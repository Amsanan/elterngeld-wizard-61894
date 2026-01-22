import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateFile, createSecureFilePath } from "@/lib/file-validation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type KindTyp = "primaer" | "geschwister";
type KindOrdnung = 0 | 1 | 2 | 3;

const UploadGeburtsurkunde = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [kindTyp, setKindTyp] = useState<KindTyp>("primaer");
  const [kindOrdnung, setKindOrdnung] = useState<KindOrdnung>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Client-side validation
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        toast({
          title: "Ungültige Datei",
          description: validation.error,
          variant: "destructive",
        });
        // Reset the input
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

      // Create secure file path with sanitized filename
      const fileName = createSecureFilePath(user.id, file.name);
      
      const { error: uploadError } = await supabase.storage
        .from("application-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Call extraction function
      toast({
        title: "Verarbeitung läuft",
        description: "Die Geburtsurkunde wird mit OCR verarbeitet...",
      });

      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        'extract-geburtsurkunde',
        {
          body: { 
            filePath: fileName,
            kindTyp: kindTyp,
            kindOrdnungszahl: kindOrdnung
          }
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
        
        // Navigate to result page with the extracted data ID
        if (extractData?.data?.id) {
          navigate(`/geburtsurkunde-result?id=${extractData.data.id}`);
          return;
        }
      }

      setFile(null);
      // Reset file input
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <div className="space-y-6">
              {/* Kind-Typ Auswahl */}
              <div>
                <Label htmlFor="kind-typ">Für welches Kind ist diese Urkunde?</Label>
                <Select
                  value={kindTyp}
                  onValueChange={(value: KindTyp) => {
                    setKindTyp(value);
                    if (value === "primaer") {
                      setKindOrdnung(0);
                    } else {
                      setKindOrdnung(1);
                    }
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Kind-Typ auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primaer">Antragskind (Kind für das Elterngeld beantragt wird)</SelectItem>
                    <SelectItem value="geschwister">Geschwisterkind (für Geschwisterbonus)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Geschwister-Ordnung falls Geschwisterkind gewählt */}
              {kindTyp === "geschwister" && (
                <div>
                  <Label htmlFor="kind-ordnung">Welches Geschwisterkind?</Label>
                  <Select
                    value={String(kindOrdnung)}
                    onValueChange={(value) => setKindOrdnung(Number(value) as KindOrdnung)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Geschwister-Position auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Jüngstes Geschwisterkind (Kind 1)</SelectItem>
                      <SelectItem value="2">Zweitjüngstes Geschwisterkind (Kind 2)</SelectItem>
                      <SelectItem value="3">Drittjüngstes Geschwisterkind (Kind 3)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    Wählen Sie die Position des Geschwisterkindes nach Alter (jüngstes zuerst).
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="file-input">Geburtsurkunde (PDF)</Label>
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
