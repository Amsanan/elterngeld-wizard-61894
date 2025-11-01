import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const UploadSteuerbescheid = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [personType, setPersonType] = useState<"mutter" | "vater">("mutter");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Bitte wählen Sie eine Datei aus");
      return;
    }

    setIsUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("application-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      toast.success("Datei hochgeladen, starte OCR...");

      // Call edge function for OCR extraction
      const { data, error } = await supabase.functions.invoke("extract-steuerbescheid", {
        body: {
          filePath: fileName,
          personType: personType,
        },
      });

      if (error) throw error;

      toast.success("Steuerbescheid erfolgreich extrahiert!");
      navigate(`/steuerbescheid-result/${data.data.id}`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Fehler beim Hochladen");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
        </div>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Einkommensteuerbescheid hochladen</h1>

          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Von welchem Elternteil?</Label>
              <RadioGroup value={personType} onValueChange={(value: any) => setPersonType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mutter" id="mutter" />
                  <Label htmlFor="mutter">Mutter</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vater" id="vater" />
                  <Label htmlFor="vater">Vater</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="file" className="mb-2 block">
                Steuerbescheid (PDF oder Bild)
              </Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>

            <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
              {isUploading ? "Wird hochgeladen..." : "Hochladen und analysieren"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UploadSteuerbescheid;
