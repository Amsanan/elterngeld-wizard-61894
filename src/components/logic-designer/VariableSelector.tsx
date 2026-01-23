import { useState } from 'react';
import { Variable, ChevronDown, Database, Hash, RotateCcw, Sigma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface VariableSelectorProps {
  availableVariables: string[];
  onSelect: (variable: string) => void;
  disabled?: boolean;
}

type VariableCategory = 'count' | 'loop' | 'transform' | 'aggregate' | 'custom';

function categorizeVariable(name: string): VariableCategory {
  if (name.endsWith('_count') || name.startsWith('count_')) return 'count';
  if (name === 'item' || name === 'index' || name.endsWith('_item') || name.endsWith('_index')) return 'loop';
  if (name.includes('_sum') || name.includes('_avg') || name.includes('_min') || name.includes('_max')) return 'aggregate';
  if (name.includes('_transformed') || name.includes('_result')) return 'transform';
  return 'custom';
}

const categoryConfig: Record<VariableCategory, { 
  label: string; 
  icon: typeof Variable; 
  className: string;
  description: string;
}> = {
  count: { 
    label: 'Zähler', 
    icon: Hash, 
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    description: 'Anzahl von Datensätzen'
  },
  loop: { 
    label: 'Schleife', 
    icon: RotateCcw, 
    className: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    description: 'Aktuelles Element/Index'
  },
  aggregate: { 
    label: 'Aggregat', 
    icon: Sigma, 
    className: 'bg-teal-100 text-teal-700 border-teal-200',
    description: 'Berechnete Werte'
  },
  transform: { 
    label: 'Transform', 
    icon: Variable, 
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    description: 'Transformierte Werte'
  },
  custom: { 
    label: 'Variable', 
    icon: Database, 
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    description: 'Benutzerdefiniert'
  },
};

function groupVariablesByCategory(variables: string[]): Record<VariableCategory, string[]> {
  const groups: Record<VariableCategory, string[]> = {
    count: [],
    loop: [],
    aggregate: [],
    transform: [],
    custom: [],
  };
  
  variables.forEach(variable => {
    const category = categorizeVariable(variable);
    groups[category].push(variable);
  });
  
  return groups;
}

export function VariableSelector({ 
  availableVariables, 
  onSelect,
  disabled = false 
}: VariableSelectorProps) {
  const [open, setOpen] = useState(false);

  const groupedVariables = groupVariablesByCategory(availableVariables);
  const hasVariables = availableVariables.length > 0;

  const handleSelect = (variable: string) => {
    onSelect(`{{${variable}}}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !hasVariables}
          className="h-8 px-2 gap-1"
          title={hasVariables ? "Variable einfügen" : "Keine Variablen verfügbar"}
        >
          <Variable className="w-4 h-4" />
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="end">
        <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
          Variable einfügen
        </div>
        
        {!hasVariables ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Keine Variablen verfügbar.
            <br />
            <span className="text-xs">Erstelle zuerst einen Datenquellen- oder Zähl-Node.</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {(['count', 'aggregate', 'loop', 'transform', 'custom'] as VariableCategory[]).map(category => {
              const variables = groupedVariables[category];
              if (variables.length === 0) return null;
              
              const config = categoryConfig[category];
              const Icon = config.icon;
              
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                    <Icon className="w-3 h-3" />
                    <span>{config.label}</span>
                    <span className="text-[10px]">({config.description})</span>
                  </div>
                  {variables.map(variable => (
                    <button
                      key={variable}
                      onClick={() => handleSelect(variable)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded text-sm font-mono",
                        "hover:bg-accent hover:text-accent-foreground transition-colors",
                        "flex items-center gap-2"
                      )}
                    >
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] px-1 py-0 shrink-0", config.className)}
                      >
                        <Icon className="w-2.5 h-2.5 mr-0.5" />
                      </Badge>
                      <code className="text-xs">{`{{${variable}}}`}</code>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
