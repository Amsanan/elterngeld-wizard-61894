import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DOKUMENT_TYPEN = [
  { value: "aerztliches_attest", label: "Ärztliches Attest", hint: "Z.B. bei Behinderung des Kindes oder schwangerschaftsbedingter Erkrankung" },
  { value: "hebammenzeugnis", label: "Hebammenzeugnis / Errechneter Termin", hint: "Nachweis über den errechneten Geburtstermin bei Frühgeburt" },
  { value: "schwerbehindertenausweis", label: "Schwerbehindertenausweis", hint: "Bei Behinderung des Kindes (GdB ≥ 20) für Geschwisterbonus" },
  { value: "sterbeurkunde", label: "Sterbeurkunde", hint: "Falls ein Elternteil verstorben ist" },
  { value: "haftbescheinigung", label: "Haftbescheinigung", hint: "Falls ein Elternteil inhaftiert ist" },
  { value: "elstam_auszug", label: "ELStAM-Auszug", hint: "Nachweis Steuerklasse II für Alleinerziehende" },
  { value: "kindergeldbescheid", label: "Kindergeldbescheid", hint: "Für Geschwisterbonus-Nachweis" },
  { value: "rentenbescheid", label: "Rentenbescheid", hint: "Bei Rentenbezug im Bemessungszeitraum" },
  { value: "elterngeldbescheid_aelteres_kind", label: "Elterngeldbescheid (älteres Kind)", hint: "Von anderer Elterngeldstelle" },
  { value: "beschaeftigungsverbot", label: "Beschäftigungsverbot", hint: "Ärztliches oder behördliches Beschäftigungsverbot" },
  { value: "entsendungsbescheinigung", label: "Entsendungsbescheinigung", hint: "Bei Arbeit/Leben im Ausland durch Entsendung" },
  { value: "vaterschaftsanerkennung", label: "Vaterschaftsanerkennung", hint: "Falls Vater nicht auf Geburtsurkunde steht" },
  { value: "einnahmen_ueberschuss_rechnung", label: "Einnahmen-Überschuss-Rechnung (EÜR)", hint: "Bei Selbstständigkeit mit geringen Einkünften" },
  { value: "krankentagegeld_bescheinigung", label: "Krankentagegeld-Bescheinigung", hint: "Von privater Krankenversicherung" },
  { value: "arbeitsvertrag", label: "Arbeitsvertrag", hint: "Nachweis über Arbeitszeit und Einkommen nach Geburt" },
  { value: "ausbildungsvertrag", label: "Ausbildungsvertrag", hint: "Bei Ausbildung nach der Geburt" },
  { value: "bezuegemitteilung_beamte", label: "Bezügemitteilung (Beamte/Soldaten)", hint: "Für Beamtinnen/Soldatinnen statt Mutterschaftsgeld" },
  { value: "tagespflege_eignung", label: "Eignungsnachweis Tagespflege", hint: "Vom Jugendamt bei Tagespflege" },
  { value: "leistungsnachweis_ausland", label: "Leistungsnachweis aus dem Ausland", hint: "Vergleichbare Leistungen aus anderen Ländern" },
  { value: "vertretungsnachweis", label: "Vertretungsnachweis", hint: "Betreuerausweis oder Bestallungsurkunde" },
  { value: "feststellungsbeschluss_familiengericht", label: "Feststellungsbeschluss Familiengericht", hint: "Bei Auslandsadoption in Deutschland anerkannt" },
  { value: "sonstige", label: "Sonstiges Dokument", hint: "Andere relevante Nachweise" },
];

const UploadSonstigeNachweise = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dokumentTyp, setDokumentTyp] = useState<string>("");
  const [personType, setPersonType] = useState<string>("Mutter");
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const selectedTypInfo = DOKUMENT_TYPEN.find(t => t.value === dokumentTyp);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !dokumentTyp) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Dokumenttyp und eine Datei aus.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Sie müssen angemeldet sein");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/sonstige/${dokumentTyp}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("application-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke(
        "extract-sonstige-nachweise",
        {
          body: { filePath, dokumentTyp, personType },
        }
      );

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: `${selectedTypInfo?.label || 'Dokument'} erfolgreich extrahiert!`,
      });

      navigate(`/sonstige-nachweise-result?id=${data.data.id}`);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground">
            Sonstige Nachweise hochladen
          </h1>
          <p className="text-muted-foreground mt-1">
            Für alle weiteren Dokumente, die im Elterngeldantrag benötigt werden
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-4 block">
                Dokumenttyp auswählen
              </Label>
              <Select value={dokumentTyp} onValueChange={setDokumentTyp}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Bitte wählen Sie den Dokumenttyp..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {DOKUMENT_TYPEN.map((typ) => (
                    <SelectItem key={typ.value} value={typ.value}>
                      {typ.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTypInfo && (
                <div className="mt-3 p-3 bg-muted rounded-lg flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {selectedTypInfo.hint}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label className="text-base font-semibold mb-4 block">
                Für welches Elternteil? (optional)
              </Label>
              <RadioGroup value={personType} onValueChange={setPersonType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Mutter" id="mutter" />
                  <Label htmlFor="mutter" className="cursor-pointer">
                    Mutter
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Vater" id="vater" />
                  <Label htmlFor="vater" className="cursor-pointer">
                    Vater
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="file">Datei auswählen (PDF oder Bild)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="mt-2"
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || !dokumentTyp || isUploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Wird hochgeladen..." : "Hochladen und analysieren"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default UploadSonstigeNachweise;
