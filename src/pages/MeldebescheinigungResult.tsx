import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, List, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MeldebescheinigungResult = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) {
      toast({
        title: "Fehler",
        description: "Keine ID gefunden",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    const fetchData = async () => {
      const { data: result, error } = await supabase
        .from("meldebescheinigungen")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast({
          title: "Fehler",
          description: "Daten konnten nicht geladen werden",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setData(result);
      setLoading(false);
    };

    fetchData();
  }, [searchParams, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Laden...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Keine Daten gefunden</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Nicht verfügbar";
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
          <h1 className="text-2xl font-bold text-foreground">
            Extrahierte Daten: Meldebescheinigung
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Persönliche Daten
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Elternteil</p>
                  <p className="font-medium text-foreground">{data.person_type || "Nicht verfügbar"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">
                    {data.vorname} {data.nachname}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Geburtsdatum</p>
                  <p className="font-medium text-foreground">{formatDate(data.geburtsdatum)}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Adresse
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Straße & Hausnummer</p>
                  <p className="font-medium text-foreground">
                    {data.strasse} {data.hausnummer}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PLZ & Ort</p>
                  <p className="font-medium text-foreground">
                    {data.plz} {data.wohnort}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meldedatum</p>
                  <p className="font-medium text-foreground">{formatDate(data.meldedatum)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Behörde</p>
                  <p className="font-medium text-foreground">{data.behoerde || "Nicht verfügbar"}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="max-w-4xl mx-auto mt-6 flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/meldebescheinigungen-list")}
            className="flex-1"
          >
            <List className="h-4 w-4 mr-2" />
            Zur Liste
          </Button>
          <Button
            onClick={() => navigate("/upload-meldebescheinigung")}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Weitere hochladen
          </Button>
        </div>
      </main>
    </div>
  );
};

export default MeldebescheinigungResult;