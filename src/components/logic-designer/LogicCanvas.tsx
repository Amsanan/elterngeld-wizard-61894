import { useCallback, useRef, DragEvent } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  DataSourceNode,
  ConditionNode,
  SetFieldNode,
  CountNode,
  VariableNode,
  TransformNode,
  LoopNode,
} from './nodes';

const nodeTypes = {
  dataSource: DataSourceNode,
  condition: ConditionNode,
  setField: SetFieldNode,
  count: CountNode,
  variable: VariableNode,
  transform: TransformNode,
  loop: LoopNode,
};

interface LogicCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodesUpdate: (nodes: Node[]) => void;
  onEdgesUpdate: (edges: Edge[]) => void;
}

export function LogicCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodesUpdate,
  onEdgesUpdate,
}: LogicCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance.current || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: getDefaultDataForType(type),
      };

      onNodesUpdate([...nodes, newNode]);
    },
    [nodes, onNodesUpdate]
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
      </ReactFlow>
    </div>
  );
}

function getDefaultDataForType(type: string): Record<string, any> {
  switch (type) {
    case 'dataSource':
      return { table: '', filter: {}, output: 'data' };
    case 'count':
      return { table: '', filter: {}, output: 'count' };
    case 'condition':
      return { left: '', operator: '==', right: '' };
    case 'setField':
      return { pdfField: '', value: '' };
    case 'variable':
      return { name: 'myVar', value: '' };
    case 'transform':
      return { operation: '', inputs: [], output: 'result' };
    case 'loop':
      return { arrayVariable: 'items', itemVariable: 'item', indexVariable: '' };
    default:
      return {};
  }
}
