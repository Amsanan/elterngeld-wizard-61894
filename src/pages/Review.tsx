import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const Review = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    vorname: "Max",
    nachname: "Mustermann",
    geburtsdatum: "1990-01-15",
    steuerID: "12345678901",
    strasse: "Musterstraße",
    hausnr: "123",
    plz: "12345",
    ort: "Berlin",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    toast({
      title: "Daten validiert",
      description: "Ihre Daten wurden erfolgreich überprüft.",
    });
    navigate("/generate");
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
                <h1 className="text-2xl font-bold text-foreground">Daten überprüfen</h1>
                <p className="text-sm text-muted-foreground">Schritt 2 von 4</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/upload")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <div className="flex items-start gap-3 mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Bitte überprüfen Sie Ihre Daten</h3>
                <p className="text-sm text-muted-foreground">
                  Die Daten wurden automatisch aus Ihren Dokumenten extrahiert. 
                  Bitte überprüfen Sie alle Felder sorgfältig und korrigieren Sie bei Bedarf.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">Persönliche Daten</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vorname">
                      Vorname(n)
                      <Badge variant="outline" className="ml-2 bg-success/10 text-success border-success/20">
                        98% Konfidenz
                      </Badge>
                    </Label>
                    <Input
                      id="vorname"
                      value={formData.vorname}
                      onChange={(e) => handleInputChange("vorname", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nachname">
                      Nachname(n)
                      <Badge variant="outline" className="ml-2 bg-success/10 text-success border-success/20">
                        95% Konfidenz
                      </Badge>
                    </Label>
                    <Input
                      id="nachname"
                      value={formData.nachname}
                      onChange={(e) => handleInputChange("nachname", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="geburtsdatum">
                      Geburtsdatum
                      <Badge variant="outline" className="ml-2 bg-warning/10 text-warning border-warning/20">
                        72% Konfidenz
                      </Badge>
                    </Label>
                    <Input
                      id="geburtsdatum"
                      type="date"
                      value={formData.geburtsdatum}
                      onChange={(e) => handleInputChange("geburtsdatum", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="steuerID">
                      Steuer-Identifikationsnummer
                      <Badge variant="outline" className="ml-2 bg-success/10 text-success border-success/20">
                        91% Konfidenz
                      </Badge>
                    </Label>
                    <Input
                      id="steuerID"
                      value={formData.steuerID}
                      onChange={(e) => handleInputChange("steuerID", e.target.value)}
                      maxLength={11}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">Wohnsitz</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="strasse">Straße</Label>
                    <Input
                      id="strasse"
                      value={formData.strasse}
                      onChange={(e) => handleInputChange("strasse", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hausnr">Hausnr.</Label>
                    <Input
                      id="hausnr"
                      value={formData.hausnr}
                      onChange={(e) => handleInputChange("hausnr", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plz">PLZ</Label>
                    <Input
                      id="plz"
                      value={formData.plz}
                      onChange={(e) => handleInputChange("plz", e.target.value)}
                      maxLength={5}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="ort">Ort</Label>
                    <Input
                      id="ort"
                      value={formData.ort}
                      onChange={(e) => handleInputChange("ort", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
              <Button onClick={handleContinue} className="flex-1">
                Weiter
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/upload")}>
                Zurück
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Review;
