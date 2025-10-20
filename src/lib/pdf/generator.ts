/**
 * PDF Generation Core Logic
 */

import { PDFDocument } from 'pdf-lib';
import { FormData } from './types';
import { getFieldMappings } from './fieldMappings';

/**
 * Generate filled PDF from template using database data
 */
export async function generateFilledPDF(formData: FormData): Promise<Uint8Array> {
  try {
    // Load template PDF directly from public folder
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

    // Get field mappings
    const fieldMappings = getFieldMappings(formData);

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
