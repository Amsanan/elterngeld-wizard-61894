import { DragEvent } from 'react';
import { Database, Hash, GitBranch, Repeat, Calculator, FileOutput, Box } from 'lucide-react';

interface NodeTypeConfig {
  type: string;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const nodeTypes: NodeTypeConfig[] = [
  { 
    type: 'dataSource', 
    label: 'Datenquelle', 
    icon: Database, 
    color: 'blue',
    description: 'Lade Daten aus einer Tabelle'
  },
  { 
    type: 'count', 
    label: 'Zählen', 
    icon: Hash, 
    color: 'green',
    description: 'Zähle Datensätze'
  },
  { 
    type: 'condition', 
    label: 'IF/ELSE', 
    icon: GitBranch, 
    color: 'yellow',
    description: 'Bedingungsprüfung'
  },
  { 
    type: 'loop', 
    label: 'Schleife', 
    icon: Repeat, 
    color: 'orange',
    description: 'Iteriere über Array'
  },
  { 
    type: 'transform', 
    label: 'Berechnung', 
    icon: Calculator, 
    color: 'purple',
    description: 'Werte transformieren'
  },
  { 
    type: 'setField', 
    label: 'PDF Feld', 
    icon: FileOutput, 
    color: 'red',
    description: 'Setze PDF Feldwert'
  },
  { 
    type: 'variable', 
    label: 'Variable', 
    icon: Box, 
    color: 'gray',
    description: 'Zwischenspeicher'
  },
];

const colorClasses: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', hover: 'hover:border-blue-500' },
  green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', hover: 'hover:border-green-500' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', hover: 'hover:border-yellow-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', hover: 'hover:border-orange-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', hover: 'hover:border-purple-500' },
  red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', hover: 'hover:border-red-500' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', hover: 'hover:border-gray-500' },
};

export function NodePalette() {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-muted/30 border-r p-4 overflow-y-auto">
      <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wide">
        Node Typen
      </h3>
      
      <div className="space-y-2">
        {nodeTypes.map((node) => {
          const colors = colorClasses[node.color];
          const Icon = node.icon;
          
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className={`
                ${colors.bg} ${colors.border} ${colors.hover}
                border-2 rounded-lg p-3 cursor-grab active:cursor-grabbing
                transition-colors
              `}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${colors.text}`} />
                <span className={`font-medium text-sm ${colors.text}`}>{node.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{node.description}</p>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Tipp:</strong> Ziehe einen Node auf die Canvas, um ihn hinzuzufügen. 
          Verbinde Nodes durch Klicken und Ziehen von den Handles.
        </p>
      </div>
    </div>
  );
}
