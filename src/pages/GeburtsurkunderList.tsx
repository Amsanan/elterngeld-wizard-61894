import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText, Trash2, Eye, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GeburtsurkunderList = () => {
  const [geburtsurkunden, setGeburtsurkunden] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchGeburtsurkunden();
  }, []);

  const fetchGeburtsurkunden = async () => {
    try {
      const { data, error } = await supabase
        .from("geburtsurkunden")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGeburtsurkunden(data || []);
    } catch (error: any) {
      console.error("Error fetching geburtsurkunden:", error);
      toast({
        title: "Fehler beim Laden",
        description: "Die Geburtsurkunden konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diese Geburtsurkunde wirklich löschen?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("geburtsurkunden")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Erfolgreich gelöscht",
        description: "Die Geburtsurkunde wurde gelöscht.",
      });

      fetchGeburtsurkunden();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Lädt...</p>
      </div>
    );
  }

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
            Zurück zum Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Meine Geburtsurkunden</h1>
                <p className="text-sm text-muted-foreground">
                  {geburtsurkunden.length} {geburtsurkunden.length === 1 ? "Dokument" : "Dokumente"}
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/upload-geburtsurkunde")}>
              <Upload className="h-4 w-4 mr-2" />
              Neue hochladen
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {geburtsurkunden.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">Keine Geburtsurkunden</h3>
              <p className="text-muted-foreground mb-6">
                Sie haben noch keine Geburtsurkunden hochgeladen.
              </p>
              <Button onClick={() => navigate("/upload-geburtsurkunde")}>
                <Upload className="h-4 w-4 mr-2" />
                Erste Geburtsurkunde hochladen
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {geburtsurkunden.map((geb) => (
                <Card key={geb.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">
                          {geb.kind_vorname && geb.kind_nachname
                            ? `${geb.kind_vorname} ${geb.kind_nachname}`
                            : "Geburtsurkunde"}
                        </h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Geburtsdatum: </span>
                          <span className="text-foreground">
                            {geb.kind_geburtsdatum || "Nicht extrahiert"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Geburtsort: </span>
                          <span className="text-foreground">
                            {geb.kind_geburtsort || "Nicht extrahiert"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Urkundennummer: </span>
                          <span className="text-foreground">
                            {geb.urkundennummer || "Nicht extrahiert"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Hochgeladen: </span>
                          <span className="text-foreground">
                            {new Date(geb.created_at).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/geburtsurkunde-result?id=${geb.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(geb.id)}
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

export default GeburtsurkunderList;
