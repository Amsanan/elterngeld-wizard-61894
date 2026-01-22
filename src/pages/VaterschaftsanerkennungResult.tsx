import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditableField } from "@/components/documents/EditableField";

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
  const [isEditing, setIsEditing] = useState(false);
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
        setData({
          ...result,
          confidence_scores: result.confidence_scores as Record<string, number> | null,
        });
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
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/vaterschaftsanerkennungen-list")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Liste
            </Button>
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {isEditing ? "Fertig" : "Bearbeiten"}
            </Button>
          </div>
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
                value={data.kind_vorname}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="kind_vorname"
                confidenceScore={confidenceScores.kind_vorname}
              />
              <EditableField
                label="Nachname"
                value={data.kind_nachname}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="kind_nachname"
                confidenceScore={confidenceScores.kind_nachname}
              />
              <EditableField
                label="Geburtsdatum"
                value={data.kind_geburtsdatum}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="kind_geburtsdatum"
                type="date"
                confidenceScore={confidenceScores.kind_geburtsdatum}
              />
              <EditableField
                label="Geburtsort"
                value={data.kind_geburtsort}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="kind_geburtsort"
                confidenceScore={confidenceScores.kind_geburtsort}
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
                value={data.vater_vorname}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="vater_vorname"
                confidenceScore={confidenceScores.vater_vorname}
              />
              <EditableField
                label="Nachname"
                value={data.vater_nachname}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="vater_nachname"
                confidenceScore={confidenceScores.vater_nachname}
              />
              <EditableField
                label="Geburtsdatum"
                value={data.vater_geburtsdatum}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="vater_geburtsdatum"
                type="date"
                confidenceScore={confidenceScores.vater_geburtsdatum}
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
                value={data.mutter_vorname}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="mutter_vorname"
                confidenceScore={confidenceScores.mutter_vorname}
              />
              <EditableField
                label="Nachname"
                value={data.mutter_nachname}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="mutter_nachname"
                confidenceScore={confidenceScores.mutter_nachname}
              />
              <EditableField
                label="Geburtsdatum"
                value={data.mutter_geburtsdatum}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="mutter_geburtsdatum"
                type="date"
                confidenceScore={confidenceScores.mutter_geburtsdatum}
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
                value={data.anerkennungsdatum}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="anerkennungsdatum"
                type="date"
                confidenceScore={confidenceScores.anerkennungsdatum}
              />
              <EditableField
                label="Zustimmungsdatum"
                value={data.zustimmungsdatum}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="zustimmungsdatum"
                type="date"
                confidenceScore={confidenceScores.zustimmungsdatum}
              />
              <EditableField
                label="Beurkundungsstelle"
                value={data.beurkundungsstelle}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="beurkundungsstelle"
                confidenceScore={confidenceScores.beurkundungsstelle}
              />
              <EditableField
                label="Urkundennummer"
                value={data.urkundennummer}
                isEditing={isEditing}
                documentId={data.id}
                tableName="vaterschaftsanerkennungen"
                fieldName="urkundennummer"
                confidenceScore={confidenceScores.urkundennummer}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VaterschaftsanerkennungResult;
