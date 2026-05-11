import { ChemNode, ChemEdge } from './types';
import { DEFAULT_BRANCH_OFFSET, DEFAULT_CHILD_VERTICAL_GAP, DEFAULT_MERGE_OFFSET, GRID_SIZE } from './layoutConstants';

const MERGE_STEP = 0.10;
const MIN_MERGE_FRACTION = 0.05;
const MAX_MERGE_FRACTION = 0.95;

/**
 * Returns an in-bounds top-edge anchor fraction for merge targets.
 * Small merge groups keep the fixed 0.10 step centered around 0.5 so the UI
 * and TeX output stay visually aligned. Larger groups fall back to proportional
 * spacing so anchors remain within the node width instead of spilling past 0..1.
 */
const getMergeAnchorFraction = (index: number, total: number): number => {
  if (total <= 1) return 0.5;

  const fixedStepSpan = (total - 1) * MERGE_STEP;
  const rawFraction = fixedStepSpan <= (MAX_MERGE_FRACTION - MIN_MERGE_FRACTION)
    ? 0.5 + (index - (total - 1) / 2) * MERGE_STEP
    : (index + 1) / (total + 1);
  return Math.min(MAX_MERGE_FRACTION, Math.max(MIN_MERGE_FRACTION, rawFraction));
};

