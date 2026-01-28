import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Info } from "lucide-react";

interface WhyAskedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldName: string;
  labelDe: string;
  analysisReference?: string | null;
  fillReason: string;
  docTypes: string[];
}

export function WhyAskedModal({
  open,
  onOpenChange,
  fieldName,
  labelDe,
  analysisReference,
  fillReason,
  docTypes
}: WhyAskedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Warum wird das gefragt?
          </DialogTitle>
          <DialogDescription>
            Informationen zum Feld "{labelDe}"
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Field Purpose */}
            <div>
              <h4 className="font-medium mb-2">Zweck dieses Feldes</h4>
              <p className="text-sm text-muted-foreground">{fillReason}</p>
            </div>
            
            {/* Required Documents */}
            {docTypes.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Benötigte Dokumente</h4>
                <div className="flex flex-wrap gap-2">
                  {docTypes.map((docType, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {docType}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Analysis Reference */}
            {analysisReference && (
              <div>
                <h4 className="font-medium mb-2">Zusätzliche Informationen</h4>
                <div className="p-3 rounded-md bg-muted text-sm">
                  {analysisReference}
                </div>
              </div>
            )}
            
            {/* Legal Context */}
            <div>
              <h4 className="font-medium mb-2">Rechtlicher Hintergrund</h4>
              <p className="text-sm text-muted-foreground">
                Diese Angabe ist Teil des Elterngeldantrags nach dem Bundeselterngeld- und 
                Elternzeitgesetz (BEEG). Die Elterngeldstelle benötigt diese Information zur 
                Berechnung und Bewilligung Ihres Elterngeldanspruchs.
              </p>
            </div>
            
            {/* Technical Info */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground font-mono">
                Technisches Feld: {fieldName}
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
