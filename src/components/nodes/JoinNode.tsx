import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';

export const JoinNode = ({ id, selected }: NodeProps) => {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div className={`chem-node node-join ${selected ? 'selected' : ''}`} style={{ minWidth: 'auto', padding: '4px', borderRadius: '50%', width: '16px', height: '16px', backgroundColor: '#555', border: '2px solid #ccc' }}>
      {selected && <button className="delete-btn" onClick={handleDelete} title="削除" style={{ position: 'absolute', top: '-20px', left: '-5px', fontSize: '10px', padding: '2px' }}>×</button>}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Right} id="side" />
    </div>
  );
};
