import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BarChart3 } from 'lucide-react';

interface AggregateNodeData {
  table?: string;
  aggregateFunction?: string;
  column?: string;
  groupBy?: string;
  having?: string;
  output?: string;
  label?: string;
}

const AGGREGATE_FUNCTIONS: Record<string, string> = {
  'count': 'COUNT',
  'countDistinct': 'COUNT DISTINCT',
  'sum': 'SUM',
  'avg': 'AVG (Durchschnitt)',
  'min': 'MIN (Minimum)',
  'max': 'MAX (Maximum)',
};

export const AggregateNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as AggregateNodeData;
  
  return (
    <div className={`bg-teal-50 border-2 ${selected ? 'border-teal-600' : 'border-teal-400'} rounded-lg p-3 min-w-[200px] shadow-md`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-teal-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-teal-600" />
        <span className="font-semibold text-teal-800 text-sm">Aggregat</span>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="bg-teal-100 rounded px-2 py-1">
          <span className="text-teal-600">Funktion:</span>{' '}
          <span className="font-mono text-teal-800">
            {AGGREGATE_FUNCTIONS[nodeData.aggregateFunction || ''] || nodeData.aggregateFunction || 'nicht gewählt'}
          </span>
        </div>
        {nodeData.table && (
          <div className="bg-teal-100 rounded px-2 py-1">
            <span className="text-teal-600">Tabelle:</span>{' '}
            <span className="font-mono text-teal-800">{nodeData.table}</span>
          </div>
        )}
        {nodeData.column && (
          <div className="bg-teal-100 rounded px-2 py-1">
            <span className="text-teal-600">Spalte:</span>{' '}
            <span className="font-mono text-teal-800">{nodeData.column}</span>
          </div>
        )}
        {nodeData.groupBy && (
          <div className="bg-teal-100 rounded px-2 py-1">
            <span className="text-teal-600">GROUP BY:</span>{' '}
            <span className="font-mono text-teal-800">{nodeData.groupBy}</span>
          </div>
        )}
        {nodeData.having && (
          <div className="bg-teal-100 rounded px-2 py-1">
            <span className="text-teal-600">HAVING:</span>{' '}
            <span className="font-mono text-teal-800 truncate max-w-[150px] block">{nodeData.having}</span>
          </div>
        )}
        {nodeData.output && (
          <div className="bg-teal-100 rounded px-2 py-1">
            <span className="text-teal-600">Output:</span>{' '}
            <span className="font-mono text-teal-800">{`{{${nodeData.output}}}`}</span>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-teal-500"
      />
    </div>
  );
});

AggregateNode.displayName = 'AggregateNode';
