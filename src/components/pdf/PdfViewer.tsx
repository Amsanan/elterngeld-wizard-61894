import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";

interface PdfViewerProps {
  pdfUrl: string | null;
  downloadUrl?: string;
  onLoadSuccess?: () => void;
  onLoadError?: (error: string) => void;
}

export const PdfViewer = ({ pdfUrl, downloadUrl, onLoadSuccess, onLoadError }: PdfViewerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchPdfBlob = async () => {
      if (!pdfUrl) {
        setBlobUrl(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch PDF without auth header (function is public)
        const response = await fetch(pdfUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        
        if (onLoadSuccess) {
          onLoadSuccess();
        }
      } catch (err) {
        console.error('Error fetching PDF:', err);
        const errorMsg = "PDF konnte nicht geladen werden";
        setError(errorMsg);
        if (onLoadError) {
          onLoadError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPdfBlob();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [pdfUrl, onLoadSuccess, onLoadError]);

  const handleDownload = () => {
    if (downloadUrl) {
      // Add download parameter to Supabase Storage URL
      const url = new URL(downloadUrl);
      url.searchParams.set("download", "elterngeldantrag.pdf");

      const link = document.createElement("a");
      link.href = url.toString();
      link.download = "elterngeldantrag.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInNewTab = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  const handleLoad = () => {
    if (onLoadSuccess) {
      onLoadSuccess();
    }
  };

  const handleError = () => {
    const errorMsg = "PDF konnte nicht geladen werden";
    setError(errorMsg);
    if (onLoadError) {
      onLoadError(errorMsg);
    }
  };

  if (!pdfUrl) {
    return (
      <div className="w-full h-[600px] border rounded-lg bg-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Keine PDF-Vorschau verfügbar</p>
          <p className="text-sm text-muted-foreground">Bitte füllen Sie die Felder aus und klicken Sie auf "Weiter"</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-[600px] border rounded-lg bg-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">PDF wird geladen...</p>
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
      {blobUrl && (
        <iframe
          src={`${blobUrl}#view=FitH`}
          className="w-full h-[900px] border rounded-lg shadow-lg"
          title="Elterngeldantrag Vorschau"
          onLoad={handleLoad}
        />
      )}

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
};
