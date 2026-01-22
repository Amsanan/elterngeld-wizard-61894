import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Database, Search } from "lucide-react";

interface DatabaseFieldsListProps {
  schema: any[];
  mappings: any[];
  selectedDocumentType?: string;
}

export function DatabaseFieldsList({ schema, mappings, selectedDocumentType }: DatabaseFieldsListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const getMappedCount = (tableName: string) => {
    return mappings.filter(m => m.source_table === tableName).length;
  };

  // Sort schema so selected document type appears first
  const sortedSchema = [...schema].sort((a, b) => {
    if (selectedDocumentType) {
      if (a.table_name === selectedDocumentType) return -1;
      if (b.table_name === selectedDocumentType) return 1;
    }
    return 0;
  });

  // Filter schema based on search term
  const filteredSchema = sortedSchema.map(table => {
    if (!searchTerm) return table;
    
    const lowerSearch = searchTerm.toLowerCase();
    const tableMatches = table.table_name.toLowerCase().includes(lowerSearch);
    const filteredColumns = table.columns.filter((col: any) => 
      col.name.toLowerCase().includes(lowerSearch) || 
      col.type.toLowerCase().includes(lowerSearch)
    );

    // If table name matches, show all columns; otherwise show only matching columns
    if (tableMatches) return table;
    if (filteredColumns.length > 0) {
      return { ...table, columns: filteredColumns };
    }
    return null;
  }).filter(Boolean);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Database Fields (Source)</h2>
      </div>
      
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tabelle oder Feld suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[550px]">
        <div className="space-y-4">
          {filteredSchema.map((table: any) => {
            const isSelected = selectedDocumentType === table.table_name;
            return (
              <div 
                key={table.table_name} 
                className={`border rounded-lg p-3 transition-all ${
                  isSelected 
                    ? 'border-primary border-2 bg-primary/5 shadow-md' 
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{table.table_name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {getMappedCount(table.table_name)}/{table.columns.length}
                </Badge>
              </div>
              <div className="space-y-1">
                {table.columns.map((col: any) => {
                  const isMapped = mappings.some(
                    m => m.source_table === table.table_name && m.source_field === col.name
                  );
                  return (
                    <div
                      key={col.name}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('source_field', JSON.stringify({
                          table: table.table_name,
                          field: col.name
                        }));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className={`text-xs py-1 px-2 rounded cursor-move transition-colors ${
                        isMapped 
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                          : 'text-muted-foreground hover:bg-accent'
                      }`}
                      title="Drag to PDF field to create mapping"
                    >
                      {col.name}
                      <span className="text-muted-foreground ml-2">({col.type})</span>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}