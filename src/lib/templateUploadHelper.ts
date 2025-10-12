import { supabase } from '@/integrations/supabase/client';

/**
 * Upload template PDF to storage if not already exists
 * Returns the storage path of the template
 */
export async function ensureTemplateUploaded(): Promise<string | null> {
  try {
    const storagePath = 'templates/elterngeldantrag_bis_Maerz25.pdf';
    
    // Check if template already exists in storage
    const { data: existingFiles } = await supabase.storage
      .from('form-templates')
      .list('templates', {
        search: 'elterngeldantrag_bis_Maerz25.pdf'
      });

    if (existingFiles && existingFiles.length > 0) {
      console.log('Template already exists in storage');
      return storagePath;
    }

    // Fetch the PDF from public folder
    const response = await fetch('/reference/elterngeldantrag_bis_Maerz25.pdf');
    if (!response.ok) {
      throw new Error('Failed to fetch template PDF from /reference folder');
    }

    const blob = await response.blob();
    
    // Verify it's a PDF
    if (blob.type !== 'application/pdf') {
      throw new Error(`Invalid file type: ${blob.type}. Expected application/pdf`);
    }

    console.log('Uploading template PDF to storage...');

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('form-templates')
      .upload(storagePath, blob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading template:', uploadError);
      return null;
    }

    console.log('Template uploaded successfully');
    return storagePath;
  } catch (error) {
    console.error('Error ensuring template upload:', error);
    return null;
  }
}
