import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, List, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { EditableField } from "@/components/documents/EditableField";

const formatMonth = (monthStr: string) => {
  if (!monthStr) return "";
  const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", 
                  "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const [year, month] = monthStr.split("-");
  return `${months[parseInt(month) - 1]} ${year}`;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const GehaltsnachweisResult = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) {
      toast({
        title: "Fehler",
        description: "Keine ID gefunden",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    const fetchData = async () => {
      const { data: result, error } = await supabase
        .from("gehaltsnachweise")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast({
          title: "Fehler",
          description: "Daten konnten nicht geladen werden",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setData(result);
      setLoading(false);
    };

    fetchData();
  }, [searchParams, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Laden...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Keine Daten gefunden</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Gehaltsnachweis für {data.person_type || "unbekannt"}
            </h1>
            <p className="text-muted-foreground">
              {formatMonth(data.abrechnungsmonat)}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Allgemeine Informationen
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField
                  label="Abrechnungsmonat"
                  value={data.abrechnungsmonat}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="abrechnungsmonat"
                  onUpdate={(value) => setData({ ...data, abrechnungsmonat: value })}
                />
                <EditableField
                  label="Arbeitgeber"
                  value={data.arbeitgeber_name}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="arbeitgeber_name"
                  onUpdate={(value) => setData({ ...data, arbeitgeber_name: value })}
                />
                <EditableField
                  label="Steuer-ID"
                  value={data.steuer_id}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="steuer_id"
                  onUpdate={(value) => setData({ ...data, steuer_id: value })}
                />
                <EditableField
                  label="Sozialversicherungsnummer"
                  value={data.sozialversicherungsnummer}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="sozialversicherungsnummer"
                  onUpdate={(value) => setData({ ...data, sozialversicherungsnummer: value })}
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Gehaltsübersicht
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField
                  label="Bruttogehalt"
                  value={data.bruttogehalt?.toString()}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="bruttogehalt"
                  type="number"
                  onUpdate={(value) => setData({ ...data, bruttogehalt: value })}
                />
                <EditableField
                  label="Nettogehalt"
                  value={data.nettogehalt?.toString()}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="nettogehalt"
                  type="number"
                  onUpdate={(value) => setData({ ...data, nettogehalt: value })}
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Steuerabzüge
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField
                  label="Lohnsteuer"
                  value={data.lohnsteuer?.toString()}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="lohnsteuer"
                  type="number"
                  onUpdate={(value) => setData({ ...data, lohnsteuer: value })}
                />
                <EditableField
                  label="Solidaritätszuschlag"
                  value={data.solidaritaetszuschlag?.toString()}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="solidaritaetszuschlag"
                  type="number"
                  onUpdate={(value) => setData({ ...data, solidaritaetszuschlag: value })}
                />
                <EditableField
                  label="Kirchensteuer"
                  value={data.kirchensteuer?.toString()}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="kirchensteuer"
                  type="number"
                  onUpdate={(value) => setData({ ...data, kirchensteuer: value })}
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Sozialversicherungsabzüge
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField
                  label="Krankenversicherung"
                  value={data.krankenversicherung?.toString()}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="krankenversicherung"
                  type="number"
                  onUpdate={(value) => setData({ ...data, krankenversicherung: value })}
                />
                <EditableField
                  label="Pflegeversicherung"
                  value={data.pflegeversicherung?.toString()}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="pflegeversicherung"
                  type="number"
                  onUpdate={(value) => setData({ ...data, pflegeversicherung: value })}
                />
                <EditableField
                  label="Rentenversicherung"
                  value={data.rentenversicherung?.toString()}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="rentenversicherung"
                  type="number"
                  onUpdate={(value) => setData({ ...data, rentenversicherung: value })}
                />
                <EditableField
                  label="Arbeitslosenversicherung"
                  value={data.arbeitslosenversicherung?.toString()}
                  isEditing={isEditing}
                  documentId={searchParams.get("id")!}
                  tableName="gehaltsnachweise"
                  fieldName="arbeitslosenversicherung"
                  type="number"
                  onUpdate={(value) => setData({ ...data, arbeitslosenversicherung: value })}
                />
              </div>
            </div>

            {(data.vermoegenswirksame_leistungen || data.sonstige_bezuege || data.sonstige_abzuege) && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">
                  Sonstige Abzüge/Bezüge
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.vermoegenswirksame_leistungen && (
                    <EditableField
                      label="Vermögenswirksame Leistungen"
                      value={data.vermoegenswirksame_leistungen?.toString()}
                      isEditing={isEditing}
                      documentId={searchParams.get("id")!}
                      tableName="gehaltsnachweise"
                      fieldName="vermoegenswirksame_leistungen"
                      type="number"
                      onUpdate={(value) => setData({ ...data, vermoegenswirksame_leistungen: value })}
                    />
                  )}
                  {data.sonstige_bezuege && (
                    <EditableField
                      label="Sonstige Bezüge"
                      value={data.sonstige_bezuege?.toString()}
                      isEditing={isEditing}
                      documentId={searchParams.get("id")!}
                      tableName="gehaltsnachweise"
                      fieldName="sonstige_bezuege"
                      type="number"
                      onUpdate={(value) => setData({ ...data, sonstige_bezuege: value })}
                    />
                  )}
                  {data.sonstige_abzuege && (
                    <EditableField
                      label="Sonstige Abzüge"
                      value={data.sonstige_abzuege?.toString()}
                      isEditing={isEditing}
                      documentId={searchParams.get("id")!}
                      tableName="gehaltsnachweise"
                      fieldName="sonstige_abzuege"
                      type="number"
                      onUpdate={(value) => setData({ ...data, sonstige_abzuege: value })}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="max-w-4xl mx-auto mt-6">
          <DocumentActions
            documentId={searchParams.get("id")!}
            tableName="gehaltsnachweise"
            listRoute="/gehaltsnachweise-list"
            onEditToggle={setIsEditing}
          />
        </div>

        <div className="max-w-4xl mx-auto mt-4 flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/gehaltsnachweise-list")}
            className="flex-1"
          >
            <List className="h-4 w-4 mr-2" />
            Zur Liste
          </Button>
          <Button
            onClick={() => navigate("/upload-gehaltsnachweis")}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Weitere hochladen
          </Button>
        </div>
      </main>
    </div>
  );
};

export default GehaltsnachweisResult;