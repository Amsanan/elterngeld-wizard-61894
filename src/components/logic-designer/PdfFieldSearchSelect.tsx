import { useState } from 'react';
import { Check, ChevronsUpDown, FileText, CheckSquare, List, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface PdfFieldSearchSelectProps {
  value: string;
  onValueChange: (field: string) => void;
  pdfFields: string[];
  placeholder?: string;
}

type FieldType = 'text' | 'checkbox' | 'dropdown' | 'unknown';

function getFieldType(fieldName: string): FieldType {
  if (fieldName.startsWith('txt.')) return 'text';
  if (fieldName.startsWith('chk.')) return 'checkbox';
  if (fieldName.startsWith('cbo.')) return 'dropdown';
  return 'unknown';
}

function getFieldTypeIcon(type: FieldType) {
  switch (type) {
    case 'text': return <FileText className="w-3 h-3" />;
    case 'checkbox': return <CheckSquare className="w-3 h-3" />;
    case 'dropdown': return <List className="w-3 h-3" />;
    default: return <FileText className="w-3 h-3" />;
  }
}

function getFieldTypeBadge(type: FieldType) {
  const config = {
    text: { label: 'Text', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    checkbox: { label: 'Check', className: 'bg-green-100 text-green-700 border-green-200' },
    dropdown: { label: 'Dropdown', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    unknown: { label: '?', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  };
  return config[type];
}

function groupFieldsByType(fields: string[]): Record<FieldType, string[]> {
  const groups: Record<FieldType, string[]> = {
    text: [],
    checkbox: [],
    dropdown: [],
    unknown: [],
  };
  
  fields.forEach(field => {
    const type = getFieldType(field);
    groups[type].push(field);
  });
  
  return groups;
}

export function PdfFieldSearchSelect({ 
  value, 
  onValueChange, 
  pdfFields,
  placeholder = "PDF-Feld suchen..." 
}: PdfFieldSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredFields = pdfFields.filter(field => 
    field.toLowerCase().includes(search.toLowerCase())
  );

  const groupedFields = groupFieldsByType(filteredFields);
  const selectedType = value ? getFieldType(value) : null;
  const selectedBadge = selectedType ? getFieldTypeBadge(selectedType) : null;

  const groupLabels: Record<FieldType, string> = {
    text: 'Textfelder',
    checkbox: 'Checkboxen',
    dropdown: 'Dropdowns',
    unknown: 'Sonstige',
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-mono text-xs h-auto min-h-[36px] py-2"
        >
          <div className="flex items-center gap-2 truncate flex-1 text-left">
            {value ? (
              <>
                {selectedBadge && (
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", selectedBadge.className)}>
                    {selectedBadge.label}
                  </Badge>
                )}
                <span className="truncate">{value}</span>
              </>
            ) : (
              <span className="text-muted-foreground flex items-center gap-2">
                <Search className="w-3 h-3" />
                {placeholder}
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Feldname eingeben..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Kein Feld gefunden.</CommandEmpty>
            
            {(['text', 'checkbox', 'dropdown', 'unknown'] as FieldType[]).map(type => {
              const fields = groupedFields[type];
              if (fields.length === 0) return null;
              
              const badge = getFieldTypeBadge(type);
              
              return (
                <CommandGroup key={type} heading={groupLabels[type]}>
                  {fields.slice(0, 50).map((field) => (
                    <CommandItem
                      key={field}
                      value={field}
                      onSelect={() => {
                        onValueChange(field);
                        setOpen(false);
                        setSearch('');
                      }}
                      className="font-mono text-xs"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === field ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFieldTypeIcon(type)}
                        <span className="truncate">{field}</span>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] px-1 py-0 ml-2 shrink-0", badge.className)}>
                        {badge.label}
                      </Badge>
                    </CommandItem>
                  ))}
                  {fields.length > 50 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      ... und {fields.length - 50} weitere (Suche eingrenzen)
                    </div>
                  )}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { getFieldType, getFieldTypeBadge };
