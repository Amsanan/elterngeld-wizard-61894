import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Filter } from "lucide-react";
import { useState } from "react";
import { MappingEditor } from "./MappingEditor";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MappingRowProps {
  mapping: any;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  pdfFields: Array<{ name: string; page: number; x: number; y: number; type: string }>;
}

export function MappingRow({ mapping, onUpdate, onDelete, pdfFields }: MappingRowProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return "bg-green-500/10 text-green-700 dark:text-green-400";
    if (score >= 70) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    return "bg-red-500/10 text-red-700 dark:text-red-400";
  };

  const getStatusBadge = () => {
    if (mapping.mapping_status === 'manual') {
      return <Badge variant="outline">Manual</Badge>;
    }
    if (mapping.mapping_status === 'verified') {
      return <Badge variant="default">Verified</Badge>;
    }
    return <Badge variant="secondary">Auto</Badge>;
  };

  const getFilterBadges = () => {
    if (!mapping.filter_condition) return null;
    
    const entries = Object.entries(mapping.filter_condition);
    if (entries.length === 0) return null;
    
    const badges: JSX.Element[] = [];
    
    entries.forEach(([filterField, filterValue], idx) => {
      const filterFieldStr = String(filterField);
      const filterValueStr = String(filterValue);
      
      if (filterFieldStr === 'person_type') {
        const icon = filterValueStr === 'mutter' ? '👩' : '👨';
        const label = filterValueStr === 'mutter' ? 'Mother' : 'Father';
        badges.push(
          <TooltipProvider key={`person-${idx}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 cursor-help">
                  <Filter className="h-3 w-3" />
                  {icon} {label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Filter: person_type='{filterValueStr}'</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fetches data from row where person_type='{filterValueStr}'
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      } else if (filterFieldStr === 'kind_ordnungszahl') {
        const labels: Record<string, string> = {
          '0': '👶 Antragskind',
          '1': '👧 1. Geschwister',
          '2': '👦 2. Geschwister',
          '3': '🧒 3. Geschwister'
        };
        badges.push(
          <TooltipProvider key={`kind-ord-${idx}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 cursor-help bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  {labels[filterValueStr] || `Kind #${filterValueStr}`}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Kind-Ordnungszahl: {filterValueStr}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  0 = Antragskind, 1+ = Geschwister nach Alter
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      } else if (filterFieldStr === 'kind_typ') {
        const labels: Record<string, string> = {
          'primaer': '👶 Primär',
          'mehrling': '👯 Mehrling',
          'geschwister': '👨‍👩‍👧 Geschwister'
        };
        badges.push(
          <Badge key={`kind-typ-${idx}`} variant="outline" className="gap-1 bg-purple-500/10 text-purple-700 dark:text-purple-400">
            {labels[filterValueStr] || filterValueStr}
          </Badge>
        );
      } else if (filterFieldStr === 'mehrling_nummer') {
        badges.push(
          <Badge key={`mehrling-${idx}`} variant="outline" className="gap-1 bg-pink-500/10 text-pink-700 dark:text-pink-400">
            👯 Mehrling #{filterValueStr}
          </Badge>
        );
      } else if (filterFieldStr === 'document_type') {
        const icons: Record<string, string> = {
          'personalausweis': '🪪',
          'reisepass': '📘'
        };
        badges.push(
          <Badge key={`doc-${idx}`} variant="outline" className="gap-1">
            {icons[filterValueStr.toLowerCase()] || '📄'} {filterValueStr}
          </Badge>
        );
      } else {
        badges.push(
          <Badge key={`other-${idx}`} variant="outline" className="gap-1">
            <Filter className="h-3 w-3" />
            {filterFieldStr}={filterValueStr}
          </Badge>
        );
      }
    });
    
    return badges.length > 0 ? <>{badges}</> : null;
  };

  return (
    <>
      <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex-1 grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_auto] gap-4">
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-muted-foreground">Source</span>
            <span className="text-sm font-medium truncate" title={`${mapping.source_table}.${mapping.source_field}`}>
              {mapping.source_table}.{mapping.source_field}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-muted-foreground">PDF Field</span>
            <span className="text-sm font-mono truncate" title={mapping.pdf_field_name}>{mapping.pdf_field_name}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {getFilterBadges()}
            {getStatusBadge()}
            {mapping.confidence_score !== undefined && (
              <Badge className={getConfidenceColor(mapping.confidence_score)}>
                {Math.round(mapping.confidence_score)}%
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <MappingEditor
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mapping={mapping}
        onSave={onUpdate}
        pdfFields={pdfFields}
      />
    </>
  );
}