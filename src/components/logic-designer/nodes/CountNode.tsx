import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Hash } from 'lucide-react';

interface CountNodeData {
  table?: string;
  filter?: Record<string, any>;
  output?: string;
  label?: string;
}

export const CountNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as CountNodeData;
  
  return (
    <div className={`bg-green-50 border-2 ${selected ? 'border-green-600' : 'border-green-400'} rounded-lg p-3 min-w-[180px] shadow-md`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-green-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <Hash className="w-4 h-4 text-green-600" />
        <span className="font-semibold text-green-800 text-sm">COUNT</span>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="bg-green-100 rounded px-2 py-1">
          <span className="text-green-600">Tabelle:</span>{' '}
          <span className="font-mono text-green-800">{nodeData.table || 'nicht gewählt'}</span>
        </div>
        {nodeData.filter && Object.keys(nodeData.filter).length > 0 && (
          <div className="bg-green-100 rounded px-2 py-1">
            <span className="text-green-600">Filter:</span>{' '}
            <span className="font-mono text-green-800">
              {Object.entries(nodeData.filter).map(([k, v]) => `${k}=${v}`).join(', ')}
            </span>
          </div>
        )}
        {nodeData.output && (
          <div className="bg-green-100 rounded px-2 py-1">
            <span className="text-green-600">Output:</span>{' '}
            <span className="font-mono text-green-800">{`{{${nodeData.output}}}`}</span>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    </div>
  );
});

CountNode.displayName = 'CountNode';
