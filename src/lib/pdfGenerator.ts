import { PDFDocument } from 'pdf-lib';
import { getActiveTemplate, downloadTemplatePDF } from './templateStorage';

export interface FormData {
  // Kind data
  kind_vorname?: string;
  kind_nachname?: string;
  kind_geburtsdatum?: string;
  
  // Parent data
  vorname?: string;
  nachname?: string;
  geburtsdatum?: string;
  steuer_identifikationsnummer?: string;
  
  // Address data
  strasse?: string;
  hausnr?: string;
  plz?: string;
  ort?: string;
  
  // Additional fields from database
  [key: string]: string | undefined;
}

/**
 * Generate filled PDF from template using database data
 */
export async function generateFilledPDF(formData: FormData): Promise<Uint8Array> {
  try {
    // Get active template metadata
    const template = await getActiveTemplate('elterngeldantrag');
    if (!template) {
      throw new Error('Kein aktives Template gefunden');
    }

    // Download template PDF from storage
    console.log('Loading template:', template.storage_path);
    const templateBlob = await downloadTemplatePDF(template.storage_path);
    const templateBytes = await templateBlob.arrayBuffer();

    // Load PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // Get all form fields (for debugging)
    const fields = form.getFields();
    console.log('Available form fields:', fields.map(f => f.getName()));

    // Map database fields to PDF AcroForm fields
    // Based on Mapping032025_1.xlsx acroform_Feldname column
    const fieldMappings: Record<string, string> = {
      // Kind (Child) data
      'txt.txt.vorname1A 4': formData.kind_vorname || '',
      'txt.txt.name1A 4': formData.kind_nachname || '',
      'txt.txt.geburtsdatum1a 3': formData.kind_geburtsdatum || '',
      
      // Parent data (you)
      'txt.vorname2b': formData.vorname || '',
      'txt.name2b': formData.nachname || '',
      'txt.geburt2b': formData.geburtsdatum || '',
      'txt.txt.steuer2b_1': formData.steuer_identifikationsnummer || '',
      
      // Address
      'txt.strasse2c': formData.strasse || '',
      'txt.nummer2c': formData.hausnr || '',
      'txt.plz2c': formData.plz || '',
      'txt.ort2c': formData.ort || '',
    };

    // Fill in the form fields
    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value) {
          field.setText(value);
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
