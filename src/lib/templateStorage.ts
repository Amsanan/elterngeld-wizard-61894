import { supabase } from "@/integrations/supabase/client";

export interface FormTemplate {
  id: string;
  template_name: string;
  version: string;
  display_name: string;
  description?: string;
  valid_from: string;
  valid_until?: string;
  storage_path: string;
  mapping_file_path?: string;
  is_active: boolean;
}

/**
 * Get the currently active template by name
 */
export async function getActiveTemplate(templateName: string = 'elterngeldantrag') {
  const { data, error } = await supabase
    .rpc('get_active_template', { p_template_name: templateName });

  if (error) {
    console.error('Error fetching active template:', error);
    throw error;
  }

  return data?.[0] || null;
}

/**
 * Download template PDF from storage
 */
export async function downloadTemplatePDF(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from('form-templates')
    .download(storagePath);

  if (error) {
    console.error('Error downloading template:', error);
    throw error;
  }

  return data;
}

/**
 * Download mapping file from storage
 */
export async function downloadMappingFile(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from('form-templates')
    .download(storagePath);

  if (error) {
    console.error('Error downloading mapping file:', error);
    throw error;
  }

  return data;
}

/**
 * Get public URL for a template file
 */
export function getTemplatePublicUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('form-templates')
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Upload template to storage (admin function)
 */
export async function uploadTemplate(
  file: File,
  path: string
): Promise<{ path: string; error?: Error }> {
  const { data, error } = await supabase.storage
    .from('form-templates')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    return { path: '', error };
  }

  return { path: data.path };
}

/**
 * List all templates (for admin)
 */
export async function listAllTemplates() {
  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing templates:', error);
    throw error;
  }

  return data as FormTemplate[];
}
