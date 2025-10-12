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
 * Get the currently active template for a given template name
 */
export async function getActiveTemplate(templateName: string = 'elterngeldantrag'): Promise<Partial<FormTemplate> | null> {
  const { data, error } = await supabase.rpc('get_active_template', {
    p_template_name: templateName
  });

  if (error) {
    console.error('Error fetching active template:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Get the public URL for a template file in storage
 */
export function getTemplateUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('form-templates')
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Download a template file as a Blob
 */
export async function downloadTemplate(storagePath: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage
    .from('form-templates')
    .download(storagePath);

  if (error) {
    console.error('Error downloading template:', error);
    return null;
  }

  return data;
}

/**
 * Upload a new template file to storage (admin function)
 */
export async function uploadTemplate(
  file: File,
  path: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  const { data, error } = await supabase.storage
    .from('form-templates')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Error uploading template:', error);
    return { success: false, error: error.message };
  }

  return { success: true, path: data.path };
}

/**
 * List all available templates
 */
export async function listTemplates(): Promise<FormTemplate[]> {
  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('is_active', true)
    .order('valid_from', { ascending: false });

  if (error) {
    console.error('Error listing templates:', error);
    return [];
  }

  return data || [];
}
