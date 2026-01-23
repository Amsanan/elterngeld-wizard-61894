import { Node } from '@xyflow/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, X, Info } from 'lucide-react';
import { FilterBuilder } from './FilterBuilder';
import { FilterCondition, ColumnDefinition } from './FilterConditionRow';
import { ColumnMultiSelect } from './ColumnMultiSelect';
import { PdfFieldSearchSelect, getFieldType, getFieldTypeBadge } from './PdfFieldSearchSelect';
import { VariableSelector } from './VariableSelector';
import { cn } from '@/lib/utils';

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
  { value: 'countDistinct', label: 'Eindeutig zählen (COUNT DISTINCT)' },
  { value: 'min', label: 'Minimum (MIN)' },
  { value: 'max', label: 'Maximum (MAX)' },
  { value: 'sum', label: 'Summe (SUM)' },
  { value: 'avg', label: 'Durchschnitt (AVG)' },
  { value: 'coalesce', label: 'Erster Nicht-Null (COALESCE)' },
  { value: 'compareArrayElements', label: 'Array-Elemente vergleichen' },
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
    const selectedColumns: string[] = (node.data as any).selectedColumns || [];

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
          <Label>Output Spalten</Label>
          <ColumnMultiSelect
            columns={columns}
            selectedColumns={selectedColumns}
            onChange={(cols) => updateData('selectedColumns', cols)}
            placeholder="Alle Spalten (Standard)"
          />
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

      case 'setField': {
        const selectedPdfField = (node.data as any).pdfField || '';
        const fieldType = selectedPdfField ? getFieldType(selectedPdfField) : null;
        const fieldBadge = fieldType ? getFieldTypeBadge(fieldType) : null;
        const isCheckbox = fieldType === 'checkbox';
        const isDateField = selectedPdfField && (
          selectedPdfField.includes('datum') || 
          selectedPdfField.includes('date') ||
          selectedPdfField.includes('geburt') ||
          selectedPdfField.includes('termin')
        );
        const currentValue = (node.data as any).value;
        const autoFormat = (node.data as any).autoFormat ?? true;
        
        return (
          <>
            <div className="space-y-2">
              <Label>PDF Feld</Label>
              <PdfFieldSearchSelect
                value={selectedPdfField}
                onValueChange={(v) => updateData('pdfField', v)}
                pdfFields={pdfFields}
                placeholder="PDF-Feld suchen..."
              />
              {selectedPdfField && fieldBadge && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", fieldBadge.className)}>
                    {fieldBadge.label}
                  </Badge>
                  {isDateField && (
                    <span className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Erwartet Datum (DD.MM.YYYY)
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {isCheckbox ? (
              <div className="space-y-2">
                <Label>Checkbox-Wert</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Switch
                    checked={currentValue === true}
                    onCheckedChange={(checked) => updateData('value', checked)}
                  />
                  <Label className="text-sm">
                    {currentValue === true ? 'Angekreuzt (TRUE)' : 'Nicht angekreuzt (FALSE)'}
                  </Label>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Wert</Label>
                  <VariableSelector
                    availableVariables={availableVariables}
                    onSelect={(varRef) => {
                      const current = String(currentValue || '');
                      updateData('value', current + varRef);
                    }}
                  />
                </div>
                <Input
                  value={String(currentValue || '')}
                  onChange={(e) => updateData('value', e.target.value)}
                  placeholder="{{variable}} oder fester Wert"
                  className="font-mono text-sm"
                />
                {typeof currentValue === 'string' && currentValue.includes('{{') && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    Variable erkannt: <code className="text-primary">{currentValue}</code>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={autoFormat}
                onCheckedChange={(checked) => updateData('autoFormat', checked)}
              />
              <Label className="text-sm">Automatische Formatierung</Label>
            </div>
            {autoFormat && (
              <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                {isDateField && 'Datum wird automatisch zu DD.MM.YYYY konvertiert'}
                {isCheckbox && 'Boolean-Wert wird für Checkbox angepasst'}
                {!isDateField && !isCheckbox && 'Wert wird für das Feldformat optimiert'}
              </div>
            )}
          </>
        );
      }

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

      case 'aggregate':
        const aggTable = (node.data as any).table || '';
        const aggColumns = tableSchemas[aggTable]?.fields || [];
        const aggFilterConditions: FilterCondition[] = (node.data as any).filterConditions || [];
        const aggFilterLogic: 'AND' | 'OR' = (node.data as any).filterLogic || 'AND';

        return (
          <>
            <div className="space-y-2">
              <Label>Aggregat-Funktion</Label>
              <Select 
                value={(node.data as any).aggregateFunction || ''} 
                onValueChange={(v) => updateData('aggregateFunction', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Funktion wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">COUNT</SelectItem>
                  <SelectItem value="countDistinct">COUNT DISTINCT</SelectItem>
                  <SelectItem value="sum">SUM</SelectItem>
                  <SelectItem value="avg">AVG (Durchschnitt)</SelectItem>
                  <SelectItem value="min">MIN (Minimum)</SelectItem>
                  <SelectItem value="max">MAX (Maximum)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tabelle</Label>
              {tables.length === 0 ? (
                <p className="text-sm text-muted-foreground">Lade Tabellen...</p>
              ) : (
                <Select 
                  value={aggTable} 
                  onValueChange={(v) => {
                    updatePatch({ table: v, column: '', groupBy: '', filterConditions: [], filterLogic: 'AND' });
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
            {aggTable && (
              <>
                <div className="space-y-2">
                  <Label>Spalte (für SUM/AVG/MIN/MAX/COUNT DISTINCT)</Label>
                  <Select 
                    value={(node.data as any).column || '__none__'} 
                    onValueChange={(v) => updateData('column', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Spalte wählen (optional)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="__none__">Keine (nur für COUNT)</SelectItem>
                      {aggColumns.map((col) => (
                        <SelectItem key={col.name} value={col.name} className="font-mono text-xs">
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>GROUP BY (optional)</Label>
                  <Select 
                    value={(node.data as any).groupBy || '__none__'} 
                    onValueChange={(v) => updateData('groupBy', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Gruppieren nach..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="__none__">Keine Gruppierung</SelectItem>
                      {aggColumns.map((col) => (
                        <SelectItem key={col.name} value={col.name} className="font-mono text-xs">
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>HAVING (optional)</Label>
                  <Input
                    value={(node.data as any).having || ''}
                    onChange={(e) => updateData('having', e.target.value)}
                    placeholder="> 1"
                  />
                  <p className="text-xs text-muted-foreground">Bedingung für gruppierte Ergebnisse</p>
                </div>
                <div className="space-y-2">
                  <Label>Filter-Bedingungen</Label>
                  <FilterBuilder
                    conditions={aggFilterConditions}
                    logic={aggFilterLogic}
                    columns={aggColumns}
                    availableVariables={availableVariables}
                    onChange={(conditions, logic) => {
                      updatePatch({ filterConditions: conditions, filterLogic: logic });
                    }}
                  />
                </div>
              </>
            )}
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
    aggregate: 'Aggregat',
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
