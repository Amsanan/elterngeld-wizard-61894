/**
 * PDF Generator
 * 
 * Main entry point for PDF generation.
 * Re-exports all PDF generation functionality from modular components.
 */

export type { FormData } from './pdf/types';
export { generateFilledPDF, createPDFBlobURL, downloadPDFFromURL, downloadPDF } from './pdf/generator';

// Legacy compatibility - re-export everything
import { generateFilledPDF as _generateFilledPDF } from './pdf/generator';
export default _generateFilledPDF;

