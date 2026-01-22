import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VaterschaftsanerkennungenList = () => {
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
        .from("vaterschaftsanerkennungen")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Fehler",
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
        .from("vaterschaftsanerkennungen")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Dokument wurde gelöscht",
      });
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-DE");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Laden...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <Button onClick={() => navigate("/upload-vaterschaftsanerkennung")}>
              <Plus className="h-4 w-4 mr-2" />
              Neue hochladen
            </Button>
          </div>
          <h1 className="text-2xl font-bold mt-4">Vaterschaftsanerkennungen</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                Noch keine Vaterschaftsanerkennungen hochgeladen.
              </p>
              <Button onClick={() => navigate("/upload-vaterschaftsanerkennung")}>
                <Plus className="h-4 w-4 mr-2" />
                Erste Vaterschaftsanerkennung hochladen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {doc.kind_vorname} {doc.kind_nachname}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {doc.beurkundungsstelle && (
                      <p>Beurkundungsstelle: {doc.beurkundungsstelle}</p>
                    )}
                    {doc.anerkennungsdatum && (
                      <p>Anerkennungsdatum: {formatDate(doc.anerkennungsdatum)}</p>
                    )}
                    <p>Hochgeladen: {formatDate(doc.created_at)}</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/vaterschaftsanerkennung-result?id=${doc.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ansehen
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Löschen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default VaterschaftsanerkennungenList;
