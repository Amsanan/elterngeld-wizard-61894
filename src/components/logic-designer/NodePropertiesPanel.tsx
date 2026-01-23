import { Node } from '@xyflow/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import { FilterBuilder } from './FilterBuilder';
import { FilterCondition, ColumnDefinition } from './FilterConditionRow';

export interface TableSchema {
  available_filters?: string[];
  fields: ColumnDefinition[];
}

interface NodePropertiesPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, any>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
  tables: string[];
  pdfFields: string[];
  tableSchemas: Record<string, TableSchema>;
  availableVariables: string[];
}

const OPERATORS = [
  { value: '==', label: 'Gleich (==)' },
  { value: '!=', label: 'Ungleich (!=)' },
  { value: '>', label: 'Größer als (>)' },
  { value: '<', label: 'Kleiner als (<)' },
  { value: '>=', label: 'Größer oder gleich (>=)' },
  { value: '<=', label: 'Kleiner oder gleich (<=)' },
  { value: 'contains', label: 'Enthält' },
  { value: 'isEmpty', label: 'Ist leer' },
  { value: 'isNotEmpty', label: 'Ist nicht leer' },
];

const TRANSFORM_OPERATIONS = [
  { value: 'add', label: 'Addition (+)' },
  { value: 'subtract', label: 'Subtraktion (-)' },
  { value: 'multiply', label: 'Multiplikation (×)' },
  { value: 'divide', label: 'Division (÷)' },
  { value: 'concat', label: 'Text verketten' },
  { value: 'formatDate', label: 'Datum formatieren' },
  { value: 'toUpperCase', label: 'Großbuchstaben' },
  { value: 'toLowerCase', label: 'Kleinbuchstaben' },
];

