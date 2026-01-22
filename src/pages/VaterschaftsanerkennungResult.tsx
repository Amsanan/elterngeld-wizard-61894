import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditableField } from "@/components/documents/EditableField";
import { ConfidenceBadge } from "@/components/documents/ConfidenceBadge";

interface VaterschaftsanerkennungData {
  id: string;
  kind_vorname: string | null;
  kind_nachname: string | null;
  kind_geburtsdatum: string | null;
  kind_geburtsort: string | null;
  vater_vorname: string | null;
  vater_nachname: string | null;
  vater_geburtsdatum: string | null;
  mutter_vorname: string | null;
  mutter_nachname: string | null;
  mutter_geburtsdatum: string | null;
  anerkennungsdatum: string | null;
  zustimmungsdatum: string | null;
  beurkundungsstelle: string | null;
  urkundennummer: string | null;
  confidence_scores: Record<string, number> | null;
  created_at: string;
}

const VaterschaftsanerkennungResult = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<VaterschaftsanerkennungData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const id = searchParams.get("id");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const { data: result, error } = await supabase
          .from("vaterschaftsanerkennungen")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setData(result);
      } catch (error: any) {
        toast({
          title: "Fehler",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  const handleFieldUpdate = async (field: string, value: string) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("vaterschaftsanerkennungen")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      setData((prev) => (prev ? { ...prev, [field]: value } : null));
      toast({ title: "Gespeichert", description: "Feld wurde aktualisiert." });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Laden...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Dokument nicht gefunden</p>
      </div>
    );
  }

  const confidenceScores = data.confidence_scores || {};

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/vaterschaftsanerkennungen-list")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Liste
          </Button>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Vaterschaftsanerkennung
              </h1>
              <p className="text-muted-foreground">
                Erstellt am {new Date(data.created_at).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Kind</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Vorname"
                value={data.kind_vorname || ""}
                onSave={(v) => handleFieldUpdate("kind_vorname", v)}
                badge={<ConfidenceBadge score={confidenceScores.kind_vorname} />}
              />
              <EditableField
                label="Nachname"
                value={data.kind_nachname || ""}
                onSave={(v) => handleFieldUpdate("kind_nachname", v)}
                badge={<ConfidenceBadge score={confidenceScores.kind_nachname} />}
              />
              <EditableField
                label="Geburtsdatum"
                value={data.kind_geburtsdatum || ""}
                onSave={(v) => handleFieldUpdate("kind_geburtsdatum", v)}
                badge={<ConfidenceBadge score={confidenceScores.kind_geburtsdatum} />}
              />
              <EditableField
                label="Geburtsort"
                value={data.kind_geburtsort || ""}
                onSave={(v) => handleFieldUpdate("kind_geburtsort", v)}
                badge={<ConfidenceBadge score={confidenceScores.kind_geburtsort} />}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vater</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Vorname"
                value={data.vater_vorname || ""}
                onSave={(v) => handleFieldUpdate("vater_vorname", v)}
                badge={<ConfidenceBadge score={confidenceScores.vater_vorname} />}
              />
              <EditableField
                label="Nachname"
                value={data.vater_nachname || ""}
                onSave={(v) => handleFieldUpdate("vater_nachname", v)}
                badge={<ConfidenceBadge score={confidenceScores.vater_nachname} />}
              />
              <EditableField
                label="Geburtsdatum"
                value={data.vater_geburtsdatum || ""}
                onSave={(v) => handleFieldUpdate("vater_geburtsdatum", v)}
                badge={<ConfidenceBadge score={confidenceScores.vater_geburtsdatum} />}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mutter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Vorname"
                value={data.mutter_vorname || ""}
                onSave={(v) => handleFieldUpdate("mutter_vorname", v)}
                badge={<ConfidenceBadge score={confidenceScores.mutter_vorname} />}
              />
              <EditableField
                label="Nachname"
                value={data.mutter_nachname || ""}
                onSave={(v) => handleFieldUpdate("mutter_nachname", v)}
                badge={<ConfidenceBadge score={confidenceScores.mutter_nachname} />}
              />
              <EditableField
                label="Geburtsdatum"
                value={data.mutter_geburtsdatum || ""}
                onSave={(v) => handleFieldUpdate("mutter_geburtsdatum", v)}
                badge={<ConfidenceBadge score={confidenceScores.mutter_geburtsdatum} />}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Urkundendetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Anerkennungsdatum"
                value={data.anerkennungsdatum || ""}
                onSave={(v) => handleFieldUpdate("anerkennungsdatum", v)}
                badge={<ConfidenceBadge score={confidenceScores.anerkennungsdatum} />}
              />
              <EditableField
                label="Zustimmungsdatum"
                value={data.zustimmungsdatum || ""}
                onSave={(v) => handleFieldUpdate("zustimmungsdatum", v)}
                badge={<ConfidenceBadge score={confidenceScores.zustimmungsdatum} />}
              />
              <EditableField
                label="Beurkundungsstelle"
                value={data.beurkundungsstelle || ""}
                onSave={(v) => handleFieldUpdate("beurkundungsstelle", v)}
                badge={<ConfidenceBadge score={confidenceScores.beurkundungsstelle} />}
              />
              <EditableField
                label="Urkundennummer"
                value={data.urkundennummer || ""}
                onSave={(v) => handleFieldUpdate("urkundennummer", v)}
                badge={<ConfidenceBadge score={confidenceScores.urkundennummer} />}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VaterschaftsanerkennungResult;
