import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Calculator } from 'lucide-react';

interface TransformNodeData {
  operation?: string;
  inputs?: string[];
  inputVariable?: string;
  outputVariable?: string;
  output?: string;
  label?: string;
  compareVariable?: string;
  compareFields?: string;
}

const OPERATIONS: Record<string, string> = {
  'add': '+',
  'subtract': '-',
  'multiply': '×',
  'divide': '÷',
  'concat': 'verketten',
  'formatDate': 'Datum formatieren',
  'toUpperCase': 'GROSSBUCHSTABEN',
  'toLowerCase': 'kleinbuchstaben',
  'first': 'Erstes Element',
  'last': 'Letztes Element',
  'countDistinct': 'Eindeutig zählen',
  'min': 'Minimum',
  'max': 'Maximum',
  'sum': 'Summe',
  'avg': 'Durchschnitt',
  'coalesce': 'Erster Nicht-Null',
  'compareObjects': 'Objekte vergleichen',
};

export const TransformNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as TransformNodeData;
  const isCompareObjects = nodeData.operation === 'compareObjects';
  const outputVar = nodeData.outputVariable || nodeData.output;
  
  return (
    <div className={`bg-purple-50 border-2 ${selected ? 'border-purple-600' : 'border-purple-400'} rounded-lg p-3 min-w-[180px] shadow-md`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-4 h-4 text-purple-600" />
        <span className="font-semibold text-purple-800 text-sm">Berechnung</span>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="bg-purple-100 rounded px-2 py-1">
          <span className="text-purple-600">Operation:</span>{' '}
          <span className="font-mono text-purple-800">
            {OPERATIONS[nodeData.operation || ''] || nodeData.operation || 'nicht gewählt'}
          </span>
        </div>
        
        {isCompareObjects ? (
          <>
            {nodeData.inputVariable && (
              <div className="bg-purple-100 rounded px-2 py-1">
                <span className="text-purple-600">Objekt 1:</span>{' '}
                <span className="font-mono text-purple-800">{`{{${nodeData.inputVariable}}}`}</span>
              </div>
            )}
            {nodeData.compareVariable && (
              <div className="bg-purple-100 rounded px-2 py-1">
                <span className="text-purple-600">Objekt 2:</span>{' '}
                <span className="font-mono text-purple-800">{`{{${nodeData.compareVariable}}}`}</span>
              </div>
            )}
            {nodeData.compareFields && (
              <div className="bg-purple-100 rounded px-2 py-1">
                <span className="text-purple-600">Felder:</span>{' '}
                <span className="font-mono text-purple-800 text-[10px]">
                  {nodeData.compareFields}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            {nodeData.inputVariable && (
              <div className="bg-purple-100 rounded px-2 py-1">
                <span className="text-purple-600">Input:</span>{' '}
                <span className="font-mono text-purple-800">{`{{${nodeData.inputVariable}}}`}</span>
              </div>
            )}
            {nodeData.inputs && nodeData.inputs.length > 0 && (
              <div className="bg-purple-100 rounded px-2 py-1">
                <span className="text-purple-600">Inputs:</span>{' '}
                <span className="font-mono text-purple-800">
                  {nodeData.inputs.join(', ')}
                </span>
              </div>
            )}
          </>
        )}
        
        {outputVar && (
          <div className="bg-purple-100 rounded px-2 py-1">
            <span className="text-purple-600">Output:</span>{' '}
            <span className="font-mono text-purple-800">{`{{${outputVar}}}`}</span>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-purple-500"
      />
    </div>
  );
});

TransformNode.displayName = 'TransformNode';
