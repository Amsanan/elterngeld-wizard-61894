import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { FileText, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TargetPersonBadge, getTargetPersonLabel, type TargetPerson } from "./TargetPersonBadge";
import { Button } from "@/components/ui/button";

interface PdfField {
  name: string;
  page: number;
  x: number;
  y: number;
  type: string;
}

interface RegistryField {
  pdf_field_name: string;
  target_person: TargetPerson;
  semantic_meaning?: string;
  label_de?: string;
}

interface PdfFieldsListProps {
  fields: PdfField[];
  mappings: any[];
  registry?: RegistryField[];
  onCreateMapping: (source: { table: string; field: string }, pdfField: string) => void;
  onLoadRegistry?: () => void;
  loadingRegistry?: boolean;
}

const targetPersonOptions = [
  { value: 'all', label: 'Alle Felder' },
  { value: 'elternteil_1', label: 'Elternteil 1' },
  { value: 'elternteil_2', label: 'Elternteil 2' },
  { value: 'antragskind', label: 'Antragskind' },
  { value: 'geschwister', label: 'Geschwister (alle)' },
  { value: 'mehrling', label: 'Mehrlinge (alle)' },
  { value: 'universal', label: 'Universal' },
];

export function PdfFieldsList({ 
  fields, 
  mappings, 
  registry = [],
  onCreateMapping,
  onLoadRegistry,
  loadingRegistry = false
}: PdfFieldsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [targetPersonFilter, setTargetPersonFilter] = useState("all");
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Create a lookup map for registry data
  const registryMap = new Map<string, RegistryField>();
  registry.forEach(r => registryMap.set(r.pdf_field_name, r));

  // Detect page filter queries (P1, Page 2, p2, etc.)
  const pageMatch = searchTerm.match(/^(?:p(?:age)?\s*)?(\d+)$/i);
  
  const filteredFields = fields.filter(field => {
    // Page filter
    if (pageMatch) {
      const pageNumber = parseInt(pageMatch[1]) - 1;
      if (field.page !== pageNumber) return false;
    } else if (searchTerm) {
      // Text search filter
      const regEntry = registryMap.get(field.name);
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = field.name.toLowerCase().includes(searchLower);
      const semanticMatch = regEntry?.semantic_meaning?.toLowerCase().includes(searchLower);
      const labelMatch = regEntry?.label_de?.toLowerCase().includes(searchLower);
      
      if (!nameMatch && !semanticMatch && !labelMatch) return false;
    }
    
    // Target person filter
    if (targetPersonFilter !== 'all') {
      const regEntry = registryMap.get(field.name);
      if (!regEntry) return targetPersonFilter === 'universal';
      
      if (targetPersonFilter === 'geschwister') {
        return regEntry.target_person.startsWith('geschwister_');
      }
      if (targetPersonFilter === 'mehrling') {
        return regEntry.target_person.startsWith('mehrling_');
      }
      return regEntry.target_person === targetPersonFilter;
    }
    
    return true;
  });

  const isMapped = (fieldName: string) => {
    return mappings.some(m => m.pdf_field_name === fieldName);
  };

  const getFieldTypeIcon = (type: string) => {
    if (type.includes('Text')) return '📝';
    if (type.includes('Check')) return '☑️';
    if (type.includes('Radio')) return '🔘';
    if (type.includes('Dropdown')) return '📋';
    return '📄';
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">PDF Fields</h2>
        {fields.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {filteredFields.length} / {fields.length} fields
          </span>
        )}
        {onLoadRegistry && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLoadRegistry}
            disabled={loadingRegistry}
            className="ml-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingRegistry ? 'animate-spin' : ''}`} />
            Load Registry
          </Button>
        )}
      </div>
      
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search fields, page (P2), or semantic..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={targetPersonFilter} onValueChange={setTargetPersonFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {targetPersonOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Registry status indicator */}
      {registry.length > 0 && (
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          Registry loaded: {registry.length} fields classified
        </div>
      )}
      
      <ScrollArea className="h-[600px]">
        <div className="space-y-1">
          {filteredFields.length === 0 && fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Click "Load PDF Fields" to load fields sorted by position
            </p>
          )}
          {filteredFields.length === 0 && fields.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No fields match your filters
            </p>
          )}
          {filteredFields.map((field, index) => {
            const regEntry = registryMap.get(field.name);
            
            return (
              <div
                key={`${field.name}-${index}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  setDragOver(field.name);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  try {
                    const sourceData = JSON.parse(e.dataTransfer.getData('source_field'));
                    onCreateMapping(sourceData, field.name);
                  } catch (error) {
                    console.error('Error parsing drag data:', error);
                  }
                }}
                className={`text-xs py-2 px-3 rounded transition-all ${
                  dragOver === field.name
                    ? 'bg-primary/20 border-2 border-primary scale-105'
                    : isMapped(field.name)
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'text-muted-foreground hover:bg-accent'
                } cursor-pointer`}
                title={`Page ${field.page + 1} | Position: (${field.x.toFixed(0)}, ${field.y.toFixed(0)}) | Type: ${field.type}${regEntry ? `\nTarget: ${getTargetPersonLabel(regEntry.target_person)}` : ''}\nDrop database field here to create mapping`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {regEntry && (
                      <TargetPersonBadge targetPerson={regEntry.target_person} />
                    )}
                    <span className="truncate">{field.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {regEntry?.semantic_meaning && regEntry.semantic_meaning !== 'unknown' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-secondary/50 rounded text-secondary-foreground">
                        {regEntry.semantic_meaning}
                      </span>
                    )}
                    <span className="text-[10px] opacity-60">{getFieldTypeIcon(field.type)}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 rounded">
                      P{field.page + 1}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
