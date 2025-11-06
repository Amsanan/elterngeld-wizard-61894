import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";
import { useState } from "react";

interface PdfFieldsListProps {
  fields: string[];
  mappings: any[];
}

export function PdfFieldsList({ fields, mappings }: PdfFieldsListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFields = fields.filter(field =>
    field.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isMapped = (fieldName: string) => {
    return mappings.some(m => m.pdf_field_name === fieldName);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">PDF AcroForm Fields (Endpoint)</h2>
      </div>
      <Input
        placeholder="Search PDF fields..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      <ScrollArea className="h-[600px]">
        <div className="space-y-1">
          {filteredFields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Run Auto-Map to load PDF fields
            </p>
          )}
          {filteredFields.map(field => (
            <div
              key={field}
              className={`text-xs py-2 px-3 rounded ${
                isMapped(field)
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {field}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}