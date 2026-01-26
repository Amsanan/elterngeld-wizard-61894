import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, ArrowLeft, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateFile, createSecureFilePath } from "@/lib/file-validation";
import { useQuery } from "@tanstack/react-query";

const UploadGeburtsurkunde = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get current count of birth certificates to show which position this will be
  const { data: existingCount = 0 } = useQuery({
    queryKey: ["geburtsurkunden-count"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { count } = await supabase
        .from("geburtsurkunden")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      return count || 0;
    },
  });

  const getPositionLabel = (position: number) => {
    if (position === 0) return "Antragskind";
    if (position <= 3) return `Mehrling ${position}`;
    return `Geschwisterkind ${position - 3}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        toast({
          title: "Ungültige Datei",
          description: validation.error,
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Keine Datei ausgewählt",
        description: "Bitte wählen Sie eine Datei aus.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const fileName = createSecureFilePath(user.id, file.name);
      
      const { error: uploadError } = await supabase.storage
        .from("application-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      toast({
        title: "Verarbeitung läuft",
        description: "Die Geburtsurkunde wird mit OCR verarbeitet...",
      });

      // Position is now calculated automatically in the edge function
      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        'extract-geburtsurkunde',
        {
          body: { filePath: fileName }
        }
      );

      if (extractError) {
        console.error("Extraction error:", extractError);
        toast({
          title: "Verarbeitung teilweise erfolgreich",
          description: "Die Datei wurde hochgeladen, aber die OCR-Verarbeitung hatte Probleme.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erfolgreich verarbeitet",
          description: "Die Geburtsurkunde wurde extrahiert und gespeichert.",
        });
        
        if (extractData?.data?.id) {
          navigate(`/geburtsurkunde-result?id=${extractData.data.id}`);
          return;
        }
      }

      setFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload fehlgeschlagen",
        description: error.message || "Ein Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Geburtsurkunde hochladen</h1>
          <p className="text-muted-foreground mt-2">
            Laden Sie die Geburtsurkunde hoch. Die Position wird automatisch bestimmt.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <div className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Upload-Position: {getPositionLabel(existingCount)}</strong>
                  <br />
                  {existingCount === 0 
                    ? "Dies wird als Geburtsurkunde des Antragskindes gespeichert."
                    : existingCount <= 3
                      ? `Dies wird als Geburtsurkunde für Mehrling ${existingCount} gespeichert.`
                      : `Dies wird als Geburtsurkunde für Geschwisterkind ${existingCount - 3} gespeichert.`
                  }
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="file-input">Geburtsurkunde (PDF oder Bild)</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  className="mt-2"
                />
                {file && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Ausgewählt: {file.name}
                  </p>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Wird hochgeladen..." : "Hochladen"}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UploadGeburtsurkunde;
