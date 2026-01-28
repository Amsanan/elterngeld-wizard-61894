import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fill mode classification rules
function determineFillMode(
  fieldName: string, 
  fieldType: string, 
  hasMapping: boolean,
  mappingConfidence: number
): { fill_mode: string; fill_reason: string; max_confidence: number } {
  
  // RULE 1: ALL checkboxes are CONFIRM_ONLY - NEVER auto-fill
  if (fieldType === 'PDFCheckBox' || fieldName.startsWith('cb.') || fieldName.startsWith('cb_')) {
    return {
      fill_mode: 'CONFIRM_ONLY',
      fill_reason: 'Checkbox/Entscheidungsfeld erfordert Benutzerbestätigung',
      max_confidence: 0
    };
  }
  
  // RULE 2: Lebensmonat grid fields are CONFIRM_ONLY
  if (fieldName.match(/cb[._]BG[._]\d+/) || fieldName.match(/cb[._]E\+[._]\d+/)) {
    return {
      fill_mode: 'CONFIRM_ONLY',
      fill_reason: 'Lebensmonat-Auswahl erfordert Benutzerplanung',
      max_confidence: 0
    };
  }
  
  // RULE 3: Declaration/signature fields are CONFIRM_ONLY
  if (fieldName.toLowerCase().includes('unterschrift') || 
      fieldName.toLowerCase().includes('erklaerung') ||
      fieldName.toLowerCase().includes('datum') && fieldName.toLowerCase().includes('antrag')) {
    return {
      fill_mode: 'CONFIRM_ONLY',
      fill_reason: 'Erklärung/Unterschrift erfordert Benutzerbestätigung',
      max_confidence: 0
    };
  }
  
  // RULE 4: Text fields with high-confidence mappings get AUTO_FILL
  if (fieldType === 'PDFTextField' && hasMapping && mappingConfidence >= 0.8) {
    // High-confidence personal data fields
    if (fieldName.match(/vorname|nachname|name|geburt|strasse|hausnr|plz|ort|iban|bic|steuer/i)) {
      return {
        fill_mode: 'AUTO_FILL',
        fill_reason: 'Hochkonfidenz-Feld aus Dokumenten extrahierbar',
        max_confidence: mappingConfidence
      };
    }
  }
  
  // RULE 5: Income fields are SUGGEST (need review)
  if (fieldName.match(/einkommen|gehalt|brutto|netto|betrag|euro|summe/i)) {
    return {
      fill_mode: 'SUGGEST',
      fill_reason: 'Einkommensfeld erfordert Benutzerprüfung',
      max_confidence: 0.7
    };
  }
  
  // RULE 6: Text fields with mapping but lower confidence get SUGGEST
  if (fieldType === 'PDFTextField' && hasMapping) {
    return {
      fill_mode: 'SUGGEST',
      fill_reason: 'Vorschlag basierend auf Dokumentenextraktion',
      max_confidence: mappingConfidence
    };
  }
  
  // RULE 7: Text fields without mapping get SUGGEST (manual entry likely)
  if (fieldType === 'PDFTextField') {
    return {
      fill_mode: 'SUGGEST',
      fill_reason: 'Manuelle Eingabe oder Dokumentenupload erforderlich',
      max_confidence: 0
    };
  }
  
  // Default: CONFIRM_ONLY for safety
  return {
    fill_mode: 'CONFIRM_ONLY',
    fill_reason: 'Unbekannter Feldtyp - Benutzerbestätigung erforderlich',
    max_confidence: 0
  };
}

// Determine document types that can provide data for a field
function determineDocTypes(fieldName: string, targetPerson: string): string[] {
  const docTypes: string[] = [];
  
  // Personal data fields
  if (fieldName.match(/vorname|nachname|name|geburt|geburts/i)) {
    if (targetPerson === 'antragskind' || fieldName.includes('1A') || fieldName.includes('1a')) {
      docTypes.push('geburtsurkunde');
    } else if (targetPerson === 'elternteil_1' || targetPerson === 'elternteil_2') {
      docTypes.push('eltern_dokument');
      docTypes.push('meldebescheinigung');
    }
  }
  
  // Address fields
  if (fieldName.match(/strasse|hausnr|plz|ort|wohn|adresse/i)) {
    docTypes.push('meldebescheinigung');
    docTypes.push('eltern_dokument');
  }
  
  // Bank fields
  if (fieldName.match(/iban|bic|bank|konto/i)) {
    docTypes.push('bankverbindung');
  }
  
  // Tax fields
  if (fieldName.match(/steuer/i)) {
    docTypes.push('einkommensteuerbescheid');
    docTypes.push('eltern_dokument');
  }
  
  // Income fields
  if (fieldName.match(/einkommen|gehalt|brutto|netto/i)) {
    docTypes.push('gehaltsnachweis');
    docTypes.push('arbeitgeberbescheinigung');
    docTypes.push('einkommensteuerbescheid');
  }
  
  return [...new Set(docTypes)];
}

