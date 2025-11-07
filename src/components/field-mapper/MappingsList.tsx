import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MappingRow } from "./MappingRow";
import { Link2, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface MappingsListProps {
  mappings: any[];
  onUpdate: (mappings: any[]) => void;
  pdfFields: Array<{ name: string; page: number; x: number; y: number; type: string }>;
}

export function MappingsList({ mappings, onUpdate, pdfFields }: MappingsListProps) {
  const [personTypeFilter, setPersonTypeFilter] = useState<string>("all");

  const handleUpdateMapping = (index: number, updates: any) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    onUpdate(newMappings);
  };

  const handleDeleteMapping = (index: number) => {
    const newMappings = mappings.filter((_, i) => i !== index);
    onUpdate(newMappings);
  };

  const filteredMappings = mappings.filter(mapping => {
    if (personTypeFilter === "all") return true;
    
    if (!mapping.filter_condition) return false;
    
    const filterCondition = mapping.filter_condition;
    if (typeof filterCondition === 'object' && filterCondition !== null) {
      const personType = filterCondition['person_type'];
      return personType === personTypeFilter;
    }
    
    return false;
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
              <SelectItem value="all">All Mappings</SelectItem>
              <SelectItem value="mutter">👩 Mother Only</SelectItem>
              <SelectItem value="vater">👨 Father Only</SelectItem>
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
              : `No mappings found with filter: ${personTypeFilter === 'mutter' ? '👩 Mother' : '👨 Father'}`
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