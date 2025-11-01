import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GeburtsurkunderResult = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const resultId = searchParams.get("id");

  useEffect(() => {
    const fetchData = async () => {
      if (!resultId) {
        navigate("/dashboard");
        return;
      }

      try {
        const { data: gebData, error } = await supabase
          .from("geburtsurkunden")
          .select("*")
          .eq("id", resultId)
          .single();

        if (error) throw error;
        setData(gebData);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Fehler beim Laden",
          description: "Die Daten konnten nicht geladen werden.",
          variant: "destructive",
        });
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resultId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Lädt...</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nicht extrahiert";
    return dateStr;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/geburtsurkunden-list")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Liste
          </Button>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Erfolgreich extrahiert</h1>
              <p className="text-sm text-muted-foreground">
                Geburtsurkunde verarbeitet am {new Date(data.created_at).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Kind Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Kind - Extrahierte Daten
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vorname</p>
                <p className="font-medium text-foreground">{data.kind_vorname || "Nicht extrahiert"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nachname</p>
                <p className="font-medium text-foreground">{data.kind_nachname || "Nicht extrahiert"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Geburtsdatum</p>
                <p className="font-medium text-foreground">{formatDate(data.kind_geburtsdatum)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Geburtsort</p>
                <p className="font-medium text-foreground">{data.kind_geburtsort || "Nicht extrahiert"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Geburtsnummer</p>
                <p className="font-medium text-foreground">{data.kind_geburtsnummer || "Nicht extrahiert"}</p>
              </div>
            </div>
          </Card>

          {/* Mutter Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Mutter</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vorname</p>
                <p className="font-medium text-foreground">{data.mutter_vorname || "Nicht extrahiert"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nachname</p>
                <p className="font-medium text-foreground">{data.mutter_nachname || "Nicht extrahiert"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Geburtsname</p>
                <p className="font-medium text-foreground">{data.mutter_geburtsname || "Nicht extrahiert"}</p>
              </div>
            </div>
          </Card>

          {/* Vater Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Vater</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vorname</p>
                <p className="font-medium text-foreground">{data.vater_vorname || "Nicht extrahiert"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nachname</p>
                <p className="font-medium text-foreground">{data.vater_nachname || "Nicht extrahiert"}</p>
              </div>
            </div>
          </Card>

          {/* Urkunden Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Urkunden-Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Urkundennummer</p>
                <p className="font-medium text-foreground">{data.urkundennummer || "Nicht extrahiert"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Behörde</p>
                <p className="font-medium text-foreground">{data.behoerde_name || "Nicht extrahiert"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ausstelldatum</p>
                <p className="font-medium text-foreground">{formatDate(data.ausstelldatum)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verwendungszweck</p>
                <p className="font-medium text-foreground">{data.verwendungszweck || "Nicht extrahiert"}</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={() => navigate("/geburtsurkunden-list")} className="flex-1">
              Alle Geburtsurkunden anzeigen
            </Button>
            <Button onClick={() => navigate("/upload-geburtsurkunde")} variant="outline" className="flex-1">
              Weitere hochladen
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GeburtsurkunderResult;
