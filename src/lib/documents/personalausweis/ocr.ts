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
    
    // Split text into lines for better parsing
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    // Helper function to find value after a label across multiple lines
    const findValueAfterLabel = (labelPattern: RegExp, lines: string[]): string | null => {
      for (let i = 0; i < lines.length; i++) {
        if (labelPattern.test(lines[i])) {
          // Check if value is on the same line
          const sameLine = lines[i].match(labelPattern);
          if (sameLine && sameLine[1] && sameLine[1].length > 3) {
            return sameLine[1].trim();
          }
          // Check next line for the value
          if (i + 1 < lines.length && lines[i + 1] && !isLabel(lines[i + 1])) {
            return lines[i + 1].trim();
          }
        }
      }
      return null;
    };

    // Helper to detect if a line is a label (contains common label keywords)
    const isLabel = (line: string): boolean => {
      const labelKeywords = /^(vornamen?|given names?|prénoms|nachname|surname|name|geburtstag|date of birth|staatsangehörigkeit|nationality|geburtsort|place of birth|anschrift|adresse|address|straße|street|rue|gültig|expiry|expiration)/i;
      return labelKeywords.test(line);
    };

    // Extract Vorname (First Name) - look for value after label
    const vornameValue = findValueAfterLabel(/(?:vornamen?|given\s*names?|prénoms)/i, lines);
    if (vornameValue && /^[A-ZÄÖÜ]/.test(vornameValue)) {
      fields.vorname = vornameValue.split(' ').map(n => 
        n.charAt(0) + n.slice(1).toLowerCase()
      ).join(' ');
    }

    // Extract Nachname (Last Name) - handle "GEB." for maiden names
    const nachnameValue = findValueAfterLabel(/(?:nachname|surname|familienname)(?!.*\/)/i, lines);
    if (nachnameValue && /^[A-ZÄÖÜ]/.test(nachnameValue)) {
      // Handle maiden name format: "MUSTERMANN GEB. GABLER" -> extract "MUSTERMANN"
      const mainName = nachnameValue.split(/\s+GEB\./i)[0].trim();
      fields.nachname = mainName.split(/[\s-]+/).map(n => 
        n.charAt(0) + n.slice(1).toLowerCase()
      ).join(' ');
    }

    // Extract Geburtsdatum (Date of Birth)
    const geburtsdatumValue = findValueAfterLabel(/(?:geburtstag|date\s*of\s*birth|date\s*de\s*naissance)/i, lines);
    if (geburtsdatumValue && /\d/.test(geburtsdatumValue)) {
      const dateMatch = geburtsdatumValue.match(/(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/);
      if (dateMatch) fields.geburtsdatum = dateMatch[1];
    }

    // Extract Geburtsort (Place of Birth)
    const geburtsortValue = findValueAfterLabel(/(?:geburtsort|place\s*of\s*birth|lieu\s*de\s*naissance)/i, lines);
    if (geburtsortValue && /^[A-ZÄÖÜ]/.test(geburtsortValue)) {
      fields.geburtsort = geburtsortValue.split(' ').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' ');
    }

    // Extract Staatsangehörigkeit (Nationality)
    const staatsangValue = findValueAfterLabel(/(?:staatsangehörigkeit|nationality|nationalite)/i, lines);
    if (staatsangValue && /^[A-ZÄÖÜ]/.test(staatsangValue)) {
      fields.staatsangehoerigkeit = staatsangValue.toUpperCase() === 'DEUTSCH' || staatsangValue.toUpperCase() === 'DEUTSCHLAND' 
        ? 'DEUTSCH' 
        : staatsangValue;
    }

    // Extract Anschrift/Adresse (Address) - look for street, PLZ, city pattern
    for (let i = 0; i < lines.length; i++) {
      if (/(?:anschrift|adresse|address|rue)/i.test(lines[i])) {
        // Address might be on next lines
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const line = lines[j];
          if (isLabel(line)) break;
          
          // Try to match PLZ + City pattern
          const plzOrtMatch = line.match(/(\d{5})\s+([A-ZÄÖÜ][A-Za-zäöüß\s\-]+)/);
          if (plzOrtMatch) {
            fields.plz = plzOrtMatch[1];
            fields.ort = plzOrtMatch[2].trim().split(' ').map(w => 
              w.charAt(0) + w.slice(1).toLowerCase()
            ).join(' ');
          }
          
          // Try to match street + house number
          const strasseMatch = line.match(/^([A-ZÄÖÜ][A-Za-zäöüß\s\-]+?)\s+(\d+[a-zA-Z]?)$/);
          if (strasseMatch && !fields.strasse) {
            fields.strasse = strasseMatch[1].trim();
            fields.hausnummer = strasseMatch[2].trim();
          }
        }
      }
    }

    return fields;
  },
};
