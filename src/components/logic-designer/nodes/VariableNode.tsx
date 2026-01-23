import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Box } from 'lucide-react';

interface VariableNodeData {
  name?: string;
  value?: string;
  label?: string;
}

export const VariableNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as VariableNodeData;
  
  return (
    <div className={`bg-gray-50 border-2 ${selected ? 'border-gray-600' : 'border-gray-400'} rounded-lg p-3 min-w-[160px] shadow-md`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <Box className="w-4 h-4 text-gray-600" />
        <span className="font-semibold text-gray-800 text-sm">Variable</span>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="bg-gray-100 rounded px-2 py-1">
          <span className="text-gray-600">Name:</span>{' '}
          <span className="font-mono text-gray-800">{`{{${nodeData.name || 'unbenannt'}}}`}</span>
        </div>
        {nodeData.value && (
          <div className="bg-gray-100 rounded px-2 py-1">
            <span className="text-gray-600">Wert:</span>{' '}
            <span className="font-mono text-gray-800">{nodeData.value}</span>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-500"
      />
    </div>
  );
});

VariableNode.displayName = 'VariableNode';
