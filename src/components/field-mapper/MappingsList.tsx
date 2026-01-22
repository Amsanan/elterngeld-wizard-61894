import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MappingRow } from "./MappingRow";
import { Link2, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface MappingsListProps {
  mappings: any[];
  onUpdate: (mappings: any[]) => void;
  onDelete?: (mapping: any) => void;
  pdfFields: Array<{ name: string; page: number; x: number; y: number; type: string }>;
}

export function MappingsList({ mappings, onUpdate, onDelete, pdfFields }: MappingsListProps) {
  const [personTypeFilter, setPersonTypeFilter] = useState<string>("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");

  const handleUpdateMapping = (index: number, updates: any) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    onUpdate(newMappings);
  };

  const handleDeleteMapping = (index: number) => {
    const mappingToDelete = mappings[index];
    // Track deletion if mapping has an ID (exists in database)
    if (mappingToDelete?.id && onDelete) {
      onDelete(mappingToDelete);
    }
    const newMappings = mappings.filter((_, i) => i !== index);
    onUpdate(newMappings);
  };

  const filteredMappings = mappings.filter(mapping => {
    // Filter by person type
    if (personTypeFilter !== "all") {
      if (!mapping.filter_condition) return false;
      
      const filterCondition = mapping.filter_condition;
      if (typeof filterCondition === 'object' && filterCondition !== null) {
        const personType = filterCondition['person_type'];
        if (personType !== personTypeFilter) return false;
      } else {
        return false;
      }
    }
    
    // Filter by document type
    if (documentTypeFilter !== "all") {
      if (!mapping.filter_condition) return false;
      
      const filterCondition = mapping.filter_condition;
      if (typeof filterCondition === 'object' && filterCondition !== null) {
        const documentType = filterCondition['document_type'];
        if (documentType !== documentTypeFilter) return false;
      } else {
        return false;
      }
    }
    
    // Filter by kind (child) filters
    if (kindFilter !== "all") {
      if (!mapping.filter_condition) return false;
      
      const filterCondition = mapping.filter_condition;
      if (typeof filterCondition === 'object' && filterCondition !== null) {
        if (kindFilter === "has_kind") {
          // Show only mappings that have any kind filter
          const hasKind = 'kind_ordnungszahl' in filterCondition || 
                          'kind_typ' in filterCondition || 
                          'mehrling_nummer' in filterCondition;
          if (!hasKind) return false;
        } else if (kindFilter.startsWith('ord_')) {
          // Filter by specific kind_ordnungszahl
          const ordValue = parseInt(kindFilter.replace('ord_', ''), 10);
          if (filterCondition['kind_ordnungszahl'] !== ordValue) return false;
        } else if (kindFilter.startsWith('typ_')) {
          // Filter by kind_typ
          const typValue = kindFilter.replace('typ_', '');
          if (filterCondition['kind_typ'] !== typValue) return false;
        }
      } else {
        return false;
      }
    }
    
    return true;
  });

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Link2 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Current Mappings</h2>
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={personTypeFilter} onValueChange={setPersonTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Person Types</SelectItem>
              <SelectItem value="mutter">👩 Mother Only</SelectItem>
              <SelectItem value="vater">👨 Father Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doc Types</SelectItem>
              <SelectItem value="personalausweis">🪪 Personalausweis</SelectItem>
              <SelectItem value="reisepass">📘 Reisepass</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Kind Filters</SelectItem>
              <SelectItem value="has_kind">🔍 Has Kind Filter</SelectItem>
              <SelectItem value="ord_0">👶 Antragskind (0)</SelectItem>
              <SelectItem value="ord_1">👧 1. Geschwister</SelectItem>
              <SelectItem value="ord_2">👦 2. Geschwister</SelectItem>
              <SelectItem value="ord_3">🧒 3. Geschwister</SelectItem>
              <SelectItem value="typ_primaer">🎯 Typ: Primär</SelectItem>
              <SelectItem value="typ_mehrling">👯 Typ: Mehrling</SelectItem>
              <SelectItem value="typ_geschwister">👨‍👩‍👧 Typ: Geschwister</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filteredMappings.length} / {mappings.length}
          </span>
        </div>
      </div>
      <ScrollArea className="h-[400px]">
        {filteredMappings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {mappings.length === 0 
              ? "No mappings yet. Click \"Auto-Map\" to generate suggestions."
              : "No mappings found with current filters"
            }
          </p>
        ) : (
          <div className="space-y-2">
            {filteredMappings.map((mapping, index) => {
              const originalIndex = mappings.indexOf(mapping);
              return (
                <MappingRow
                  key={`${mapping.source_table}-${mapping.source_field}-${originalIndex}`}
                  mapping={mapping}
                  onUpdate={(updates) => handleUpdateMapping(originalIndex, updates)}
                  onDelete={() => handleDeleteMapping(originalIndex)}
                  pdfFields={pdfFields}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}