import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ValidationAlert, ValidationSuccess } from "./ValidationAlert";
import { 
  Check, 
  AlertCircle, 
  Clock, 
  SkipForward, 
  FileDown, 
  ArrowLeft,
  Eye
} from "lucide-react";
import type { FieldState, PageStats } from "@/lib/fill-mode-engine";
import type { ValidationSummary } from "@/lib/validation-rules";

interface FinalReviewChecklistProps {
  fieldStates: Record<string, FieldState>;
  pageStats: PageStats[];
  validationSummary: ValidationSummary;
  onGoBack: () => void;
  onPreview: () => void;
  onExport: () => void;
  isExporting?: boolean;
}

export function FinalReviewChecklist({
  fieldStates,
  pageStats,
  validationSummary,
  onGoBack,
  onPreview,
  onExport,
  isExporting = false
}: FinalReviewChecklistProps) {
  // Calculate totals
  const totals = pageStats.reduce((acc, stats) => ({
    total: acc.total + stats.total,
    autoFilled: acc.autoFilled + stats.autoFilled,
    confirmed: acc.confirmed + stats.confirmed,
    suggestedPending: acc.suggestedPending + stats.suggestedPending,
    skipped: acc.skipped + stats.skipped,
    empty: acc.empty + stats.empty,
  }), { total: 0, autoFilled: 0, confirmed: 0, suggestedPending: 0, skipped: 0, empty: 0 });
  
  const completionPercent = totals.total > 0 
    ? Math.round(((totals.autoFilled + totals.confirmed + totals.skipped) / totals.total) * 100)
    : 0;
  
  const pendingItems = totals.suggestedPending + totals.empty;
  const canExport = validationSummary.canSubmit && pendingItems === 0;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 Abschluss-Prüfung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Gesamtfortschritt</span>
              <span className="text-2xl font-bold">{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-3" />
          </div>
          
          <Separator />
          
          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Check className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {totals.autoFilled}
              </div>
              <div className="text-xs text-muted-foreground">Auto-befüllt</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Check className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {totals.confirmed}
              </div>
              <div className="text-xs text-muted-foreground">Bestätigt</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {totals.suggestedPending}
              </div>
              <div className="text-xs text-muted-foreground">Ausstehend</div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <SkipForward className="h-5 w-5 mx-auto mb-1 text-gray-500" />
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                {totals.skipped}
              </div>
              <div className="text-xs text-muted-foreground">Übersprungen</div>
            </div>
          </div>
          
          <Separator />
          
          {/* Pending Items */}
          {pendingItems > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                Noch ausstehend ({pendingItems})
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-2">
                {totals.empty > 0 && (
                  <li>{totals.empty} Entscheidungsfelder nicht gesetzt</li>
                )}
                {totals.suggestedPending > 0 && (
                  <li>{totals.suggestedPending} Vorschläge nicht bestätigt</li>
                )}
              </ul>
            </div>
          )}
          
          {/* Validation Errors */}
          <ValidationAlert errors={[...validationSummary.errors, ...validationSummary.warnings]} />
          
          {/* Success Message */}
          {canExport && (
            <ValidationSuccess message="Alle Felder ausgefüllt und validiert. Bereit zum Export!" />
          )}
          
          <Separator />
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={onGoBack} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Bearbeitung
            </Button>
            
            <Button variant="outline" onClick={onPreview} className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Vorschau PDF
            </Button>
            
            <Button 
              onClick={onExport} 
              disabled={!canExport || isExporting}
              className="flex-1"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportiere...' : 'PDF Exportieren'}
            </Button>
          </div>
          
          {!canExport && (
            <p className="text-xs text-muted-foreground text-center">
              Bitte füllen Sie alle erforderlichen Felder aus und beheben Sie die Validierungsfehler, 
              bevor Sie den Antrag exportieren.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
