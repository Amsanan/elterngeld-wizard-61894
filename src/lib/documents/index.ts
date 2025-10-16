import { performBaseOCR } from './base/ocr';
import { geburtsurkunderProcessor } from './geburtsurkunde/ocr';
import { personalausweisProcessor } from './personalausweis/ocr';
import type { OCRResult, DocumentProcessor } from './types';

const processors: DocumentProcessor[] = [
  geburtsurkunderProcessor,
  personalausweisProcessor,
];

export async function performOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  const { text, confidence } = await performBaseOCR(file, onProgress);

  // Detect document type
  let documentType = 'unknown';
  let extractedFields = {};

  for (const processor of processors) {
    if (processor.detectType(text)) {
      documentType = processor.documentType;
      extractedFields = processor.extractFields(text);
      break;
    }
  }

  return {
    text,
    confidence,
    extractedFields,
    documentType,
  };
}

export function detectDocumentType(text: string): string {
  for (const processor of processors) {
    if (processor.detectType(text)) {
      return processor.documentType;
    }
  }
  return 'unknown';
}

export * from './types';
