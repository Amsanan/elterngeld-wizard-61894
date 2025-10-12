import { supabase } from '@/integrations/supabase/client';

export interface AntragData {
  antrag_id: string;
  uploaded_documents: string[];
  filled_fields: string[];
  extracted_data: Record<string, any>;
}

/**
 * Load antrag data from database
 */
export async function loadAntragData(antragId: string): Promise<AntragData | null> {
  try {
    // Get antrag
    const { data: antrag, error: antragError } = await supabase
      .from('antrag')
      .select('*')
      .eq('id', antragId)
      .single();

    if (antragError) throw antragError;

    // Get all related data
    const [kind, elternteil, wohnsitz, wohnsitzAufenthalt, alleinerziehende, files] = await Promise.all([
      supabase.from('kind').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2b_elternteil').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2c_wohnsitz').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2c_wohnsitz_aufenthalt').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2a_alleinerziehende').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('user_files').select('*').eq('antrag_id', antragId),
    ]);

    // Combine all data
    const extracted_data = {
      ...antrag,
      ...kind.data,
      ...elternteil.data,
      ...wohnsitz.data,
      ...wohnsitzAufenthalt.data,
      ...alleinerziehende.data,
    };

    // Get uploaded document types
    const uploaded_documents = files.data?.map(f => f.file_type).filter(Boolean) || [];

    // Calculate filled fields
    const filled_fields = Object.keys(extracted_data).filter(
      key => extracted_data[key] !== null && extracted_data[key] !== undefined && extracted_data[key] !== ''
    );

    return {
      antrag_id: antragId,
      uploaded_documents,
      filled_fields,
      extracted_data,
    };
  } catch (error) {
    console.error('Error loading antrag data:', error);
    return null;
  }
}

/**
 * Get next required document based on what's already uploaded
 */
export function getNextRequiredDocument(uploadedDocuments: string[]): string | null {
  const requiredDocuments = [
    'geburtsurkunde',
    'gehaltsnachweis',
    'personalausweis',
    'versicherungsnachweis',
  ];

  for (const doc of requiredDocuments) {
    if (!uploadedDocuments.includes(doc)) {
      return doc;
    }
  }

  return null; // All documents uploaded
}

/**
 * Get document display name
 */
export function getDocumentDisplayName(docType: string): string {
  const names: Record<string, string> = {
    geburtsurkunde: 'Geburtsurkunde',
    gehaltsnachweis: 'Gehaltsnachweis',
    personalausweis: 'Personalausweis',
    versicherungsnachweis: 'Versicherungsnachweis',
  };
  return names[docType] || docType;
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(filledFields: string[], totalFields: number = 50): number {
  return Math.min(100, Math.round((filledFields.length / totalFields) * 100));
}