// Extract semantic entity from field name
function determineEntities(fieldName: string, targetPerson: string): string[] {
  const entities: string[] = [];
  
  // Add person prefix
  let personPrefix = '';
  if (targetPerson === 'elternteil_1') personPrefix = 'eltern1.';
  else if (targetPerson === 'elternteil_2') personPrefix = 'eltern2.';
  else if (targetPerson === 'antragskind') personPrefix = 'kind.';
  else if (targetPerson.startsWith('geschwister')) personPrefix = `geschwister.`;
  
  // Common field patterns
  if (fieldName.match(/vorname/i)) entities.push(`${personPrefix}vorname`);
  if (fieldName.match(/nachname|name/i) && !fieldName.match(/vorname/i)) entities.push(`${personPrefix}nachname`);
  if (fieldName.match(/geburt/i) && fieldName.match(/datum|tag/i)) entities.push(`${personPrefix}geburtsdatum`);
  if (fieldName.match(/geburtsort/i)) entities.push(`${personPrefix}geburtsort`);
  if (fieldName.match(/strasse|str\./i)) entities.push(`${personPrefix}strasse`);
  if (fieldName.match(/hausnr|hnr/i)) entities.push(`${personPrefix}hausnummer`);
  if (fieldName.match(/plz/i)) entities.push(`${personPrefix}plz`);
  if (fieldName.match(/ort|wohnort/i) && !fieldName.match(/geburtsort/i)) entities.push(`${personPrefix}wohnort`);
  if (fieldName.match(/iban/i)) entities.push('bank.iban');
  if (fieldName.match(/bic/i)) entities.push('bank.bic');
  if (fieldName.match(/steuer.*id|id.*steuer/i)) entities.push(`${personPrefix}steuer_id`);
  
  return entities;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clear_existing } = await req.json().catch(() => ({}));

    // Fetch all fields from pdf_field_registry
    const { data: registryFields, error: registryError } = await supabase
      .from('pdf_field_registry')
      .select('pdf_field_name, field_type, target_person, semantic_meaning, page_number');

    if (registryError) throw registryError;

    if (!registryFields || registryFields.length === 0) {
      throw new Error('pdf_field_registry is empty. Please run populate-pdf-field-registry first.');
    }

    // Fetch existing mappings for confidence info
    const { data: mappings, error: mappingsError } = await supabase
      .from('pdf_field_mappings')
      .select('pdf_field_name');

    if (mappingsError) throw mappingsError;

    const mappedFields = new Set((mappings || []).map(m => m.pdf_field_name));

    // Generate fill modes for each field
    const fillModes = registryFields.map(field => {
      const hasMapping = mappedFields.has(field.pdf_field_name);
      const mappingConfidence = hasMapping ? 0.85 : 0; // Default confidence for mapped fields
      
      const { fill_mode, fill_reason, max_confidence } = determineFillMode(
        field.pdf_field_name,
        field.field_type,
        hasMapping,
        mappingConfidence
      );
      
      const docTypes = determineDocTypes(field.pdf_field_name, field.target_person);
      const entities = determineEntities(field.pdf_field_name, field.target_person);
      
      return {
        pdf_field_name: field.pdf_field_name,
        fill_mode,
        fill_reason,
        doc_types: docTypes,
        entities,
        max_confidence,
        has_analysis_link: false, // Can be updated later with analysis data
        analysis_reference: null
      };
    });

    // Clear existing entries if requested
    if (clear_existing) {
      const { error: deleteError } = await supabase
        .from('field_fill_modes')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        console.error('Error clearing field_fill_modes:', deleteError);
      }
    }

    // Upsert fill modes
    const { data: upsertData, error: upsertError } = await supabase
      .from('field_fill_modes')
      .upsert(fillModes, { 
        onConflict: 'pdf_field_name',
        ignoreDuplicates: false 
      })
      .select();

    if (upsertError) {
      console.error('Error upserting fill modes:', upsertError);
      throw upsertError;
    }

    // Count by fill_mode for summary
    const summary = {
      AUTO_FILL: fillModes.filter(f => f.fill_mode === 'AUTO_FILL').length,
      SUGGEST: fillModes.filter(f => f.fill_mode === 'SUGGEST').length,
      CONFIRM_ONLY: fillModes.filter(f => f.fill_mode === 'CONFIRM_ONLY').length,
    };

    return new Response(JSON.stringify({ 
      success: true,
      total_fields: fillModes.length,
      summary,
      message: `Generated fill modes for ${fillModes.length} fields`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-fill-modes:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
