import type { DocumentProcessor, ExtractedFields } from '../types';

export const geburtsurkunderProcessor: DocumentProcessor = {
  documentType: 'geburtsurkunde',

  detectType: (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes('geburtsurkunde') ||
      lowerText.includes('standesamt') ||
      (lowerText.includes('geboren') && lowerText.includes('kind'))
    );
  },

  extractFields: (text: string): ExtractedFields => {
    const fields: ExtractedFields = {};

    // Extract child's first name
    const vornameMatch = text.match(/(?:vorname|vornamen)[\s:]*([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*)/i);
    if (vornameMatch) fields.vorname = vornameMatch[1].trim();

    // Extract child's last name
    const nachnameMatch = text.match(/(?:nachname|familienname|name)[\s:]*([A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)*)/i);
    if (nachnameMatch) fields.nachname = nachnameMatch[1].trim();

    // Extract birth date
    const geburtsdatumMatch = text.match(/(?:geboren am|geburtsdatum|geb\.)[\s:]*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/i);
    if (geburtsdatumMatch) fields.geburtsdatum = geburtsdatumMatch[1].trim();

    // Extract birth place
    const geburtsortMatch = text.match(/(?:geburtsort|in)[\s:]*([A-ZÄÖÜ][a-zäöüß\s]+)/i);
    if (geburtsortMatch) fields.geburtsort = geburtsortMatch[1].trim();

    // Extract gender
    const geschlechtMatch = text.match(/(?:geschlecht)[\s:]*([mwdx]|männlich|weiblich|divers)/i);
    if (geschlechtMatch) {
      const gender = geschlechtMatch[1].toLowerCase();
      fields.geschlecht = gender.charAt(0) === 'm' ? 'männlich' : 
                         gender.charAt(0) === 'w' ? 'weiblich' : 'divers';
    }

    return fields;
  },
};
