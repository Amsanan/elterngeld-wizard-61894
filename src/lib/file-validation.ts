/**
 * File validation utilities for secure file uploads
 * Used to validate file type, size, and sanitize filenames
 */

// Allowed MIME types for document uploads
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
] as const;

// Allowed file extensions
export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;

// Maximum file size in bytes (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Maximum filename length
export const MAX_FILENAME_LENGTH = 100;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];
export type AllowedExtension = typeof ALLOWED_EXTENSIONS[number];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file's type based on MIME type
 */
export function validateFileType(file: File): FileValidationResult {
  const mimeType = file.type.toLowerCase();
  
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return {
      valid: false,
      error: `Ungültiger Dateityp "${mimeType}". Nur PDF und Bilddateien (JPG, PNG) sind erlaubt.`,
    };
  }
  
  return { valid: true };
}

/**
 * Validates a file's size
 */
export function validateFileSize(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Die Datei ist zu groß (${sizeMB}MB). Die maximale Größe beträgt 10MB.`,
    };
  }
  
  if (file.size === 0) {
    return {
      valid: false,
      error: 'Die Datei ist leer.',
    };
  }
  
  return { valid: true };
}

/**
 * Sanitizes a filename by removing special characters and limiting length
 */
export function sanitizeFilename(filename: string): string {
  // Get the extension
  const lastDotIndex = filename.lastIndexOf('.');
  const extension = lastDotIndex > 0 ? filename.slice(lastDotIndex) : '';
  const nameWithoutExt = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  
  // Remove or replace dangerous characters
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Trim underscores from start/end
    .slice(0, MAX_FILENAME_LENGTH - extension.length - 1); // Limit length
  
  // Ensure we have a valid name
  const finalName = sanitized || 'file';
  
  return `${finalName}${extension.toLowerCase()}`;
}

/**
 * Validates file extension from filename
 */
export function validateFileExtension(filename: string): FileValidationResult {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    return {
      valid: false,
      error: `Ungültige Dateierweiterung ".${ext || 'unbekannt'}". Erlaubt sind: ${ALLOWED_EXTENSIONS.join(', ')}.`,
    };
  }
  
  return { valid: true };
}

/**
 * Comprehensive file validation - validates type, size, and extension
 */
export function validateFile(file: File): FileValidationResult {
  // Check file type
  const typeResult = validateFileType(file);
  if (!typeResult.valid) return typeResult;
  
  // Check file size
  const sizeResult = validateFileSize(file);
  if (!sizeResult.valid) return sizeResult;
  
  // Check file extension
  const extResult = validateFileExtension(file.name);
  if (!extResult.valid) return extResult;
  
  return { valid: true };
}

/**
 * Creates a secure file path for storage
 */
export function createSecureFilePath(userId: string, originalFilename: string): string {
  const timestamp = Date.now();
  const sanitizedName = sanitizeFilename(originalFilename);
  return `${userId}/${timestamp}_${sanitizedName}`;
}
