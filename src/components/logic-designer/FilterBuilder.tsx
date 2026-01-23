import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterConditionRow, FilterCondition, ColumnDefinition } from './FilterConditionRow';

interface FilterBuilderProps {
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
  columns: ColumnDefinition[];
  availableVariables: string[];
  onChange: (conditions: FilterCondition[], logic: 'AND' | 'OR') => void;
}

export function FilterBuilder({
  conditions,
  logic,
  columns,
  availableVariables,
  onChange,
}: FilterBuilderProps) {
  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: `cond_${Date.now()}`,
      column: columns[0]?.name || '',
      columnType: 'text',
      operator: '=',
      value: null,
      valueType: 'static',
    };
    onChange([...conditions, newCondition], logic);
  };

  const updateCondition = (index: number, updated: FilterCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = updated;
    onChange(newConditions, logic);
  };

  const deleteCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    onChange(newConditions, logic);
  };

  const handleLogicChange = (newLogic: 'AND' | 'OR') => {
    onChange(conditions, newLogic);
  };

  if (columns.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
        Wähle zuerst eine Tabelle aus, um Filter zu definieren.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">WHERE-Bedingungen</span>
        {conditions.length > 1 && (
          <Select value={logic} onValueChange={(v) => handleLogicChange(v as 'AND' | 'OR')}>
            <SelectTrigger className="w-20 h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <div key={condition.id}>
            <FilterConditionRow
              condition={condition}
              columns={columns}
              availableVariables={availableVariables}
              onChange={(updated) => updateCondition(index, updated)}
              onDelete={() => deleteCondition(index)}
            />
            {index < conditions.length - 1 && (
              <div className="flex justify-center py-1">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {logic}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={addCondition}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Bedingung hinzufügen
      </Button>

      {conditions.length > 0 && (
        <div className="mt-3 p-2 bg-muted/50 rounded text-xs font-mono overflow-x-auto">
          <span className="text-muted-foreground">Preview: </span>
          <span>
            WHERE {conditions.map((c, i) => {
              let clause = `${c.column} ${c.operator}`;
              if (!['IS NULL', 'IS NOT NULL'].includes(c.operator)) {
                const val = c.valueType === 'variable' 
                  ? c.value 
                  : typeof c.value === 'string' ? `'${c.value}'` : c.value;
                if (c.operator === 'BETWEEN') {
                  const val2 = typeof c.value2 === 'string' ? `'${c.value2}'` : c.value2;
                  clause += ` ${val} AND ${val2}`;
                } else {
                  clause += ` ${val}`;
                }
              }
              return i > 0 ? ` ${logic} ${clause}` : clause;
            }).join('')}
          </span>
        </div>
      )}
    </div>
  );
}
