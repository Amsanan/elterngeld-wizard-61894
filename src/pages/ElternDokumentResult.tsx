import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ElternDokumentResult = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const id = searchParams.get("id");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        toast({
          title: "Fehler",
          description: "Keine ID angegeben",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      try {
        const { data: result, error } = await supabase
          .from("eltern_dokumente")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setData(result);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Fehler beim Laden",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Keine Daten gefunden</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Nicht verfügbar";
    return new Date(dateStr).toLocaleDateString("de-DE");
  };

  const documentTypeLabel = data.document_type === "personalausweis" ? "Personalausweis" : "Reisepass";
  const personTypeLabel = data.person_type === "mutter" ? "Mutter" : "Vater";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/eltern-dokumente-list")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Liste
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Extrahierte Daten</h1>
          <p className="text-muted-foreground mt-1">
            {documentTypeLabel} - {personTypeLabel}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Dokumentinformationen</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Dokumenttyp</p>
                <p className="font-medium">{documentTypeLabel}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Elternteil</p>
                <p className="font-medium">{personTypeLabel}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Vorname</p>
                <p className="font-medium">{data.vorname || "Nicht extrahiert"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Nachname</p>
                <p className="font-medium">{data.nachname || "Nicht extrahiert"}</p>
              </div>

              {data.geburtsname && (
                <div>
                  <p className="text-sm text-muted-foreground">Geburtsname</p>
                  <p className="font-medium">{data.geburtsname}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Geburtsdatum</p>
                <p className="font-medium">{data.geburtsdatum ? formatDate(data.geburtsdatum) : "Nicht extrahiert"}</p>
              </div>

              {data.geburtsort && (
                <div>
                  <p className="text-sm text-muted-foreground">Geburtsort</p>
                  <p className="font-medium">{data.geburtsort}</p>
                </div>
              )}

              {data.staatsangehoerigkeit && (
                <div>
                  <p className="text-sm text-muted-foreground">Staatsangehörigkeit</p>
                  <p className="font-medium">{data.staatsangehoerigkeit}</p>
                </div>
              )}

              {data.ausweisnummer && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {data.document_type === "personalausweis" ? "Ausweisnummer" : "Reisepassnummer"}
                  </p>
                  <p className="font-medium">{data.ausweisnummer}</p>
                </div>
              )}

              {data.gueltig_bis && (
                <div>
                  <p className="text-sm text-muted-foreground">Gültig bis</p>
                  <p className="font-medium">{formatDate(data.gueltig_bis)}</p>
                </div>
              )}
            </div>
          </Card>

          <div className="flex gap-4">
            <Button onClick={() => navigate("/eltern-dokumente-list")} className="flex-1">
              Zur Übersicht
            </Button>
            <Button onClick={() => navigate("/upload-eltern-dokument")} variant="outline" className="flex-1">
              Weiteres Dokument hochladen
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ElternDokumentResult;