import { PDFDocument } from 'pdf-lib';

export interface FormData {
  // Antrag
  adresse_elterngeldstelle?: string;
  ort?: string;
  datum?: string;
  
  // Kind data (from kind table - no prefix)
  vorname?: string;
  nachname?: string;
  geburtsdatum?: string;
  anzahl_mehrlinge?: number;
  fruehgeboren?: boolean;
  errechneter_geburtsdatum?: string;
  behinderung?: boolean;
  keine_weitere_kinder?: boolean;
  insgesamt?: boolean;
  anzahl_weitere_kinder?: number;
  
  // Parent data (Elternteil 1 conflicts with kind, Elternteil 2 uses _2 suffix)
  steuer_identifikationsnummer?: string;
  
  // Parent data (Elternteil 2)
  vorname_2?: string;
  nachname_2?: string;
  geburtsdatum_2?: string;
  geschlecht_2?: string;
  steuer_identifikationsnummer_2?: string;
  
  // Alleinerziehende
  ist_alleinerziehend?: boolean;
  anderer_unmoeglich_betreuung?: boolean;
  betreuung_gefaehrdet_wohl?: boolean;
  
  // Wohnsitz/Aufenthalt
  wohnsitz_in_deutschland?: boolean;
  seit_meiner_geburt?: boolean;
  seit_in_deutschland?: boolean;
  seit_datum_deutschland?: string;
  
  // Address data
  strasse?: string;
  hausnr?: string;
  plz?: string;
  adresszusatz?: string;
  
  // Ausland
  wohnsitz_ausland?: boolean;
  ausland_staat?: string;
  ausland_strasse?: string;
  ausland_aufenthaltsgrund?: string;
  aufenthalt_befristet?: boolean;
  aufenthalt_befristet_von?: string;
  aufenthalt_befristet_bis?: string;
  aufenthalt_unbefristet?: boolean;
  aufenthalt_unbefristet_seit?: string;
  arbeitsvertrag_deutsches_recht_ja?: boolean;
  arbeitsvertrag_deutsches_recht_nein?: boolean;
  ausland_arbeitgeber_sitz_plz?: string;
  ausland_arbeitgeber_sitz_ort?: string;
  
  // Additional fields from database
  [key: string]: string | boolean | number | undefined;
}

/**
 * Generate filled PDF from template using database data
 */
