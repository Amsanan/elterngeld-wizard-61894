import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnDefinition } from './FilterConditionRow';

interface ColumnMultiSelectProps {
  columns: ColumnDefinition[];
  selectedColumns: string[];
  onChange: (columns: string[]) => void;
  placeholder?: string;
}

export function ColumnMultiSelect({
  columns,
  selectedColumns,
  onChange,
  placeholder = 'Spalten wählen...',
}: ColumnMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (columnName: string) => {
    if (selectedColumns.includes(columnName)) {
      onChange(selectedColumns.filter((c) => c !== columnName));
    } else {
      onChange([...selectedColumns, columnName]);
    }
  };

  const removeColumn = (columnName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedColumns.filter((c) => c !== columnName));
  };

  const selectAll = () => {
    onChange(columns.map((c) => c.name));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between h-auto min-h-10 px-3 py-2"
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-wrap gap-1 flex-1 text-left">
          {selectedColumns.length === 0 ? (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          ) : (
            selectedColumns.slice(0, 3).map((col) => (
              <Badge key={col} variant="secondary" className="text-xs">
                {col}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive"
                  onClick={(e) => removeColumn(col, e)}
                />
              </Badge>
            ))
          )}
          {selectedColumns.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{selectedColumns.length - 3}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 ml-2 shrink-0 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="flex gap-1 p-2 border-b">
            <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-xs">
              Alle
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="text-xs">
              Keine
            </Button>
          </div>
          <div className="p-1">
            {columns.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">Keine Spalten verfügbar</p>
            ) : (
              columns.map((col) => {
                const isSelected = selectedColumns.includes(col.name);
                return (
                  <button
                    key={col.name}
                    type="button"
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-1.5 text-left text-sm rounded hover:bg-accent',
                      isSelected && 'bg-accent/50'
                    )}
                    onClick={() => toggleColumn(col.name)}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 border rounded flex items-center justify-center',
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="flex-1 font-mono text-xs">{col.name}</span>
                    <span className="text-xs text-muted-foreground">{col.type}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
