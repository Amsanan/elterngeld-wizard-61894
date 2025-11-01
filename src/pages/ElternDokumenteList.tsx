import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Eye, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ElternDokumenteList = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("eltern_dokumente")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Fehler beim Laden",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie dieses Dokument wirklich löschen?")) return;

    try {
      const { error } = await supabase
        .from("eltern_dokumente")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Erfolgreich gelöscht",
        description: "Das Dokument wurde gelöscht.",
      });

      fetchDocuments();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-DE");
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Eltern-Dokumente</h1>
              <p className="text-muted-foreground mt-1">
                Alle hochgeladenen Personalausweise und Reisepässe
              </p>
            </div>
            <Button onClick={() => navigate("/upload-eltern-dokument")}>
              <Upload className="h-4 w-4 mr-2" />
              Neues Dokument
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <p className="text-center text-muted-foreground">Laden...</p>
          ) : documents.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                Noch keine Dokumente hochgeladen
              </p>
              <Button onClick={() => navigate("/upload-eltern-dokument")}>
                <Upload className="h-4 w-4 mr-2" />
                Erstes Dokument hochladen
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {doc.document_type === "personalausweis" ? "Personalausweis" : "Reisepass"} - {doc.person_type === "mutter" ? "Mutter" : "Vater"}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span>{" "}
                          <span className="font-medium">
                            {doc.vorname} {doc.nachname}
                          </span>
                        </div>
                        {doc.geburtsdatum && (
                          <div>
                            <span className="text-muted-foreground">Geburtsdatum:</span>{" "}
                            <span className="font-medium">{formatDate(doc.geburtsdatum)}</span>
                          </div>
                        )}
                        {doc.ausweisnummer && (
                          <div>
                            <span className="text-muted-foreground">Nummer:</span>{" "}
                            <span className="font-medium">{doc.ausweisnummer}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Hochgeladen:</span>{" "}
                          <span className="font-medium">{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/eltern-dokument-result?id=${doc.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
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
        </div>
      </main>
    </div>
  );
};

export default ElternDokumenteList;