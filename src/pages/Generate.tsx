import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, ArrowLeft, Download, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const Generate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setProgress(0);

    // Simulate PDF generation progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 200);

    // TODO: Implement actual PDF generation with pdf-lib
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setGenerating(false);
      setGenerated(true);
      
      toast({
        title: "PDF erfolgreich erstellt",
        description: "Ihr ausgefüllter Elterngeldantrag ist bereit zum Download.",
      });
    }, 4000);
  };

  const handleDownload = () => {
    // TODO: Implement actual PDF download
    toast({
      title: "Download gestartet",
      description: "Die PDF-Datei wird heruntergeladen.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">PDF generieren</h1>
                <p className="text-sm text-muted-foreground">Schritt 3 von 4</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/review")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            {!generated ? (
              <>
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-10 w-10 text-primary" />
                </div>

                <h2 className="text-2xl font-bold mb-4 text-foreground">
                  Bereit zum Generieren
                </h2>
                <p className="text-muted-foreground mb-8">
                  Alle Ihre Daten wurden überprüft und sind bereit, 
                  in das offizielle Elterngeldantrags-Formular übertragen zu werden.
                </p>

                {generating && (
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      PDF wird generiert... {progress}%
                    </p>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full sm:w-auto"
                >
                  {generating ? "Wird generiert..." : "PDF jetzt generieren"}
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>

                <h2 className="text-2xl font-bold mb-4 text-foreground">
                  PDF erfolgreich erstellt!
                </h2>
                <p className="text-muted-foreground mb-8">
                  Ihr ausgefüllter Elterngeldantrag ist bereit. 
                  Sie können die PDF-Datei jetzt herunterladen.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" onClick={handleDownload}>
                    <Download className="h-5 w-5 mr-2" />
                    PDF herunterladen
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
                    Zum Dashboard
                  </Button>
                </div>
              </>
            )}
          </Card>

          {/* Info Card */}
          <Card className="mt-6 p-6 bg-secondary/20">
            <h4 className="font-semibold mb-2 text-foreground">Nächste Schritte:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>1. PDF-Datei herunterladen</li>
              <li>2. Unterschreiben Sie das Dokument</li>
              <li>3. Senden Sie es an Ihre zuständige Elterngeldstelle</li>
              <li>4. Fügen Sie alle erforderlichen Nachweise bei</li>
            </ul>
          </Card>

          <Card className="mt-6 p-6 bg-accent/5 border-accent/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-accent" />
              Datenschutz
            </h4>
            <p className="text-sm text-muted-foreground">
              Alle Ihre Daten werden nach dem Download automatisch nach 30 Tagen 
              von unseren Servern gelöscht. Die PDF-Datei verbleibt nur auf Ihrem Gerät.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Generate;
