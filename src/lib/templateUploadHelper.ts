import { supabase } from '@/integrations/supabase/client';

/**
 * Upload template PDF to storage if not already exists
 */
export async function ensureTemplateUploaded(): Promise<boolean> {
  try {
    // Check if template already exists in storage
    const { data: existingFiles } = await supabase.storage
      .from('form-templates')
      .list('templates', {
        search: 'elterngeldantrag_bis_Maerz25.pdf'
      });

    if (existingFiles && existingFiles.length > 0) {
      console.log('Template already exists in storage');
      return true;
    }

    // Fetch the PDF from public folder
    const response = await fetch('/reference/elterngeldantrag_bis_Maerz25.pdf');
    if (!response.ok) {
      throw new Error('Failed to fetch template PDF');
    }

    const blob = await response.blob();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('form-templates')
      .upload('templates/elterngeldantrag_bis_Maerz25.pdf', blob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading template:', uploadError);
      return false;
    }

    console.log('Template uploaded successfully');
    return true;
  } catch (error) {
    console.error('Error ensuring template upload:', error);
    return false;
  }
}
