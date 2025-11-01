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
            {data.jahreseinkommen && (
              <div>
                <p className="text-sm text-muted-foreground">Jahreseinkommen</p>
                <p className="font-medium">{data.jahreseinkommen} EUR</p>
              </div>
            )}
            {data.zu_versteuerndes_einkommen && (
              <div>
                <p className="text-sm text-muted-foreground">Zu versteuerndes Einkommen</p>
                <p className="font-medium">{data.zu_versteuerndes_einkommen} EUR</p>
              </div>
            )}
            {data.festgesetzte_steuer && (
              <div>
                <p className="text-sm text-muted-foreground">Festgesetzte Steuer</p>
                <p className="font-medium">{data.festgesetzte_steuer} EUR</p>
              </div>
            )}
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