export const generateTexCode = (nodes: ChemNode[], edges: ChemEdge[]): string => {
  const TEX_X_QUANTIZE_PX = GRID_SIZE;
  const TEX_X_SCALE = 80;
  const TEX_Y_QUANTIZE_PX = 20;
  const quantize = (value: number, step: number) => Math.round(value / step) * step;
  const processes = nodes.filter(n => n.type === 'process');
  const processById = new Map(processes.map((process) => [process.id, process]));
  const snappedXById = new Map(
    processes.map((process) => [process.id, quantize(process.position.x, TEX_X_QUANTIZE_PX)])
  );

  // 既存出力との互換用: 旧UIデフォルト縦間隔(px)
  const BASE_UI_CHILD_VERTICAL_GAP = 140;
  // 既存出力との互換用: 旧TeX縦スケール
  const BASE_TEX_Y_SCALE = 100;
  const Y_SCALE = (DEFAULT_CHILD_VERTICAL_GAP / BASE_UI_CHILD_VERTICAL_GAP) * BASE_TEX_Y_SCALE;

  let texParts: string[] = [];

  // ── プリアンブル ──────────────────────
  texParts.push(`% class=jlreq, luatex を指定することで単体でも日本語が通ります
\\documentclass[class=jlreq, luatex, tikz, border=2mm]{standalone}

\\usepackage[version=4]{mhchem}
\\usepackage{siunitx}
\\usetikzlibrary{arrows.meta, positioning, calc}

\\begin{document}
% --- 試薬追加用マクロ (埋め込み時の衝突を防ぐため document 内に定義) ---
\\newcommand{\\addreagent}[4]{
    \\path (#1) -- (#2) node[coordinate, pos=#3] (tmp) {};
    \\draw [thick, -{Latex[length=2.5mm, width=2.0mm]}] ($ (tmp) + (0.75, 0) $) -- (tmp);
    \\node [reagent_node, anchor=west] at ($ (tmp) + (0.785, 0) $) {#4};
}

\\newcommand{\\addside}[2]{
    \\draw [thick, -{Latex[length=2.5mm, width=2.0mm]}] ($ (#1.east) + (0.75, 0) $) |- (#1.east);
    \\node [anchor=west, font=\\small] at ($ (#1.east) + (0.785, 0) $) {#2};
}

% --- スタイル定義 ---
\\tikzset{
    proc/.style={
        draw, thick, sharp corners, fill=white,
        inner sep=2mm, align=center, font=\\small,
        minimum width=2cm
    },
    reagent_node/.style={
        font=\\small, inner sep=2pt, anchor=south
    },
    myarrow/.style={thick, {Latex[length=2.5mm, width=2.0mm]}-}
}

\\begin{tikzpicture}[node distance=1.2cm]`);

  // ── ノード配置 ────────────────────────────────────────
  texParts.push(`\n    % === ノード配置 ===`);
  processes.forEach(node => {
    const textStr = node.data.text.replace(/\n/g, '\\\\');
    const snapX = quantize(node.position.x, TEX_X_QUANTIZE_PX);
    const snapY = quantize(node.position.y, TEX_Y_QUANTIZE_PX);
    const tx = (snapX / TEX_X_SCALE).toFixed(2);
    const ty = (-snapY / Y_SCALE).toFixed(2);
    texParts.push(`    \\node (${node.id}) [proc] at (${tx}, ${ty}) {${textStr}};`);
  });

  // ── フロー接続 ────────────────────────────────────────
  const branchGroups = new Map<string, string[]>();
  const mergeGroups = new Map<string, ChemEdge[]>();
  const normalEdges: ChemEdge[] = []; // 保守のため既存の配列も残す

  edges.forEach(edge => {
    if ((edge as any).data?.isBranch) {
      const targets = branchGroups.get(edge.source) || [];
      targets.push(edge.target);
      branchGroups.set(edge.source, targets);
    } else {
      normalEdges.push(edge);
      const incoming = mergeGroups.get(edge.target) || [];
      incoming.push(edge);
      mergeGroups.set(edge.target, incoming);
    }
  });

  texParts.push(`\n    % === 結線 ===`);
  
  // 1. 通常の結線 (合流考慮)
  mergeGroups.forEach((incomingEdges, targetId) => {
    const tgtNode = processById.get(targetId);
    if (!tgtNode) return;

    // ソースのX座標（スナップ済）で左から順にソートする
    const sortedEdges = incomingEdges.sort((a, b) => {
      const xa = snappedXById.get(a.source) ?? 0;
      const xb = snappedXById.get(b.source) ?? 0;
      return xa - xb;
    });

    const isMerge = sortedEdges.length > 1;

    sortedEdges.forEach((edge, index) => {
      const srcNode = processById.get(edge.source);
      if (!srcNode) return;

      const edgeData = (edge.data as any) || {};
      const loopDir: 'right' | 'left' | null =
        edgeData.isLoop === 'left' ? 'left' : edgeData.isLoop ? 'right' : null;

      // ターゲット位置: 合流の場合は中央寄せ（固定ステップ0.10）、1本なら中央
      // N本合流: fraction = 0.5 + (index - (N-1)/2) * MERGE_STEP
      // 例) N=2: 0.45, 0.55  N=3: 0.40, 0.50, 0.60
      const fraction = isMerge ? getMergeAnchorFraction(index, sortedEdges.length).toFixed(2) : null;
      const targetAnchor = isMerge
        ? `($(${targetId}.north west)!${fraction}!(${targetId}.north east)$)`
        : `(${targetId}.north)`;

      const srcSnapX = snappedXById.get(edge.source)!;
      const srcTx = parseFloat((srcSnapX / TEX_X_SCALE).toFixed(2));

      if (loopDir) {
          const LOOP_OFFSET_CM = 2.5;
          const loopX = loopDir === 'right'
            ? (srcTx + LOOP_OFFSET_CM).toFixed(2)
            : (srcTx - LOOP_OFFSET_CM).toFixed(2);
          texParts.push(
            `    \\draw [thick] let \\p1 = (${edge.source}.south), \\p2 = ${targetAnchor} in\n` +
            `      (${edge.source}.south) -- (\\x1, \\y1-14pt) -- (${loopX}cm, \\y1-14pt) -- (${loopX}cm, \\y2+14pt) -- (\\x2, \\y2+14pt) -- ${targetAnchor};`
          );
      } else {
          const tgtSnapX = snappedXById.get(targetId)!;
          const dx = Math.abs(srcSnapX - tgtSnapX);
          if (dx === 0 && !isMerge) {
              texParts.push(`    \\draw [thick] (${edge.source}.south) -- ${targetAnchor};`);
          } else if (isMerge) {
              // mergeOffset (px) を Y_SCALE で割って cm に変換し、各合流枝のベンドY座標を揃える
              // デフォルトは branchOffset と同じ 40px (= 0.40cm) に統一
              const mergeOffsetPx = (edgeData.mergeOffset as number) ?? DEFAULT_MERGE_OFFSET;
              const quantizedMergeOffsetPx = quantize(mergeOffsetPx, TEX_Y_QUANTIZE_PX);
              const texDrop = (quantizedMergeOffsetPx / Y_SCALE).toFixed(2);
              texParts.push(`    \\draw [thick] (${edge.source}.south) -- ++(0,-${texDrop}) -| ${targetAnchor};`);
          } else {
              // 非合流の折れ線（X座標が異なる通常エッジ）
              texParts.push(`    \\draw [thick] (${edge.source}.south) -| ${targetAnchor};`);
          }
      }
    });
  });

  // 2. 分岐線の描画
  if (branchGroups.size > 0) {
    // ターゲットごとの全入力エッジ数（分岐・通常問わず）を数えておく
    const incomingCountByTarget = new Map<string, number>();
    edges.forEach(edge => {
      incomingCountByTarget.set(edge.target, (incomingCountByTarget.get(edge.target) ?? 0) + 1);
    });

    branchGroups.forEach((targets, sourceId) => {
      const splitCoord = `split_${sourceId}`;
      const srcNode = processById.get(sourceId);
      if (srcNode) {
        const offset = (srcNode.data as any).branchOffset ?? DEFAULT_BRANCH_OFFSET;
        const quantizedOffsetPx = quantize(offset, TEX_Y_QUANTIZE_PX);
        const texOffset = (-quantizedOffsetPx / Y_SCALE).toFixed(2);
        texParts.push(`    \\draw [thick] (${sourceId}.south) -- ++(0,${texOffset}) coordinate (${splitCoord});`);
        targets.forEach(targetId => {
          // ターゲットに複数の入力エッジがあれば等間隔で分配（合流＋分岐の複合ケース）
          const totalIncoming = incomingCountByTarget.get(targetId) ?? 1;
          if (totalIncoming > 1) {
            // すべての入力エッジ（分岐・通常）を左から X 座標順にソートしてインデックスを決定
            // slice() でコピーしてから sort() することで edges 配列の破壊的変更を防ぐ
            const allIncoming = edges.filter(e => e.target === targetId);
            const sortedIncoming = allIncoming.slice().sort((a, b) => {
              const xa = snappedXById.get(a.source) ?? 0;
              const xb = snappedXById.get(b.source) ?? 0;
              return xa - xb;
            });
            const idx = sortedIncoming.findIndex(e => e.source === sourceId);
            // findIndex が -1 を返す（予期しないケース）場合は中央にフォールバック
            const safeIdx = idx >= 0 ? idx : Math.floor(totalIncoming / 2);
            const fraction = ((safeIdx + 1) / (totalIncoming + 1)).toFixed(2);
            const targetAnchor = `($(${targetId}.north west)!${fraction}!(${targetId}.north east)$)`;
            texParts.push(`    \\draw [thick] (${splitCoord}) -| ${targetAnchor};`);
          } else {
            texParts.push(`    \\draw [thick] (${splitCoord}) -| (${targetId}.north);`);
          }
        });
      }
    });
  }

  // ── 試薬／横追加 ─────────────────────────────────────
  texParts.push(`\n    % === 試薬／横追加 ===`);

  processes.forEach(node => {
    // 横追加
    if (node.data.sides && node.data.sides.length > 0) {
      node.data.sides.forEach(side => {
        const textStr = side.text.replace(/\n/g, '\\\\');
        texParts.push(`    \\addside{${node.id}}{${textStr}}`);
      });
    }

    // トランク（垂直分岐前）部分に配置すべき試薬をまとめる
    const trunkReagents: { text: string }[] = [];
    
    // 1. ノードに直接紐づく分岐前試薬
    if (node.data.branchReagents) {
      trunkReagents.push(...(node.data.branchReagents as any[]));
    }

    // 2. このノードをソースとする「分岐エッジ」に紐づく試薬
    const branchEdgesFromThisNode = edges.filter(e => e.source === node.id && (e as any).data?.isBranch);
    branchEdgesFromThisNode.forEach(edge => {
      const edgeReagents = (edge.data?.reagents as any[]) || [];
      trunkReagents.push(...edgeReagents);
    });

    if (trunkReagents.length > 0) {
      const splitCoord = `split_${node.id}`;
      trunkReagents.forEach((reagent, index) => {
        const textStr = reagent.text.replace(/\n/g, '\\\\');
        const autoPos = (index + 1) / (trunkReagents.length + 1);
        const posStr = autoPos.toFixed(2);
        texParts.push(`    \\addreagent{${node.id}.south}{${splitCoord}}{${posStr}}{${textStr}}`);
      });
    }
  });

  // 1-2. 通常エッジ試薬（分岐でないもの）
  normalEdges.forEach(edge => {
    const edgeReagents = (edge.data?.reagents as any[]) || [];
    if (edgeReagents.length > 0) {
      edgeReagents.forEach((reagent, index) => {
        const textStr = reagent.text.replace(/\n/g, '\\\\');
        const autoPos = (index + 1) / (edgeReagents.length + 1);
        const posStr = autoPos.toFixed(2);
        texParts.push(`    \\addreagent{${edge.source}.south}{${edge.target}.north}{${posStr}}{${textStr}}`);
      });
    }
  });

  texParts.push(`\n\\end{tikzpicture}
\\end{document}`);

  return texParts.join('\n');
};
