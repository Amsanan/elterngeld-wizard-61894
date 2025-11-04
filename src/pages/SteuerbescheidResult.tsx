import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Edit2, Trash2, Save } from "lucide-react";
import { ConfidenceBadge } from "@/components/documents/ConfidenceBadge";
import { EditableField } from "@/components/documents/EditableField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SteuerbescheidResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const confidenceScores = data?.confidence_scores || {};
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("einkommensteuerbescheide")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Steuerbescheid erfolgreich gelöscht");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Fehler beim Löschen");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleUpdate = (field: string, value: string) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };
  
  const renderFieldWithConfidence = (label: string, value: string | null, fieldKey: string, suffix = "", type: "text" | "date" | "number" = "text") => {
    if (!value && !isEditing) return null;
    const score = confidenceScores[fieldKey];
    
    return (
      <EditableField
        label={label}
        value={value}
        isEditing={isEditing}
        documentId={id!}
        tableName="einkommensteuerbescheide"
        fieldName={fieldKey}
        type={type}
        onUpdate={(newValue) => handleUpdate(fieldKey, newValue)}
        confidenceScore={score}
      />
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
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <div className="flex gap-2">
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Fertig
                </>
              ) : (
                <>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Bearbeiten
                </>
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Der Steuerbescheid wird dauerhaft gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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
            
            {renderFieldWithConfidence("Finanzamt", data.finanzamt_name, "finanzamt_name")}
            {renderFieldWithConfidence("Finanzamt Adresse", data.finanzamt_adresse, "finanzamt_adresse")}
            {renderFieldWithConfidence("Bescheiddatum", data.bescheiddatum, "bescheiddatum", "", "date")}
            {renderFieldWithConfidence("Vorname", data.vorname, "vorname")}
            {renderFieldWithConfidence("Nachname", data.nachname, "nachname")}
            {renderFieldWithConfidence("Steuerjahr", data.steuerjahr, "steuerjahr")}
            {renderFieldWithConfidence("Steuernummer", data.steuernummer, "steuernummer")}
            {renderFieldWithConfidence("Steuer-ID", data.steuer_id_nummer, "steuer_id_nummer")}
            {renderFieldWithConfidence("PLZ", data.plz, "plz")}
            {renderFieldWithConfidence("Wohnort", data.wohnort, "wohnort")}

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Einkünfte</h3>
              {renderFieldWithConfidence("Bruttoarbeitslohn", data.bruttoarbeitslohn, "bruttoarbeitslohn", " EUR", "number")}
              {renderFieldWithConfidence("Einkünfte aus selbständiger Arbeit", data.einkuenfte_selbstaendig, "einkuenfte_selbstaendig", " EUR", "number")}
              {renderFieldWithConfidence("Werbungskosten", data.werbungskosten, "werbungskosten", " EUR", "number")}
              {renderFieldWithConfidence("Summe der Einkünfte", data.summe_der_einkuenfte, "summe_der_einkuenfte", " EUR", "number")}
              {renderFieldWithConfidence("Gesamtbetrag der Einkünfte", data.gesamtbetrag_der_einkuenfte, "gesamtbetrag_der_einkuenfte", " EUR", "number")}
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Steuerberechnung</h3>
              {renderFieldWithConfidence("Zu versteuerndes Einkommen", data.zu_versteuerndes_einkommen, "zu_versteuerndes_einkommen", " EUR", "number")}
              {renderFieldWithConfidence("Festgesetzte Einkommensteuer", data.festgesetzte_steuer, "festgesetzte_steuer", " EUR", "number")}
              {renderFieldWithConfidence("Solidaritätszuschlag", data.solidaritaetszuschlag, "solidaritaetszuschlag", " EUR", "number")}
              {renderFieldWithConfidence("Steuerabzug vom Lohn", data.steuerabzug_vom_lohn, "steuerabzug_vom_lohn", " EUR", "number")}
              {renderFieldWithConfidence("Verbleibende Steuer", data.verbleibende_steuer, "verbleibende_steuer", " EUR", "number")}
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
