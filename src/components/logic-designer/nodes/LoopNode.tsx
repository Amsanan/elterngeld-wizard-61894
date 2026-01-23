import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Repeat } from 'lucide-react';

interface LoopNodeData {
  arrayVariable?: string;
  itemVariable?: string;
  indexVariable?: string;
  label?: string;
}

export const LoopNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as LoopNodeData;
  
  return (
    <div className={`bg-orange-50 border-2 ${selected ? 'border-orange-600' : 'border-orange-400'} rounded-lg p-3 min-w-[200px] shadow-md`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-orange-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <Repeat className="w-4 h-4 text-orange-600" />
        <span className="font-semibold text-orange-800 text-sm">FOR EACH Schleife</span>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="bg-orange-100 rounded px-2 py-1">
          <span className="text-orange-600">Array:</span>{' '}
          <span className="font-mono text-orange-800">{`{{${nodeData.arrayVariable || 'items'}}}`}</span>
        </div>
        <div className="bg-orange-100 rounded px-2 py-1">
          <span className="text-orange-600">Element:</span>{' '}
          <span className="font-mono text-orange-800">{`{{${nodeData.itemVariable || 'item'}}}`}</span>
        </div>
        {nodeData.indexVariable && (
          <div className="bg-orange-100 rounded px-2 py-1">
            <span className="text-orange-600">Index:</span>{' '}
            <span className="font-mono text-orange-800">{`{{${nodeData.indexVariable}}}`}</span>
          </div>
        )}
      </div>
      
      <div className="flex justify-between mt-3 text-xs">
        <div className="flex flex-col items-center">
          <span className="text-orange-600 font-medium">BODY</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="body"
            className="!relative !transform-none !left-0 !top-1 w-3 h-3 !bg-orange-500"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-orange-600 font-medium">DONE</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="done"
            className="!relative !transform-none !left-0 !top-1 w-3 h-3 !bg-orange-700"
          />
        </div>
      </div>
    </div>
  );
});

LoopNode.displayName = 'LoopNode';
