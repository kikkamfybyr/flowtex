import { useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { PreviewTex } from '../PreviewTex';

export const ReagentNode = ({ id, data, selected }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { setNodes, setEdges } = useReactFlow();

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, text: newText } } : n)));
  };

  const handleDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div className={`chem-node node-reagent ${selected ? 'selected' : ''}`} onDoubleClick={() => setIsEditing(true)}>
      <button className="delete-btn" onClick={handleDelete} title="削除">×</button>
      
      {isEditing ? (
        <input 
          autoFocus 
          className="inline-input" 
          value={data.text as string} 
          onChange={handleTextChange} 
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(false); }}
        />
      ) : (
        <PreviewTex text={data.text as string || '試薬名'} />
      )}
      
      <Handle type="source" position={Position.Left} />
    </div>
  );
};
