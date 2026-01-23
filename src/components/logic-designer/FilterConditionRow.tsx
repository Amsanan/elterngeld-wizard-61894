import { Trash2, Variable } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

export interface FilterCondition {
  id: string;
  column: string;
  columnType: 'text' | 'date' | 'numeric' | 'integer' | 'boolean' | 'uuid';
  operator: string;
  value: string | number | boolean | null;
  value2?: string | number;
  valueType: 'static' | 'variable';
}

export interface ColumnDefinition {
  name: string;
  type: string;
  description?: string;
}

interface FilterConditionRowProps {
  condition: FilterCondition;
  columns: ColumnDefinition[];
  availableVariables: string[];
  onChange: (condition: FilterCondition) => void;
  onDelete: () => void;
}

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: '=', label: '= (gleich)' },
    { value: '!=', label: '!= (ungleich)' },
    { value: 'LIKE', label: 'LIKE (enthält)' },
    { value: 'NOT LIKE', label: 'NOT LIKE' },
    { value: 'ILIKE', label: 'ILIKE (enthält, case-insensitive)' },
    { value: 'IN', label: 'IN (einer von)' },
    { value: 'NOT IN', label: 'NOT IN (keiner von)' },
    { value: 'SIMILAR TO', label: 'SIMILAR TO (Regex)' },
    { value: 'IS NULL', label: 'IS NULL (leer)' },
    { value: 'IS NOT NULL', label: 'IS NOT NULL (nicht leer)' },
  ],
  date: [
    { value: '=', label: '= (gleich)' },
    { value: '!=', label: '!= (ungleich)' },
    { value: '>', label: '> (nach)' },
    { value: '<', label: '< (vor)' },
    { value: '>=', label: '>= (ab)' },
    { value: '<=', label: '<= (bis)' },
    { value: 'BETWEEN', label: 'BETWEEN (zwischen)' },
    { value: 'IS NULL', label: 'IS NULL (leer)' },
    { value: 'IS NOT NULL', label: 'IS NOT NULL (nicht leer)' },
  ],
  numeric: [
    { value: '=', label: '= (gleich)' },
    { value: '!=', label: '!= (ungleich)' },
    { value: '>', label: '> (größer)' },
    { value: '<', label: '< (kleiner)' },
    { value: '>=', label: '>= (größer oder gleich)' },
    { value: '<=', label: '<= (kleiner oder gleich)' },
    { value: 'BETWEEN', label: 'BETWEEN (zwischen)' },
    { value: 'IN', label: 'IN (einer von)' },
    { value: 'NOT IN', label: 'NOT IN (keiner von)' },
    { value: 'IS NULL', label: 'IS NULL (leer)' },
    { value: 'IS NOT NULL', label: 'IS NOT NULL (nicht leer)' },
  ],
  integer: [
    { value: '=', label: '= (gleich)' },
    { value: '!=', label: '!= (ungleich)' },
    { value: '>', label: '> (größer)' },
    { value: '<', label: '< (kleiner)' },
    { value: '>=', label: '>= (größer oder gleich)' },
    { value: '<=', label: '<= (kleiner oder gleich)' },
    { value: 'BETWEEN', label: 'BETWEEN (zwischen)' },
    { value: 'IN', label: 'IN (einer von)' },
    { value: 'NOT IN', label: 'NOT IN (keiner von)' },
    { value: 'IS NULL', label: 'IS NULL (leer)' },
    { value: 'IS NOT NULL', label: 'IS NOT NULL (nicht leer)' },
  ],
  boolean: [
    { value: '=', label: '= (ist)' },
    { value: 'IS NULL', label: 'IS NULL (leer)' },
    { value: 'IS NOT NULL', label: 'IS NOT NULL (nicht leer)' },
  ],
  uuid: [
    { value: '=', label: '= (gleich)' },
    { value: '!=', label: '!= (ungleich)' },
    { value: 'IN', label: 'IN (einer von)' },
    { value: 'NOT IN', label: 'NOT IN (keiner von)' },
    { value: 'IS NULL', label: 'IS NULL (leer)' },
    { value: 'IS NOT NULL', label: 'IS NOT NULL (nicht leer)' },
  ],
};

function mapDbTypeToColumnType(dbType: string): FilterCondition['columnType'] {
  const type = dbType.toLowerCase();
  if (type.includes('timestamp') || type.includes('date')) return 'date';
  if (type.includes('int') || type === 'smallint' || type === 'bigint') return 'integer';
  if (type.includes('numeric') || type.includes('decimal') || type.includes('real') || type.includes('double')) return 'numeric';
  if (type.includes('bool')) return 'boolean';
  if (type.includes('uuid')) return 'uuid';
  return 'text';
}