export function NodePropertiesPanel({ 
  node, 
  onUpdate, 
  onDelete, 
  onClose,
  tables,
  pdfFields,
  tableSchemas,
  availableVariables,
}: NodePropertiesPanelProps) {
  if (!node) {
    return (
      <div className="w-72 bg-muted/30 border-l p-4">
        <p className="text-sm text-muted-foreground text-center mt-8">
          Wähle einen Node aus, um seine Eigenschaften zu bearbeiten
        </p>
      </div>
    );
  }

  const updateData = (key: string, value: any) => {
    onUpdate(node.id, { ...node.data, [key]: value });
  };

  // Batch-Update: mehrere Felder in einem Call setzen (vermeidet stale state)
  const updatePatch = (patch: Record<string, any>) => {
    onUpdate(node.id, { ...node.data, ...patch });
  };

  const renderDataSourceFields = () => {
    const table = (node.data as any).table || '';
    const columns = tableSchemas[table]?.fields || [];
    const filterConditions: FilterCondition[] = (node.data as any).filterConditions || [];
    const filterLogic: 'AND' | 'OR' = (node.data as any).filterLogic || 'AND';

    return (
      <>
        <div className="space-y-2">
          <Label>Tabelle</Label>
          {tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">Lade Tabellen...</p>
          ) : (
            <Select 
              value={table} 
              onValueChange={(v) => {
                updatePatch({ table: v, filterConditions: [], filterLogic: 'AND' });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tabelle wählen" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Filter-Bedingungen</Label>
          <FilterBuilder
            conditions={filterConditions}
            logic={filterLogic}
            columns={columns}
            availableVariables={availableVariables}
            onChange={(conditions, logic) => {
              updatePatch({ filterConditions: conditions, filterLogic: logic });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Output Variable</Label>
          <Input
            value={(node.data as any).output || ''}
            onChange={(e) => updateData('output', e.target.value)}
            placeholder="variableName"
          />
        </div>
      </>
    );
  };

  const renderCountFields = () => {
    const table = (node.data as any).table || '';
    const columns = tableSchemas[table]?.fields || [];
    const filterConditions: FilterCondition[] = (node.data as any).filterConditions || [];
    const filterLogic: 'AND' | 'OR' = (node.data as any).filterLogic || 'AND';

    return (
      <>
        <div className="space-y-2">
          <Label>Tabelle</Label>
          {tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">Lade Tabellen...</p>
          ) : (
            <Select 
              value={table} 
              onValueChange={(v) => {
                updatePatch({ table: v, filterConditions: [], filterLogic: 'AND' });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tabelle wählen" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Filter-Bedingungen</Label>
          <FilterBuilder
            conditions={filterConditions}
            logic={filterLogic}
            columns={columns}
            availableVariables={availableVariables}
            onChange={(conditions, logic) => {
              updatePatch({ filterConditions: conditions, filterLogic: logic });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Output Variable</Label>
          <Input
            value={(node.data as any).output || ''}
            onChange={(e) => updateData('output', e.target.value)}
            placeholder="count"
          />
        </div>
      </>
    );
  };

  const renderFields = () => {
    switch (node.type) {
      case 'dataSource':
        return renderDataSourceFields();

      case 'count':
        return renderCountFields();

      case 'condition':
        return (
          <>
            <div className="space-y-2">
              <Label>Linker Wert</Label>
              <Input
                value={(node.data as any).left || ''}
                onChange={(e) => updateData('left', e.target.value)}
                placeholder="{{variable}} oder Wert"
              />
            </div>
            <div className="space-y-2">
              <Label>Operator</Label>
              <Select 
                value={(node.data as any).operator || '=='} 
                onValueChange={(v) => updateData('operator', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rechter Wert</Label>
              <Input
                value={(node.data as any).right || ''}
                onChange={(e) => updateData('right', e.target.value)}
                placeholder="0"
              />
            </div>
          </>
        );

      case 'setField':
        return (
          <>
            <div className="space-y-2">
              <Label>PDF Feld</Label>
              <Select 
                value={(node.data as any).pdfField || ''} 
                onValueChange={(v) => updateData('pdfField', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Feld wählen" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {pdfFields.map((f) => (
                    <SelectItem key={f} value={f} className="font-mono text-xs">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Wert</Label>
              <Input
                value={String((node.data as any).value || '')}
                onChange={(e) => updateData('value', e.target.value)}
                placeholder="{{variable}} oder Text"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={(node.data as any).value === true}
                onCheckedChange={(checked) => updateData('value', checked)}
              />
              <Label className="text-sm">Boolean TRUE (Checkbox ankreuzen)</Label>
            </div>
          </>
        );

      case 'variable':
        return (
          <>
            <div className="space-y-2">
              <Label>Variablenname</Label>
              <Input
                value={(node.data as any).name || ''}
                onChange={(e) => updateData('name', e.target.value)}
                placeholder="myVariable"
              />
            </div>
            <div className="space-y-2">
              <Label>Initialwert</Label>
              <Input
                value={(node.data as any).value || ''}
                onChange={(e) => updateData('value', e.target.value)}
                placeholder="{{otherVar}} oder Wert"
              />
            </div>
          </>
        );

      case 'transform':
        return (
          <>
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select 
                value={(node.data as any).operation || ''} 
                onValueChange={(v) => updateData('operation', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Operation wählen" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFORM_OPERATIONS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Inputs (komma-getrennt)</Label>
              <Input
                value={((node.data as any).inputs || []).join(', ')}
                onChange={(e) => updateData('inputs', e.target.value.split(',').map(s => s.trim()))}
                placeholder="{{a}}, {{b}}"
              />
            </div>
            <div className="space-y-2">
              <Label>Output Variable</Label>
              <Input
                value={(node.data as any).output || ''}
                onChange={(e) => updateData('output', e.target.value)}
                placeholder="result"
              />
            </div>
          </>
        );

      case 'loop':
        return (
          <>
            <div className="space-y-2">
              <Label>Array Variable</Label>
              <Input
                value={(node.data as any).arrayVariable || ''}
                onChange={(e) => updateData('arrayVariable', e.target.value)}
                placeholder="items"
              />
            </div>
            <div className="space-y-2">
              <Label>Element Variable</Label>
              <Input
                value={(node.data as any).itemVariable || 'item'}
                onChange={(e) => updateData('itemVariable', e.target.value)}
                placeholder="item"
              />
            </div>
            <div className="space-y-2">
              <Label>Index Variable (optional)</Label>
              <Input
                value={(node.data as any).indexVariable || ''}
                onChange={(e) => updateData('indexVariable', e.target.value)}
                placeholder="index"
              />
            </div>
          </>
        );

      default:
        return <p className="text-sm text-muted-foreground">Keine Eigenschaften für diesen Node-Typ</p>;
    }
  };

  const nodeTypeLabels: Record<string, string> = {
    dataSource: 'Datenquelle',
    count: 'Zählen',
    condition: 'IF/ELSE Bedingung',
    setField: 'PDF Feld setzen',
    variable: 'Variable',
    transform: 'Berechnung',
    loop: 'Schleife',
  };

  return (
    <div className="w-72 bg-muted/30 border-l p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">
          {nodeTypeLabels[node.type || ''] || node.type}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-4">
        {renderFields()}
      </div>
      
      <div className="mt-6 pt-4 border-t">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Node löschen
        </Button>
      </div>
    </div>
  );
}
