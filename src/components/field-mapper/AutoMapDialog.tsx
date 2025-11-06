import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface AutoMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: string;
  databaseSchema: any[];
  onMappingsGenerated: (mappings: any[]) => void;
}

export function AutoMapDialog({ 
  open, 
  onOpenChange, 
  documentType, 
  databaseSchema,
  onMappingsGenerated 
}: AutoMapDialogProps) {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");

  const handleAutoMap = async () => {
    setIsProcessing(true);
    setProgress(10);
    setStatus("Analyzing database schema...");

    try {
      // Get relevant source fields based on document type
      const relevantTables = getRelevantTables(documentType);
      const sourceFields: any[] = [];

      databaseSchema.forEach(table => {
        if (relevantTables.includes(table.table_name)) {
          table.columns.forEach((col: any) => {
            // Skip system fields
            if (!['id', 'user_id', 'created_at', 'updated_at', 'file_path', 'confidence_scores', 'antrag_id'].includes(col.name)) {
              sourceFields.push({
                table: table.table_name,
                name: col.name
              });
            }
          });
        }
      });

      setProgress(30);
      setStatus(`Found ${sourceFields.length} fields to map...`);

      // Call auto-map function
      const { data, error } = await supabase.functions.invoke('auto-map-fields', {
        body: {
          document_type: documentType,
          source_fields: sourceFields,
          pdf_template_path: 'elterngeldantrag_bis_Maerz25.pdf'
        }
      });

      if (error) throw error;

      setProgress(70);
      setStatus("Generating mappings...");

      // Convert suggestions to mappings
      const newMappings = data.mappings
        .filter((m: any) => m.best_match && m.best_match.confidence_score > 50)
        .map((m: any) => ({
          document_type: documentType,
          source_table: m.source_table,
          source_field: m.source_field,
          pdf_field_name: m.best_match.pdf_field_name,
          confidence_score: m.best_match.confidence_score,
          mapping_status: 'auto',
          is_active: true,
          notes: null
        }));

      setProgress(100);
      setStatus(`Successfully mapped ${newMappings.length} fields!`);

      onMappingsGenerated(newMappings);
      toast.success(`Auto-mapped ${newMappings.length} fields`);

      setTimeout(() => {
        onOpenChange(false);
        setProgress(0);
        setIsProcessing(false);
        setStatus("");
      }, 1000);

    } catch (error: any) {
      console.error('Auto-map error:', error);
      toast.error('Failed to auto-map fields');
      setIsProcessing(false);
    }
  };

  const getRelevantTables = (docType: string): string[] => {
    const tableMap: Record<string, string[]> = {
      'geburtsurkunde': ['geburtsurkunden'],
      'eltern_dokument_vater': ['eltern_dokumente'],
      'eltern_dokument_mutter': ['eltern_dokumente'],
      'meldebescheinigung_mutter': ['meldebescheinigungen'],
      'meldebescheinigung_vater': ['meldebescheinigungen'],
      'bankverbindung': ['bankverbindungen'],
    };
    return tableMap[docType] || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Auto-Map Fields
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!isProcessing ? (
            <p className="text-sm text-muted-foreground">
              This will automatically analyze the PDF form and suggest mappings based on field name similarity.
              You can review and edit the suggestions afterwards.
            </p>
          ) : (
            <>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">{status}</p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleAutoMap} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Start Auto-Mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}