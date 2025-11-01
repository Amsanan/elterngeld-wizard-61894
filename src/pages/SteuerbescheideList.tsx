import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const SteuerbescheideList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: results, error } = await supabase
          .from("einkommensteuerbescheide")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setData(results || []);
      } catch (error: any) {
        console.error("Fetch error:", error);
        toast.error("Fehler beim Laden der Daten");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <p>Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-6">Alle Einkommensteuerbescheide</h1>

        {data.length === 0 ? (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">
              Keine Steuerbescheide gefunden. Laden Sie einen hoch!
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <Card
                key={item.id}
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate(`/steuerbescheid-result/${item.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">
                      {item.person_type === "mutter" ? "Mutter" : "Vater"}
                      {item.nachname && ` - ${item.nachname}`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.steuerjahr && `Steuerjahr: ${item.steuerjahr}`}
                    </p>
                    {item.zu_versteuerndes_einkommen && (
                      <p className="text-sm">
                        Zu versteuerndes Einkommen: {item.zu_versteuerndes_einkommen} EUR
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SteuerbescheideList;
