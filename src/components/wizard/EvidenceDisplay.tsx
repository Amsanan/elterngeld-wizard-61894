import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { DocEvidence } from "@/lib/fill-mode-engine";
import { getDocTypeLabel } from "@/lib/fill-mode-engine";

interface EvidenceDisplayProps {
  evidence: DocEvidence[];
  compact?: boolean;
}

export function EvidenceDisplay({ evidence, compact = false }: EvidenceDisplayProps) {
  if (evidence.length === 0) return null;
  
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {evidence.map((doc, idx) => (
          <Badge 
            key={idx} 
            variant="outline" 
            className="text-xs"
          >
            <FileText className="h-3 w-3 mr-1" />
            {getDocTypeLabel(doc.docType)}
          </Badge>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Datenquellen:</p>
      <div className="space-y-1">
        {evidence.map((doc, idx) => (
          <div 
            key={idx} 
            className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{getDocTypeLabel(doc.docType)}</span>
            </div>
            {doc.confidence > 0 && (
              <Badge 
                variant={doc.confidence >= 0.8 ? "default" : "secondary"}
                className="text-xs"
              >
                {Math.round(doc.confidence * 100)}% Konfidenz
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
