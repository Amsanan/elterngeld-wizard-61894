import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  fields: ExtractedFields;
}

export interface ExtractedFields {
  // Kind (Child) information
  kind_vorname?: string;
  kind_nachname?: string;
  kind_geburtsdatum?: string;
  kind_geburtsort?: string;
  
  // Parent information
  vorname?: string;
  nachname?: string;
  geburtsdatum?: string;
  steuer_identifikationsnummer?: string;
  
  // Address
  strasse?: string;
  hausnr?: string;
  plz?: string;
  ort?: string;
}

/**
 * Perform OCR on an uploaded file
 */
export async function performOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    console.log('Starting OCR for file:', file.name);
    
    const result = await Tesseract.recognize(file, 'deu', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    console.log('OCR completed. Confidence:', result.data.confidence);
    
    // Extract structured fields from raw text
    const fields = extractFieldsFromText(result.data.text);
    
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      fields,
    };
  } catch (error) {
    console.error('OCR error:', error);
    throw error;
  }
}

/**
 * Extract structured fields from OCR text using pattern matching
 */
function extractFieldsFromText(text: string): ExtractedFields {
  const fields: ExtractedFields = {};
  
  // Common patterns for German documents
  const patterns = {
    // Names - looks for "Vorname:" or "Name:" followed by text
    vorname: /(?:Vorname[n]?|Rufname)[:\s]+([A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+)*)/i,
    nachname: /(?:Nachname|Familienname|Name)[:\s]+([A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)*)/i,
    
    // Birth date - DD.MM.YYYY or similar
    geburtsdatum: /(?:Geburtsdatum|geboren am|geb\.?)[:\s]+(\d{1,2}\.\d{1,2}\.\d{4})/i,
    geburtsort: /(?:Geburtsort|geboren in)[:\s]+([A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+)*)/i,
    
    // Tax ID - 11 digits
    steuer_id: /(?:Steuer-?(?:ID|identifikationsnummer))[:\s]+(\d{11})/i,
    
    // Address patterns
    strasse: /(?:Straße|Str\.?)[:\s]+([A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+)*)/i,
    hausnr: /(?:Hausnummer|Nr\.?|Haus-Nr\.?)[:\s]+(\d+[a-z]?)/i,
    plz: /(?:PLZ|Postleitzahl)[:\s]+(\d{5})/i,
    ort: /(?:Ort|Wohnort)[:\s]+([A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+)*)/i,
  };

  // Extract using patterns
  const vornameMatch = text.match(patterns.vorname);
  if (vornameMatch) fields.vorname = vornameMatch[1].trim();
  
  const nachnameMatch = text.match(patterns.nachname);
  if (nachnameMatch) fields.nachname = nachnameMatch[1].trim();
  
  const geburtsdatumMatch = text.match(patterns.geburtsdatum);
  if (geburtsdatumMatch) fields.geburtsdatum = geburtsdatumMatch[1].trim();
  
  const geburtsortMatch = text.match(patterns.geburtsort);
  if (geburtsortMatch) fields.kind_geburtsort = geburtsortMatch[1].trim();
  
  const steuerIdMatch = text.match(patterns.steuer_id);
  if (steuerIdMatch) fields.steuer_identifikationsnummer = steuerIdMatch[1].trim();
  
  const strasseMatch = text.match(patterns.strasse);
  if (strasseMatch) fields.strasse = strasseMatch[1].trim();
  
  const hausnrMatch = text.match(patterns.hausnr);
  if (hausnrMatch) fields.hausnr = hausnrMatch[1].trim();
  
  const plzMatch = text.match(patterns.plz);
  if (plzMatch) fields.plz = plzMatch[1].trim();
  
  const ortMatch = text.match(patterns.ort);
  if (ortMatch) fields.ort = ortMatch[1].trim();

  console.log('Extracted fields:', fields);
  
  return fields;
}

/**
 * Determine document type from extracted text
 */
export function detectDocumentType(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('geburtsurkunde')) return 'geburtsurkunde';
  if (lowerText.includes('gehaltsabrechnung') || lowerText.includes('lohnabrechnung')) return 'gehaltsnachweis';
  if (lowerText.includes('personalausweis')) return 'personalausweis';
  if (lowerText.includes('krankenversicherung')) return 'versicherungsnachweis';
  
  return 'unbekannt';
}
