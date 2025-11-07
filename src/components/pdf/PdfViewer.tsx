import { useState } from "react";
import { usePdfRenderer } from "@/hooks/usePdfRenderer";
import { PdfControls } from "./PdfControls";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PdfViewerProps {
  pdfUrl: string | null;
  downloadUrl?: string;
  onLoadSuccess?: () => void;
  onLoadError?: (error: string) => void;
}

export const PdfViewer = ({ 
  pdfUrl, 
  downloadUrl,
  onLoadSuccess, 
  onLoadError 
}: PdfViewerProps) => {
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.25);

  const { canvasRef, numPages, loading, error } = usePdfRenderer({
    pdfUrl,
    scale,
    pageNumber,
  });

  // Notify parent component of load success/error
  if (!loading && !error && numPages > 0 && onLoadSuccess) {
    onLoadSuccess();
  }
  if (error && onLoadError) {
    onLoadError(error);
  }

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'elterngeldantrag.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInNewTab = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  if (!pdfUrl) {
    return (
      <div className="w-full h-[600px] border rounded-lg bg-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Keine PDF-Vorschau verfügbar</p>
          <p className="text-sm text-muted-foreground">
            Bitte füllen Sie die Felder aus und klicken Sie auf "Weiter"
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        {downloadUrl && (
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              PDF herunterladen
            </Button>
            <Button onClick={handleOpenInNewTab} variant="outline" className="flex-1">
              <ExternalLink className="mr-2 h-4 w-4" />
              In neuem Tab öffnen
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {numPages > 0 && (
        <PdfControls
          pageNumber={pageNumber}
          numPages={numPages}
          scale={scale}
          onPageChange={setPageNumber}
          onZoomChange={setScale}
        />
      )}

      <div className="relative w-full border rounded-lg bg-muted/30 overflow-auto max-h-[800px] scroll-smooth">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">PDF wird geladen...</p>
            </div>
          </div>
        )}

        <div className="flex justify-center p-4">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto shadow-lg"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      </div>

      {downloadUrl && numPages > 0 && (
        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            PDF herunterladen
          </Button>
          <Button onClick={handleOpenInNewTab} variant="outline" className="flex-1">
            <ExternalLink className="mr-2 h-4 w-4" />
            In neuem Tab öffnen
          </Button>
        </div>
      )}
    </div>
  );
};
