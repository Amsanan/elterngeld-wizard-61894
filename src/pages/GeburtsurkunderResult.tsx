import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { EditableField } from "@/components/documents/EditableField";

const GeburtsurkunderResult = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const resultId = searchParams.get("id");

  useEffect(() => {
    const fetchData = async () => {
      if (!resultId) {
        navigate("/dashboard");
        return;
      }

      try {
        const { data: gebData, error } = await supabase
          .from("geburtsurkunden")
          .select("*")
          .eq("id", resultId)
          .single();

        if (error) throw error;
        setData(gebData);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Fehler beim Laden",
          description: "Die Daten konnten nicht geladen werden.",
          variant: "destructive",
        });
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resultId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Lädt...</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nicht extrahiert";
    return dateStr;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/geburtsurkunden-list")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Liste
          </Button>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Erfolgreich extrahiert</h1>
              <p className="text-sm text-muted-foreground">
                Geburtsurkunde verarbeitet am {new Date(data.created_at).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Kind Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Kind - Extrahierte Daten
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <EditableField
                label="Vorname"
                value={data.kind_vorname}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="kind_vorname"
                onUpdate={(value) => setData({ ...data, kind_vorname: value })}
              />
              <EditableField
                label="Nachname"
                value={data.kind_nachname}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="kind_nachname"
                onUpdate={(value) => setData({ ...data, kind_nachname: value })}
              />
              <EditableField
                label="Geburtsdatum"
                value={data.kind_geburtsdatum}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="kind_geburtsdatum"
                type="date"
                onUpdate={(value) => setData({ ...data, kind_geburtsdatum: value })}
              />
              <EditableField
                label="Geburtsort"
                value={data.kind_geburtsort}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="kind_geburtsort"
                onUpdate={(value) => setData({ ...data, kind_geburtsort: value })}
              />
              <EditableField
                label="Geburtsnummer"
                value={data.kind_geburtsnummer}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="kind_geburtsnummer"
                onUpdate={(value) => setData({ ...data, kind_geburtsnummer: value })}
              />
            </div>
          </Card>

          {/* Mutter Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Mutter</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <EditableField
                label="Vorname"
                value={data.mutter_vorname}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="mutter_vorname"
                onUpdate={(value) => setData({ ...data, mutter_vorname: value })}
              />
              <EditableField
                label="Nachname"
                value={data.mutter_nachname}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="mutter_nachname"
                onUpdate={(value) => setData({ ...data, mutter_nachname: value })}
              />
              <EditableField
                label="Geburtsname"
                value={data.mutter_geburtsname}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="mutter_geburtsname"
                onUpdate={(value) => setData({ ...data, mutter_geburtsname: value })}
              />
            </div>
          </Card>

          {/* Vater Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Vater</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <EditableField
                label="Vorname"
                value={data.vater_vorname}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="vater_vorname"
                onUpdate={(value) => setData({ ...data, vater_vorname: value })}
              />
              <EditableField
                label="Nachname"
                value={data.vater_nachname}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="vater_nachname"
                onUpdate={(value) => setData({ ...data, vater_nachname: value })}
              />
            </div>
          </Card>

          {/* Urkunden Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Urkunden-Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <EditableField
                label="Urkundennummer"
                value={data.urkundennummer}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="urkundennummer"
                onUpdate={(value) => setData({ ...data, urkundennummer: value })}
              />
              <EditableField
                label="Behörde"
                value={data.behoerde_name}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="behoerde_name"
                onUpdate={(value) => setData({ ...data, behoerde_name: value })}
              />
              <EditableField
                label="Ausstelldatum"
                value={data.ausstelldatum}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="ausstelldatum"
                type="date"
                onUpdate={(value) => setData({ ...data, ausstelldatum: value })}
              />
              <EditableField
                label="Verwendungszweck"
                value={data.verwendungszweck}
                isEditing={isEditing}
                documentId={resultId!}
                tableName="geburtsurkunden"
                fieldName="verwendungszweck"
                onUpdate={(value) => setData({ ...data, verwendungszweck: value })}
              />
            </div>
          </Card>

          <DocumentActions
            documentId={resultId!}
            tableName="geburtsurkunden"
            listRoute="/geburtsurkunden-list"
            onEditToggle={setIsEditing}
          />

          <div className="flex gap-4 mt-4">
            <Button onClick={() => navigate("/geburtsurkunden-list")} variant="outline" className="flex-1">
              Alle Geburtsurkunden anzeigen
            </Button>
            <Button onClick={() => navigate("/upload-geburtsurkunde")} variant="outline" className="flex-1">
              Weitere hochladen
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GeburtsurkunderResult;
