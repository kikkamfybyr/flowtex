import { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useEdges, useStoreApi } from '@xyflow/react';
import { PreviewTex } from '../PreviewTex';

const isDefaultText = (t: string) => /^(プロセス|新しい操作|出発物質|挿入された工程|追加された枝|横追加|分岐 \d+)$/.test(t);

// 長押し検出の閾値（ミリ秒）
const LONG_PRESS_DURATION = 400;
// 長押し中に指が動いた場合のキャンセル距離（ピクセル）
const LONG_PRESS_MOVE_THRESHOLD = 10;

export const ProcessNode = ({ id, data, selected, positionAbsoluteY }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const { setNodes, setEdges, getNode } = useReactFlow();
  const store = useStoreApi();
  const nodeRef = useRef<HTMLDivElement>(null);
  // 長押しタイマーと初期タッチ位置を保持
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  // 長押しが成立したかどうか（後続のclickイベントを抑制するため）
  const longPressTriggered = useRef(false);

  // 長押しタイマーをクリアするヘルパー
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  }, []);

  // touchstart: 長押しタイマーを開始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // マルチタッチの場合はキャンセル（ピンチズームなど）
    // ※ multiSelectionActive のリセットより先に判定しないと、2本指タッチで誤って
    //   multiSelectionActive が false にリセットされ複数選択が解除されてしまう。
    if (e.touches.length > 1) {
      cancelLongPress();
      return;
    }

    // 既に選択されているノードをシングルタッチした場合は、複数ドラッグの開始の可能性が高い。
    // multiSelectionActiveがtrueのままだと、React Flowがドラッグ開始時にこのノードの選択を解除してしまうため、
    // ここで一時的にfalseにする。これにより、選択状態を維持したまま複数ノードを一緒にドラッグできる。
    if (selected) {
      store.setState({ multiSelectionActive: false });
    }
    longPressTriggered.current = false;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      longPressTriggered.current = true;
      // バイブレーションフィードバック
      if (navigator.vibrate) navigator.vibrate(30);

      // multiSelectionActive をセットし、現在のノードを選択に追加
      const { addSelectedNodes } = store.getState();
      store.setState({ multiSelectionActive: true });
      addSelectedNodes([id]);
    }, LONG_PRESS_DURATION);
  }, [id, store, cancelLongPress, selected]);

  // Handle用のtouchendハンドラ: iOS Safariでのクリック-接続バグを回避
  const handleHandleTouchEnd = useCallback((e: React.TouchEvent, handleType: 'source' | 'target', handleId: string) => {
    const state = store.getState();
    const startHandle = state.connectionClickStartHandle;
    
    // 既に別のハンドルがクリックされて接続待機状態である場合
    if (startHandle && (startHandle.nodeId !== id || startHandle.id !== handleId)) {
      if (startHandle.type !== handleType) {
        e.preventDefault(); // Safariで後続のclickイベントが発火するのを防止（二重処理や選択解除を防ぐ）
        e.stopPropagation();
        
        const connection = {
          source: startHandle.type === 'source' ? startHandle.nodeId : id,
          sourceHandle: (startHandle.type === 'source' ? startHandle.id : handleId) || null,
          target: startHandle.type === 'target' ? startHandle.nodeId : id,
          targetHandle: (startHandle.type === 'target' ? startHandle.id : handleId) || null,
        };
        
        // React FlowのonConnectを手動で呼び出し
        if (state.onConnect) {
          state.onConnect(connection);
        }
        // 接続待機状態をクリア
        store.setState({ connectionClickStartHandle: null });
      }
    }
  }, [id, store]);

  // touchmove: 指が大きく動いたらキャンセル
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_THRESHOLD) {
      cancelLongPress();
    }
  }, [cancelLongPress]);

  // touchend / touchcancel: タイマーをクリア
  const handleTouchEnd = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  // 長押し成立後の click イベントを抑制する
  // （iOS Safariは長押し→指を離す→clickの順で発火するため）
  const handleClickCapture = useCallback((e: MouseEvent) => {
    if (longPressTriggered.current) {
      e.stopPropagation();
      e.preventDefault();
      longPressTriggered.current = false;
    }
  }, []);

  // DOM要素にタッチイベントハンドラをアタッチ
  // Reactの合成イベントではなくネイティブイベントを使用。スクロールを妨げないよう { passive: true } を指定。
  // Handle上のtouchendはReact合成イベント（onTouchEnd）で処理するため、そちらでpreventDefaultが可能。
  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    el.addEventListener('click', handleClickCapture, true); // capturing phase
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      el.removeEventListener('click', handleClickCapture, true);
      cancelLongPress();
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleClickCapture, cancelLongPress]);

  // contextmenu: デスクトップ右クリック & Android Chrome長押し用（従来のフォールバック）
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(30);
    store.setState({ multiSelectionActive: true });
    // Android Chrome等ではcontextmenuが確実に発火するため、ここでも選択追加
    const { addSelectedNodes } = store.getState();
    addSelectedNodes([id]);
  };
  
  const allEdges = useEdges();
  const outgoingEdges = allEdges.filter(e => e.source === id);
  const hasAnyChildren = outgoingEdges.length > 0;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, text: newText } } : n)));
  };

  const handleDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const handleAddBelow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newNodeId = `node_${Date.now()}`;
    // nodeOrigin[0.5, 0] 環境では、node.position.x は既にノードの「中心」を指しているため
    // 単に親の x を引き継ぐだけで、ノード幅に関わらず完璧に垂直軸が一致します。
    const parentNode = getNode(id);
    if (!parentNode) return;
    const parentCenterX = parentNode.position.x;
    const y = Math.round((positionAbsoluteY || 0) / 10) * 10;

    setNodes(nds => nds.concat({
      id: newNodeId,
      type: 'process',
      position: { x: parentCenterX, y: y + 160 },
      data: { text: '新しい操作', sides: [] }
    } as any));
    setEdges(eds => eds.concat({
      id: `edge_${id}_${newNodeId}`,
      source: id,
      target: newNodeId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'process_edge',
    }));
  };

  const executeBranch = (count: number) => {
    const parentNode = getNode(id);
    if (!parentNode) return;
    const x = parentNode.position.x;
    const y = Math.round((positionAbsoluteY || 0) / 10) * 10;
    const newNodes: any[] = [];
    const newEdges: any[] = [];
    
    // プロセスのデフォルト最小幅(160)より十分大きな間隔にする
    const spacing = 180;
    const totalWidth = (count - 1) * spacing;
    const startX = x - totalWidth / 2;

    for (let i = 0; i < count; i++) {
      const nodeId = `node_${Date.now()}_${i}`;
      newNodes.push({
        id: nodeId,
        type: 'process',
        position: { x: startX + i * spacing, y: y + 160 },
        data: { text: `分岐 ${i + 1}`, sides: [] }
      });
      newEdges.push({
        id: `edge_${id}_${nodeId}`,
        source: id,
        target: nodeId,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'process_edge',
        data: { reagents: [], isBranch: true }
      });
    }

    setNodes(nds => nds.concat(newNodes));
    setEdges(eds => eds.concat(newEdges));
    setBranchMenuOpen(false);
  };

  const handleAddSide = () => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        const sides = (n.data.sides as any[]) || [];
        return {
          ...n,
          data: {
            ...n.data,
            sides: [...sides, { id: `side_${Date.now()}`, text: '横追加' }]
          }
        };
      }
      return n;
    }));
  };

  const handleSideChange = (sideId: string, newText: string) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return {
          ...n,
          data: {
            ...n.data,
            sides: (n.data.sides as any[]).map((s: any) => s.id === sideId ? { ...s, text: newText } : s)
          }
        };
      }
      return n;
    }));
  };

  const handleSideDelete = (sideId: string) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return {
          ...n,
          data: {
            ...n.data,
            sides: (n.data.sides as any[]).filter((s: any) => s.id !== sideId)
          }
        };
      }
      return n;
    }));
  };

  // Unused handleBranchReagentAdd removed

  const handleBranchReagentChange = (reagentId: string, text: string) => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) {
        return {
          ...n,
          data: {
            ...n.data,
            branchReagents: (n.data.branchReagents as any[] || []).map(r => r.id === reagentId ? { ...r, text } : r)
          }
        };
      }
      return n;
    }));
  };

  const handleBranchReagentDelete = (reagentId: string) => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) {
        return {
          ...n,
          data: {
            ...n.data,
            branchReagents: (n.data.branchReagents as any[] || []).filter(r => r.id !== reagentId)
          }
        };
      }
      return n;
    }));
  };

  const handleInsertNode = () => {
    const newNodeId = `node_${Date.now()}`;
    const parentNode = getNode(id);
    if (!parentNode) return;
    const x = parentNode.position.x;
    const y = Math.round((positionAbsoluteY || 0) / 10) * 10;
    
    const newNode = {
      id: newNodeId,
      type: 'process',
      position: { x, y: y + 160 }, 
      data: { text: '挿入された工程', sides: [] }
    };

    setNodes(nds => nds.concat(newNode as any));

    setEdges(eds => {
      return eds.map(e => {
        if (e.source === id) {
          return { ...e, source: newNodeId };
        }
        return e;
      }).concat({
        id: `edge_${id}_${newNodeId}`,
        source: id,
        target: newNodeId,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'process_edge'
      });
    });
  };

  const handleAddExtraBranch = () => {
    const newNodeId = `node_extra_${Date.now()}`;
    const parentNode = getNode(id);
    if (!parentNode) return;
    const parentX = parentNode.position.x;
    const y = Math.round((positionAbsoluteY || 0) / 10) * 10;

    const branchChildrenX = outgoingEdges
      .filter(e => (e.data as any)?.isBranch)
      .map(e => {
        const child = getNode(e.target);
        return child ? child.position.x : parentX;
      });
      
    const maxBranchX = branchChildrenX.length > 0 ? Math.max(...branchChildrenX) : parentX;
    const newX = maxBranchX + 180;

    setNodes(nds => nds.concat({
      id: newNodeId,
      type: 'process',
      position: { x: newX, y: y + 160 }, 
      data: { text: '追加された枝', sides: [] }
    } as any));

    setEdges(eds => eds.map(e => {
      if (e.source === id) {
        return { ...e, data: { ...e.data, isBranch: true } };
      }
      return e;
    }).concat({
      id: `edge_${id}_${newNodeId}`,
      source: id,
      target: newNodeId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'process_edge',
      data: { reagents: [], isBranch: true }
    }));
  };

  const sides = (data.sides as any[]) || [];
  const branchReagents = (data.branchReagents as any[]) || [];

  return (
    <div ref={nodeRef} className={`chem-node node-process ${selected ? 'selected' : ''}`} style={{ position: 'relative' }}
      onContextMenu={handleContextMenu}
    >
      <button className="delete-btn" onClick={handleDelete} title="プロセス削除">×</button>
      <Handle id="top" type="target" position={Position.Top} onTouchEnd={(e) => handleHandleTouchEnd(e, 'target', 'top')} />
      
      <div onClick={() => setIsEditing(true)}>
        {isEditing ? (
          <div style={{ display: 'inline-grid', alignItems: 'center', justifyItems: 'center', width: '100%' }}>
            {/* テキスト長に合わせた幅を確保するための非表示スパン */}
            <span style={{ visibility: 'hidden', gridArea: '1 / 1', whiteSpace: 'pre', padding: '0 4px', fontSize: 'inherit' }}>
              {(data.text as string) || 'プロセス'}
            </span>
            <input 
              autoFocus 
              className="inline-input nodrag" 
              style={{ gridArea: '1 / 1', width: '100%', minWidth: '100%' }}
              value={data.text as string} 
              onChange={handleTextChange} 
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(false); }}
              onFocus={(e) => { if (isDefaultText(e.target.value)) e.target.select(); }}
            />
          </div>
        ) : (
          <PreviewTex text={data.text as string || 'プロセス'} />
        )}
      </div>

      <button className="add-side-btn" onClick={handleAddSide} title="横からの追加">+試薬</button>

      {/* 横追加（サイド試薬） */}
      {sides.length > 0 && (
        <div className="side-reagents-container">
          {sides.map((side) => (
            <div key={side.id} className="inline-reagent">
              <div style={{ display: 'inline-grid', alignItems: 'center', justifyItems: 'center' }}>
                <span style={{ visibility: 'hidden', gridArea: '1 / 1', whiteSpace: 'pre', padding: '4px 0', fontSize: '12px', lineHeight: 1.5 }}>
                  {side.text || '横追加'}
                </span>
                <input 
                  className="reagent-input nodrag" 
                  style={{ gridArea: '1 / 1', width: '100%', minWidth: '40px' }}
                  value={side.text} 
                  onChange={(e) => handleSideChange(side.id, e.target.value)}
                  onFocus={(e) => { if (isDefaultText(e.target.value)) e.target.select(); }}
                />
              </div>
              <button className="del-mini" onClick={() => handleSideDelete(side.id)}>×</button>
            </div>
          ))}
        </div>
      )}
      {hasAnyChildren && (
        <div className="branch-reagents-section">
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            <button className="add-tool-btn" onClick={handleInsertNode} title="間にプロセスを割り込ませる">↓間に挿入</button>
            <button className="add-tool-btn" onClick={handleAddExtraBranch} title="新しい枝を1つ増やす">＋枝を追加</button>
          </div>

          {branchReagents.length > 0 && (
            <div style={{ width: '100% '}}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>↓分岐前に追加（既存データのみ表示）</div>
              {branchReagents.map((r: any) => (
                <div key={r.id} className="inline-reagent">
                  <div style={{ display: 'inline-grid', alignItems: 'center', justifyItems: 'center' }}>
                    <span style={{ visibility: 'hidden', gridArea: '1 / 1', whiteSpace: 'pre', padding: '4px 0', fontSize: '11px', lineHeight: 1.5 }}>
                      {r.text}
                    </span>
                    <input
                      className="reagent-input nodrag"
                      style={{ gridArea: '1 / 1', width: '100%', minWidth: '40px' }}
                      value={r.text}
                      onChange={(e) => handleBranchReagentChange(r.id, e.target.value)}
                      onFocus={(e) => { if (isDefaultText(e.target.value)) e.target.select(); }}
                    />
                  </div>
                  <button className="del-mini" onClick={() => handleBranchReagentDelete(r.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ボトムツール：子がいない場合のみ新規追加/分岐作成 */}
      {!isEditing && !hasAnyChildren && (
        <div className="node-tools-bottom">
          {branchMenuOpen ? (
            <div className="branch-selector glass-panel">
              <span>分岐数: </span>
              {[2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => executeBranch(n)}>{n}</button>
              ))}
              <button onClick={() => setBranchMenuOpen(false)}>×</button>
            </div>
          ) : (
            <>
              <button className="add-below-btn" onClick={handleAddBelow} title="下にプロセスを追加">↓追加</button>
              <button className="add-branch-btn" onClick={(e) => { e.stopPropagation(); setBranchMenuOpen(true); }} title="分岐を作成">⑂分岐</button>
            </>
          )}
        </div>
      )}

      <Handle id="bottom" type="source" position={Position.Bottom} onTouchEnd={(e) => handleHandleTouchEnd(e, 'source', 'bottom')} />
    </div>
  );
};
