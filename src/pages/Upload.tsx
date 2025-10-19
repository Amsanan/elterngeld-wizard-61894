import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Upload as UploadIcon, ArrowLeft, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { performOCR, detectDocumentType, type OCRResult } from "@/lib/documents";
import { requiresParentSelection } from "@/lib/documentMapping";
import * as pdfjsLib from 'pdfjs-dist';

interface UploadedFile {
  file: File;
  ocrResult?: OCRResult;
  documentType?: string;
  uploading?: boolean;
  uploaded?: boolean;
  visionData?: any; // Store vision API results
  parentNumber?: 1 | 2; // Which parent this document belongs to (for Personalausweis, etc.)
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
      // First do quick OCR to detect document type
      const quickOcr = await performOCR(
        uploadedFile.file,
        (progress) => setOcrProgress(Math.min(progress, 30))
      );
      const docType = detectDocumentType(quickOcr.text);

      // For birth certificates, use vision API instead of OCR
      if (docType === 'geburtsurkunde') {
        setOcrProgress(40);
        
        // Convert file to base64
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(uploadedFile.file);
        });

        setOcrProgress(60);

        // Call vision API directly
        const { data: visionResult, error: visionError } = await supabase.functions.invoke(
          'map-pdf-fields',
          {
            body: {
              imageData: fileBase64,
              mimeType: uploadedFile.file.type,
              documentType: docType,
              antragId: null, // No antrag ID yet, just extract data
            },
          }
        );

        setOcrProgress(100);

        if (visionError || !visionResult?.mapped_fields) {
          throw new Error('Vision API Fehler');
        }

        // Convert vision results to OCR format for display
        const extractedFields: Record<string, string> = {};
        Object.entries(visionResult.mapped_fields).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            extractedFields[key] = String(value);
          }
        });

        setFiles(prev => prev.map((f, i) => 
          i === index 
            ? { 
                ...f, 
                ocrResult: {
                  text: '',
                  confidence: (visionResult.confidence || 0.95) * 100,
                  extractedFields,
                  documentType: docType,
                },
                documentType: docType,
                visionData: visionResult // Store complete vision results
              }
            : f
        ));

        toast({
          title: "✓ KI-Vision Extraktion abgeschlossen",
          description: `${uploadedFile.file.name} - ${Object.keys(extractedFields).length} Felder extrahiert`,
        });

      } else {
        // For other documents, use regular OCR
        setOcrProgress(50);
        const ocrResult = await performOCR(
          uploadedFile.file,
          (progress) => setOcrProgress(50 + progress / 2)
        );

        setFiles(prev => prev.map((f, i) => 
          i === index 
            ? { ...f, ocrResult, documentType: docType }
            : f
        ));

        toast({
          title: "OCR abgeschlossen",
          description: `${uploadedFile.file.name} wurde erfolgreich analysiert.`,
        });
      }

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
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
          ort: files[0]?.ocrResult?.extractedFields.ort || null,
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

        // For birth certificates with pre-extracted vision data, save directly to database
        if (uploadedFile.documentType === 'geburtsurkunde' && uploadedFile.visionData) {
          try {
            const fields = uploadedFile.visionData.mapped_fields;
            
            // Save to kind table
            const kindData: any = { antrag_id: antrag.id };
            if (fields.vorname) kindData.vorname = fields.vorname;
            if (fields.nachname) kindData.nachname = fields.nachname;
            if (fields.geburtsdatum) kindData.geburtsdatum = fields.geburtsdatum;
            if (fields.anzahl_mehrlinge) kindData.anzahl_mehrlinge = fields.anzahl_mehrlinge;
            if (fields.fruehgeboren !== undefined) kindData.fruehgeboren = fields.fruehgeboren;
            if (fields.errechneter_geburtsdatum) kindData.errechneter_geburtsdatum = fields.errechneter_geburtsdatum;
            if (fields.behinderung !== undefined) kindData.behinderung = fields.behinderung;
            if (fields.anzahl_weitere_kinder) kindData.anzahl_weitere_kinder = fields.anzahl_weitere_kinder;
            if (fields.keine_weitere_kinder !== undefined) kindData.keine_weitere_kinder = fields.keine_weitere_kinder;
            if (fields.insgesamt !== undefined) kindData.insgesamt = fields.insgesamt;

            const { error: kindError } = await supabase
              .from('kind')
              .insert(kindData);

            if (kindError) {
              console.error('Error saving kind:', kindError);
              toast({
                variant: "destructive",
                title: "Fehler beim Speichern",
                description: "Kinddaten konnten nicht gespeichert werden.",
              });
            } else {
              toast({
                title: "✓ Daten gespeichert",
                description: `${fields.vorname} ${fields.nachname} wurde erfolgreich gespeichert.`,
              });
              
              // Log to extraction_logs
              if (fileRecord) {
                const extractionPromises = Object.entries(fields).map(
                  ([fieldName, fieldValue]) =>
                    fieldValue !== null && fieldValue !== undefined &&
                    supabase.from('extraction_logs').insert({
                      user_file_id: fileRecord.id,
                      antrag_id: antrag.id,
                      field_name: fieldName,
                      field_value: String(fieldValue),
                      confidence_score: uploadedFile.visionData.confidence || 0.95,
                    })
                );
                await Promise.all(extractionPromises.filter(Boolean));
              }
            }
          } catch (error) {
            console.error('Error processing birth certificate data:', error);
          }
        }

        // Call AI mapping function for other document types
        else if (uploadedFile.documentType && uploadedFile.documentType !== 'geburtsurkunde') {
          try {
            let imageBase64: string;
            let imageMimeType: string;

            // Check if file is PDF - need to convert to image first
            if (uploadedFile.file.type === 'application/pdf') {
              console.log('Converting PDF to image for OCR...');
              
              // Load PDF using pdf.js
              const arrayBuffer = await uploadedFile.file.arrayBuffer();
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              
              // Get first page (most IDs have info on first page)
              const page = await pdf.getPage(1);
              
              // Create canvas to render PDF page
              const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              // Render PDF page to canvas
              await page.render({
                canvasContext: context,
                viewport: viewport,
                canvas: canvas,
              }).promise;
              
              // Convert canvas to base64 JPEG
              const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
              imageBase64 = dataUrl.split(',')[1];
              imageMimeType = 'image/jpeg';
              
              console.log('PDF converted to image successfully');
            } else {
              // For image files, use directly
              imageBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(uploadedFile.file);
              });
              imageMimeType = uploadedFile.file.type;
            }

            console.log('Calling map-pdf-fields:', {
              documentType: uploadedFile.documentType,
              antragId: antrag.id,
              mimeType: imageMimeType,
            });

            const { data: mappingResult, error: mappingError } = await supabase.functions.invoke(
              'map-pdf-fields',
              {
                body: {
                  imageData: imageBase64,
                  mimeType: imageMimeType,
                  documentType: uploadedFile.documentType,
                  antragId: antrag.id,
                  parentNumber: uploadedFile.parentNumber || 1,
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
            } else {
              console.log('AI Mapping successful:', mappingResult);
              
              // Show success feedback with extracted data
              const extractedData = mappingResult.mapped_fields || {};
              const dataPreview = Object.entries(extractedData)
                .filter(([_, value]) => value !== null && value !== undefined)
                .map(([key, value]) => `${key}: ${value}`)
                .slice(0, 3)
                .join(', ');
              
              toast({
                title: "✓ Daten erfolgreich extrahiert",
                description: `${dataPreview}${Object.keys(extractedData).length > 3 ? '...' : ''}`,
                duration: 5000,
              });
              
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
              
              // Save AI mapping metadata to extraction logs
              if (fileRecord && mappingResult.mapped_fields) {
                const extractionPromises = Object.entries(mappingResult.mapped_fields).map(
                  ([fieldName, fieldValue]) =>
                    supabase.from('extraction_logs').insert({
                      user_file_id: fileRecord.id,
                      antrag_id: antrag.id,
                      field_name: fieldName,
                      field_value: fieldValue as string,
                      confidence_score: mappingResult.confidence || 0.95,
                    })
                );
                await Promise.all(extractionPromises);
              }
            }
          } catch (aiError) {
            console.error('AI mapping failed:', aiError);
            toast({
              variant: "destructive",
              title: "Fehler",
              description: "Dokumentverarbeitung fehlgeschlagen",
            });
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

  const setParentNumber = (index: number, parentNum: 1 | 2) => {
    setFiles((prev) => prev.map((f, i) => 
      i === index ? { ...f, parentNumber: parentNum } : f
    ));
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

                        {/* Parent selection for documents that need it */}
                        {uploadedFile.documentType && requiresParentSelection(uploadedFile.documentType) && (
                          <div className="mt-3 mb-3 p-3 bg-secondary/20 rounded-lg">
                            <label className="text-xs font-semibold text-foreground mb-2 block">
                              Dieses Dokument gehört zu:
                            </label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={uploadedFile.parentNumber === 1 ? "default" : "outline"}
                                size="sm"
                                onClick={() => setParentNumber(index, 1)}
                              >
                                Elternteil 1
                              </Button>
                              <Button
                                type="button"
                                variant={uploadedFile.parentNumber === 2 ? "default" : "outline"}
                                size="sm"
                                onClick={() => setParentNumber(index, 2)}
                              >
                                Elternteil 2
                              </Button>
                            </div>
                          </div>
                        )}

                        {uploadedFile.ocrResult && (
                          <div className="mt-2 p-3 bg-secondary/20 rounded-lg">
                            <p className="text-xs font-semibold text-foreground mb-1">
                              Extrahierte Daten:
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(uploadedFile.ocrResult.extractedFields).map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-muted-foreground">{key}: </span>
                                  <span className="text-foreground font-medium">{value as string}</span>
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
