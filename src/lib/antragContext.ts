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

    // Get all related data including both parents and all form sections
    const [
      kind, 
      elternteilData, 
      wohnsitz, 
      wohnsitzAufenthalt, 
      alleinerziehende,
      elternteilInfo,
      kindAdresse,
      arbeitImAusland,
      antragstellende,
      staatsangehoerigkeit,
      familienstand,
      betreuungKind,
      elternkindBeziehung,
      adoption,
      weitereKinder,
      krankenversicherung,
      gesamteinkommen,
      mindestbetrag,
      bisherigeErwerbstaetigkeit,
      einkommenVorGeburt,
      steuernUndAbgaben,
      einkommenErsatzLeistungen,
      mutterschaftsLeistungen,
      bankverbindung,
      kontakt,
      mitteilung,
      unterschrift,
      files
    ] = await Promise.all([
      supabase.from('kind').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('elternteil').select('*').eq('antrag_id', antragId),
      supabase.from('antrag_2c_wohnsitz').select('*').eq('antrag_id', antragId),
      supabase.from('antrag_2c_wohnsitz_aufenthalt').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2a_alleinerziehende').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2b_elternteil').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2c_kind_adresse').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2d_arbeit_im_ausland').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2e_antragstellende').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_2f_staatsangehoerigkeit').select('*').eq('antrag_id', antragId),
      supabase.from('antrag_2g_familienstand').select('*').eq('antrag_id', antragId),
      supabase.from('antrag_3a_betreuung_kind').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_3b_elternkind_beziehung').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_3c_adoption').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_4_weitere_kinder_info').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_5_krankenversicherung').select('*').eq('antrag_id', antragId),
      supabase.from('antrag_6a_gesamteinkommen').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_6b_mindestbetrag').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_7a_bisherige_erwerbstaetigkeit').select('*').eq('antrag_id', antragId),
      supabase.from('antrag_8a_einkomen_vor_geburt_bestimmt').select('*').eq('antrag_id', antragId),
      supabase.from('antrag_8b_steuern_und_abgaben').select('*').eq('antrag_id', antragId),
      supabase.from('antrag_9_einkommen_ersatz_leistungen').select('*').eq('antrag_id', antragId),
      supabase.from('antrag_10_mutterschafts_leistungen').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_16a_bankverbindung').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_16b_kontakt').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_16c_mitteilung').select('*').eq('antrag_id', antragId).maybeSingle(),
      supabase.from('antrag_16d_unterschrift').select('*').eq('antrag_id', antragId).maybeSingle(),
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

    // Helper to merge table data, handling arrays and filtering parent-specific data
    const mergeTableData = (data: any, suffix: string = '', elternteilId?: string) => {
      if (!data) return;
      
      // Handle array results (e.g., wohnsitz, staatsangehoerigkeit with elternteil_id)
      const records = Array.isArray(data) ? data : [data];
      
      records.forEach((record: any) => {
        if (!record) return;
        
        // Filter by elternteil_id if specified
        if (elternteilId && record.elternteil_id && record.elternteil_id !== elternteilId) {
          return;
        }
        
        Object.entries(record).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'antrag_id' && key !== 'created_at' && key !== 'updated_at' && key !== 'elternteil_id') {
            extracted_data[`${key}${suffix}`] = value;
          }
        });
      });
    };

    // Merge all table data
    mergeTableData(alleinerziehende.data);
    mergeTableData(elternteilInfo.data);
    mergeTableData(kindAdresse.data);
    mergeTableData(arbeitImAusland.data);
    mergeTableData(antragstellende.data);
    mergeTableData(betreuungKind.data);
    mergeTableData(elternkindBeziehung.data);
    mergeTableData(adoption.data);
    mergeTableData(weitereKinder.data);
    mergeTableData(gesamteinkommen.data);
    mergeTableData(mindestbetrag.data);
    mergeTableData(mutterschaftsLeistungen.data);
    mergeTableData(bankverbindung.data);
    mergeTableData(kontakt.data);
    mergeTableData(mitteilung.data);
    mergeTableData(unterschrift.data);
    mergeTableData(wohnsitzAufenthalt.data);
    
    // Handle parent-specific data (wohnsitz, staatsangehoerigkeit, etc.)
    if (elternteil_1) {
      mergeTableData(wohnsitz.data, '', elternteil_1.id);
      mergeTableData(staatsangehoerigkeit.data, '', elternteil_1.id);
      mergeTableData(familienstand.data, '', elternteil_1.id);
      mergeTableData(krankenversicherung.data, '', elternteil_1.id);
      mergeTableData(bisherigeErwerbstaetigkeit.data, '', elternteil_1.id);
      mergeTableData(einkommenVorGeburt.data, '', elternteil_1.id);
      mergeTableData(steuernUndAbgaben.data, '', elternteil_1.id);
      mergeTableData(einkommenErsatzLeistungen.data, '', elternteil_1.id);
    }
    
    if (elternteil_2) {
      mergeTableData(wohnsitz.data, '_2', elternteil_2.id);
      mergeTableData(staatsangehoerigkeit.data, '_2', elternteil_2.id);
      mergeTableData(familienstand.data, '_2', elternteil_2.id);
      mergeTableData(krankenversicherung.data, '_2', elternteil_2.id);
      mergeTableData(bisherigeErwerbstaetigkeit.data, '_2', elternteil_2.id);
      mergeTableData(einkommenVorGeburt.data, '_2', elternteil_2.id);
      mergeTableData(steuernUndAbgaben.data, '_2', elternteil_2.id);
      mergeTableData(einkommenErsatzLeistungen.data, '_2', elternteil_2.id);
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
