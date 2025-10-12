import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Upload as UploadIcon, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const Upload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "Keine Dateien ausgewählt",
        description: "Bitte wählen Sie mindestens eine Datei zum Hochladen aus.",
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    // TODO: Implement actual file upload to Supabase storage
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setUploading(false);
      
      toast({
        title: "Upload erfolgreich",
        description: "Ihre Dokumente wurden hochgeladen. Beginne mit der Extraktion...",
      });

      // Navigate to review page
      setTimeout(() => {
        navigate("/review");
      }, 1000);
    }, 3000);
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
                <p className="text-sm text-muted-foreground">Schritt 1 von 4</p>
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
              Bitte laden Sie die folgenden Dokumente hoch. Alle Dateien werden verschlüsselt 
              und DSGVO-konform gespeichert.
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
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>Dateien auswählen</span>
                </Button>
              </label>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2 mb-6">
                <h4 className="font-semibold text-foreground">Ausgewählte Dateien:</h4>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      Entfernen
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            {uploading && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Upload-Fortschritt</p>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="flex-1"
              >
                {uploading ? "Wird hochgeladen..." : "Hochladen und fortfahren"}
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
