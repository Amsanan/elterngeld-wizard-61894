import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileText, Loader2, Accessibility, X } from "lucide-react";
import { toast } from "sonner";

export default function UploadSchwerbehindertenausweis() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [personType, setPersonType] = useState<string>("");
  const [kindOrdnungszahl, setKindOrdnungszahl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Bitte wählen Sie eine Datei aus");
      return;
    }

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nicht authentifiziert");
        navigate("/auth");
        return;
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/schwerbehindertenausweis_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error("Fehler beim Hochladen der Datei");
        return;
      }

      // Call extraction function
      const { data, error } = await supabase.functions.invoke('extract-schwerbehindertenausweis', {
        body: { 
          filePath: fileName,
          personType: personType || null,
          kindOrdnungszahl: kindOrdnungszahl ? parseInt(kindOrdnungszahl) : null
        }
      });

      if (error) {
        console.error('Extraction error:', error);
        toast.error("Fehler bei der Datenextraktion");
        return;
      }

      toast.success("Schwerbehindertenausweis erfolgreich verarbeitet");
      navigate(`/schwerbehindertenausweis-result/${data.data.id}`);

    } catch (error) {
      console.error('Error:', error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Accessibility className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Schwerbehindertenausweis hochladen</CardTitle>
                <CardDescription>
                  Laden Sie einen Schwerbehindertenausweis oder Feststellungsbescheid hoch
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Person</Label>
                <Select value={personType} onValueChange={setPersonType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Person auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mutter">Mutter</SelectItem>
                    <SelectItem value="vater">Vater</SelectItem>
                    <SelectItem value="kind">Kind</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {personType === "kind" && (
                <div className="space-y-2">
                  <Label>Kind Nr.</Label>
                  <Select value={kindOrdnungszahl} onValueChange={setKindOrdnungszahl}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kind auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">1. Kind</SelectItem>
                      <SelectItem value="1">2. Kind</SelectItem>
                      <SelectItem value="2">3. Kind</SelectItem>
                      <SelectItem value="3">4. Kind</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* File Upload Area */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Klicken Sie hier oder ziehen Sie Dateien hierher
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG (max. 10 MB)
                  </p>
                </label>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verarbeite...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Hochladen & Extrahieren
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/schwerbehindertenausweise")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Alle anzeigen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
