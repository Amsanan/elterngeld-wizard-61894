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
    const [kind, elternteil, wohnsitz, wohnsitzAufenthalt, alleinerziehende, files, extractionLogs] = await Promise.all([
      supabase.from('kind').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2b_elternteil').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2c_wohnsitz').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2c_wohnsitz_aufenthalt').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2a_alleinerziehende').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('user_files').select('*').eq('antrag_id', antragId),
      supabase.from('extraction_logs').select('*').eq('antrag_id', antragId),
    ]);

    // Combine data from tables with prefixes to avoid field name conflicts
    let extracted_data: Record<string, any> = {
      ...antrag,
    };

    // Add kind data with 'kind_' prefix to avoid conflicts with parent data
    if (kind.data) {
      Object.entries(kind.data).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'antrag_id' && key !== 'created_at') {
          extracted_data[`kind_${key}`] = value;
        }
      });
    }

    // Add other table data
    extracted_data = {
      ...extracted_data,
      ...elternteil.data,
      ...wohnsitz.data,
      ...wohnsitzAufenthalt.data,
      ...alleinerziehende.data,
    };

    // Add extraction_logs data as fallback
    if (extractionLogs.data) {
      const logsData: Record<string, any> = {};
      extractionLogs.data.forEach(log => {
        if (log.field_name && log.field_value) {
          logsData[log.field_name] = log.field_value;
        }
      });
      // Merge with priority to table data
      extracted_data = { ...logsData, ...extracted_data };
    }

    // Get uploaded document types
    const uploaded_documents = files.data?.map(f => f.file_type).filter(Boolean) || [];

    // Calculate filled fields
    const filled_fields = Object.keys(extracted_data).filter(
      key => extracted_data[key] !== null && extracted_data[key] !== undefined && extracted_data[key] !== ''
    );

    console.log('Loaded antrag data:', { extracted_data, uploaded_documents, filled_fields });

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
