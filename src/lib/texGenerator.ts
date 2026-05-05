import { ChemNode, ChemEdge } from './types';

export const generateTexCode = (nodes: ChemNode[], edges: ChemEdge[]): string => {
  const processes = nodes.filter(n => n.type === 'process');
  const processById = new Map(processes.map((process) => [process.id, process]));
  const snappedXById = new Map(
    processes.map((process) => [process.id, Math.round(process.position.x / 10) * 10])
  );

  const X_SCALE = 60; 
  const Y_SCALE = 100; 

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
    const snapX = Math.round(node.position.x / 10) * 10;
    const snapY = Math.round(node.position.y / 10) * 10;
    const tx = (snapX / X_SCALE).toFixed(2);
    const ty = -(snapY / Y_SCALE).toFixed(2); 
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

      // ターゲット位置（複数本なら等間隔、1本なら中央）
      const fraction = ((index + 1) / (sortedEdges.length + 1)).toFixed(2);
      const targetAnchor = isMerge
        ? `($(${targetId}.north west)!${fraction}!(${targetId}.north east)$)`
        : `(${targetId}.north)`;

      const srcSnapX = snappedXById.get(edge.source)!;
      const srcTx = parseFloat((srcSnapX / X_SCALE).toFixed(2));

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
          } else {
              // mergeOffset (px) を Y_SCALE で割って cm に変換し、各合流枝のベンドY座標を揃える
              const DEFAULT_MERGE_OFFSET_PX = 50;
              const mergeOffsetPx = (edgeData.mergeOffset as number) ?? DEFAULT_MERGE_OFFSET_PX;
              const texDrop = (mergeOffsetPx / Y_SCALE).toFixed(2);
              texParts.push(`    \\draw [thick] (${edge.source}.south) -- ++(0,-${texDrop}) -| ${targetAnchor};`);
          }
      }
    });
  });

  // 2. 分岐線の描画
  if (branchGroups.size > 0) {
    branchGroups.forEach((targets, sourceId) => {
      const splitCoord = `split_${sourceId}`;
      const srcNode = processById.get(sourceId);
      if (srcNode) {
        const offset = (srcNode.data as any).branchOffset ?? 60;
        const texOffset = -(offset / Y_SCALE).toFixed(2);
        texParts.push(`    \\draw [thick] (${sourceId}.south) -- ++(0,${texOffset}) coordinate (${splitCoord});`);
        targets.forEach(targetId => {
          texParts.push(`    \\draw [thick] (${splitCoord}) -| (${targetId}.north);`);
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
