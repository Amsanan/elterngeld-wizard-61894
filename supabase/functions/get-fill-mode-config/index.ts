import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const url = new URL(req.url);
    const fieldName = url.searchParams.get('field');
    const page = url.searchParams.get('page');

    // Build query
    let query = supabase
      .from('field_fill_modes')
      .select(`
        pdf_field_name,
        fill_mode,
        fill_reason,
        doc_types,
        entities,
        max_confidence,
        has_analysis_link,
        analysis_reference
      `);

    // Filter by specific field
    if (fieldName) {
      query = query.eq('pdf_field_name', fieldName);
    }

    // If page filter is provided, we need to join with pdf_field_registry
    if (page && !fieldName) {
      // First get field names for that page from registry
      const { data: registryFields, error: registryError } = await supabase
        .from('pdf_field_registry')
        .select('pdf_field_name')
        .eq('page_number', parseInt(page));

      if (registryError) throw registryError;

      if (registryFields && registryFields.length > 0) {
        const fieldNames = registryFields.map(f => f.pdf_field_name);
        query = query.in('pdf_field_name', fieldNames);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    // If single field requested, return just that object
    if (fieldName) {
      if (data && data.length > 0) {
        return new Response(JSON.stringify(data[0]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Return default CONFIRM_ONLY for unknown fields
        return new Response(JSON.stringify({
          pdf_field_name: fieldName,
          fill_mode: 'CONFIRM_ONLY',
          fill_reason: 'Feld nicht in Konfiguration gefunden',
          doc_types: [],
          entities: [],
          max_confidence: 0,
          has_analysis_link: false,
          analysis_reference: null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Return all fields as an object keyed by field name for easy lookup
    const fieldsMap: Record<string, any> = {};
    for (const field of (data || [])) {
      fieldsMap[field.pdf_field_name] = field;
    }

    return new Response(JSON.stringify({
      fields: fieldsMap,
      count: Object.keys(fieldsMap).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-fill-mode-config:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
