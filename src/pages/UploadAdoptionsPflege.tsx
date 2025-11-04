import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UploadAdoptionsPflege = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dokumentTyp, setDokumentTyp] = useState<string>("Adoptionsbeschluss");
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
        title: "Fehler",
        description: "Bitte wählen Sie eine Datei aus.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Sie müssen angemeldet sein");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/adoptions-pflege/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("application-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke(
        "extract-adoptions-pflege",
        {
          body: { filePath, dokumentTyp },
        }
      );

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Dokument erfolgreich extrahiert!",
      });

      navigate(`/adoptions-pflege-result?id=${data.data.id}`);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Ein Fehler ist aufgetreten",
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
          <h1 className="text-2xl font-bold text-foreground">
            Adoptions-/Pflegedokument hochladen
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-4 block">
                Dokumenttyp
              </Label>
              <RadioGroup value={dokumentTyp} onValueChange={setDokumentTyp}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Adoptionsbeschluss" id="adoption" />
                  <Label htmlFor="adoption" className="cursor-pointer">
                    Adoptionsbeschluss
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Pflegeerlaubnis" id="pflegeerlaubnis" />
                  <Label htmlFor="pflegeerlaubnis" className="cursor-pointer">
                    Pflegeerlaubnis
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Pflegevertrag" id="pflegevertrag" />
                  <Label htmlFor="pflegevertrag" className="cursor-pointer">
                    Pflegevertrag
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="file">Datei auswählen (PDF oder Bild)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="mt-2"
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Wird hochgeladen..." : "Hochladen und analysieren"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default UploadAdoptionsPflege;