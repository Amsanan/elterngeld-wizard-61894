import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FillModeBadge } from "./FillModeBadge";
import { 
  Check, 
  X, 
  Pencil, 
  RotateCcw, 
  SkipForward, 
  HelpCircle,
  FileText,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FillMode, FieldStatus, DocEvidence } from "@/lib/fill-mode-engine";
import { getDocTypeLabel } from "@/lib/fill-mode-engine";
import { useState } from "react";

interface FillModeFieldCardProps {
  pdfFieldName: string;
  labelDe: string;
  currentValue: string | boolean | null;
  suggestedValue: string | boolean | null;
  fillMode: FillMode;
  fillReason: string;
  docEvidence: DocEvidence[];
  hasAnalysisLink: boolean;
  status: FieldStatus;
  fieldType: 'text' | 'checkbox' | 'date' | 'number';
  validationError?: string;
  onConfirm: (value: any) => void;
  onEdit: (value: any) => void;
  onSkip: () => void;
  onUndo: () => void;
  onWhyAsked?: () => void;
}

export function FillModeFieldCard({
  pdfFieldName,
  labelDe,
  currentValue,
  suggestedValue,
  fillMode,
  fillReason,
  docEvidence,
  hasAnalysisLink,
  status,
  fieldType,
  validationError,
  onConfirm,
  onEdit,
  onSkip,
  onUndo,
  onWhyAsked
}: FillModeFieldCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | boolean>(
    currentValue ?? suggestedValue ?? (fieldType === 'checkbox' ? false : '')
  );
  
  const displayValue = currentValue ?? suggestedValue;
  const hasValue = displayValue !== null && displayValue !== undefined && displayValue !== '';
  
  // Determine card styling based on status
  const getCardStyle = () => {
    switch (status) {
      case 'auto_filled':
        return 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20';
      case 'confirmed':
      case 'user_edited':
        return 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20';
      case 'suggested_pending':
        return 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'skipped':
        return 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50 opacity-60';
      case 'empty':
      default:
        if (fillMode === 'CONFIRM_ONLY') {
          return 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-900/20';
        }
        return 'border-border';
    }
  };
  
  const getStatusIcon = () => {
    switch (status) {
      case 'auto_filled':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'confirmed':
      case 'user_edited':
        return <Check className="h-4 w-4 text-blue-600" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-gray-500" />;
      case 'suggested_pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };
  
  const handleSaveEdit = () => {
    onEdit(editValue);
    setIsEditing(false);
  };
  
  const handleCancelEdit = () => {
    setEditValue(currentValue ?? suggestedValue ?? (fieldType === 'checkbox' ? false : ''));
    setIsEditing(false);
  };
  
  const handleConfirmSuggestion = () => {
    onConfirm(suggestedValue);
  };
  
  return (
    <Card className={cn("transition-colors", getCardStyle())}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusIcon()}
            <CardTitle className="text-sm font-medium">{labelDe}</CardTitle>
            <FillModeBadge fillMode={fillMode} />
          </div>
          {hasAnalysisLink && onWhyAsked && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onWhyAsked}
            >
              <HelpCircle className="h-3 w-3 mr-1" />
              Warum?
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{fillReason}</p>
      </CardHeader>
      
      <CardContent className="py-3 px-4 pt-0">
        {/* Document Evidence */}
        {docEvidence.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {docEvidence.map((doc, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="text-xs flex items-center gap-1"
              >
                <FileText className="h-3 w-3" />
                {getDocTypeLabel(doc.docType)}
                {doc.confidence > 0 && (
                  <span className="text-muted-foreground">
                    ({Math.round(doc.confidence * 100)}%)
                  </span>
                )}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Validation Error */}
        {validationError && (
          <div className="flex items-center gap-2 text-destructive text-xs mb-3">
            <AlertCircle className="h-3 w-3" />
            {validationError}
          </div>
        )}
        
        {/* Value Display / Edit */}
        <div className="space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              {fieldType === 'checkbox' ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editValue as boolean}
                    onCheckedChange={(checked) => setEditValue(checked as boolean)}
                  />
                  <span className="text-sm">Ja</span>
                </div>
              ) : (
                <Input
                  type={fieldType === 'date' ? 'date' : fieldType === 'number' ? 'number' : 'text'}
                  value={editValue as string}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="text-sm"
                  autoFocus
                />
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  <Check className="h-3 w-3 mr-1" />
                  Speichern
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="h-3 w-3 mr-1" />
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Display current/suggested value */}
              {fieldType === 'checkbox' ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={currentValue as boolean ?? false}
                    onCheckedChange={(checked) => {
                      onConfirm(checked);
                    }}
                    disabled={status === 'skipped'}
                  />
                  <span className="text-sm">
                    {currentValue === true ? 'Ja' : currentValue === false ? 'Nein' : 
                     suggestedValue === true ? '(Vorschlag: Ja)' : 'Auswahl erforderlich'}
                  </span>
                </div>
              ) : (
                <div className="text-sm">
                  {status === 'auto_filled' && (
                    <span className="font-medium text-green-700 dark:text-green-400">
                      {String(currentValue)}
                    </span>
                  )}
                  {status === 'confirmed' || status === 'user_edited' ? (
                    <span className="font-medium text-blue-700 dark:text-blue-400">
                      {String(currentValue)}
                    </span>
                  ) : null}
                  {status === 'suggested_pending' && suggestedValue && (
                    <span className="text-yellow-700 dark:text-yellow-400">
                      Vorschlag: {String(suggestedValue)}
                    </span>
                  )}
                  {status === 'empty' && !suggestedValue && (
                    <span className="text-muted-foreground italic">Nicht ausgefüllt</span>
                  )}
                  {status === 'skipped' && (
                    <span className="text-muted-foreground italic">Übersprungen</span>
                  )}
                </div>
              )}
              
              {/* Action Buttons based on fill mode and status */}
              <div className="flex flex-wrap gap-2 mt-2">
                {/* AUTO_FILL: Undo + Edit */}
                {fillMode === 'AUTO_FILL' && status === 'auto_filled' && (
                  <>
                    <Button size="sm" variant="outline" onClick={onUndo}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Rückgängig
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Bearbeiten
                    </Button>
                  </>
                )}
                
                {/* SUGGEST: Confirm + Edit + Skip */}
                {fillMode === 'SUGGEST' && status === 'suggested_pending' && (
                  <>
                    <Button size="sm" onClick={handleConfirmSuggestion}>
                      <Check className="h-3 w-3 mr-1" />
                      Bestätigen
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Bearbeiten
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onSkip}>
                      <SkipForward className="h-3 w-3 mr-1" />
                      Überspringen
                    </Button>
                  </>
                )}
                
                {/* CONFIRM_ONLY or empty: Show input/edit */}
                {(fillMode === 'CONFIRM_ONLY' || status === 'empty') && 
                 status !== 'skipped' && 
                 status !== 'confirmed' && 
                 status !== 'auto_filled' &&
                 fieldType !== 'checkbox' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Eingeben
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onSkip}>
                      <SkipForward className="h-3 w-3 mr-1" />
                      Überspringen
                    </Button>
                  </>
                )}
                
                {/* Confirmed: Allow edit */}
                {(status === 'confirmed' || status === 'user_edited') && (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Bearbeiten
                  </Button>
                )}
                
                {/* Skipped: Allow restore */}
                {status === 'skipped' && (
                  <Button size="sm" variant="outline" onClick={onUndo}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Wiederherstellen
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Technical field name (small, for debugging) */}
        <p className="text-xs text-muted-foreground mt-2 font-mono">{pdfFieldName}</p>
      </CardContent>
    </Card>
  );
}
