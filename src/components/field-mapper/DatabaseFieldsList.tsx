import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";

interface DatabaseFieldsListProps {
  schema: any[];
  mappings: any[];
}

export function DatabaseFieldsList({ schema, mappings }: DatabaseFieldsListProps) {
  const getMappedCount = (tableName: string) => {
    return mappings.filter(m => m.source_table === tableName).length;
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Database Fields (Source)</h2>
      </div>
      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {schema.map(table => (
            <div key={table.table_name} className="border rounded-lg p-3">
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
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}