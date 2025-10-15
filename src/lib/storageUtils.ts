import { supabase } from '@/integrations/supabase/client';

/**
 * Delete all files in a folder (path prefix) from a storage bucket
 */
export async function deleteFolder(bucketName: string, folderPath: string): Promise<{ success: boolean; error?: Error; deletedCount?: number }> {
  try {
    // Ensure folder path ends with /
    const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    
    // List all files in the folder
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list(normalizedPath, {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      return { success: false, error: listError };
    }

    if (!files || files.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Build full paths for all files
    const filePaths = files.map(file => `${normalizedPath}${file.name}`);

    // Delete all files
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(filePaths);

    if (deleteError) {
      return { success: false, error: deleteError };
    }

    return { success: true, deletedCount: files.length };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
