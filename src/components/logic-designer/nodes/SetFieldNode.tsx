import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileOutput, FileText, CheckSquare, List, Variable, Calendar, Wand2 } from 'lucide-react';

interface SetFieldNodeData {
  pdfField?: string;
  value?: string | boolean;
  label?: string;
  autoFormat?: boolean;
}

type FieldType = 'text' | 'checkbox' | 'dropdown' | 'unknown';

function getFieldType(fieldName: string): FieldType {
  if (fieldName.startsWith('txt.')) return 'text';
  if (fieldName.startsWith('chk.')) return 'checkbox';
  if (fieldName.startsWith('cbo.')) return 'dropdown';
  return 'unknown';
}

function getFieldTypeInfo(type: FieldType) {
  switch (type) {
    case 'text': return { icon: FileText, label: 'Text', color: 'text-blue-600' };
    case 'checkbox': return { icon: CheckSquare, label: 'Check', color: 'text-green-600' };
    case 'dropdown': return { icon: List, label: 'Dropdown', color: 'text-purple-600' };
    default: return { icon: FileText, label: '?', color: 'text-gray-600' };
  }
}

export const SetFieldNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as SetFieldNodeData;
  const fieldType = nodeData.pdfField ? getFieldType(nodeData.pdfField) : null;
  const typeInfo = fieldType ? getFieldTypeInfo(fieldType) : null;
  const TypeIcon = typeInfo?.icon || FileText;
  
  const isVariable = typeof nodeData.value === 'string' && nodeData.value.includes('{{');
  const isDateField = nodeData.pdfField && (
    nodeData.pdfField.includes('datum') || 
    nodeData.pdfField.includes('geburt') ||
    nodeData.pdfField.includes('termin')
  );
  
  const displayValue = () => {
    if (nodeData.value === true) return '✓ TRUE';
    if (nodeData.value === false) return '✗ FALSE';
    if (typeof nodeData.value === 'string' && nodeData.value.startsWith('{{')) {
      return nodeData.value;
    }
    return nodeData.value !== undefined && nodeData.value !== '' 
      ? `"${nodeData.value}"` 
      : 'nicht gesetzt';
  };
  
  return (
    <div className={`bg-red-50 border-2 ${selected ? 'border-red-600' : 'border-red-400'} rounded-lg p-3 min-w-[220px] max-w-[280px] shadow-md`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-red-500"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <FileOutput className="w-4 h-4 text-red-600" />
        <span className="font-semibold text-red-800 text-sm">PDF Feld setzen</span>
        {nodeData.autoFormat && (
          <span title="Auto-Formatierung aktiv">
            <Wand2 className="w-3 h-3 text-red-400 ml-auto" />
          </span>
        )}
      </div>
      
      <div className="text-xs space-y-1.5">
        <div className="bg-red-100 rounded px-2 py-1.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-red-600">Feld:</span>
            {typeInfo && (
              <span className={`flex items-center gap-0.5 ${typeInfo.color}`}>
                <TypeIcon className="w-3 h-3" />
                <span className="text-[10px]">{typeInfo.label}</span>
              </span>
            )}
            {isDateField && (
              <span title="Datumsfeld">
                <Calendar className="w-3 h-3 text-orange-500" />
              </span>
            )}
          </div>
          <span className="font-mono text-red-800 break-all text-[11px] block">
            {nodeData.pdfField || 'nicht gewählt'}
          </span>
        </div>
        
        <div className="bg-red-100 rounded px-2 py-1.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-red-600">Wert:</span>
            {isVariable && (
              <span title="Variable">
                <Variable className="w-3 h-3 text-amber-600" />
              </span>
            )}
          </div>
          <span className={`font-mono text-red-800 break-all text-[11px] block ${isVariable ? 'text-amber-700 bg-amber-50 rounded px-1' : ''}`}>
            {displayValue()}
          </span>
        </div>
      </div>
    </div>
  );
});

SetFieldNode.displayName = 'SetFieldNode';
