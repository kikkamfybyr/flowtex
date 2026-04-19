import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  SelectionMode,
} from '@xyflow/react';
import type { OnNodeDrag } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ProcessNode } from './components/nodes/ProcessNode';
import { ProcessEdge } from './components/edges/ProcessEdge';
import { generateTexCode } from './lib/texGenerator';
import { supabase } from './lib/supabase';
import { LicensePage } from './components/LicensePage';
import { HelpPage } from './components/HelpPage';
import { HelpPage } from './components/HelpPage';

const nodeTypes = { process: ProcessNode };
const edgeTypes = { process_edge: ProcessEdge };

const initialNodes = [
  {
    id: 'node_1',
    type: 'process',
    position: { x: 400, y: 100 }, // 中心基準に合わせて調整
    data: { text: '出発物質', sides: [] },
  },
];

export default function App() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [showLicense, setShowLicense] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [panelHeight, setPanelHeight] = useState(250);
  const [showOutput, setShowOutput] = useState(true);

  // --- Resize Sidebar Logic ---
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'auto';
    document.body.style.userSelect = 'auto';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
      setPanelHeight(newHeight);
    }
  }, []);

  // --- Undo/Redo Logic ---
  const [history, setHistory] = useState<{ past: any[]; future: any[] }>({
    past: [],
    future: [],
  });

  const takeSnapshot = useCallback(() => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-49), { nodes, edges }], // Keep last 50 steps
      future: [],
    }));
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory((prev) => ({
      past: prev.past.slice(0, -1),
      future: [{ nodes, edges }, ...prev.future],
    }));
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [history, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory((prev) => ({
      past: [...prev.past, { nodes, edges }],
      future: prev.future.slice(1),
    }));
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [history, nodes, edges, setNodes, setEdges]);

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'Z')) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const onNodeDragStop = useCallback<OnNodeDrag>((_event, _node, nodesToUpdate) => {
    takeSnapshot();
    // ドラッグ終了時に端数（小数点）を強制的に丸めて、ノードの横ズレを防ぐ
    setNodes((nds) =>
      nds.map((n) => {
        if (nodesToUpdate.some((u) => u.id === n.id)) {
          return {
            ...n,
            position: {
              x: Math.round(n.position.x / 10) * 10,
              y: Math.round(n.position.y / 10) * 10,
            },
          };
        }
        return n;
      })
    );
  }, [takeSnapshot, setNodes]);

  // --- Local Persistence & State Loading ---
  useEffect(() => {
    const loadState = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const flowId = urlParams.get('v');

      if (flowId) {
        try {
          const { data, error } = await supabase
            .from('flows')
            .select('data')
            .eq('id', flowId)
            .single();

          if (!error && data) {
            const flowData = data.data as any;
            setNodes(flowData.nodes);
            setEdges(flowData.edges);
            return;
          }
        } catch (err) {
          console.error('Failed to load shared flow', err);
        }
      }

      const saved = localStorage.getItem('chemflow-autosave');
      if (saved) {
        try {
          const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved);
          setNodes(savedNodes);
          setEdges(savedEdges);
        } catch (e) {
          console.error('Failed to parse autosave', e);
        }
      }
    };

    loadState();
  }, [setNodes, setEdges]);

  useEffect(() => {
    const data = JSON.stringify({ nodes, edges });
    localStorage.setItem('chemflow-autosave', data);
  }, [nodes, edges]);

  const handleClear = () => {
    if (window.confirm('キャンバスをクリアしますか？')) {
      takeSnapshot();
      setNodes(initialNodes as any);
      setEdges([]);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      takeSnapshot();
      setEdges((eds) =>
        addEdge({ ...params, type: 'process_edge', data: { reagents: [] } }, eds)
      );
    },
    [setEdges, takeSnapshot]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const snappedX = Math.round(position.x / 10) * 10;
      const snappedY = Math.round(position.y / 10) * 10;

      const newNode = {
        id: `node_${Date.now()}`,
        type,
        position: { x: snappedX, y: snappedY }, // nodeOrigin[0.5, 0] により中心に配置される
        data: { text: '新しい操作', sides: [] },
      };
      takeSnapshot();
      setNodes((nds) => nds.concat(newNode as any));
    },
    [reactFlowInstance, setNodes, takeSnapshot]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const texCode = generateTexCode(nodes as any, edges as any);

  const addProcessNodeClicked = () => {
    if (!reactFlowInstance) return;
    const center = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const x = Math.round((center.x || 300) / 10) * 10;
    const y = Math.round((center.y || 200) / 10) * 10;

    const newNode = {
      id: `node_${Date.now()}`,
      type: 'process',
      position: { x, y },
      data: { text: '新しい操作', sides: [] },
    };
    takeSnapshot();
    setNodes((nds) => nds.concat(newNode as any));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(texCode);
    alert('クリップボードにコピーしました！');
  };

  const handleDownload = async () => {
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'flowchart.tex',
          types: [{
            description: 'TeX Files',
            accept: { 'text/plain': ['.tex'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(texCode);
        await writable.close();
      } else {
        const blob = new Blob([texCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flowchart.tex';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        alert('ファイルの保存中にエラーが発生しました。');
      }
    }
  };

  const handleShare = async () => {
    try {
      const id = Math.random().toString(36).substring(2, 10);
      const { error } = await supabase
        .from('flows')
        .insert([{
          id,
          data: { nodes, edges }
        }]);

      if (error) throw error;

      const shareUrl = `${window.location.origin}${window.location.pathname}?v=${id}`;
      
      navigator.clipboard.writeText(shareUrl);
      alert(`共有リンクを作成しました！クリップボードにコピーされました：\n${shareUrl}`);
    } catch (err: any) {
      console.error('Supabase Error:', err);
      const msg = err.message || '不明なエラー';
      alert(`共有リンクの作成に失敗しました。\n理由: ${msg}\n\n※テーブル「flows」があることと、RLSポリシー（INSERT許可）が設定されているか確認してください。`);
    }
  };

  return (
    <div className="app-container">
      {showLicense && <LicensePage onClose={() => setShowLicense(false)} />}
      {showHelp && <HelpPage onClose={() => setShowHelp(false)} />}
      <div className="main-content">
      {/* Sidebar */}
      <div className="sidebar glass-panel">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>ChemFlow-TeX</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4>ノード追加</h4>
          <div
            className="chem-node node-process"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'process')}
            onClick={addProcessNodeClicked}
            style={{ cursor: 'pointer' }}
          >
            ＋ プロセスを追加
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={undo} disabled={history.past.length === 0} style={{ flex: 1 }}>
              ↩ 戻る
            </button>
            <button className="btn-secondary" onClick={redo} disabled={history.future.length === 0} style={{ flex: 1 }}>
              ↪ 進む
            </button>
          </div>

          {nodes.filter((n: any) => n.selected).length >= 2 && (
            <button 
              className="btn-primary" 
              onClick={() => {
                const selectedNodes = nodes.filter((n: any) => n.selected);
                if (selectedNodes.length < 2) return;
                const maxY = Math.max(...selectedNodes.map((n: any) => n.position.y));
                const avgX = selectedNodes.reduce((sum: number, n: any) => sum + n.position.x, 0) / selectedNodes.length;
                const x = Math.round(avgX / 10) * 10;
                const y = Math.round((maxY + 160) / 10) * 10;
                
                const newNodeId = `node_${Date.now()}`;
                const newNode = {
                  id: newNodeId,
                  type: 'process',
                  position: { x, y },
                  data: { text: '合流', sides: [] },
                };

                const newEdges = selectedNodes.map((n: any) => ({
                  id: `edge_${n.id}_${newNodeId}`,
                  source: n.id,
                  target: newNodeId,
                  sourceHandle: 'bottom',
                  targetHandle: 'top',
                  type: 'process_edge',
                  data: { reagents: [] }
                }));

                takeSnapshot();
                setNodes(nds => nds.concat(newNode as any));
                setEdges(eds => eds.concat(newEdges as any));
              }} 
              style={{ marginTop: '10px', backgroundColor: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              ↓ 選択項目を合流
            </button>
          )}

          <button className="btn-primary" onClick={handleShare} style={{ marginTop: '10px' }}>
            🔗 共有リンクを発行
          </button>

          <button className="btn-danger" onClick={handleClear} style={{ marginTop: '10px' }}>
            🗑 キャンバスクリア
          </button>

          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowHelp(true)}
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                color: 'var(--text-primary)',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                flex: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              📘 使い方
            </button>
            <button
              onClick={() => setShowLicense(true)}
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                color: 'var(--text-secondary)',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                flex: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              📄 ライセンス
            </button>
          </div>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flow-container" ref={reactFlowWrapper}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes as any}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'process_edge' }}
            snapToGrid={true}
            snapGrid={[10, 10]}
            nodeOrigin={[0.5, 0]}
            fitView
            selectionMode={SelectionMode.Partial}
            multiSelectionKeyCode="Shift"
            selectionKeyCode="Shift"
          >
            <Controls />
            <Background color="#aaa" gap={10} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      </div>

      {/* Resize Handle (Horizontal for bottom drawer) */}
      {showOutput && <div className="sidebar-resizer" onMouseDown={startResizing} />}

      {/* Output pane (Bottom Drawer) */}
      <div
        className={`sidebar glass-panel output-sidebar ${showOutput ? 'open' : 'closed'}`}
        style={{
          height: showOutput ? `${panelHeight}px` : '0px',
          width: '100%',
          borderTop: showOutput ? '1px solid var(--panel-border)' : 'none',
          borderRight: 'none',
          borderLeft: 'none',
          transition: isResizing.current ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: showOutput ? '20px' : '0px',
          opacity: 1,
          position: 'relative',
          overflow: 'visible',
          borderRadius: 0,
        }}
      >
        {/* Toggle Button (Tab Style) - Attached to the top edge */}
        <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translate(-50%, -100%)', zIndex: 1001 }}>
          <button
            className={`toggle-output-btn glass-panel ${showOutput ? 'open' : 'closed'}`}
            onClick={() => setShowOutput(!showOutput)}
            title={showOutput ? "閉じる" : "TeX出力を表示"}
          >
            {showOutput ? '▼' : '▲'}
          </button>
        </div>

        {/* Content Wrapper (Controlled by showOutput) */}
        <div style={{
          opacity: showOutput ? 1 : 0,
          pointerEvents: showOutput ? 'auto' : 'none',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'opacity 0.2s ease',
          width: '100%',
        }}>
          <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', whiteSpace: 'nowrap' }}>
            生成された TeX
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-primary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={handleDownload}
              >
                保存 (.tex)
              </button>
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={handleCopy}
              >
                コピー
              </button>
            </div>
          </h4>
          <div className="tex-output" style={{ flexGrow: 1, height: '100%', marginTop: '10px' }}>
            {texCode || '% ここにコードが生成されます'}
          </div>
        </div>
      </div>
    </div>
  );
}
