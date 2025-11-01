import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UploadElternDokument = () => {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<"personalausweis" | "reisepass">("personalausweis");
  const [personType, setPersonType] = useState<"mutter" | "vater">("mutter");
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("application-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Call extraction function
      toast({
        title: "Verarbeitung läuft",
        description: "Das Dokument wird mit OCR verarbeitet...",
      });

      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        'extract-eltern-dokument',
        {
          body: { 
            filePath: fileName,
            documentType,
            personType
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
          description: "Das Dokument wurde extrahiert und gespeichert.",
        });
        
        if (extractData?.data?.id) {
          navigate(`/eltern-dokument-result?id=${extractData.data.id}`);
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
          <h1 className="text-2xl font-bold text-foreground">Eltern-Dokument hochladen</h1>
          <p className="text-muted-foreground mt-2">
            Personalausweis oder Reisepass der Eltern
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <div className="space-y-6">
              <div>
                <Label>Dokumenttyp</Label>
                <RadioGroup value={documentType} onValueChange={(v) => setDocumentType(v as any)} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="personalausweis" id="personalausweis" />
                    <Label htmlFor="personalausweis" className="cursor-pointer">Personalausweis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reisepass" id="reisepass" />
                    <Label htmlFor="reisepass" className="cursor-pointer">Reisepass</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Elternteil</Label>
                <RadioGroup value={personType} onValueChange={(v) => setPersonType(v as any)} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mutter" id="mutter" />
                    <Label htmlFor="mutter" className="cursor-pointer">Mutter</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vater" id="vater" />
                    <Label htmlFor="vater" className="cursor-pointer">Vater</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="file-input">Dokument (PDF/Bild)</Label>
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

export default UploadElternDokument;