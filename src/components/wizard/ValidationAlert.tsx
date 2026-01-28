import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ValidationError } from "@/lib/validation-rules";

interface ValidationAlertProps {
  errors: ValidationError[];
}

export function ValidationAlert({ errors }: ValidationAlertProps) {
  if (errors.length === 0) return null;
  
  const criticalErrors = errors.filter(e => e.severity === 'error');
  const warnings = errors.filter(e => e.severity === 'warning');
  
  return (
    <div className="space-y-2">
      {criticalErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler gefunden</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {criticalErrors.map((error, idx) => (
                <li key={idx} className="text-sm">{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Hinweise</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx} className="text-sm">{warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface ValidationSuccessProps {
  message?: string;
}

export function ValidationSuccess({ message = "Alle Validierungen bestanden" }: ValidationSuccessProps) {
  return (
    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800 dark:text-green-300">Bereit</AlertTitle>
      <AlertDescription className="text-green-700 dark:text-green-400">
        {message}
      </AlertDescription>
    </Alert>
  );
}
