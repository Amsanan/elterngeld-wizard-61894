import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, List, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DOKUMENT_LABELS: Record<string, string> = {
  aerztliches_attest: "Ärztliches Attest",
  hebammenzeugnis: "Hebammenzeugnis / Zeugnis errechneter Termin",
  schwerbehindertenausweis: "Schwerbehindertenausweis",
  sterbeurkunde: "Sterbeurkunde",
  haftbescheinigung: "Haftbescheinigung",
  elstam_auszug: "ELStAM-Auszug",
  kindergeldbescheid: "Kindergeldbescheid",
  rentenbescheid: "Rentenbescheid",
  elterngeldbescheid_aelteres_kind: "Elterngeldbescheid (älteres Kind)",
  beschaeftigungsverbot: "Beschäftigungsverbot",
  entsendungsbescheinigung: "Entsendungsbescheinigung",
  vaterschaftsanerkennung: "Vaterschaftsanerkennung",
  einnahmen_ueberschuss_rechnung: "Einnahmen-Überschuss-Rechnung",
  krankentagegeld_bescheinigung: "Krankentagegeld-Bescheinigung",
  arbeitsvertrag: "Arbeitsvertrag",
  ausbildungsvertrag: "Ausbildungsvertrag",
  bezuegemitteilung_beamte: "Bezügemitteilung (Beamte/Soldaten)",
  tagespflege_eignung: "Eignungsnachweis Tagespflege",
  leistungsnachweis_ausland: "Leistungsnachweis aus dem Ausland",
  vertretungsnachweis: "Vertretungsnachweis",
  feststellungsbeschluss_familiengericht: "Feststellungsbeschluss Familiengericht",
  sonstige: "Sonstiges Dokument",
};

const SonstigeNachweiseResult = () => {
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
        .from("sonstige_nachweise")
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

  const extractedData = data.extracted_data || {};

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
            Extrahierte Daten: {DOKUMENT_LABELS[data.dokument_typ] || data.dokument_typ}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Allgemeine Informationen
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dokumenttyp</p>
                  <p className="font-medium text-foreground">
                    {DOKUMENT_LABELS[data.dokument_typ] || data.dokument_typ}
                  </p>
                </div>
                {data.person_type && (
                  <div>
                    <p className="text-sm text-muted-foreground">Elternteil</p>
                    <p className="font-medium text-foreground">{data.person_type}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Ausstelldatum</p>
                  <p className="font-medium text-foreground">{formatDate(data.ausstelldatum)}</p>
                </div>
                {data.aussteller && (
                  <div>
                    <p className="text-sm text-muted-foreground">Aussteller</p>
                    <p className="font-medium text-foreground">{data.aussteller}</p>
                  </div>
                )}
                {data.gueltig_von && (
                  <div>
                    <p className="text-sm text-muted-foreground">Gültig von</p>
                    <p className="font-medium text-foreground">{formatDate(data.gueltig_von)}</p>
                  </div>
                )}
                {data.gueltig_bis && (
                  <div>
                    <p className="text-sm text-muted-foreground">Gültig bis</p>
                    <p className="font-medium text-foreground">{formatDate(data.gueltig_bis)}</p>
                  </div>
                )}
                {data.betrag && (
                  <div>
                    <p className="text-sm text-muted-foreground">Betrag</p>
                    <p className="font-medium text-foreground">{data.betrag} €</p>
                  </div>
                )}
              </div>
            </div>

            {Object.keys(extractedData).length > 0 && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">
                  Extrahierte Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(extractedData).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-sm text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="font-medium text-foreground">
                        {String(value) || "Nicht verfügbar"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.beschreibung && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">
                  Beschreibung
                </h2>
                <p className="text-foreground">{data.beschreibung}</p>
              </div>
            )}
          </div>
        </Card>

        <div className="max-w-4xl mx-auto mt-6 flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/sonstige-nachweise-list")}
            className="flex-1"
          >
            <List className="h-4 w-4 mr-2" />
            Zur Liste
          </Button>
          <Button
            onClick={() => navigate("/upload-sonstige-nachweise")}
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

export default SonstigeNachweiseResult;
