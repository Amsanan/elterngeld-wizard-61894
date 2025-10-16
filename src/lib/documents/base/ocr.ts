import Tesseract from 'tesseract.js';
import type { OCRResult } from '../types';

export async function performBaseOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ text: string; confidence: number }> {
  const result = await Tesseract.recognize(file, 'deu', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  return {
    text: result.data.text,
    confidence: result.data.confidence,
  };
}
