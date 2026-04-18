import { Handle, Position } from '@xyflow/react';

export const JointNode = ({ selected }: { selected?: boolean }) => {
  return (
    <div 
      className={`joint-node ${selected ? 'selected' : ''}`}
      style={{
        width: '10px',
        height: '10px',
        background: 'var(--edge-color)',
        borderRadius: '50%',
        position: 'relative',
        boxShadow: selected ? '0 0 0 2px var(--accent-color)' : 'none',
        cursor: 'grab',
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        style={{ opacity: 0, width: '100%', height: '100%', top: 0, left: 0 }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        style={{ opacity: 0, width: '100%', height: '100%', top: 0, left: 0 }} 
      />
    </div>
  );
};
