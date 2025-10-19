import { supabase } from '@/integrations/supabase/client';

export interface AntragData {
  antrag_id: string;
  uploaded_documents: string[];
  filled_fields: string[];
  extracted_data: Record<string, any>;
}

/**
 * Load antrag data from database using the new normalized elternteil structure
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

    // Get all related data including both parents from normalized elternteil table
    const [kind, elternteilData, wohnsitz, wohnsitzAufenthalt, alleinerziehende, files] = await Promise.all([
      supabase.from('kind').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('elternteil').select('*').eq('antrag_id', antragId), // Get both parents
      supabase.from('antrag_2c_wohnsitz').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2c_wohnsitz_aufenthalt').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2a_alleinerziehende').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('user_files').select('*').eq('antrag_id', antragId),
    ]);

    // Separate parent 1 and parent 2 from elternteil data
    const elternteil = elternteilData.data || [];
    const elternteil_1 = elternteil.find((e: any) => e.parent_number === 1);
    const elternteil_2 = elternteil.find((e: any) => e.parent_number === 2);

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

    // Add parent 1 data (no suffix for backward compatibility with PDF fields)
    if (elternteil_1) {
      Object.entries(elternteil_1).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'antrag_id' && key !== 'created_at' && key !== 'parent_number' && key !== 'updated_at') {
          extracted_data[key] = value;
        }
      });
    }

    // Add parent 2 data with '_2' suffix
    if (elternteil_2) {
      Object.entries(elternteil_2).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'antrag_id' && key !== 'created_at' && key !== 'parent_number' && key !== 'updated_at') {
          extracted_data[`${key}_2`] = value;
        }
      });
    }

    // Add other table data
    if (wohnsitz.data) {
      Object.entries(wohnsitz.data).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'antrag_id' && key !== 'created_at') {
          extracted_data[key] = value;
        }
      });
    }
    
    if (wohnsitzAufenthalt.data) {
      Object.entries(wohnsitzAufenthalt.data).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'antrag_id' && key !== 'created_at') {
          extracted_data[key] = value;
        }
      });
    }
    
    if (alleinerziehende.data) {
      Object.entries(alleinerziehende.data).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'antrag_id' && key !== 'created_at') {
          extracted_data[key] = value;
        }
      });
    }

    // Get uploaded document types
    const uploaded_documents = files.data?.map(f => f.file_type).filter(Boolean) || [];

    // Calculate filled fields
    const filled_fields = Object.keys(extracted_data).filter(
      key => extracted_data[key] !== null && extracted_data[key] !== undefined && extracted_data[key] !== ''
    );

    console.log('Loaded antrag data with normalized elternteil:', { 
      extracted_data, 
      uploaded_documents, 
      filled_fields,
      hasParent1: !!elternteil_1,
      hasParent2: !!elternteil_2,
    });

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
