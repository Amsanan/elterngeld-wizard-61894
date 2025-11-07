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
  
  // Parse filter_condition which is stored as {"field_name": "value"}
  const existingFilter = mapping.filter_condition && typeof mapping.filter_condition === 'object' 
    ? Object.entries(mapping.filter_condition)[0] || ['', '']
    : ['', ''];
  
  const [filterField, setFilterField] = useState(String(existingFilter[0] || ''));
  const [filterValue, setFilterValue] = useState(String(existingFilter[1] || ''));

  const filteredFields = pdfFields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    const filterCondition = filterField && filterValue 
      ? { [filterField]: filterValue }
      : null;
    
    onSave({
      pdf_field_name: pdfFieldName,
      notes,
      filter_condition: filterCondition,
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
          <div className="border-t pt-4">
            <Label className="text-sm font-semibold">Filter Condition (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              For tables with person_type (mutter/vater), specify filter to fetch correct record
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Field Name</Label>
                <Input
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  placeholder="e.g., person_type"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Field Value</Label>
                <Input
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="e.g., mutter"
                  className="text-sm"
                />
              </div>
            </div>
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