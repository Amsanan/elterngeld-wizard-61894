import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Upload as UploadIcon, ArrowLeft, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { performOCR, detectDocumentType, type OCRResult } from "@/lib/ocrService";

interface UploadedFile {
  file: File;
  ocrResult?: OCRResult;
  documentType?: string;
  uploading?: boolean;
  uploaded?: boolean;
}

const Upload = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({ file }));
    
    setFiles((prev) => [...prev, ...uploadedFiles]);

    // Start OCR processing for each file
    for (let i = 0; i < uploadedFiles.length; i++) {
      await processFile(uploadedFiles[i], files.length + i);
    }
  };

  const processFile = async (uploadedFile: UploadedFile, index: number) => {
    setProcessing(true);
    setCurrentFile(uploadedFile.file.name);
    setOcrProgress(0);

    try {
      // Perform OCR
      const ocrResult = await performOCR(
        uploadedFile.file,
        (progress) => setOcrProgress(progress)
      );

      // Detect document type
      const docType = detectDocumentType(ocrResult.text);

      // Update file with OCR results
      setFiles(prev => prev.map((f, i) => 
        i === index 
          ? { ...f, ocrResult, documentType: docType }
          : f
      ));

      toast({
        title: "OCR abgeschlossen",
        description: `${uploadedFile.file.name} wurde erfolgreich analysiert.`,
      });

    } catch (error) {
      console.error('OCR error:', error);
      toast({
        variant: "destructive",
        title: "OCR fehlgeschlagen",
        description: `Fehler bei der Analyse von ${uploadedFile.file.name}`,
      });
    } finally {
      setProcessing(false);
      setCurrentFile("");
    }
  };

  const handleUploadToSupabase = async () => {
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "Keine Dateien ausgewählt",
        description: "Bitte wählen Sie mindestens eine Datei zum Hochladen aus.",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Nicht angemeldet",
        description: "Bitte melden Sie sich an, um Dateien hochzuladen.",
      });
      navigate("/auth");
      return;
    }

    // Check if we have an existing antrag from sessionStorage
    const existingAntragId = sessionStorage.getItem('current_antrag_id');
    let antrag;

    if (existingAntragId) {
      // Use existing antrag
      const { data, error } = await supabase
        .from('antrag')
        .select('*')
        .eq('id', existingAntragId)
        .single();

      if (error || !data) {
        // Create new if existing not found
        sessionStorage.removeItem('current_antrag_id');
      } else {
        antrag = data;
      }
    }

    // Create new application record if needed
    if (!antrag) {
      const { data: newAntrag, error: antragError } = await supabase
        .from('antrag')
        .insert({
          user_id: user.id,
          status: 'draft',
          ort: files[0]?.ocrResult?.fields.ort || null,
        })
        .select()
        .single();

      if (antragError || !newAntrag) {
        toast({
          variant: "destructive",
          title: "Fehler beim Erstellen",
          description: "Der Antrag konnte nicht erstellt werden.",
        });
        return;
      }
      antrag = newAntrag;
      sessionStorage.setItem('current_antrag_id', antrag.id);
    }

    // Upload files and save extraction data
    for (const uploadedFile of files) {
      try {
        // Upload to storage
        const fileName = `${user.id}/${antrag.id}/${uploadedFile.file.name}`;
        const { error: storageError } = await supabase.storage
          .from('application-documents')
          .upload(fileName, uploadedFile.file);

        if (storageError) {
          console.error('Storage error:', storageError);
          continue;
        }

        // Save file metadata
        const { data: fileRecord } = await supabase
          .from('user_files')
          .insert({
            user_id: user.id,
            antrag_id: antrag.id,
            filename: uploadedFile.file.name,
            file_type: uploadedFile.documentType || 'unbekannt',
            file_size: uploadedFile.file.size,
            storage_path: fileName,
            status: 'extracted',
          })
          .select()
          .single();

        // Call AI mapping function to intelligently map OCR data
        if (uploadedFile.ocrResult && uploadedFile.documentType) {
          try {
            console.log('Calling map-pdf-fields with:', {
              documentType: uploadedFile.documentType,
              antragId: antrag.id,
              fieldsCount: Object.keys(uploadedFile.ocrResult.fields).length,
            });

            const { data: mappingResult, error: mappingError } = await supabase.functions.invoke(
              'map-pdf-fields',
              {
                body: {
                  ocrData: uploadedFile.ocrResult.fields,
                  documentType: uploadedFile.documentType,
                  antragId: antrag.id,
                },
              }
            );

            if (mappingError) {
              console.error('AI Mapping error:', mappingError);
              toast({
                variant: "destructive",
                title: "KI-Mapping Fehler",
                description: `Fehler beim intelligenten Mapping: ${mappingError.message}`,
              });
              // Fallback to basic extraction logs if AI fails
              const extractionPromises = Object.entries(uploadedFile.ocrResult.fields).map(
                ([fieldName, fieldValue]) =>
                  supabase.from('extraction_logs').insert({
                    user_file_id: fileRecord?.id,
                    antrag_id: antrag.id,
                    field_name: fieldName,
                    field_value: fieldValue as string,
                    confidence_score: uploadedFile.ocrResult!.confidence,
                  })
              );
              await Promise.all(extractionPromises);
            } else {
              console.log('AI Mapping successful:', mappingResult);
              
              // Check if data was actually saved to kind table
              if (uploadedFile.documentType === 'geburtsurkunde') {
                const { data: kindCheck } = await supabase
                  .from('kind')
                  .select('*')
                  .eq('antrag_id', antrag.id)
                  .maybeSingle();
                
                console.log('Kind table check after mapping:', kindCheck);
                
                if (!kindCheck) {
                  console.warn('Kind data was NOT saved to database despite successful mapping');
                  toast({
                    variant: "destructive",
                    title: "Warnung",
                    description: "Kinddaten wurden nicht gespeichert. Bitte überprüfen Sie die Daten manuell.",
                  });
                }
              }
              
              // Save the AI-mapped fields
              if (fileRecord && mappingResult.mapped_fields) {
                const extractionPromises = Object.entries(mappingResult.mapped_fields).map(
                  ([fieldName, fieldValue]) =>
                    supabase.from('extraction_logs').insert({
                      user_file_id: fileRecord.id,
                      antrag_id: antrag.id,
                      field_name: fieldName,
                      field_value: fieldValue as string,
                      confidence_score: mappingResult.confidence || uploadedFile.ocrResult!.confidence,
                    })
                );
                await Promise.all(extractionPromises);
              }
            }
          } catch (aiError) {
            console.error('AI mapping failed:', aiError);
            // Fallback to basic extraction
            const extractionPromises = Object.entries(uploadedFile.ocrResult.fields).map(
              ([fieldName, fieldValue]) =>
                supabase.from('extraction_logs').insert({
                  user_file_id: fileRecord?.id,
                  antrag_id: antrag.id,
                  field_name: fieldName,
                  field_value: fieldValue as string,
                  confidence_score: uploadedFile.ocrResult!.confidence,
                })
            );
            await Promise.all(extractionPromises);
          }
        }

      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    toast({
      title: "Upload erfolgreich",
      description: "Dokumente werden verarbeitet. PDF-Vorschau wird generiert...",
    });

    // Navigate to review/preview page with antrag ID
    navigate(`/review?antrag=${antrag.id}`);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dokumente hochladen</h1>
                <p className="text-sm text-muted-foreground">Schritt 1 von 4 • OCR-Extraktion</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Erforderliche Unterlagen</h2>
            <p className="text-muted-foreground mb-6">
              Laden Sie Ihre Dokumente hoch. Die KI extrahiert automatisch relevante Informationen.
            </p>

            {/* File Upload Area */}
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center mb-6 hover:border-primary/50 transition-colors">
              <UploadIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                Dateien hier ablegen oder klicken
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Unterstützte Formate: PDF, JPG, PNG (max. 20MB pro Datei)
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={processing}
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer" asChild disabled={processing}>
                  <span>{processing ? "Wird analysiert..." : "Dateien auswählen"}</span>
                </Button>
              </label>
            </div>

            {/* OCR Progress */}
            {processing && currentFile && (
              <Card className="p-4 mb-6 bg-accent/5">
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="h-5 w-5 text-accent" />
                  <p className="text-sm font-medium text-foreground">
                    Analysiere: {currentFile}
                  </p>
                </div>
                <Progress value={ocrProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">{ocrProgress}% abgeschlossen</p>
              </Card>
            )}

            {/* File List with OCR Results */}
            {files.length > 0 && (
              <div className="space-y-3 mb-6">
                <h4 className="font-semibold text-foreground">Hochgeladene Dateien:</h4>
                {files.map((uploadedFile, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {uploadedFile.file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        
                        {uploadedFile.documentType && (
                          <Badge variant="outline" className="mb-2">
                            {uploadedFile.documentType}
                          </Badge>
                        )}

                        {uploadedFile.ocrResult && (
                          <div className="mt-2 p-3 bg-secondary/20 rounded-lg">
                            <p className="text-xs font-semibold text-foreground mb-1">
                              Extrahierte Daten:
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(uploadedFile.ocrResult.fields).map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-muted-foreground">{key}: </span>
                                  <span className="text-foreground font-medium">{value}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Konfidenz: {Math.round(uploadedFile.ocrResult.confidence)}%
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={processing}
                      >
                        Entfernen
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleUploadToSupabase}
                disabled={processing || files.length === 0}
                className="flex-1"
              >
                {processing ? "Wird analysiert..." : "Speichern und fortfahren"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Abbrechen
              </Button>
            </div>
          </Card>

          {/* Required Documents Info */}
          <Card className="mt-6 p-6 bg-secondary/20">
            <h4 className="font-semibold mb-3 text-foreground">Benötigte Dokumente:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Geburtsurkunde des Kindes</li>
              <li>• Einkommensnachweise (z.B. Lohnabrechnungen)</li>
              <li>• Bescheinigung der Krankenversicherung</li>
              <li>• Personalausweis oder Reisepass</li>
              <li>• Ggf. weitere relevante Unterlagen</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Upload;
