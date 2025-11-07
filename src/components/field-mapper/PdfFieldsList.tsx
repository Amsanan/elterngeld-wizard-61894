import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";
import { useState } from "react";

interface PdfField {
  name: string;
  page: number;
  x: number;
  y: number;
  type: string;
}

interface PdfFieldsListProps {
  fields: PdfField[];
  mappings: any[];
  onCreateMapping: (source: { table: string; field: string }, pdfField: string) => void;
}

export function PdfFieldsList({ fields, mappings, onCreateMapping }: PdfFieldsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Detect page filter queries (P1, Page 2, p2, etc.)
  const pageMatch = searchTerm.match(/^(?:p(?:age)?\s*)?(\d+)$/i);
  
  const filteredFields = fields.filter(field => {
    if (pageMatch) {
      // Filter by page number (pages are 0-indexed, but users think 1-indexed)
      const pageNumber = parseInt(pageMatch[1]) - 1;
      return field.page === pageNumber;
    }
    // Default: filter by field name
    return field.name.toLowerCase().includes(searchTerm.toLowerCase());
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
        <h2 className="text-xl font-semibold">PDF Fields (Sorted by Position)</h2>
        {fields.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {fields.length} fields
          </span>
        )}
      </div>
      <Input
        placeholder="Search fields or filter by page (e.g., P2 or Page 2)..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      <ScrollArea className="h-[600px]">
        <div className="space-y-1">
          {filteredFields.length === 0 && fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Click "Load PDF Fields" to load fields sorted by position
            </p>
          )}
          {filteredFields.length === 0 && fields.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No fields match your search
            </p>
          )}
          {filteredFields.map((field, index) => (
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
              title={`Page ${field.page + 1} | Position: (${field.x}, ${field.y}) | Type: ${field.type}\nDrop database field here to create mapping`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex-1 truncate">{field.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] opacity-60">{getFieldTypeIcon(field.type)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 rounded">
                    P{field.page + 1}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}