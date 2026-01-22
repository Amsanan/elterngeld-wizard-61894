/**
 * Server-side file validation utilities for edge functions
 * Validates file paths, types, and sizes on the server
 */

// Allowed file extensions (lowercase)
export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;

// Maximum file size in bytes (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type AllowedExtension = typeof ALLOWED_EXTENSIONS[number];

export interface ServerFileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedPath?: string;
}

/**
 * Validates and sanitizes a file path from client request
 * Prevents path traversal and validates format
 */
export function validateFilePath(filePath: string | undefined | null): ServerFileValidationResult {
  // Check if path exists
  if (!filePath || typeof filePath !== 'string') {
    return {
      valid: false,
      error: 'No file path provided',
    };
  }
  
  // Trim and check for empty string
  const trimmedPath = filePath.trim();
  if (trimmedPath.length === 0) {
    return {
      valid: false,
      error: 'File path is empty',
    };
  }
  
  // Check path length (reasonable limit)
  if (trimmedPath.length > 500) {
    return {
      valid: false,
      error: 'File path too long',
    };
  }
  
  // Prevent path traversal attacks
  if (trimmedPath.includes('..') || trimmedPath.includes('//') || trimmedPath.startsWith('/')) {
    return {
      valid: false,
      error: 'Invalid file path format - path traversal not allowed',
    };
  }
  
  // Validate path format: UUID/timestamp_filename.ext
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (lowercase hex)
  // Timestamp: digits only
  // Filename: alphanumeric, dots, underscores, hyphens
  const pathRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/\d+_[\w.-]+\.(pdf|jpg|jpeg|png)$/i;
  
  if (!pathRegex.test(trimmedPath)) {
    return {
      valid: false,
      error: 'Invalid file path format - must be userId/timestamp_filename.ext',
    };
  }
  
  // Validate file extension
  const ext = trimmedPath.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    return {
      valid: false,
      error: `Invalid file type - only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
    };
  }
  
  return {
    valid: true,
    sanitizedPath: trimmedPath,
  };
}

/**
 * Validates file size from Blob/File data
 */
export function validateFileSize(fileData: Blob): ServerFileValidationResult {
  if (fileData.size > MAX_FILE_SIZE) {
    const sizeMB = (fileData.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size of 10MB`,
    };
  }
  
  if (fileData.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }
  
  return { valid: true };
}

/**
 * Validates file extension from path
 */
export function validateFileExtension(filePath: string): ServerFileValidationResult {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    return {
      valid: false,
      error: `Invalid file type - only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
    };
  }
  
  return { valid: true };
}

/**
 * Gets the file extension from a path
 */
export function getFileExtension(filePath: string): string {
  return filePath.split('.').pop()?.toLowerCase() || '';
}

/**
 * Checks if a file extension indicates a PDF
 */
export function isPDFFile(filePath: string): boolean {
  return getFileExtension(filePath) === 'pdf';
}
