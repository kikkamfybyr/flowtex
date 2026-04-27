import { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useEdges } from '@xyflow/react';
import { PreviewTex } from '../PreviewTex';

const isDefaultText = (t: string) => /^(プロセス|新しい操作|出発物質|挿入された工程|追加された枝|横追加|分岐 \d+)$/.test(t);

export const ProcessNode = ({ id, data, selected, positionAbsoluteY }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const { setNodes, setEdges, getNode } = useReactFlow();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const allEdges = useEdges();
  const outgoingEdges = allEdges.filter(e => e.source === id);
  const hasAnyChildren = outgoingEdges.length > 0;

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (isEditing) {
      autoResize();
    }
  }, [isEditing, data.text, autoResize]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, text: newText } } : n)));
    autoResize();
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

  const handleBranchReagentAdd = () => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) {
        const current = (n.data.branchReagents as any[]) || [];
        return {
          ...n,
          data: {
            ...n.data,
            branchReagents: [...current, { id: crypto.randomUUID(), text: '分岐前試薬' }]
          }
        };
      }
      return n;
    }));
  };

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
    <div className={`chem-node node-process ${selected ? 'selected' : ''}`} style={{ position: 'relative' }}>
      <button className="delete-btn" onClick={handleDelete} title="プロセス削除">×</button>
      <Handle id="top" type="target" position={Position.Top} />
      
      <div onClick={() => setIsEditing(true)}>
        {isEditing ? (
          <div style={{ display: 'inline-grid', alignItems: 'center', justifyItems: 'center', width: '100%' }}>
            {/* テキスト長に合わせた幅を確保するための非表示スパン */}
            <span style={{ visibility: 'hidden', gridArea: '1 / 1', whiteSpace: 'pre', padding: '0 4px', fontSize: 'inherit' }}>
              {(data.text as string) || 'プロセス'}
            </span>
            <textarea
              ref={textareaRef}
              autoFocus
              rows={1}
              className="inline-textarea nodrag"
              style={{ gridArea: '1 / 1', width: '100%', minWidth: '100%' }}
              value={data.text as string}
              onChange={handleTextChange}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); setIsEditing(false); }
                // Enter without Shift inserts newline (default textarea behaviour)
              }}
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
            <button className="add-tool-btn" onClick={handleBranchReagentAdd} title="分岐前に試薬を追加">＋分岐前試薬</button>
          </div>

          {branchReagents.length > 0 && (
            <div style={{ width: '100% '}}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>↓分岐前に追加</div>
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

      <Handle id="bottom" type="source" position={Position.Bottom} />
    </div>
  );
};
