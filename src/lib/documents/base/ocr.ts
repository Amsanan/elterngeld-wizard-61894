import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import type { OCRResult } from '../types';

// Configure PDF.js worker - use bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

async function convertPdfToImages(file: File): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: Blob[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext: any = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert canvas to blob'));
      }, 'image/png');
    });

    images.push(blob);
  }

  return images;
}

export async function performBaseOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ text: string; confidence: number }> {
  let filesToProcess: Blob[] = [];
  
  // Check if file is PDF
  if (file.type === 'application/pdf') {
    console.log('Converting PDF to images...');
    filesToProcess = await convertPdfToImages(file);
    console.log(`Converted PDF to ${filesToProcess.length} images`);
  } else {
    filesToProcess = [file];
  }

  let allText = '';
  let totalConfidence = 0;

  for (let i = 0; i < filesToProcess.length; i++) {
    const result = await Tesseract.recognize(filesToProcess[i], 'deu', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          const pageProgress = (i / filesToProcess.length) + (m.progress / filesToProcess.length);
          onProgress(Math.round(pageProgress * 100));
        }
      },
    });

    allText += result.data.text + '\n';
    totalConfidence += result.data.confidence;
  }

  return {
    text: allText.trim(),
    confidence: totalConfidence / filesToProcess.length,
  };
}
