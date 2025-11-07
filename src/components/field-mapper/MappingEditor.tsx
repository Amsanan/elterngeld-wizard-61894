import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface MappingEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: any;
  onSave: (updates: any) => void;
  pdfFields: Array<{ name: string; page: number; x: number; y: number; type: string }>;
}

export function MappingEditor({ open, onOpenChange, mapping, onSave, pdfFields }: MappingEditorProps) {
  const [pdfFieldName, setPdfFieldName] = useState(mapping.pdf_field_name);
  const [notes, setNotes] = useState(mapping.notes || "");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFields = pdfFields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    onSave({
      pdf_field_name: pdfFieldName,
      notes,
      mapping_status: 'manual'
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Field Mapping</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Source Field</Label>
            <Input
              value={`${mapping.source_table}.${mapping.source_field}`}
              disabled
              className="bg-muted"
            />
          </div>
          <div>
            <Label>PDF Field</Label>
            <Input
              placeholder="Search PDF fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
            <Select value={pdfFieldName} onValueChange={setPdfFieldName}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredFields.slice(0, 50).map((field, index) => (
                  <SelectItem key={`${field.name}-${index}`} value={field.name} className="font-mono text-xs">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="truncate">{field.name}</span>
                      <span className="text-[10px] px-1 bg-primary/10 rounded shrink-0">
                        P{field.page + 1}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {filteredFields.length > 50 && (
                  <div className="text-xs text-muted-foreground p-2">
                    + {filteredFields.length - 50} more fields...
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this mapping..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}