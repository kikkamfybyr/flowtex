import { Handle, Position, NodeProps } from '@xyflow/react';
import { PreviewTex } from '../PreviewTex';

export const SideNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`chem-node node-side ${selected ? 'selected' : ''}`}>
      <PreviewTex text={data.text as string || '操作入力'} />
      <Handle type="source" position={Position.Left} />
    </div>
  );
};
