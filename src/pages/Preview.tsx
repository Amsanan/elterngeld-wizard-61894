import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, ArrowLeft, Upload, CheckCircle2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { generateFilledPDF, downloadPDF, FormData } from "@/lib/pdfGenerator";
import { loadAntragData, getNextRequiredDocument, getDocumentDisplayName, calculateCompletionPercentage } from "@/lib/antragContext";
import { Badge } from "@/components/ui/badge";

const Preview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const antragId = searchParams.get('antrag');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [antragData, setAntragData] = useState<any>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [nextDocument, setNextDocument] = useState<string | null>(null);

  useEffect(() => {
    if (!antragId) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Kein Antrag gefunden.",
      });
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [antragId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await loadAntragData(antragId!);
      if (!data) {
        throw new Error('Antrag nicht gefunden');
      }

      setAntragData(data);
      setCompletionPercentage(calculateCompletionPercentage(data.filled_fields));
      setNextDocument(getNextRequiredDocument(data.uploaded_documents));

      // Auto-generate PDF preview
      await generatePreview(data.extracted_data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Laden",
        description: "Die Daten konnten nicht geladen werden.",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async (data: any) => {
    setGenerating(true);
    try {
      // Convert database data to FormData format
      const formData: FormData = {
        // Kind
        kind_vorname: data.kind_vorname,
        kind_nachname: data.kind_nachname,
        kind_geburtsdatum: data.kind_geburtsdatum,
        kind_geschlecht: data.kind_geschlecht,
        
        // Parent
        vorname: data.vorname,
        nachname: data.nachname,
        geburtsdatum: data.geburtsdatum,
        steuer_identifikationsnummer: data.steuer_identifikationsnummer,
        
        // Address
        strasse: data.strasse,
        hausnr: data.hausnr,
        plz: data.plz,
        ort: data.ort,
      };

      console.log('Generating PDF with data:', formData);

      const bytes = await generateFilledPDF(formData);
      setPdfBytes(bytes);

      // Create blob URL for preview
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      toast({
        title: "PDF-Vorschau erstellt",
        description: "Das PDF wurde mit den aktuellen Daten erstellt.",
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error instanceof Error ? error.message : "PDF konnte nicht generiert werden.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfBytes) {
      downloadPDF(pdfBytes, `elterngeldantrag_vorschau_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({
        title: "Download gestartet",
        description: "Die PDF-Datei wird heruntergeladen.",
      });
    }
  };

  const handleUploadNext = () => {
    // Keep the current antrag_id for next upload
    sessionStorage.setItem('current_antrag_id', antragId!);
    navigate('/upload');
  };

  const handleFinish = () => {
    sessionStorage.removeItem('current_antrag_id');
    navigate('/dashboard');
    toast({
      title: "Antrag gespeichert",
      description: "Ihr Antrag wurde erfolgreich gespeichert. Sie können ihn jederzeit weiterbearbeiten.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Progress value={50} className="w-64 mb-4" />
          <p className="text-muted-foreground">Lade Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">PDF-Vorschau</h1>
                <p className="text-sm text-muted-foreground">
                  Fortschritt: {completionPercentage}%
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zum Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* PDF Preview */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 text-foreground">Ausgefülltes Formular</h2>
              
              {generating ? (
                <div className="flex items-center justify-center h-[600px] bg-secondary/20 rounded-lg">
                  <div className="text-center">
                    <Progress value={50} className="w-64 mb-4" />
                    <p className="text-muted-foreground">PDF wird generiert...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-[600px]"
                    title="PDF Preview"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[600px] bg-secondary/20 rounded-lg">
                  <p className="text-muted-foreground">Keine Vorschau verfügbar</p>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button onClick={handleDownload} disabled={!pdfBytes}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF herunterladen
                </Button>
                <Button variant="outline" onClick={() => generatePreview(antragData?.extracted_data)}>
                  Vorschau aktualisieren
                </Button>
              </div>
            </Card>
          </div>

          {/* Status & Actions */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 text-foreground">Fortschritt</h3>
              <Progress value={completionPercentage} className="mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                {completionPercentage}% der Felder ausgefüllt
              </p>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Hochgeladene Dokumente:</h4>
                {antragData?.uploaded_documents.map((doc: string) => (
                  <div key={doc} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">{getDocumentDisplayName(doc)}</span>
                  </div>
                )) }
              </div>
            </Card>

            {/* Next Steps Card */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 text-foreground">Nächste Schritte</h3>
              
              {nextDocument ? (
                <>
                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-foreground mb-2">
                      Fehlendes Dokument:
                    </p>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      {getDocumentDisplayName(nextDocument)}
                    </Badge>
                  </div>

                  <Button onClick={handleUploadNext} className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Weiteres Dokument hochladen
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <p className="text-sm font-semibold text-foreground">
                        Alle Dokumente hochgeladen!
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sie können weitere Felder manuell ausfüllen oder den Antrag abschließen.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button onClick={handleUploadNext} variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Weiteres Dokument hinzufügen
                    </Button>
                    <Button onClick={handleFinish} className="w-full">
                      Antrag speichern & beenden
                    </Button>
                  </div>
                </>
              )}
            </Card>

            {/* Info Card */}
            <Card className="p-6 bg-secondary/20">
              <h4 className="font-semibold mb-2 text-foreground">Hinweis</h4>
              <p className="text-sm text-muted-foreground">
                Die Felder in Abschnitt "Antrag_11_Elterngeld_EG Tabelle" müssen Sie manuell 
                im heruntergeladenen PDF ausfüllen (Checkboxen und Arbeitszeit).
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Preview;
