import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect, useRef } from "react";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const [usePdfJs, setUsePdfJs] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchPdfBlob = async () => {
      if (!pdfUrl) {
        setBlobUrl(null);
        setPdfDocument(null);
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
        
        // Load PDF with PDF.js for canvas rendering
        if (usePdfJs) {
          const arrayBuffer = await blob.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setPdfDocument(pdf);
          setNumPages(pdf.numPages);
        }
        
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
  }, [pdfUrl, usePdfJs, onLoadSuccess, onLoadError]);

  // Render PDF.js pages to canvas
  useEffect(() => {
    const renderPages = async () => {
      if (!pdfDocument || !usePdfJs) return;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const canvas = canvasRefs.current[pageNum - 1];
        if (!canvas) continue;

        const viewport = page.getViewport({ scale: 1.5 });
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
      }
    };

    renderPages();
  }, [pdfDocument, usePdfJs, numPages]);

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
      <div className="flex gap-2 items-center justify-between">
        <Button
          onClick={() => setUsePdfJs(!usePdfJs)}
          variant="outline"
          size="sm"
        >
          <FileText className="mr-2 h-4 w-4" />
          {usePdfJs ? "Native Rendering" : "PDF.js Rendering"}
        </Button>

        {downloadUrl && (
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Herunterladen
            </Button>
            <Button onClick={handleOpenInNewTab} variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              Neuer Tab
            </Button>
          </div>
        )}
      </div>

      {blobUrl && !usePdfJs && (
        <iframe
          src={`${blobUrl}#view=FitH`}
          className="w-full h-[900px] border rounded-lg shadow-lg"
          title="Elterngeldantrag Vorschau"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {usePdfJs && pdfDocument && (
        <div className="space-y-4">
          {Array.from({ length: numPages }, (_, i) => (
            <canvas
              key={i}
              ref={(el) => (canvasRefs.current[i] = el)}
              className="w-full border rounded-lg shadow-lg"
            />
          ))}
        </div>
      )}
    </div>
  );
};
