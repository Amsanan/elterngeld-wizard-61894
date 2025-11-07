import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FIELD_MAPPINGS } from "../../supabase/functions/_shared/elterngeld-field-mappings";

interface PdfFieldInfo {
  name: string;
  type: string;
}

interface MappingStatus {
  sourceTable: string;
  sourceField: string;
  pdfFieldName: string;
  exists: boolean;
  actualPdfFields?: string[];
}

export default function FieldDiagnostics() {
  const [pdfFields, setPdfFields] = useState<PdfFieldInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mappingStatuses, setMappingStatuses] = useState<MappingStatus[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPdfFields();
  }, []);

  const loadPdfFields = async () => {
    setIsLoading(true);
    try {
      console.log("Calling analyze-elterngeld-form...");
      
      const { data, error } = await supabase.functions.invoke('analyze-elterngeld-form', {
        body: {}
      });

      if (error) {
        console.error("Error calling edge function:", error);
        throw error;
      }

      console.log("PDF Fields loaded:", data);
      setPdfFields(data.fields || []);
      
      // Analyze mappings
      analyzeMappings(data.fields || []);
      
      toast({
        title: "Analyse abgeschlossen",
        description: `${data.fields?.length || 0} PDF-Felder gefunden`,
      });
    } catch (error) {
      console.error("Error loading PDF fields:", error);
      toast({
        title: "Fehler",
        description: "PDF-Felder konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeMappings = (fields: PdfFieldInfo[]) => {
    const fieldNames = fields.map(f => f.name);
    const statuses: MappingStatus[] = [];

    Object.entries(FIELD_MAPPINGS).forEach(([docType, mappings]) => {
      Object.entries(mappings).forEach(([sourceField, pdfFieldName]) => {
        const exists = fieldNames.includes(pdfFieldName);
        
        // Find similar fields if not exact match
        let similarFields: string[] = [];
        if (!exists) {
          similarFields = fieldNames.filter(fn => 
            fn.toLowerCase().includes(sourceField.toLowerCase()) ||
            sourceField.toLowerCase().includes(fn.toLowerCase().split('.')[1] || '')
          ).slice(0, 3);
        }

        statuses.push({
          sourceTable: docType,
          sourceField,
          pdfFieldName,
          exists,
          actualPdfFields: exists ? undefined : similarFields
        });
      });
    });

    setMappingStatuses(statuses);
  };

  const validMappings = mappingStatuses.filter(m => m.exists);
  const invalidMappings = mappingStatuses.filter(m => !m.exists);
  const successRate = mappingStatuses.length > 0 
    ? Math.round((validMappings.length / mappingStatuses.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/admin/setup')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-3xl font-bold">Feld-Mapping Diagnose</h1>
          <Button onClick={loadPdfFields} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Neu laden"}
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">PDF Felder</div>
            <div className="text-2xl font-bold">{pdfFields.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Mappings gesamt</div>
            <div className="text-2xl font-bold">{mappingStatuses.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Gültig</div>
            <div className="text-2xl font-bold text-green-600">{validMappings.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Erfolgsrate</div>
            <div className="text-2xl font-bold">{successRate}%</div>
          </Card>
        </div>

        {successRate < 50 && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Kritisches Problem:</strong> Nur {successRate}% der Mappings sind gültig. 
              Das PDF wird nicht korrekt befüllt werden. Die Felder in elterngeld-field-mappings.ts müssen korrigiert werden.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Invalid Mappings */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Ungültige Mappings ({invalidMappings.length})
              </h2>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {invalidMappings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Alle Mappings sind gültig! 🎉
                    </p>
                  ) : (
                    invalidMappings.map((mapping, idx) => (
                      <Card key={idx} className="p-4 border-red-500/50 bg-red-500/5">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <Badge variant="outline" className="mb-2">{mapping.sourceTable}</Badge>
                              <div className="text-sm space-y-1">
                                <div>
                                  <span className="font-medium">Quellfeld:</span>{" "}
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{mapping.sourceField}</code>
                                </div>
                                <div>
                                  <span className="font-medium">PDF-Feld (ungültig):</span>{" "}
                                  <code className="text-xs bg-red-500/10 px-1 py-0.5 rounded">{mapping.pdfFieldName}</code>
                                </div>
                              </div>
                            </div>
                          </div>
                          {mapping.actualPdfFields && mapping.actualPdfFields.length > 0 && (
                            <div className="text-xs mt-2 pt-2 border-t">
                              <div className="font-medium mb-1">Mögliche Alternativen:</div>
                              <div className="space-y-1">
                                {mapping.actualPdfFields.map((field, i) => (
                                  <code key={i} className="block bg-muted px-2 py-1 rounded text-xs">
                                    {field}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Valid Mappings */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Gültige Mappings ({validMappings.length})
              </h2>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {validMappings.map((mapping, idx) => (
                    <Card key={idx} className="p-4 border-green-500/50 bg-green-500/5">
                      <Badge variant="outline" className="mb-2">{mapping.sourceTable}</Badge>
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium">Quellfeld:</span>{" "}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">{mapping.sourceField}</code>
                        </div>
                        <div>
                          <span className="font-medium">PDF-Feld:</span>{" "}
                          <code className="text-xs bg-green-500/10 px-1 py-0.5 rounded">{mapping.pdfFieldName}</code>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        )}

        {/* All PDF Fields */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Alle PDF-Felder ({pdfFields.length})</h2>
          <ScrollArea className="h-[400px]">
            <div className="grid md:grid-cols-3 gap-2">
              {pdfFields.map((field, idx) => (
                <div key={idx} className="p-2 border rounded text-xs">
                  <code className="font-mono">{field.name}</code>
                  <Badge variant="secondary" className="ml-2 text-xs">{field.type}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
