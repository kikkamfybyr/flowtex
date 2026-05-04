import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { useCallback } from 'react';

const edgeDegreeCache = new WeakMap<object, {
  sourceCounts: Map<string, number>;
  targetCounts: Map<string, number>;
}>();

const getEdgeDegreeCounts = (edges: Array<{ source: string; target: string }>) => {
  const cached = edgeDegreeCache.get(edges);
  if (cached) return cached;

  const sourceCounts = new Map<string, number>();
  const targetCounts = new Map<string, number>();
  edges.forEach((edge) => {
    sourceCounts.set(edge.source, (sourceCounts.get(edge.source) || 0) + 1);
    targetCounts.set(edge.target, (targetCounts.get(edge.target) || 0) + 1);
  });

  const counts = { sourceCounts, targetCounts };
  edgeDegreeCache.set(edges, counts);
  return counts;
};

export const ProcessEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
}: EdgeProps) => {
  const { setEdges, setNodes, screenToFlowPosition } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const sourceNode = nodes.find(n => n.id === source);
  const branchOffset = (sourceNode?.data as any)?.branchOffset ?? 50;
  const { sourceCounts, targetCounts } = getEdgeDegreeCounts(
    edges as Array<{ source: string; target: string }>
  );

  // 線の出入り本数を動的にカウント
  const isActualBranch = (sourceCounts.get(source) || 0) > 1;
  const isActualMerge = (targetCounts.get(target) || 0) > 1;
  const isComplexEdge = isActualBranch || isActualMerge;

  // データ上は分岐として生成されていても、1本道になったら通常の線として扱う
  const isBranch = !!(data?.isBranch) && isActualBranch;

  // isLoop: 'right' | 'left' | false（後方互換でtrueは'right'扱い）
  const loopDir: 'right' | 'left' | null =
    data?.isLoop === 'left' ? 'left' :
    data?.isLoop ? 'right' : null;
  const reagents = (data?.reagents as any[]) || [];
  const markerId = `arrowhead-${id}`;
  // Safari resolves url(#id) relative to the base URL of the document, but fails when
  // the SVG defs are in a nested <svg> element.  Using the absolute page URL as a
  // prefix forces all browsers to look up the marker in the current document.
  const baseUrl = typeof window !== 'undefined' ? window.location.href.replace(/#.*$/, '') : '';
  const markerUrl = `url(${baseUrl}#${markerId})`;

  // X座標の差
  const dx = Math.abs(sourceX - targetX);

  // 1. 分岐パス（縦→横→縦）
  // ユーザーがドラッグで調整可能なオフセットを使用
  const branchMidY = sourceY + branchOffset;
  const familyTreePath = `M ${sourceX},${sourceY} L ${sourceX},${branchMidY} L ${targetX},${branchMidY} L ${targetX},${targetY}`;

  // 2. 垂直線パス（dx が小さい場合、斜め線を防ぐため sourceX に揃えた厳密な縦線を使う）
  const verticalPath = `M ${sourceX},${sourceY} L ${sourceX},${targetY}`;

  // 3. 回り込みパス
  //    右ループ: loopX = sourceX + 150 → 下, 右, 上/下, 右(tgtX), 下  (tgtXがloopXより右の場合)
  //    左ループ: loopX = sourceX - 150 → 下, 左, 上/下, 左(tgtX), 下  (tgtXがloopXより左の場合)
  const LOOP_OFFSET = 150;
  const loopX = loopDir === 'right'
    ? sourceX + LOOP_OFFSET
    : loopDir === 'left'
      ? sourceX - LOOP_OFFSET
      : 0;
  const loopPath = loopDir ? [
    `M ${sourceX},${sourceY}`,
    `L ${sourceX},${sourceY + 30}`,
    `L ${loopX},${sourceY + 30}`,
    `L ${loopX},${targetY - 30}`,
    `L ${targetX},${targetY - 30}`,
    `L ${targetX},${targetY}`,
  ].join(' ') : '';

  // 4. 通常の直角折れ線
  const [smoothPath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Bottom,
    targetX,
    targetY,
    targetPosition: Position.Top,
    borderRadius: 0,
  });

  // パスの選択とラベル位置の決定
  let edgePath: string;
  let midX: number;
  let midY: number;

  if (isBranch) {
    edgePath = familyTreePath;
    // 分岐の場合、ツール（削除ボタン等）は各枝（垂直部）の中央に配置
    midX = targetX;
    midY = (branchMidY + targetY) / 2;
  } else if (loopDir) {
    edgePath = loopPath;
    midX = loopX;
    midY = (sourceY + targetY) / 2;
  } else if (dx < 5) {
    edgePath = verticalPath;
    midX = sourceX;
    midY = (sourceY + targetY) / 2;
  } else {
    edgePath = smoothPath;
    midX = labelX;
    midY = labelY;
  }

  // 合流（isActualMerge）の場合、×ボタンがターゲットノードに被らないようにmidYを上方にクランプ
  const EDGE_BUTTON_MARGIN = 36;
  if (isActualMerge) {
    midY = Math.min(midY, targetY - EDGE_BUTTON_MARGIN);
  }

  const handleDeleteEdge = () => {
    setEdges(eds => eds.filter(e => e.id !== id));
  };

  const handleToggleLoop = () => {
    const next = !loopDir ? 'right' : loopDir === 'right' ? 'left' : false;
    setEdges(eds => eds.map(e =>
      e.id === id ? { ...e, data: { ...e.data, isLoop: next } } : e
    ));
  };


  const handleAddReagent = () => {
    setEdges((eds) => eds.map(e => {
      if (e.id === id) {
        const current = (e.data?.reagents as any[]) || [];
        return {
          ...e,
          data: { ...e.data, reagents: [...current, { id: `reagent_${Date.now()}`, pos: 0.5, text: '途中追加' }] }
        };
      }
      return e;
    }));
  };

  const handleReagentChange = (reagentId: string, newText: string) => {
    setEdges((eds) => eds.map(e => {
      if (e.id === id) {
        return {
          ...e,
          data: {
            ...e.data,
            reagents: (e.data?.reagents as any[]).map(r => r.id === reagentId ? { ...r, text: newText } : r)
          }
        };
      }
      return e;
    }));
  };

  const handleDeleteReagent = (reagentId: string) => {
    setEdges((eds) => eds.map(e => {
      if (e.id === id) {
        return {
          ...e,
          data: {
            ...e.data,
            reagents: (e.data?.reagents as any[]).filter(r => r.id !== reagentId)
          }
        };
      }
      return e;
    }));
  };

  const handleBranchDrag = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    document.body.style.cursor = 'grabbing';
    
    // ドラッグ開始時のスクリーン座標とフロー座標を記録
    const startFlowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const startOffset = branchOffset;

    // 分岐の下流ノード（全子孫）を特定する
    const getDownstreamIds = (nodeId: string, visited = new Set<string>()): string[] => {
      if (visited.has(nodeId)) return [];
      visited.add(nodeId);
      const childIds = edges.filter(edge => edge.source === nodeId).map(edge => edge.target);
      let allFound = [...childIds];
      for (const cid of childIds) {
        allFound = [...allFound, ...getDownstreamIds(cid, visited)];
      }
      return allFound;
    };

    // このブランチソースから出ている全枝のターゲット以降をすべて下流とみなす
    const branchTargets = edges
      .filter(edge => edge.source === source && edge.data?.isBranch)
      .map(edge => edge.target);
    const downstreamIds = new Set<string>();
    branchTargets.forEach(tid => {
      downstreamIds.add(tid);
      getDownstreamIds(tid).forEach(did => downstreamIds.add(did));
    });

    // ドラッグ開始時の全ノード座標を確定（蓄積誤差防止）
    const initialPositions = new Map<string, { x: number; y: number }>();
    nodes.forEach(n => {
      if (downstreamIds.has(n.id)) {
        initialPositions.set(n.id, { ...n.position });
      }
    });

    const onPointerMove = (moveEvent: PointerEvent) => {
      // スクリーン座標の差をフロー座標系の差に変換してカーソルに正確追従させる
      const currentFlowPos = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      const deltaY = currentFlowPos.y - startFlowPos.y;
      
      // スナップなしでオフセットを計算（ドラッグ中はなめらかに）
      const newOffset = Math.max(20, startOffset + deltaY);

      setNodes(nds => nds.map(n => {
        if (n.id === source) {
          return { ...n, data: { ...n.data, branchOffset: newOffset } };
        }
        if (downstreamIds.has(n.id)) {
          const init = initialPositions.get(n.id);
          if (init) {
            return { ...n, position: { x: init.x, y: init.y + deltaY } };
          }
        }
        return n;
      }));
    };

    const onPointerUp = () => {
      document.body.style.cursor = 'auto';
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [branchOffset, source, nodes, edges, setNodes, screenToFlowPosition]);

  return (
    <>
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="var(--edge-color)" />
          </marker>
        </defs>
      </svg>

      {/* クリック判定エリア拡大用の透明なパス */}
      <BaseEdge
        path={edgePath}
        style={{ strokeWidth: 20, stroke: 'transparent' }}
      />

      <BaseEdge
        path={edgePath}
        style={{ ...style, strokeWidth: 2, stroke: 'var(--edge-color)' }}
        markerEnd={markerUrl}
      />

      <EdgeLabelRenderer>
        {/* 合流前の操作（＋ボタン） - 合流時のみ表示 */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${targetX}px,${targetY - 25}px)`,
            pointerEvents: 'all',
            display: isActualMerge ? 'flex' : 'none',
            alignItems: 'center',
            backgroundColor: 'var(--panel-bg)',
            padding: '2px',
            borderRadius: '20px',
            border: '1px solid var(--panel-border)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 1001,
            opacity: 0.9,
          }}
          className="edge-tool-group-merge nodrag nopan"
        >
          <button className="add-edge-reagent-btn" onClick={handleAddReagent} title="合流前に試薬を追加">+</button>
        </div>

        {/* トランク部分の操作（＋ボタン） - 分岐時のみ表示 */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceX}px,${sourceY + 25}px)`,
            pointerEvents: 'all',
            display: isBranch ? 'flex' : 'none',
            alignItems: 'center',
            backgroundColor: 'var(--panel-bg)',
            padding: '2px',
            borderRadius: '20px',
            border: '1px solid var(--panel-border)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 1001,
            opacity: 0.9,
          }}
          className="edge-tool-group-trunk nodrag nopan"
        >
          <button className="add-edge-reagent-btn" onClick={handleAddReagent} title="トランクに試薬を追加">+</button>
        </div>

        {/* 分岐ドラッグハンドル - 複数エッジあるが一番左の時だけ表示するように見える工夫 */}
        {isBranch && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX}px,${branchMidY}px)`,
              pointerEvents: 'all',
              touchAction: 'none', /* Androidでのドラッグ中のページスクロールを防ぐ */
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--accent-color)',
              borderRadius: '50%',
              cursor: 'grab',
              zIndex: 1002,
              border: '2px solid white',
              boxShadow: '0 0 6px rgba(0,0,0,0.4)',
              opacity: 0.9,
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            }}
            className="nodrag nopan"
            onPointerDown={handleBranchDrag}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-50%, -50%) translate(' + sourceX + 'px,' + branchMidY + 'px) scale(1.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(-50%, -50%) translate(' + sourceX + 'px,' + branchMidY + 'px) scale(1)')}
            title="ドラッグして分岐の高さを調整"
          />
        )}

        {/* 各枝・通常線用の操作（×ボタンなど） */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${midX}px,${midY}px)`,
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--panel-bg)',
            padding: '4px',
            borderRadius: '20px',
            border: '1px solid var(--panel-border)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 1000,
          }}
          className="edge-tool-group nodrag nopan"
        >
          {!isComplexEdge && (
            <>
              <button
                className="add-edge-reagent-btn"
                onClick={handleAddReagent}
                title="試薬を途中追加"
              >
                +
              </button>
              <button
                className="edge-loop-toggle"
                onClick={handleToggleLoop}
                style={{
                  color: loopDir ? 'var(--accent-color)' : 'inherit',
                  fontWeight: loopDir ? 'bold' : 'normal',
                }}
                title={
                  !loopDir ? '回り込みモード（クリックで右ループ）' :
                  loopDir === 'right' ? '右ループ ON → クリックで左ループ' :
                  '左ループ ON → クリックで解除'
                }
              >
                {!loopDir ? '🔄' : loopDir === 'right' ? '↪右' : '↩左'}
              </button>
            </>
          )}

          <button
            className="edge-delete-btn"
            style={{ opacity: 1 }}
            onClick={handleDeleteEdge}
            title="この接続を削除"
          >
            ×
          </button>
        </div>

        {/* 試薬ラベル - ツールバーの外でレンダリングすることで座標の狂いを防ぐ */}
        {reagents.map((reagent: any, index: number) => {
          const autoPos = (index + 1) / (reagents.length + 1);
          let rx_base = sourceX + (targetX - sourceX) * autoPos;
          let ry_base = sourceY + (targetY - sourceY) * autoPos;
          
          if (isBranch) {
            rx_base = sourceX;
            ry_base = sourceY + (branchMidY - sourceY) * autoPos;
          }

          // ノードの真横 (中心から65px右)
          const rX = rx_base + 65;
          const rY = ry_base;

          return (
            <div key={reagent.id} className="edge-reagent-item-right nodrag nopan" style={{
              position: 'absolute',
              transform: `translate(0, -50%) translate(${rX}px, ${rY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
            }}>
              {/* 連絡線と起点ドット */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                marginRight: '0px'
              }}>
                <div style={{
                  position: 'absolute',
                  left: '-65px', /* 結線中心へ */
                  width: '65px', /* 点線の長さ（ブロックの端まで到達） */
                  height: '1px',
                  borderTop: '1px dashed var(--edge-color)',
                }} />
                <div style={{
                  position: 'absolute',
                  left: '-65px',
                  width: '4px',
                  height: '4px',
                  backgroundColor: 'var(--edge-color)',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)'
                }} />
              </div>
              
              <div className="inline-reagent glass-panel" style={{ padding: '2px 4px' }}>
                <div style={{ display: 'inline-grid', alignItems: 'center', justifyItems: 'center' }}>
                  <span style={{ visibility: 'hidden', gridArea: '1 / 1', whiteSpace: 'pre', padding: '4px 0', fontSize: '10px', lineHeight: 1.5 }}>
                    {reagent.text || '途中追加'}
                  </span>
                  <input
                    className="reagent-input nodrag"
                    style={{ gridArea: '1 / 1', width: '100%', minWidth: '40px', fontSize: '10px', background: 'transparent', border: 'none', padding: '4px 0', margin: 0, lineHeight: 1.5 }}
                    value={reagent.text}
                    onChange={(e) => handleReagentChange(reagent.id, e.target.value)}
                    onFocus={(e) => { if (e.target.value === '途中追加') e.target.select(); }}
                  />
                </div>
                <button className="del-mini" onClick={() => handleDeleteReagent(reagent.id)} style={{ fontSize: '12px' }}>×</button>
              </div>
            </div>
          );
        })}
      </EdgeLabelRenderer>
    </>
  );
};
