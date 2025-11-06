import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { EditableField } from "@/components/documents/EditableField";

const ElternDokumentResult = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const id = searchParams.get("id");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        toast({
          title: "Fehler",
          description: "Keine ID angegeben",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      try {
        const { data: result, error } = await supabase
          .from("eltern_dokumente")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setData(result);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Fehler beim Laden",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Keine Daten gefunden</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Nicht verfügbar";
    return new Date(dateStr).toLocaleDateString("de-DE");
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "personalausweis":
        return "Personalausweis";
      case "reisepass":
        return "Reisepass";
      case "aufenthaltstitel":
        return "Aufenthaltstitel";
      default:
        return type;
    }
  };

  const documentTypeLabel = getDocumentTypeLabel(data.document_type);
  const personTypeLabel = data.person_type === "mutter" ? "Mutter" : "Vater";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/eltern-dokumente-list")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Liste
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Extrahierte Daten</h1>
          <p className="text-muted-foreground mt-1">
            {documentTypeLabel} - {personTypeLabel}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Dokumentinformationen</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Dokumenttyp</p>
                <p className="font-medium">{documentTypeLabel}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Elternteil</p>
                <p className="font-medium">{personTypeLabel}</p>
              </div>

              <EditableField
                label="Vorname"
                value={data.vorname}
                isEditing={isEditing}
                documentId={id!}
                tableName="eltern_dokumente"
                fieldName="vorname"
                onUpdate={(value) => setData({ ...data, vorname: value })}
              />

              <EditableField
                label="Nachname"
                value={data.nachname}
                isEditing={isEditing}
                documentId={id!}
                tableName="eltern_dokumente"
                fieldName="nachname"
                onUpdate={(value) => setData({ ...data, nachname: value })}
              />

              <EditableField
                label="Geburtsname"
                value={data.geburtsname}
                isEditing={isEditing}
                documentId={id!}
                tableName="eltern_dokumente"
                fieldName="geburtsname"
                onUpdate={(value) => setData({ ...data, geburtsname: value })}
              />

              <EditableField
                label="Geburtsdatum"
                value={data.geburtsdatum}
                isEditing={isEditing}
                documentId={id!}
                tableName="eltern_dokumente"
                fieldName="geburtsdatum"
                type="date"
                onUpdate={(value) => setData({ ...data, geburtsdatum: value })}
              />

              <EditableField
                label="Geburtsort"
                value={data.geburtsort}
                isEditing={isEditing}
                documentId={id!}
                tableName="eltern_dokumente"
                fieldName="geburtsort"
                onUpdate={(value) => setData({ ...data, geburtsort: value })}
              />

              <EditableField
                label="Staatsangehörigkeit"
                value={data.staatsangehoerigkeit}
                isEditing={isEditing}
                documentId={id!}
                tableName="eltern_dokumente"
                fieldName="staatsangehoerigkeit"
                onUpdate={(value) => setData({ ...data, staatsangehoerigkeit: value })}
              />

              <EditableField
                label={data.document_type === "personalausweis" ? "Ausweisnummer" : data.document_type === "aufenthaltstitel" ? "Aufenthaltstitel-Nummer" : "Reisepassnummer"}
                value={data.ausweisnummer}
                isEditing={isEditing}
                documentId={id!}
                tableName="eltern_dokumente"
                fieldName="ausweisnummer"
                onUpdate={(value) => setData({ ...data, ausweisnummer: value })}
              />

              <EditableField
                label="Gültig bis"
                value={data.gueltig_bis}
                isEditing={isEditing}
                documentId={id!}
                tableName="eltern_dokumente"
                fieldName="gueltig_bis"
                type="date"
                onUpdate={(value) => setData({ ...data, gueltig_bis: value })}
              />
            </div>

            {/* Address section */}
            {(data.plz || data.wohnort || data.strasse || data.hausnummer || data.wohnungsnummer) && (
              <>
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4">Adresse</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditableField
                      label="Straße"
                      value={data.strasse}
                      isEditing={isEditing}
                      documentId={id!}
                      tableName="eltern_dokumente"
                      fieldName="strasse"
                      onUpdate={(value) => setData({ ...data, strasse: value })}
                    />

                    <EditableField
                      label="Hausnummer"
                      value={data.hausnummer}
                      isEditing={isEditing}
                      documentId={id!}
                      tableName="eltern_dokumente"
                      fieldName="hausnummer"
                      onUpdate={(value) => setData({ ...data, hausnummer: value })}
                    />

                    <EditableField
                      label="Wohnungsnummer"
                      value={data.wohnungsnummer}
                      isEditing={isEditing}
                      documentId={id!}
                      tableName="eltern_dokumente"
                      fieldName="wohnungsnummer"
                      onUpdate={(value) => setData({ ...data, wohnungsnummer: value })}
                    />

                    <EditableField
                      label="PLZ"
                      value={data.plz}
                      isEditing={isEditing}
                      documentId={id!}
                      tableName="eltern_dokumente"
                      fieldName="plz"
                      onUpdate={(value) => setData({ ...data, plz: value })}
                    />

                    <EditableField
                      label="Wohnort"
                      value={data.wohnort}
                      isEditing={isEditing}
                      documentId={id!}
                      tableName="eltern_dokumente"
                      fieldName="wohnort"
                      onUpdate={(value) => setData({ ...data, wohnort: value })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Residence Permit section */}
            {(data.aufenthaltstitel_art || data.aufenthaltstitel_nummer || data.aufenthaltstitel_gueltig_von || 
              data.aufenthaltstitel_gueltig_bis || data.aufenthaltstitel_zweck) && (
              <>
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4">Aufenthaltstitel</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditableField
                      label="Art des Aufenthaltstitels"
                      value={data.aufenthaltstitel_art}
                      isEditing={isEditing}
                      documentId={id!}
                      tableName="eltern_dokumente"
                      fieldName="aufenthaltstitel_art"
                      onUpdate={(value) => setData({ ...data, aufenthaltstitel_art: value })}
                    />

                    <EditableField
                      label="Aufenthaltstitel-Nummer"
                      value={data.aufenthaltstitel_nummer}
                      isEditing={isEditing}
                      documentId={id!}
                      tableName="eltern_dokumente"
                      fieldName="aufenthaltstitel_nummer"
                      onUpdate={(value) => setData({ ...data, aufenthaltstitel_nummer: value })}
                    />

                    <EditableField
                      label="Gültig von"
                      value={data.aufenthaltstitel_gueltig_von}
                      isEditing={isEditing}
                      documentId={id!}
                      tableName="eltern_dokumente"
                      fieldName="aufenthaltstitel_gueltig_von"
                      type="date"
                      onUpdate={(value) => setData({ ...data, aufenthaltstitel_gueltig_von: value })}
                    />

                    <EditableField
                      label="Gültig bis"
                      value={data.aufenthaltstitel_gueltig_bis}
                      isEditing={isEditing}
                      documentId={id!}
                      tableName="eltern_dokumente"
                      fieldName="aufenthaltstitel_gueltig_bis"
                      type="date"
                      onUpdate={(value) => setData({ ...data, aufenthaltstitel_gueltig_bis: value })}
                    />

                    <div className="md:col-span-2">
                      <EditableField
                        label="Zweck des Aufenthalts"
                        value={data.aufenthaltstitel_zweck}
                        isEditing={isEditing}
                        documentId={id!}
                        tableName="eltern_dokumente"
                        fieldName="aufenthaltstitel_zweck"
                        onUpdate={(value) => setData({ ...data, aufenthaltstitel_zweck: value })}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>

          <DocumentActions
            documentId={id!}
            tableName="eltern_dokumente"
            listRoute="/eltern-dokumente-list"
            onEditToggle={setIsEditing}
          />

          <div className="flex gap-4 mt-4">
            <Button onClick={() => navigate("/eltern-dokumente-list")} variant="outline" className="flex-1">
              Zur Übersicht
            </Button>
            <Button onClick={() => navigate("/upload-eltern-dokument")} variant="outline" className="flex-1">
              Weiteres Dokument hochladen
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ElternDokumentResult;