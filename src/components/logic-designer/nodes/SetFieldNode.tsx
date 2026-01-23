import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileOutput } from 'lucide-react';

interface SetFieldNodeData {
  pdfField?: string;
  value?: string | boolean;
  label?: string;
}

export const SetFieldNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as SetFieldNodeData;
  
  const displayValue = () => {
    if (nodeData.value === true) return 'TRUE (ankreuzen)';
    if (nodeData.value === false) return 'FALSE';
    if (typeof nodeData.value === 'string' && nodeData.value.startsWith('{{')) {
      return nodeData.value;
    }
    return nodeData.value !== undefined ? `"${nodeData.value}"` : 'nicht gesetzt';
  };
  
  return (
    <div className={`bg-red-50 border-2 ${selected ? 'border-red-600' : 'border-red-400'} rounded-lg p-3 min-w-[200px] shadow-md`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-red-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <FileOutput className="w-4 h-4 text-red-600" />
        <span className="font-semibold text-red-800 text-sm">PDF Feld setzen</span>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="bg-red-100 rounded px-2 py-1">
          <span className="text-red-600">Feld:</span>{' '}
          <span className="font-mono text-red-800 break-all">{nodeData.pdfField || 'nicht gewählt'}</span>
        </div>
        <div className="bg-red-100 rounded px-2 py-1">
          <span className="text-red-600">Wert:</span>{' '}
          <span className="font-mono text-red-800">{displayValue()}</span>
        </div>
      </div>
    </div>
  );
});

SetFieldNode.displayName = 'SetFieldNode';
