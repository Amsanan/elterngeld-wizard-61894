import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, List, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MutterschaftsgeldResult = () => {
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
        .from("mutterschaftsgeld")
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
            Extrahierte Daten: Mutterschaftsgeld
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Krankenversicherung
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Krankenkasse</p>
                  <p className="font-medium text-foreground">{data.krankenkasse_name || "Nicht verfügbar"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Versichertennummer</p>
                  <p className="font-medium text-foreground">{data.versichertennummer || "Nicht verfügbar"}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Leistungsdetails
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Leistungsbeginn</p>
                  <p className="font-medium text-foreground">{formatDate(data.leistungsbeginn)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leistungsende</p>
                  <p className="font-medium text-foreground">{formatDate(data.leistungsende)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tagessatz</p>
                  <p className="font-medium text-foreground">
                    {data.tagessatz ? `${data.tagessatz} €` : "Nicht verfügbar"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gesamtbetrag</p>
                  <p className="font-medium text-foreground">
                    {data.gesamtbetrag ? `${data.gesamtbetrag} €` : "Nicht verfügbar"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bescheiddatum</p>
                  <p className="font-medium text-foreground">{formatDate(data.bescheiddatum)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="max-w-4xl mx-auto mt-6 flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/mutterschaftsgeld-list")}
            className="flex-1"
          >
            <List className="h-4 w-4 mr-2" />
            Zur Liste
          </Button>
          <Button
            onClick={() => navigate("/upload-mutterschaftsgeld")}
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

export default MutterschaftsgeldResult;