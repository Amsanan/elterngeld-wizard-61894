import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';

interface DataSourceNodeData {
  table?: string;
  filter?: Record<string, any>;
  output?: string;
  label?: string;
}

export const DataSourceNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as DataSourceNodeData;
  
  return (
    <div className={`bg-blue-50 border-2 ${selected ? 'border-blue-600' : 'border-blue-400'} rounded-lg p-3 min-w-[180px] shadow-md`}>
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-blue-800 text-sm">Datenquelle</span>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="bg-blue-100 rounded px-2 py-1">
          <span className="text-blue-600">Tabelle:</span>{' '}
          <span className="font-mono text-blue-800">{nodeData.table || 'nicht gewählt'}</span>
        </div>
        {nodeData.filter && Object.keys(nodeData.filter).length > 0 && (
          <div className="bg-blue-100 rounded px-2 py-1">
            <span className="text-blue-600">Filter:</span>{' '}
            <span className="font-mono text-blue-800">
              {Object.entries(nodeData.filter).map(([k, v]) => `${k}=${v}`).join(', ')}
            </span>
          </div>
        )}
        {nodeData.output && (
          <div className="bg-blue-100 rounded px-2 py-1">
            <span className="text-blue-600">Output:</span>{' '}
            <span className="font-mono text-blue-800">{`{{${nodeData.output}}}`}</span>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
});

DataSourceNode.displayName = 'DataSourceNode';
