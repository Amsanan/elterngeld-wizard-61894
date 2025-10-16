export interface OCRResult {
  text: string;
  confidence: number;
  extractedFields: ExtractedFields;
  documentType?: string;
}

export interface ExtractedFields {
  vorname?: string;
  nachname?: string;
  geburtsdatum?: string;
  geburtsort?: string;
  geschlecht?: string;
  staatsangehoerigkeit?: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  ort?: string;
  [key: string]: string | undefined;
}

export interface DocumentProcessor {
  detectType: (text: string) => boolean;
  extractFields: (text: string) => ExtractedFields;
  documentType: string;
}
