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

    // Extract first name - handles both "Vorname" label and all-caps format
    const vornameMatch = text.match(/(?:vorname|given\s*names?|vornamen)[\s:\/\-]*([A-ZÄÖÜ]{2,}(?:\s+[A-ZÄÖÜ]{2,})*)/i);
    if (vornameMatch) {
      fields.vorname = vornameMatch[1].trim().split(' ').map(n => 
        n.charAt(0) + n.slice(1).toLowerCase()
      ).join(' ');
    }

    // Extract last name - handles "Nachname" label and all-caps format
    const nachnameMatch = text.match(/(?:nachname|surname|familienname|name)[\s:\/\-]*([A-ZÄÖÜ]{2,}(?:-[A-ZÄÖÜ]{2,})*)/i);
    if (nachnameMatch) {
      fields.nachname = nachnameMatch[1].trim().split('-').map(n => 
        n.charAt(0) + n.slice(1).toLowerCase()
      ).join('-');
    }

    // Extract birth date - various formats
    const geburtsdatumMatch = text.match(/(?:geboren|date\s*of\s*birth|geb\.?|geburtsdatum)[\s:\/\-]*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/i);
    if (geburtsdatumMatch) fields.geburtsdatum = geburtsdatumMatch[1].trim();

    // Extract birth place
    const geburtsortMatch = text.match(/(?:geburtsort|place\s*of\s*birth|geboren\s*in)[\s:\/\-]*([A-ZÄÖÜ][A-Za-zäöüß\s\-]+?)(?=\s*(?:\d{2}|\n|staatsangehörigkeit|nationality))/i);
    if (geburtsortMatch) fields.geburtsort = geburtsortMatch[1].trim();

    // Extract nationality - handles both "DEUTSCH" and "DEUTSCHLAND"
    const staatsangMatch = text.match(/(?:staatsangehörigkeit|nationality)[\s:\/\-]*([A-ZÄÖÜ]+)/i);
    if (staatsangMatch) {
      const nat = staatsangMatch[1].trim();
      fields.staatsangehoerigkeit = nat === 'DEUTSCH' || nat === 'DEUTSCHLAND' ? 'DEUTSCH' : nat;
    }

    // Extract address - handles all-caps street names
    const strasseMatch = text.match(/(?:straße|str\.|strasse|street)[\s:\/\-]*([A-ZÄÖÜ][A-ZÄÖÜa-zäöüß\s\-]+?)(?:\s+(\d+[a-zA-Z]?))?(?=\s*\d{5}|\n)/i);
    if (strasseMatch) {
      const streetFull = strasseMatch[1].trim();
      // Extract house number if it's in the street match
      const houseNumInStreet = streetFull.match(/^(.+?)\s+(\d+[a-zA-Z]?)$/);
      if (houseNumInStreet) {
        fields.strasse = houseNumInStreet[1].trim();
        fields.hausnummer = houseNumInStreet[2].trim();
      } else {
        fields.strasse = streetFull;
        if (strasseMatch[2]) fields.hausnummer = strasseMatch[2].trim();
      }
    }

    // Extract PLZ and city
    const plzOrtMatch = text.match(/(\d{5})\s+([A-ZÄÖÜ][A-ZÄÖÜa-zäöüß\s\-]+)/);
    if (plzOrtMatch) {
      fields.plz = plzOrtMatch[1].trim();
      fields.ort = plzOrtMatch[2].trim().split(' ').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' ');
    }

    return fields;
  },
};
