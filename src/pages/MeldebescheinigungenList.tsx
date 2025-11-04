import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Upload, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MeldebescheinigungenList = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("meldebescheinigungen")
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
      .from("meldebescheinigungen")
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
            <Button onClick={() => navigate("/upload-meldebescheinigung")}>
              <Upload className="h-4 w-4 mr-2" />
              Neue hochladen
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Meine Meldebescheinigungen ({documents.length})
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {documents.length === 0 ? (
          <Card className="max-w-2xl mx-auto p-12 text-center">
            <p className="text-muted-foreground mb-4">
              Noch keine Meldebescheinigungen hochgeladen
            </p>
            <Button onClick={() => navigate("/upload-meldebescheinigung")}>
              <Upload className="h-4 w-4 mr-2" />
              Erste Meldebescheinigung hochladen
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
                        {doc.person_type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium text-foreground">
                          {doc.vorname} {doc.nachname}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Wohnort</p>
                        <p className="font-medium text-foreground">
                          {doc.plz} {doc.wohnort}
                        </p>
                      </div>
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
                        navigate(`/meldebescheinigung-result?id=${doc.id}`)
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

export default MeldebescheinigungenList;