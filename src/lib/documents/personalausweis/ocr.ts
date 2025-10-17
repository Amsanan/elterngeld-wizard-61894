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
    
    // Clean up text - remove extra spaces and normalize
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Extract Nachname (Last Name) - look for all-caps word after the label, before "GEB."
    const nachnameMatch = cleanText.match(/(?:PERSONALAUSWEIS|IDENTITY CARD|CARTE D'IDENTITE)[\s\S]*?([A-ZÄÖÜ]{3,}(?:\s+[A-ZÄÖÜ]{3,})?)\s*(?:GEB\.|Vornamen|Given names)/i);
    if (nachnameMatch) {
      const nachname = nachnameMatch[1].trim().replace(/\s+/g, ' ');
      fields.nachname = nachname.split(/[\s-]+/).map(n => 
        n.charAt(0) + n.slice(1).toLowerCase()
      ).join(' ');
    }

    // Extract Vorname (First Name) - look for all-caps word(s) after "Vornamen/Given names/Prénoms"
    const vornameMatch = cleanText.match(/(?:Vornamen|Given names|Prénoms)[\s\/]*([A-ZÄÖÜ]{2,}(?:\s+[A-ZÄÖÜ]{2,})?)\s*(?:Geburtstag|Date of birth|Geburtsort)/i);
    if (vornameMatch) {
      const vorname = vornameMatch[1].trim().replace(/\s+/g, ' ');
      fields.vorname = vorname.split(' ').map(n => 
        n.charAt(0) + n.slice(1).toLowerCase()
      ).join(' ');
    }

    // Extract Geburtsdatum (Date of Birth) - look for DD.MM.YYYY pattern after "Geburtstag"
    const geburtsdatumMatch = cleanText.match(/(?:Geburtstag|Date of birth|Date de naissance)[\s\/\-:]*(\d{1,2}\.\d{1,2}\.\d{4})/i);
    if (geburtsdatumMatch) {
      fields.geburtsdatum = geburtsdatumMatch[1].trim();
    }

    // Extract Staatsangehörigkeit (Nationality) - look for "DEUTSCH" or other nationality after the label
    const staatsangMatch = cleanText.match(/(?:Staatsangehörigkeit|Nationality|Nationalite)[\s\/\-:]*([A-ZÄÖÜ]{5,})/i);
    if (staatsangMatch) {
      const nationality = staatsangMatch[1].trim().toUpperCase();
      // Only accept if it's a valid nationality word (not numbers or garbage)
      if (!/\d/.test(nationality) && nationality.length >= 5) {
        fields.staatsangehoerigkeit = nationality === 'DEUTSCH' || nationality === 'DEUTSCHLAND' ? 'DEUTSCH' : nationality;
      }
    }

    // Extract Geburtsort (Place of Birth) - look for city name after "Geburtsort"
    const geburtsortMatch = cleanText.match(/(?:Geburtsort|Place of birth|Lieu de naissance)[\s\/\-:]*([A-ZÄÖÜ]{3,}(?:\s+[A-ZÄÖÜ]{3,})?)\s*(?:Gültig|Date of expiry|$)/i);
    if (geburtsortMatch) {
      const geburtsort = geburtsortMatch[1].trim().replace(/\s+/g, ' ');
      // Only accept if it doesn't contain numbers
      if (!/\d/.test(geburtsort)) {
        fields.geburtsort = geburtsort.split(' ').map(word => 
          word.charAt(0) + word.slice(1).toLowerCase()
        ).join(' ');
      }
    }

    // For address fields, look for PLZ (postal code) + city pattern anywhere in text
    const plzOrtMatch = cleanText.match(/(\d{5})\s+([A-ZÄÖÜ][A-Za-zäöüß\s\-]{2,})/);
    if (plzOrtMatch) {
      fields.plz = plzOrtMatch[1];
      const ort = plzOrtMatch[2].trim().split(/\s+/)[0]; // Take first word only
      fields.ort = ort.charAt(0) + ort.slice(1).toLowerCase();
    }

    // Look for street + house number pattern
    const strasseMatch = cleanText.match(/([A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.?))\s+(\d+[a-zA-Z]?)/i);
    if (strasseMatch) {
      fields.strasse = strasseMatch[1].trim();
      fields.hausnummer = strasseMatch[2].trim();
    }

    return fields;
  },
};
