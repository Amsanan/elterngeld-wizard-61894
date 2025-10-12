import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { uploadTemplate } from "@/lib/templateManager";
import { FileText, Upload as UploadIcon, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const UploadTemplates = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!pdfFile || !excelFile) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte wählen Sie beide Dateien aus.",
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Upload PDF template
      setProgress(25);
      const pdfResult = await uploadTemplate(
        pdfFile,
        'templates/elterngeldantrag_bis_Maerz25.pdf'
      );

      if (!pdfResult.success) {
        throw new Error(`PDF Upload fehlgeschlagen: ${pdfResult.error}`);
      }

      setProgress(50);

      // Upload Excel mapping
      const excelResult = await uploadTemplate(
        excelFile,
        'templates/Mapping032025_1.xlsx'
      );

      if (!excelResult.success) {
        throw new Error(`Excel Upload fehlgeschlagen: ${excelResult.error}`);
      }

      setProgress(100);

      toast({
        title: "Upload erfolgreich",
        description: "Template-Dateien wurden hochgeladen und sind jetzt aktiv.",
      });

      // Reset form
      setPdfFile(null);
      setExcelFile(null);
      setProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Template-Upload</h1>
              <p className="text-sm text-muted-foreground">
                Formulare und Mapping-Dateien hochladen
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-foreground">
              Elterngeldantrag Template hochladen
            </h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pdf-template">PDF-Formular (elterngeldantrag_bis_Maerz25.pdf)</Label>
                <Input
                  id="pdf-template"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                />
                {pdfFile && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{pdfFile.name} ausgewählt</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excel-mapping">Excel-Mapping (Mapping032025_1.xlsx)</Label>
                <Input
                  id="excel-mapping"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                />
                {excelFile && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{excelFile.name} ausgewählt</span>
                  </div>
                )}
              </div>

              {uploading && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Upload läuft... {progress}%</p>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={uploading || !pdfFile || !excelFile}
                className="w-full"
                size="lg"
              >
                <UploadIcon className="h-5 w-5 mr-2" />
                {uploading ? "Wird hochgeladen..." : "Templates hochladen"}
              </Button>
            </div>
          </Card>

          <Card className="mt-6 p-6 bg-secondary/20">
            <h4 className="font-semibold mb-2 text-foreground">Hinweis</h4>
            <p className="text-sm text-muted-foreground">
              Diese Seite dient zum initialen Upload der Template-Dateien in Supabase Storage. 
              Nach dem Upload werden die Dateien im <code className="text-xs bg-muted px-1 py-0.5 rounded">form-templates</code> Bucket 
              gespeichert und können von allen Nutzern für die PDF-Generierung verwendet werden.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UploadTemplates;
