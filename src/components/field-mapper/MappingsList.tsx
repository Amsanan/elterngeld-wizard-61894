import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MappingRow } from "./MappingRow";
import { Link2 } from "lucide-react";

interface MappingsListProps {
  mappings: any[];
  onUpdate: (mappings: any[]) => void;
  pdfFields: string[];
}

export function MappingsList({ mappings, onUpdate, pdfFields }: MappingsListProps) {
  const handleUpdateMapping = (index: number, updates: any) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    onUpdate(newMappings);
  };

  const handleDeleteMapping = (index: number) => {
    const newMappings = mappings.filter((_, i) => i !== index);
    onUpdate(newMappings);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Current Mappings</h2>
        <span className="text-sm text-muted-foreground ml-auto">
          {mappings.length} mappings
        </span>
      </div>
      <ScrollArea className="h-[400px]">
        {mappings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No mappings yet. Click "Auto-Map" to generate suggestions.
          </p>
        ) : (
          <div className="space-y-2">
            {mappings.map((mapping, index) => (
              <MappingRow
                key={`${mapping.source_table}-${mapping.source_field}-${index}`}
                mapping={mapping}
                onUpdate={(updates) => handleUpdateMapping(index, updates)}
                onDelete={() => handleDeleteMapping(index)}
                pdfFields={pdfFields}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}