import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

interface ConditionNodeData {
  left?: string;
  operator?: string;
  right?: string;
  label?: string;
}

const OPERATORS: Record<string, string> = {
  '==': '=',
  '!=': '≠',
  '>': '>',
  '<': '<',
  '>=': '≥',
  '<=': '≤',
  'contains': 'enthält',
  'isEmpty': 'ist leer',
  'isNotEmpty': 'nicht leer',
};

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ConditionNodeData;
  
  return (
    <div className={`bg-yellow-50 border-2 ${selected ? 'border-yellow-600' : 'border-yellow-400'} rounded-lg p-3 min-w-[200px] shadow-md`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-yellow-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-4 h-4 text-yellow-600" />
        <span className="font-semibold text-yellow-800 text-sm">IF Bedingung</span>
      </div>
      
      <div className="bg-yellow-100 rounded px-2 py-2 text-center">
        <span className="font-mono text-sm text-yellow-800">
          {nodeData.left || '?'}{' '}
          <span className="font-bold">{OPERATORS[nodeData.operator || '=='] || nodeData.operator}</span>{' '}
          {nodeData.right || '?'}
        </span>
      </div>
      
      <div className="flex justify-between mt-3 text-xs">
        <div className="flex flex-col items-center">
          <span className="text-green-600 font-medium">TRUE</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!relative !transform-none !left-0 !top-1 w-3 h-3 !bg-green-500"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-red-600 font-medium">FALSE</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!relative !transform-none !left-0 !top-1 w-3 h-3 !bg-red-500"
          />
        </div>
      </div>
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
