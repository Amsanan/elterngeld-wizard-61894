import { supabase } from '@/integrations/supabase/client';

/**
 * Recursively list all files in a bucket
 */
async function listAllFiles(bucketName: string, path: string = ''): Promise<string[]> {
  const allFiles: string[] = [];
  
  const { data: items, error } = await supabase.storage
    .from(bucketName)
    .list(path, {
      limit: 1000,
      offset: 0,
    });

  if (error || !items) {
    console.error('Error listing files:', error);
    return allFiles;
  }

  for (const item of items) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    
    if (item.id) {
      // It's a file
      allFiles.push(fullPath);
    } else {
      // It's a folder, recurse into it
      const subFiles = await listAllFiles(bucketName, fullPath);
      allFiles.push(...subFiles);
    }
  }

  return allFiles;
}

/**
 * Delete all files in entire bucket
 */
export async function deleteAllFilesInBucket(bucketName: string): Promise<{ success: boolean; error?: Error; deletedCount?: number }> {
  try {
    console.log('Starting to list all files...');
    const allFilePaths = await listAllFiles(bucketName);
    
    console.log(`Found ${allFilePaths.length} files to delete`);
    
    if (allFilePaths.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Delete files in batches of 100
    const batchSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < allFilePaths.length; i += batchSize) {
      const batch = allFilePaths.slice(i, i + batchSize);
      console.log(`Deleting batch ${Math.floor(i / batchSize) + 1}, files ${i + 1} to ${Math.min(i + batchSize, allFilePaths.length)}`);
      
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove(batch);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return { success: false, error: deleteError, deletedCount: totalDeleted };
      }

      totalDeleted += batch.length;
    }

    console.log(`Successfully deleted ${totalDeleted} files`);
    return { success: true, deletedCount: totalDeleted };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: error as Error };
  }
}

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
