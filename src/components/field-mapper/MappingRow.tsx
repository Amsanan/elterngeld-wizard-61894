import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { MappingEditor } from "./MappingEditor";

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

  return (
    <>
      <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Source</span>
            <span className="text-sm font-medium">
              {mapping.source_table}.{mapping.source_field}
            </span>
            {mapping.filter_condition && (
              <span className="text-xs text-muted-foreground mt-1">
                Filter: {Object.entries(mapping.filter_condition).map(([k, v]) => `${k}='${v}'`).join(', ')}
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">PDF Field</span>
            <span className="text-sm font-mono">{mapping.pdf_field_name}</span>
          </div>
          <div className="flex items-center gap-2">
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