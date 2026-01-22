import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditableField } from "@/components/documents/EditableField";

interface AerztlichesZeugnisData {
  id: string;
  zeugnis_typ: string;
  arzt_name: string | null;
  arzt_praxis: string | null;
  ausstelldatum: string | null;
  errechneter_geburtstermin: string | null;
  verbot_beginn: string | null;
  verbot_ende: string | null;
  verbot_grund: string | null;
  verbot_art: string | null;
  confidence_scores: Record<string, number> | null;
  created_at: string;
}

const AerztlichesZeugnisResult = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<AerztlichesZeugnisData | null>(null);
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
          .from("aerztliche_zeugnisse")
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
  const isETBescheinigung = data.zeugnis_typ === "et_bescheinigung";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/aerztliche-zeugnisse-list")}
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
                {isETBescheinigung ? "ET-Bescheinigung" : "Beschäftigungsverbot"}
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
              <CardTitle>Arzt / Praxis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Arztname"
                value={data.arzt_name}
                isEditing={isEditing}
                documentId={data.id}
                tableName="aerztliche_zeugnisse"
                fieldName="arzt_name"
                confidenceScore={confidenceScores.arzt_name}
              />
              <EditableField
                label="Praxis / Klinik"
                value={data.arzt_praxis}
                isEditing={isEditing}
                documentId={data.id}
                tableName="aerztliche_zeugnisse"
                fieldName="arzt_praxis"
                confidenceScore={confidenceScores.arzt_praxis}
              />
              <EditableField
                label="Ausstelldatum"
                value={data.ausstelldatum}
                isEditing={isEditing}
                documentId={data.id}
                tableName="aerztliche_zeugnisse"
                fieldName="ausstelldatum"
                type="date"
                confidenceScore={confidenceScores.ausstelldatum}
              />
            </CardContent>
          </Card>

          {isETBescheinigung ? (
            <Card>
              <CardHeader>
                <CardTitle>Errechneter Termin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <EditableField
                  label="Errechneter Geburtstermin (ET)"
                  value={data.errechneter_geburtstermin}
                  isEditing={isEditing}
                  documentId={data.id}
                  tableName="aerztliche_zeugnisse"
                  fieldName="errechneter_geburtstermin"
                  type="date"
                  confidenceScore={confidenceScores.errechneter_geburtstermin}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Beschäftigungsverbot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <EditableField
                  label="Verbot Beginn"
                  value={data.verbot_beginn}
                  isEditing={isEditing}
                  documentId={data.id}
                  tableName="aerztliche_zeugnisse"
                  fieldName="verbot_beginn"
                  type="date"
                  confidenceScore={confidenceScores.verbot_beginn}
                />
                <EditableField
                  label="Verbot Ende"
                  value={data.verbot_ende}
                  isEditing={isEditing}
                  documentId={data.id}
                  tableName="aerztliche_zeugnisse"
                  fieldName="verbot_ende"
                  type="date"
                  confidenceScore={confidenceScores.verbot_ende}
                />
                <EditableField
                  label="Grund"
                  value={data.verbot_grund}
                  isEditing={isEditing}
                  documentId={data.id}
                  tableName="aerztliche_zeugnisse"
                  fieldName="verbot_grund"
                  confidenceScore={confidenceScores.verbot_grund}
                />
                <EditableField
                  label="Art (teilweise/vollständig)"
                  value={data.verbot_art}
                  isEditing={isEditing}
                  documentId={data.id}
                  tableName="aerztliche_zeugnisse"
                  fieldName="verbot_art"
                  confidenceScore={confidenceScores.verbot_art}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default AerztlichesZeugnisResult;
