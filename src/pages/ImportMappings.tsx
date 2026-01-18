import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, FileJson, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ImportResult {
  success: boolean;
  summary: {
    totalReceived: number;
    processed: number;
    inserted: number;
    skipped: number;
    errors: number;
    totalInDatabase: number;
    tableDistribution?: Record<string, number>;
  };
  skippedDetails?: string[];
  errorDetails?: string[];
}

export default function ImportMappings() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'upsert' | 'replace'>('upsert');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setError(null);

    try {
      const text = await selectedFile.text();
      
      if (selectedFile.name.endsWith('.json')) {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setParsedData(data);
          toast({
            title: "JSON geladen",
            description: `${data.length} Mapping-Einträge gefunden`,
          });
        } else {
          throw new Error('JSON muss ein Array sein');
        }
      } else if (selectedFile.name.endsWith('.csv')) {
        // Simple CSV parsing
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const obj: Record<string, string | number> = {};
          headers.forEach((h, i) => {
            const val = values[i] || '';
            // Try to parse numbers
            const num = parseFloat(val);
            obj[h] = !isNaN(num) && val !== '' ? num : val;
          });
          return obj;
        });
        setParsedData(data);
        toast({
          title: "CSV geladen",
          description: `${data.length} Mapping-Einträge gefunden`,
        });
      } else {
        throw new Error('Nur JSON oder CSV Dateien werden unterstützt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Parsen der Datei');
      setParsedData(null);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setImporting(true);
    setProgress(10);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Nicht angemeldet');
      }

      setProgress(30);

      const { data, error: fnError } = await supabase.functions.invoke('import-field-mappings', {
        body: {
          mappings: parsedData,
          documentType: 'elterngeldantrag',
          mode: importMode
        }
      });

      setProgress(90);

      if (fnError) throw fnError;

      setResult(data);
      setProgress(100);

      if (data.success) {
        toast({
          title: "Import erfolgreich",
          description: `${data.summary.inserted} von ${data.summary.totalReceived} Mappings importiert`,
        });
      } else {
        toast({
          title: "Import mit Fehlern",
          description: `${data.summary.errors} Fehler aufgetreten`,
          variant: "destructive"
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import fehlgeschlagen');
      toast({
        title: "Import fehlgeschlagen",
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/field-mapper')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Feld-Mappings importieren</h1>
            <p className="text-muted-foreground">JSON oder CSV Datei mit PDF-Feld-Mappings hochladen</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Datei auswählen
              </CardTitle>
              <CardDescription>
                Unterstützte Formate: JSON, CSV mit den Spalten: technischer_name, ziel_feld_de, seite, koord_x, koord_y, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                disabled={importing}
              />
              
              {parsedData && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{parsedData.length} Einträge gefunden</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Erste Felder: {parsedData.slice(0, 3).map(r => r.technischer_name || r.pdf_field_name).filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import Mode */}
          {parsedData && (
            <Card>
              <CardHeader>
                <CardTitle>Import-Modus</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as 'upsert' | 'replace')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="upsert" id="upsert" />
                    <Label htmlFor="upsert">
                      <span className="font-medium">Aktualisieren (Upsert)</span>
                      <span className="text-muted-foreground ml-2">- Neue hinzufügen, bestehende aktualisieren</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace">
                      <span className="font-medium">Ersetzen</span>
                      <span className="text-muted-foreground ml-2">- Alle bestehenden löschen und neu importieren</span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {importing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Importiere...</p>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result */}
          {result && (
            <Card className={result.success ? 'border-green-500' : 'border-yellow-500'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  Import-Ergebnis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{result.summary.totalReceived}</p>
                    <p className="text-xs text-muted-foreground">Empfangen</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{result.summary.inserted}</p>
                    <p className="text-xs text-muted-foreground">Importiert</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">{result.summary.skipped}</p>
                    <p className="text-xs text-muted-foreground">Übersprungen</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{result.summary.totalInDatabase}</p>
                    <p className="text-xs text-muted-foreground">Gesamt in DB</p>
                  </div>
                </div>

                {result.summary.tableDistribution && (
                  <div>
                    <p className="font-medium mb-2">Tabellen-Verteilung:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(result.summary.tableDistribution).map(([table, count]) => (
                        <span key={table} className="px-2 py-1 bg-muted rounded text-sm">
                          {table}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.errorDetails && result.errorDetails.length > 0 && (
                  <div>
                    <p className="font-medium text-destructive mb-2">Fehler:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {result.errorDetails.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/field-mapper')}
            >
              Zurück
            </Button>
            <Button
              onClick={handleImport}
              disabled={!parsedData || importing}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importiere...' : `${parsedData?.length || 0} Mappings importieren`}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
