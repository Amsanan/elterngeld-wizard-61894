import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use unpkg with full HTTPS URL for better reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface UsePdfRendererProps {
  pdfUrl: string | null;
  scale: number;
  pageNumber: number;
}

export const usePdfRenderer = ({ pdfUrl, scale, pageNumber }: UsePdfRendererProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (!pdfUrl) {
      setLoading(false);
      return;
    }

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('PDF konnte nicht geladen werden');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current || loading) {
      return;
    }

    const renderPage = async () => {
      try {
        // Cancel any ongoing render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDocRef.current.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;
        
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.style.height = Math.floor(viewport.height) + "px";
        canvas.style.width = Math.floor(viewport.width) + "px";

        // Clear canvas and set quality settings
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = false;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: transform,
        };

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Seite konnte nicht gerendert werden');
      }
    };

    renderPage();
  }, [pageNumber, scale, loading]);

  return {
    canvasRef,
    numPages,
    loading,
    error,
  };
};
