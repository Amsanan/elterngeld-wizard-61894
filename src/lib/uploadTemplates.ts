/**
 * One-time script to upload template files to Supabase Storage
 * This should be run once to migrate files from public/reference to Supabase
 */

import { uploadTemplate } from './templateStorage';

export async function uploadInitialTemplates() {
  try {
    console.log('Starting template upload...');

    // Fetch the PDF from public folder
    const pdfResponse = await fetch('/reference/elterngeldantrag_bis_Maerz25.pdf');
    const pdfBlob = await pdfResponse.blob();
    const pdfFile = new File([pdfBlob], 'elterngeldantrag_bis_Maerz25.pdf', {
      type: 'application/pdf',
    });

    // Fetch the mapping Excel file
    const excelResponse = await fetch('/reference/Mapping032025_1.xlsx');
    const excelBlob = await excelResponse.blob();
    const excelFile = new File([excelBlob], 'Mapping032025_1.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Upload PDF template
    console.log('Uploading PDF template...');
    const pdfResult = await uploadTemplate(pdfFile, 'templates/elterngeldantrag_bis_Maerz25.pdf');
    if (pdfResult.error) {
      console.error('PDF upload failed:', pdfResult.error);
      throw pdfResult.error;
    }
    console.log('PDF uploaded successfully:', pdfResult.path);

    // Upload mapping file
    console.log('Uploading mapping file...');
    const excelResult = await uploadTemplate(excelFile, 'templates/Mapping032025_1.xlsx');
    if (excelResult.error) {
      console.error('Excel upload failed:', excelResult.error);
      throw excelResult.error;
    }
    console.log('Mapping file uploaded successfully:', excelResult.path);

    console.log('✅ All templates uploaded successfully!');
    return { success: true };
  } catch (error) {
    console.error('❌ Template upload failed:', error);
    return { success: false, error };
  }
}
