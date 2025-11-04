import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Upload, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EheSorgerechtList = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("ehe_sorgerecht_nachweise")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Fehler",
        description: "Dokumente konnten nicht geladen werden",
        variant: "destructive",
      });
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie dieses Dokument wirklich löschen?")) return;

    const { error } = await supabase
      .from("ehe_sorgerecht_nachweise")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Fehler",
        description: "Dokument konnte nicht gelöscht werden",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Erfolg",
        description: "Dokument wurde gelöscht",
      });
      fetchDocuments();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-DE");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Laden...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <Button onClick={() => navigate("/upload-ehe-sorgerecht")}>
              <Upload className="h-4 w-4 mr-2" />
              Neue hochladen
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Meine Ehe-/Sorgerechtsdokumente ({documents.length})
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {documents.length === 0 ? (
          <Card className="max-w-2xl mx-auto p-12 text-center">
            <p className="text-muted-foreground mb-4">
              Noch keine Ehe- oder Sorgerechtsdokumente hochgeladen
            </p>
            <Button onClick={() => navigate("/upload-ehe-sorgerecht")}>
              <Upload className="h-4 w-4 mr-2" />
              Erstes Dokument hochladen
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 max-w-4xl mx-auto">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                        {doc.dokument_typ}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {doc.partner1_nachname && (
                        <div>
                          <p className="text-sm text-muted-foreground">Partner 1</p>
                          <p className="font-medium text-foreground">
                            {doc.partner1_vorname} {doc.partner1_nachname}
                          </p>
                        </div>
                      )}
                      {doc.partner2_nachname && (
                        <div>
                          <p className="text-sm text-muted-foreground">Partner 2</p>
                          <p className="font-medium text-foreground">
                            {doc.partner2_vorname} {doc.partner2_nachname}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Hochgeladen am</p>
                        <p className="font-medium text-foreground">
                          {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/ehe-sorgerecht-result?id=${doc.id}`)
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default EheSorgerechtList;