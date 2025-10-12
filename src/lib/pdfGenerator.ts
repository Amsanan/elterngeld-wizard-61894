import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';

export interface FormData {
  // Antrag
  adresse_elterngeldstelle?: string;
  ort?: string;
  datum?: string;
  
  // Kind data
  kind_vorname?: string;
  kind_nachname?: string;
  kind_geburtsdatum?: string;
  kind_anzahl_mehrlinge?: string;
  kind_fruehgeboren?: boolean;
  kind_errechneter_geburtsdatum?: string;
  kind_behinderung?: boolean;
  kind_keine_weitere_kinder?: boolean;
  kind_insgesamt?: boolean;
  kind_anzahl_weitere_kinder?: string;
  
  // Parent data (Elternteil 1)
  vorname?: string;
  nachname?: string;
  geburtsdatum?: string;
  geschlecht?: string;
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
  [key: string]: string | boolean | undefined;
}

/**
 * Generate filled PDF from template using database data
 */
export async function generateFilledPDF(formData: FormData): Promise<Uint8Array> {
  try {
    // Try to load from Supabase Storage first
    const { data } = supabase.storage
      .from('form-templates')
      .getPublicUrl('templates/elterngeldantrag_bis_Maerz25.pdf');

    console.log('Loading template from Storage:', data.publicUrl);
    const response = await fetch(data.publicUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch template PDF: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    console.log('Response content-type:', contentType);
    
    const templateBlob = await response.blob();
    console.log('Template blob type:', templateBlob.type, 'size:', templateBlob.size);
    
    if (!templateBlob.type.includes('pdf') && templateBlob.type !== 'application/octet-stream') {
      throw new Error(`Invalid file type: ${templateBlob.type}. Expected application/pdf`);
    }
    
    const templateBytes = await templateBlob.arrayBuffer();
    console.log('Template bytes length:', templateBytes.byteLength);

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
      
      // Kind (Child) data
      'txt.txt.vorname1A 4': formData.kind_vorname || '',
      'txt.txt.name1A 4': formData.kind_nachname || '',
      'txt.txt.geburtsdatum1a 3': formData.kind_geburtsdatum || '',
      'txt.txt.anzahl 4': formData.kind_anzahl_mehrlinge || '',
      'cb.ja1b 3': formData.kind_fruehgeboren || false,
      'txt.geburtsdatum_frueh1b 3': formData.kind_errechneter_geburtsdatum || '',
      'cb.nein1b 3': formData.kind_behinderung || false,
      'cb.keine1c 3': formData.kind_keine_weitere_kinder || false,
      'cb.insgesamt1c 3': formData.kind_insgesamt || false,
      'txt.anzahl1c 3': formData.kind_anzahl_weitere_kinder || '',
      
      // Alleinerziehende
      'cb.allein2a': formData.ist_alleinerziehend || false,
      'cb.nichtbetreuung2a': formData.anderer_unmoeglich_betreuung || false,
      'cb.kindeswohl2a': formData.betreuung_gefaehrdet_wohl || false,
      
      // Parent data (Elternteil 1)
      'txt.vorname2b': formData.vorname || '',
      'txt.name2b': formData.nachname || '',
      'txt.geburt2b': formData.geburtsdatum || '',
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
    return pdfBytes;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Download the generated PDF
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string = 'elterngeldantrag_ausgefuellt.pdf') {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
