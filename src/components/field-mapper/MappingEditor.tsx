import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Info, Baby } from "lucide-react";

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
  
  // Parse existing filter_condition
  const existingFilter = mapping.filter_condition && typeof mapping.filter_condition === 'object' 
    ? mapping.filter_condition
    : {};
  
  const [filterField, setFilterField] = useState<string>(
    existingFilter.person_type ? 'person_type' : 
    existingFilter.document_type ? 'document_type' : 
    existingFilter.custom ? 'custom' : 'none'
  );
  const [filterValue, setFilterValue] = useState<string>(
    existingFilter.person_type || existingFilter.document_type || ''
  );
  
  // Kind-specific filters
  const [kindOrdnungszahl, setKindOrdnungszahl] = useState<string>(
    existingFilter.kind_ordnungszahl !== undefined ? String(existingFilter.kind_ordnungszahl) : '__none__'
  );
  const [kindTyp, setKindTyp] = useState<string>(existingFilter.kind_typ || '__none__');
  const [mehrlingNummer, setMehrlingNummer] = useState<string>(
    existingFilter.mehrling_nummer !== undefined ? String(existingFilter.mehrling_nummer) : '__none__'
  );

  // Auto-generate notes when filter changes
  useEffect(() => {
    if (filterField && filterValue) {
      const filterNote = generateFilterNote(filterField, filterValue);
      if (!notes.includes(filterNote)) {
        setNotes(prev => prev ? `${prev}\n\n${filterNote}` : filterNote);
      }
    }
  }, [filterField, filterValue]);

  const generateFilterNote = (field: string, value: string) => {
    if (field === 'person_type') {
      const personLabel = value === 'mutter' ? 'Mother' : 'Father';
      return `⚠️ This mapping is for ${personLabel}'s data (person_type='${value}'). PDF field uses technical name, not semantic.`;
    }
    if (field === 'document_type') {
      return `⚠️ This mapping is for ${value} documents. PDF field uses technical name.`;
    }
    return `Filter: ${field}='${value}'`;
  };

  const filteredFields = pdfFields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    // Build filter condition from all filter fields
    const filterCondition: Record<string, any> = {};
    
    // Person/Document type filter
    if (filterField && filterField !== 'none' && filterValue) {
      let normalizedValue = filterValue;
      if (filterField === 'person_type') {
        normalizedValue = filterValue.toLowerCase();
      }
      filterCondition[filterField] = normalizedValue;
    }
    
    // Kind filters
    if (kindOrdnungszahl !== '__none__' && kindOrdnungszahl !== '') {
      filterCondition.kind_ordnungszahl = parseInt(kindOrdnungszahl, 10);
    }
    if (kindTyp && kindTyp !== '__none__') {
      filterCondition.kind_typ = kindTyp;
    }
    if (mehrlingNummer !== '__none__' && mehrlingNummer !== '') {
      filterCondition.mehrling_nummer = parseInt(mehrlingNummer, 10);
    }
    
    onSave({
      pdf_field_name: pdfFieldName,
      notes,
      filter_condition: Object.keys(filterCondition).length > 0 ? filterCondition : null,
      mapping_status: 'manual'
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <SelectContent className="bg-background z-50">
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
          
          {/* Person/Document Filter */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-sm font-semibold">Person/Document Filter (Optional)</Label>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              For tables with person_type (mutter/vater), specify filter to fetch correct record
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Filter Field</Label>
                <Select value={filterField || 'none'} onValueChange={setFilterField}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="person_type">person_type</SelectItem>
                    <SelectItem value="document_type">document_type</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Filter Value</Label>
                {filterField === 'person_type' ? (
                  <Select value={filterValue} onValueChange={setFilterValue}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select value..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="mutter">👩 Mutter</SelectItem>
                      <SelectItem value="vater">👨 Vater</SelectItem>
                    </SelectContent>
                  </Select>
                ) : filterField === 'document_type' ? (
                  <Select value={filterValue} onValueChange={setFilterValue}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select value..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="personalausweis">Personalausweis</SelectItem>
                      <SelectItem value="reisepass">Reisepass</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Enter value..."
                    className="text-sm"
                    disabled={!filterField || filterField === 'none'}
                  />
                )}
              </div>
            </div>
          </div>
          
          {/* Kind Filter Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Baby className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Kind-Filter (Optional)</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Für Tabellen mit Kind-Daten (geburtsurkunden, etc.) - wähle welches Kind gemeint ist
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Kind Ordnungszahl</Label>
                <Select value={kindOrdnungszahl} onValueChange={setKindOrdnungszahl}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Auswählen..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="__none__">Keine Auswahl</SelectItem>
                    <SelectItem value="0">👶 0 - Antragskind</SelectItem>
                    <SelectItem value="1">👧 1 - Jüngstes Geschwister</SelectItem>
                    <SelectItem value="2">👦 2 - Zweitjüngstes</SelectItem>
                    <SelectItem value="3">🧒 3 - Drittjüngstes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Kind Typ</Label>
                <Select value={kindTyp} onValueChange={setKindTyp}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Auswählen..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="__none__">Keine Auswahl</SelectItem>
                    <SelectItem value="primaer">👶 Primär (Antragskind)</SelectItem>
                    <SelectItem value="mehrling">👯 Mehrling (Zwilling etc.)</SelectItem>
                    <SelectItem value="geschwister">👨‍👩‍👧 Geschwister</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Mehrling Nummer</Label>
                <Select value={mehrlingNummer} onValueChange={setMehrlingNummer}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Auswählen..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="__none__">Keine Auswahl</SelectItem>
                    <SelectItem value="1">1 - Erster Mehrling</SelectItem>
                    <SelectItem value="2">2 - Zweiter Mehrling</SelectItem>
                    <SelectItem value="3">3 - Dritter Mehrling</SelectItem>
                  </SelectContent>
                </Select>
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