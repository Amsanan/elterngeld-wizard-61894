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

const UploadAerztlichesZeugnis = () => {
  const [file, setFile] = useState<File | null>(null);
  const [zeugnisTyp, setZeugnisTyp] = useState<string>("et_bescheinigung");
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
      const filePath = `${session.user.id}/aerztliches-zeugnis/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("application-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke(
        "extract-aerztliches-zeugnis",
        {
          body: { filePath, zeugnisTyp },
        }
      );

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Ärztliches Zeugnis erfolgreich extrahiert!",
      });

      navigate(`/aerztliches-zeugnis-result?id=${data.data.id}`);
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
            Ärztliches Zeugnis hochladen
          </h1>
          <p className="text-muted-foreground mt-2">
            Laden Sie die ET-Bescheinigung oder das Beschäftigungsverbot hoch.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-4 block">
                Art des Zeugnisses
              </Label>
              <RadioGroup value={zeugnisTyp} onValueChange={setZeugnisTyp}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="et_bescheinigung" id="et" />
                  <Label htmlFor="et" className="cursor-pointer">
                    ET-Bescheinigung (Errechneter Geburtstermin)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="beschaeftigungsverbot" id="verbot" />
                  <Label htmlFor="verbot" className="cursor-pointer">
                    Beschäftigungsverbot
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

export default UploadAerztlichesZeugnis;
