import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const SteuerbescheidResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: result, error } = await supabase
          .from("einkommensteuerbescheide")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setData(result);
      } catch (error: any) {
        console.error("Fetch error:", error);
        toast.error("Fehler beim Laden der Daten");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <p>Laden...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <p>Keine Daten gefunden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
        </div>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">
            Extrahierte Daten - Einkommensteuerbescheid ({data.person_type === "mutter" ? "Mutter" : "Vater"})
          </h1>

          <div className="space-y-4">
            {data.gemeinsame_veranlagung && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md mb-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Gemeinsame Veranlagung (Ehepaar)
                </p>
              </div>
            )}
            
            {data.finanzamt_name && (
              <div>
                <p className="text-sm text-muted-foreground">Finanzamt</p>
                <p className="font-medium">{data.finanzamt_name}</p>
                {data.finanzamt_adresse && <p className="text-sm">{data.finanzamt_adresse}</p>}
              </div>
            )}

            {data.bescheiddatum && (
              <div>
                <p className="text-sm text-muted-foreground">Bescheiddatum</p>
                <p className="font-medium">{new Date(data.bescheiddatum).toLocaleDateString("de-DE")}</p>
              </div>
            )}

            {data.vorname && (
              <div>
                <p className="text-sm text-muted-foreground">Vorname</p>
                <p className="font-medium">{data.vorname}</p>
              </div>
            )}
            {data.nachname && (
              <div>
                <p className="text-sm text-muted-foreground">Nachname</p>
                <p className="font-medium">{data.nachname}</p>
              </div>
            )}
            {data.steuerjahr && (
              <div>
                <p className="text-sm text-muted-foreground">Steuerjahr</p>
                <p className="font-medium">{data.steuerjahr}</p>
              </div>
            )}
            {data.steuernummer && (
              <div>
                <p className="text-sm text-muted-foreground">Steuernummer</p>
                <p className="font-medium">{data.steuernummer}</p>
              </div>
            )}
            {data.steuer_id_nummer && (
              <div>
                <p className="text-sm text-muted-foreground">Steuer-ID</p>
                <p className="font-medium">{data.steuer_id_nummer}</p>
              </div>
            )}
            {data.plz && (
              <div>
                <p className="text-sm text-muted-foreground">PLZ</p>
                <p className="font-medium">{data.plz}</p>
              </div>
            )}
            {data.wohnort && (
              <div>
                <p className="text-sm text-muted-foreground">Wohnort</p>
                <p className="font-medium">{data.wohnort}</p>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Einkünfte</h3>
              {data.bruttoarbeitslohn && (
                <div>
                  <p className="text-sm text-muted-foreground">Bruttoarbeitslohn</p>
                  <p className="font-medium">{data.bruttoarbeitslohn} EUR</p>
                </div>
              )}
              {data.einkuenfte_selbstaendig && (
                <div>
                  <p className="text-sm text-muted-foreground">Einkünfte aus selbständiger Arbeit</p>
                  <p className="font-medium">{data.einkuenfte_selbstaendig} EUR</p>
                </div>
              )}
              {data.werbungskosten && (
                <div>
                  <p className="text-sm text-muted-foreground">Werbungskosten</p>
                  <p className="font-medium">{data.werbungskosten} EUR</p>
                </div>
              )}
              {data.summe_der_einkuenfte && (
                <div>
                  <p className="text-sm text-muted-foreground">Summe der Einkünfte</p>
                  <p className="font-medium">{data.summe_der_einkuenfte} EUR</p>
                </div>
              )}
              {data.gesamtbetrag_der_einkuenfte && (
                <div>
                  <p className="text-sm text-muted-foreground">Gesamtbetrag der Einkünfte</p>
                  <p className="font-medium">{data.gesamtbetrag_der_einkuenfte} EUR</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Steuerberechnung</h3>
              {data.zu_versteuerndes_einkommen && (
                <div>
                  <p className="text-sm text-muted-foreground">Zu versteuerndes Einkommen</p>
                  <p className="font-medium">{data.zu_versteuerndes_einkommen} EUR</p>
                </div>
              )}
              {data.festgesetzte_steuer && (
                <div>
                  <p className="text-sm text-muted-foreground">Festgesetzte Einkommensteuer</p>
                  <p className="font-medium text-lg">{data.festgesetzte_steuer} EUR</p>
                </div>
              )}
              {data.solidaritaetszuschlag && (
                <div>
                  <p className="text-sm text-muted-foreground">Solidaritätszuschlag</p>
                  <p className="font-medium">{data.solidaritaetszuschlag} EUR</p>
                </div>
              )}
              {data.steuerabzug_vom_lohn && (
                <div>
                  <p className="text-sm text-muted-foreground">Steuerabzug vom Lohn</p>
                  <p className="font-medium">{data.steuerabzug_vom_lohn} EUR</p>
                </div>
              )}
              {data.verbleibende_steuer && (
                <div>
                  <p className="text-sm text-muted-foreground">Verbleibende Steuer</p>
                  <p className="font-medium text-lg text-red-600 dark:text-red-400">{data.verbleibende_steuer} EUR</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={() => navigate("/steuerbescheide-list")} className="w-full">
              Alle Steuerbescheide anzeigen
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SteuerbescheidResult;
