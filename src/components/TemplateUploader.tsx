import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadInitialTemplates } from "@/lib/uploadTemplates";

export const TemplateUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const { toast } = useToast();

  const handleUpload = async () => {
    setUploading(true);
    
    try {
      const result = await uploadInitialTemplates();
      
      if (result.success) {
        setUploaded(true);
        toast({
          title: "Upload erfolgreich",
          description: "Alle Template-Dateien wurden in Supabase Storage hochgeladen.",
        });
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload fehlgeschlagen",
        description: error instanceof Error ? error.message : "Ein Fehler ist aufgetreten",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        {uploaded ? (
          <>
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2 text-foreground">Templates hochgeladen</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Die Template-Dateien sind jetzt in Supabase Storage verfügbar.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2 text-foreground">
                Template-Migration erforderlich
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Die Template-Dateien müssen einmalig von public/reference nach Supabase Storage 
                migriert werden. Dies ermöglicht Versionsverwaltung und zentrale Updates.
              </p>
              <Button onClick={handleUpload} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Wird hochgeladen..." : "Jetzt migrieren"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
