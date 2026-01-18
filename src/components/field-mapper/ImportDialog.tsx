import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  documentType: string;
}

interface ImportResult {
  success: boolean;
  summary: {
    totalReceived: number;
    processed: number;
    inserted: number;
    skipped: number;
    errors: number;
    totalInDatabase: number;
  };
  skippedDetails: string[];
  errorDetails: string[];
}

export function ImportDialog({ open, onOpenChange, onImportComplete, documentType }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'upsert' | 'replace'>('upsert');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setResult(null);
    setParsedData(null);

    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/json'
    ];

    if (selectedFile.name.endsWith('.json')) {
      // Parse JSON directly
      try {
        const text = await selectedFile.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setParsedData(data);
        } else if (data.mappings && Array.isArray(data.mappings)) {
          setParsedData(data.mappings);
        } else {
          setError('JSON muss ein Array oder ein Objekt mit "mappings" Array sein');
        }
      } catch (err) {
        setError('Fehler beim Parsen der JSON-Datei');
      }
    } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
      // For Excel files, we need to convert them to JSON first
      // This would typically be done with a library like xlsx/sheetjs
      // For now, we'll show a message that the user needs to export as JSON
      setError('Excel-Dateien werden noch nicht direkt unterstützt. Bitte exportieren Sie die Datei als JSON.');
    } else if (selectedFile.name.endsWith('.csv')) {
      // Parse CSV
      try {
        const text = await selectedFile.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: Record<string, any> = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });
        
        setParsedData(data);
      } catch (err) {
        setError('Fehler beim Parsen der CSV-Datei');
      }
    } else {
      setError('Ungültiger Dateityp. Bitte JSON oder CSV verwenden.');
    }
  }, []);

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      setError('Keine Daten zum Importieren');
      return;
    }

    setImporting(true);
    setProgress(10);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('Nicht authentifiziert');
      }

      setProgress(30);

      const response = await supabase.functions.invoke('import-field-mappings', {
        body: {
          mappings: parsedData,
          documentType: documentType,
          mode: importMode,
        },
      });

      setProgress(90);

      if (response.error) {
        throw new Error(response.error.message || 'Import fehlgeschlagen');
      }

      const importResult = response.data as ImportResult;
      setResult(importResult);
      setProgress(100);

      if (importResult.success) {
        toast.success(`${importResult.summary.inserted} Mappings importiert`);
        onImportComplete();
      } else {
        toast.error('Import mit Fehlern abgeschlossen');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      toast.error('Import fehlgeschlagen');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setResult(null);
    setError(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel-Mapping importieren
          </DialogTitle>
          <DialogDescription>
            Importieren Sie Feld-Mappings aus einer JSON- oder CSV-Datei in die Datenbank.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Datei auswählen</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file-upload"
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                disabled={importing}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Ausgewählt: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Parsed Data Preview */}
          {parsedData && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {parsedData.length} Zeilen erkannt und bereit zum Import
              </AlertDescription>
            </Alert>
          )}

          {/* Import Mode */}
          {parsedData && (
            <div className="space-y-2">
              <Label>Import-Modus</Label>
              <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as 'upsert' | 'replace')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upsert" id="upsert" />
                  <Label htmlFor="upsert" className="font-normal">
                    Aktualisieren (bestehende Mappings behalten, neue hinzufügen)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="font-normal text-destructive">
                    Ersetzen (alle bestehenden Mappings für "{documentType}" löschen)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Importiere... {progress}%
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Import-Ergebnis</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Empfangen:</span>
                <span>{result.summary.totalReceived}</span>
                <span>Verarbeitet:</span>
                <span>{result.summary.processed}</span>
                <span>Importiert:</span>
                <span className="text-green-600 font-medium">{result.summary.inserted}</span>
                <span>Übersprungen:</span>
                <span className="text-yellow-600">{result.summary.skipped}</span>
                <span>Fehler:</span>
                <span className="text-red-600">{result.summary.errors}</span>
                <span>Gesamt in DB:</span>
                <span className="font-medium">{result.summary.totalInDatabase}</span>
              </div>

              {result.errorDetails.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-destructive">Fehler:</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4">
                    {result.errorDetails.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {result ? 'Schließen' : 'Abbrechen'}
          </Button>
          {!result && (
            <Button 
              onClick={handleImport} 
              disabled={!parsedData || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importieren ({parsedData?.length || 0} Zeilen)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