export function FilterConditionRow({
  condition,
  columns,
  availableVariables,
  onChange,
  onDelete,
}: FilterConditionRowProps) {
  const selectedColumn = columns.find(c => c.name === condition.column);
  const columnType = selectedColumn ? mapDbTypeToColumnType(selectedColumn.type) : 'text';
  const operators = OPERATORS_BY_TYPE[columnType] || OPERATORS_BY_TYPE.text;
  
  const needsValue = !['IS NULL', 'IS NOT NULL'].includes(condition.operator);
  const needsSecondValue = condition.operator === 'BETWEEN';
  const isVariable = condition.valueType === 'variable';

  const handleColumnChange = (columnName: string) => {
    const col = columns.find(c => c.name === columnName);
    const newType = col ? mapDbTypeToColumnType(col.type) : 'text';
    const newOperators = OPERATORS_BY_TYPE[newType] || OPERATORS_BY_TYPE.text;
    const newOperator = newOperators.find(o => o.value === condition.operator) 
      ? condition.operator 
      : newOperators[0].value;
    
    onChange({
      ...condition,
      column: columnName,
      columnType: newType,
      operator: newOperator,
      value: null,
      value2: undefined,
    });
  };

  const handleOperatorChange = (operator: string) => {
    onChange({
      ...condition,
      operator,
      value: ['IS NULL', 'IS NOT NULL'].includes(operator) ? null : condition.value,
      value2: operator === 'BETWEEN' ? condition.value2 : undefined,
    });
  };

  const toggleVariableMode = () => {
    onChange({
      ...condition,
      valueType: isVariable ? 'static' : 'variable',
      value: '',
    });
  };

  const renderValueInput = (
    value: string | number | boolean | null | undefined,
    onValueChange: (val: string | number | boolean) => void,
    placeholder = 'Wert'
  ) => {
    if (isVariable) {
      return (
        <div className="flex-1 relative">
          <Input
            value={String(value || '')}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="{{variable}}"
            className="font-mono text-xs pr-8"
          />
          {availableVariables.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-8"
                >
                  <Variable className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1">
                <div className="text-xs font-medium text-muted-foreground p-2">
                  Variablen
                </div>
                {availableVariables.map((v) => (
                  <Button
                    key={v}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start font-mono text-xs"
                    onClick={() => onValueChange(`{{${v}}}`)}
                  >
                    {`{{${v}}}`}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      );
    }

    if (columnType === 'boolean') {
      return (
        <Select
          value={value === true ? 'true' : value === false ? 'false' : ''}
          onValueChange={(v) => onValueChange(v === 'true')}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Wert wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true (ja)</SelectItem>
            <SelectItem value="false">false (nein)</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (columnType === 'date') {
      const dateValue = value ? parse(String(value), 'yyyy-MM-dd', new Date()) : undefined;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'flex-1 justify-start text-left font-normal',
                !value && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(dateValue!, 'dd.MM.yyyy', { locale: de }) : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={(date) => {
                if (date) {
                  onValueChange(format(date, 'yyyy-MM-dd'));
                }
              }}
              locale={de}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (columnType === 'numeric' || columnType === 'integer') {
      return (
        <Input
          type="number"
          value={value !== null && value !== undefined ? String(value) : ''}
          onChange={(e) => {
            const num = columnType === 'integer' 
              ? parseInt(e.target.value, 10) 
              : parseFloat(e.target.value);
            onValueChange(isNaN(num) ? e.target.value : num);
          }}
          placeholder={placeholder}
          className="flex-1"
        />
      );
    }

    return (
      <Input
        value={String(value || '')}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
    );
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
      {/* Column Selector */}
      <Select value={condition.column} onValueChange={handleColumnChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Spalte" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {columns.map((col) => (
            <SelectItem key={col.name} value={col.name} className="text-xs">
              <div className="flex flex-col">
                <span className="font-mono">{col.name}</span>
                {col.description && (
                  <span className="text-muted-foreground text-[10px] truncate max-w-[200px]">
                    {col.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Selector */}
      <Select value={condition.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value} className="text-xs">
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input(s) */}
      {needsValue && (
        <>
          {renderValueInput(condition.value, (val) => onChange({ ...condition, value: val }))}
          
          {needsSecondValue && (
            <>
              <span className="text-xs text-muted-foreground">und</span>
              {renderValueInput(condition.value2, (val) => onChange({ ...condition, value2: val as string | number }), 'Bis')}
            </>
          )}
        </>
      )}

      {/* Variable Toggle */}
      {needsValue && (
        <Button
          variant={isVariable ? 'secondary' : 'ghost'}
          size="icon"
          onClick={toggleVariableMode}
          title={isVariable ? 'Statischer Wert' : 'Variable verwenden'}
        >
          <Variable className="h-4 w-4" />
        </Button>
      )}

      {/* Delete */}
      <Button variant="ghost" size="icon" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
