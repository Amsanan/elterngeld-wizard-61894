import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditableField } from "@/components/documents/EditableField";

interface KindergeldBescheidData {
  id: string;
  person_type: string;
  familienkasse: string | null;
  kindergeld_nummer: string | null;
  kind_vorname: string | null;
  kind_nachname: string | null;
  kind_geburtsdatum: string | null;
  kind_ordnungszahl: number | null;
  bescheiddatum: string | null;
  betrag_monatlich: number | null;
  zahlungsbeginn: string | null;
  zahlungsende: string | null;
  iban: string | null;
  kontoinhaber: string | null;
  confidence_scores: Record<string, number> | null;
  created_at: string;
}

const KindergeldBescheidResult = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<KindergeldBescheidData | null>(null);
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
          .from("kindergeld_bescheide")
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
              onClick={() => navigate("/kindergeld-bescheide-list")}
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
                Kindergeld-Bescheid ({data.person_type})
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
              <CardTitle>Familienkasse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Familienkasse"
                value={data.familienkasse}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="familienkasse"
                confidenceScore={confidenceScores.familienkasse}
              />
              <EditableField
                label="Kindergeld-Nr."
                value={data.kindergeld_nummer}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="kindergeld_nummer"
                confidenceScore={confidenceScores.kindergeld_nummer}
              />
              <EditableField
                label="Bescheiddatum"
                value={data.bescheiddatum}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="bescheiddatum"
                type="date"
                confidenceScore={confidenceScores.bescheiddatum}
              />
            </CardContent>
          </Card>

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
                tableName="kindergeld_bescheide"
                fieldName="kind_vorname"
                confidenceScore={confidenceScores.kind_vorname}
              />
              <EditableField
                label="Nachname"
                value={data.kind_nachname}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="kind_nachname"
                confidenceScore={confidenceScores.kind_nachname}
              />
              <EditableField
                label="Geburtsdatum"
                value={data.kind_geburtsdatum}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="kind_geburtsdatum"
                type="date"
                confidenceScore={confidenceScores.kind_geburtsdatum}
              />
              <EditableField
                label="Ordnungszahl (1., 2., 3. Kind)"
                value={data.kind_ordnungszahl?.toString() || null}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="kind_ordnungszahl"
                type="number"
                confidenceScore={confidenceScores.kind_ordnungszahl}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zahlungsdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Monatsbetrag (€)"
                value={data.betrag_monatlich?.toString() || null}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="betrag_monatlich"
                type="number"
                confidenceScore={confidenceScores.betrag_monatlich}
              />
              <EditableField
                label="Zahlungsbeginn"
                value={data.zahlungsbeginn}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="zahlungsbeginn"
                type="date"
                confidenceScore={confidenceScores.zahlungsbeginn}
              />
              <EditableField
                label="Zahlungsende"
                value={data.zahlungsende}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="zahlungsende"
                type="date"
                confidenceScore={confidenceScores.zahlungsende}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bankverbindung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="IBAN"
                value={data.iban}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="iban"
                confidenceScore={confidenceScores.iban}
              />
              <EditableField
                label="Kontoinhaber"
                value={data.kontoinhaber}
                isEditing={isEditing}
                documentId={data.id}
                tableName="kindergeld_bescheide"
                fieldName="kontoinhaber"
                confidenceScore={confidenceScores.kontoinhaber}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default KindergeldBescheidResult;
