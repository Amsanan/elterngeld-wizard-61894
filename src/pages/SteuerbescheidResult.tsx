import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ConfidenceBadge } from "@/components/documents/ConfidenceBadge";

const SteuerbescheidResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const confidenceScores = data?.confidence_scores || {};
  
  const renderFieldWithConfidence = (label: string, value: string | null, fieldKey: string, suffix = "") => {
    if (!value) return null;
    const score = confidenceScores[fieldKey];
    
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {score !== undefined && <ConfidenceBadge score={score} />}
        </div>
        <p className="font-medium">{value}{suffix}</p>
      </div>
    );
  };

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
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Gemeinsame Veranlagung (Ehepaar)
                  </p>
                  {confidenceScores.gemeinsame_veranlagung && (
                    <ConfidenceBadge score={confidenceScores.gemeinsame_veranlagung} />
                  )}
                </div>
              </div>
            )}
            
            {data.finanzamt_name && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-muted-foreground">Finanzamt</p>
                  {confidenceScores.finanzamt_name && (
                    <ConfidenceBadge score={confidenceScores.finanzamt_name} />
                  )}
                </div>
                <p className="font-medium">{data.finanzamt_name}</p>
                {data.finanzamt_adresse && (
                  <p className="text-sm mt-1">{data.finanzamt_adresse}</p>
                )}
              </div>
            )}

            {renderFieldWithConfidence(
              "Bescheiddatum",
              data.bescheiddatum ? new Date(data.bescheiddatum).toLocaleDateString("de-DE") : null,
              "bescheiddatum"
            )}
            {renderFieldWithConfidence("Vorname", data.vorname, "vorname")}
            {renderFieldWithConfidence("Nachname", data.nachname, "nachname")}
            {renderFieldWithConfidence("Steuerjahr", data.steuerjahr, "steuerjahr")}
            {renderFieldWithConfidence("Steuernummer", data.steuernummer, "steuernummer")}
            {renderFieldWithConfidence("Steuer-ID", data.steuer_id_nummer, "steuer_id_nummer")}
            {renderFieldWithConfidence("PLZ", data.plz, "plz")}
            {renderFieldWithConfidence("Wohnort", data.wohnort, "wohnort")}

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Einkünfte</h3>
              {renderFieldWithConfidence("Bruttoarbeitslohn", data.bruttoarbeitslohn, "bruttoarbeitslohn", " EUR")}
              {renderFieldWithConfidence("Einkünfte aus selbständiger Arbeit", data.einkuenfte_selbstaendig, "einkuenfte_selbstaendig", " EUR")}
              {renderFieldWithConfidence("Werbungskosten", data.werbungskosten, "werbungskosten", " EUR")}
              {renderFieldWithConfidence("Summe der Einkünfte", data.summe_der_einkuenfte, "summe_der_einkuenfte", " EUR")}
              {renderFieldWithConfidence("Gesamtbetrag der Einkünfte", data.gesamtbetrag_der_einkuenfte, "gesamtbetrag_der_einkuenfte", " EUR")}
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Steuerberechnung</h3>
              {renderFieldWithConfidence("Zu versteuerndes Einkommen", data.zu_versteuerndes_einkommen, "zu_versteuerndes_einkommen", " EUR")}
              
              {data.festgesetzte_steuer && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-muted-foreground">Festgesetzte Einkommensteuer</p>
                    {confidenceScores.festgesetzte_steuer && (
                      <ConfidenceBadge score={confidenceScores.festgesetzte_steuer} />
                    )}
                  </div>
                  <p className="font-medium text-lg">{data.festgesetzte_steuer} EUR</p>
                </div>
              )}
              
              {renderFieldWithConfidence("Solidaritätszuschlag", data.solidaritaetszuschlag, "solidaritaetszuschlag", " EUR")}
              {renderFieldWithConfidence("Steuerabzug vom Lohn", data.steuerabzug_vom_lohn, "steuerabzug_vom_lohn", " EUR")}
              
              {data.verbleibende_steuer && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-muted-foreground">Verbleibende Steuer</p>
                    {confidenceScores.verbleibende_steuer && (
                      <ConfidenceBadge score={confidenceScores.verbleibende_steuer} />
                    )}
                  </div>
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