export async function generateFilledPDF(formData: FormData): Promise<Uint8Array> {
  try {
    // Load template PDF directly from public folder (root level for Vite to serve correctly)
    console.log('Loading template from public folder');
    const response = await fetch('/elterngeldantrag_bis_Maerz25.pdf');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch template PDF: ${response.status} ${response.statusText}`);
    }
    
    const templateBytes = await response.arrayBuffer();
    console.log('Template bytes length:', templateBytes.byteLength);
    
    // Verify template size (should be > 10KB for a valid PDF)
    if (templateBytes.byteLength < 10000) {
      throw new Error(`Template file too small (${templateBytes.byteLength} bytes), might be corrupted`);
    }

    // Load PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // Get all form fields (for debugging)
    const fields = form.getFields();
    console.log('Available form fields:', fields.map(f => f.getName()));

    // Map database fields to PDF AcroForm fields
    // Based on Mapping032025_1.xlsx acroform_Feldname column
    const fieldMappings: Record<string, string | boolean> = {
      // Antrag
      'txt.adresse_elterngeldstelle 2': formData.adresse_elterngeldstelle || '',
      'txt.ortdatum_1': formData.ort && formData.datum ? `${formData.ort}, ${formData.datum}` : '',
      'txt.ortdatum_2': formData.ort && formData.datum ? `${formData.ort}, ${formData.datum}` : '',
      
      // Kind (Child) data - using correct AcroForm field names from mapping file
      'txt.txt.vorname1A 4': formData.vorname || '',
      'txt.txt.name1A 4': formData.nachname || '',
      'txt.txt.geburtsdatum1a 3': formData.geburtsdatum || '',
      'txt.txt.anzahl 4': formData.anzahl_mehrlinge?.toString() || '',
      'cb.ja1b 3': formData.fruehgeboren || false,
      'txt.geburtsdatum_frueh1b 3': formData.errechneter_geburtsdatum || '',
      'cb.nein1b 3': formData.behinderung || false,
      'cb.keine1c 3': formData.keine_weitere_kinder || false,
      'cb.insgesamt1c 3': formData.insgesamt || false,
      'txt.anzahl1c 3': formData.anzahl_weitere_kinder?.toString() || '',
      
      // Alleinerziehende
      'cb.allein2a': formData.ist_alleinerziehend || false,
      'cb.nichtbetreuung2a': formData.anderer_unmoeglich_betreuung || false,
      'cb.kindeswohl2a': formData.betreuung_gefaehrdet_wohl || false,
      
      // Parent data (Elternteil 1) - Note: conflicts with Kind fields, using steuer_identifikationsnummer only
      // Vorname/Nachname/Geburtsdatum come from Kind table since they are merged
      'txt.txt.steuer2b_1': formData.steuer_identifikationsnummer || '',
      
      // Parent data (Elternteil 2)
      'txt.vorname2b 1': formData.vorname_2 || '',
      'txt.name2b 1': formData.nachname_2 || '',
      'txt.geburt2b 1': formData.geburtsdatum_2 || '',
      'txt.txt.steuer2b_2': formData.steuer_identifikationsnummer_2 || '',
      
      // Wohnsitz/Aufenthalt
      'cb.ja2c': formData.wohnsitz_in_deutschland || false,
      'cb.seitGeburt2c': formData.seit_meiner_geburt || false,
      'cb.seit2c': formData.seit_in_deutschland || false,
      'txt.geburt2c': formData.seit_datum_deutschland || '',
      
      // Address
      'txt.strasse2c': formData.strasse || '',
      'txt.nummer2c': formData.hausnr || '',
      'txt.plz2c': formData.plz || '',
      'txt.ort2c': formData.ort || '',
      'txt.adresszusatz2c': formData.adresszusatz || '',
      
      // Ausland
      'cb.nein2c': formData.wohnsitz_ausland || false,
      'txt.staat2c': formData.ausland_staat || '',
      'txt.adresse2c': formData.ausland_strasse || '',
      'txt.warum2c': formData.ausland_aufenthaltsgrund || '',
      'cb.befristet2c': formData.aufenthalt_befristet || false,
      'txt.von2c': formData.aufenthalt_befristet_von || '',
      'txt.bis2c': formData.aufenthalt_befristet_bis || '',
      'cb.unbefristet2c': formData.aufenthalt_unbefristet || false,
      'txt.unbefristetdatum2c': formData.aufenthalt_unbefristet_seit || '',
      'cb.jaRecht2c': formData.arbeitsvertrag_deutsches_recht_ja || false,
      'cb.neinRecht2c': formData.arbeitsvertrag_deutsches_recht_nein || false,
      'txt.plzarbeitgeber2c': formData.ausland_arbeitgeber_sitz_plz || '',
      'txt.ortarbeitgeber2c': formData.ausland_arbeitgeber_sitz_ort || '',
    };

    // Fill in the form fields
    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
      try {
        // Check if it's a checkbox field
        if (fieldName.startsWith('cb.')) {
          try {
            const checkBox = form.getCheckBox(fieldName);
            if (checkBox && value === true) {
              checkBox.check();
            }
          } catch {
            // Not a checkbox, might be a button or other field type
            console.warn(`Could not check checkbox ${fieldName}`);
          }
        } else {
          // Text field
          const field = form.getTextField(fieldName);
          if (field && value && typeof value === 'string') {
            field.setText(value);
          }
        }
      } catch (error) {
        // Field might not exist or be a different type
        console.warn(`Could not fill field ${fieldName}:`, error);
      }
    });

    // Flatten the form (make fields non-editable) - optional
    // form.flatten();

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create a deep copy immediately to prevent detached buffer issues
    const pdfBytesCopy = new Uint8Array(pdfBytes.length);
    pdfBytesCopy.set(pdfBytes);
    
    return pdfBytesCopy;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Create a Blob URL from PDF bytes - safer for storing in React state
 */
export function createPDFBlobURL(pdfBytes: Uint8Array): string {
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

/**
 * Download PDF from a Blob URL
 */
export function downloadPDFFromURL(blobUrl: string, filename: string = 'elterngeldantrag_ausgefuellt.pdf') {
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Download the generated PDF (legacy function - kept for compatibility)
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string = 'elterngeldantrag_ausgefuellt.pdf') {
  const blobUrl = createPDFBlobURL(pdfBytes);
  downloadPDFFromURL(blobUrl, filename);
  // Cleanup after download
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
