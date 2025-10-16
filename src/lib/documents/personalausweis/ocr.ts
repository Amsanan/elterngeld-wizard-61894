import type { DocumentProcessor, ExtractedFields } from '../types';

export const personalausweisProcessor: DocumentProcessor = {
  documentType: 'personalausweis',

  detectType: (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes('personalausweis') ||
      lowerText.includes('bundesrepublik deutschland') ||
      lowerText.includes('identity card')
    );
  },

  extractFields: (text: string): ExtractedFields => {
    const fields: ExtractedFields = {};

    // Extract first name
    const vornameMatch = text.match(/(?:vorname|given names?)[\s:]*([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*)/i);
    if (vornameMatch) fields.vorname = vornameMatch[1].trim();

    // Extract last name
    const nachnameMatch = text.match(/(?:nachname|surname|familienname)[\s:]*([A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)*)/i);
    if (nachnameMatch) fields.nachname = nachnameMatch[1].trim();

    // Extract birth date
    const geburtsdatumMatch = text.match(/(?:geboren|date of birth|geb\.)[\s:]*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/i);
    if (geburtsdatumMatch) fields.geburtsdatum = geburtsdatumMatch[1].trim();

    // Extract nationality
    const staatsangMatch = text.match(/(?:staatsangehörigkeit|nationality)[\s:]*([A-ZÄÖÜ]+)/i);
    if (staatsangMatch) fields.staatsangehoerigkeit = staatsangMatch[1].trim();

    // Extract address
    const strasseMatch = text.match(/(?:straße|str\.|strasse)[\s:]*([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*)/i);
    if (strasseMatch) fields.strasse = strasseMatch[1].trim();

    const hausnrMatch = text.match(/(?:straße|str\.)[\s:]*[A-Za-zäöüß]+[\s]+(\d+[a-z]?)/i);
    if (hausnrMatch) fields.hausnummer = hausnrMatch[1].trim();

    const plzMatch = text.match(/(\d{5})\s+[A-ZÄÖÜ][a-zäöüß]+/);
    if (plzMatch) fields.plz = plzMatch[1].trim();

    const ortMatch = text.match(/\d{5}\s+([A-ZÄÖÜ][a-zäöüß\s]+)/);
    if (ortMatch) fields.ort = ortMatch[1].trim();

    return fields;
  },
};
