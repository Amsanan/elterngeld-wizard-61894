import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExcelMappingRow {
  lfd_nr_json?: number;
  seite?: number;
  kapitel?: number;
  abschnitt?: string;
  abschnitt_visuell?: string;
  visueller_feldname_de?: string;
  technischer_name?: string;
  feldtyp?: string;
  format?: string;
  koord_x?: number;
  koord_y?: number;
  breite?: number;
  hoehe?: number;
  ziel_feld_de?: string;
  validierung_de?: string;
  hinweis_de?: string;
}

interface MappingInsert {
  pdf_field_name: string;
  source_table: string;
  source_field: string;
  document_type: string;
  page_number: number | null;
  section_visual: string | null;
  field_label_de: string | null;
  field_type: string | null;
  format_hint: string | null;
  coord_x: number | null;
  coord_y: number | null;
  width: number | null;
  height: number | null;
  validation_rule_de: string | null;
  hint_de: string | null;
  reading_order: number | null;
  confidence_score: number;
  mapping_status: string;
  is_active: boolean;
  created_by: string;
}

// Enhanced function to derive source_table from ziel_feld_de
function deriveSourceTable(zielFeld: string): { table: string; field: string; isCount?: boolean } {
  if (!zielFeld || zielFeld.trim() === '') {
    return { table: 'elterngeldantrag_data', field: '' };
  }

  const field = zielFeld.trim().toLowerCase();

  // Geburtsurkunden-Felder (Kind-Daten)
  const geburtsurkunderFelder = [
    'kind_vorname', 'kind_nachname', 'kind_geburtsdatum', 'kind_geburtsort',
    'kind_geburtsnummer', 'urkundennummer', 'behoerde_name',
    'mutter_vorname', 'mutter_nachname', 'mutter_geburtsname',
    'vater_vorname', 'vater_nachname'
  ];
  
  if (geburtsurkunderFelder.includes(field)) {
    return { table: 'geburtsurkunden', field: zielFeld };
  }

  // Mehrlinge = COUNT auf geburtsurkunden (Spezialfall!)
  if (field === 'kind_mehrlinge_anzahl') {
    return { table: 'geburtsurkunden', field: 'COUNT', isCount: true };
  }

  // Bankverbindung
  if (field.startsWith('bank_') || field === 'iban' || field === 'bic' || field === 'kontoinhaber') {
    return { table: 'bankverbindungen', field: zielFeld };
  }

  // Meldebescheinigung
  if (field.includes('meldebescheinigung') || field === 'meldedatum') {
    return { table: 'meldebescheinigungen', field: zielFeld };
  }

  // Arbeitgeberbescheinigung
  if (field.includes('arbeitgeber') && !field.includes('sitz')) {
    return { table: 'arbeitgeberbescheinigungen', field: zielFeld };
  }

  // Mutterschaftsgeld
  if (field.includes('mutterschaftsgeld') || field === 'tagessatz' || field === 'gesamtbetrag') {
    return { table: 'mutterschaftsgeld', field: zielFeld };
  }

  // Krankenversicherung - check for specific patterns
  if (field.includes('krankenkasse') || field.includes('versicherten') || 
      field === 'beitragssatz' || field.includes('_kv_')) {
    return { table: 'krankenversicherung_nachweise', field: zielFeld };
  }

  // Eltern-Dokumente (Personalausweis, Reisepass, etc.)
  if (field.includes('ausweisnummer') || field.includes('aufenthaltstitel') || 
      (field.includes('gueltig_bis') && !field.includes('leistungs'))) {
    return { table: 'eltern_dokumente', field: zielFeld };
  }

  // Leistungsbescheide
  if (field.includes('leistungs') || field.includes('alg') || field.includes('buergergeld')) {
    return { table: 'leistungsbescheide', field: zielFeld };
  }

  // Steuerbescheide / Einkommensteuer
  if (field.includes('steuer') && (field.includes('bescheid') || field.includes('einkommen'))) {
    return { table: 'einkommensteuerbescheide', field: zielFeld };
  }

  // Selbstständigen-Nachweise
  if (field.includes('selbst') || field.includes('gewerbe') || field.includes('freiberuf')) {
    return { table: 'selbststaendigen_nachweise', field: zielFeld };
  }

  // Profile-Daten (Kontaktdaten)
  if (field === 'email' || field === 'telefon') {
    return { table: 'profiles', field: zielFeld };
  }

  // Gehaltsnachweise
  if (field.includes('gehalt') || field.includes('brutto') || field.includes('netto') ||
      field.includes('lohnsteuer') || field.includes('sozialversicherung')) {
    return { table: 'gehaltsnachweise', field: zielFeld };
  }

  // Adoption/Pflege Dokumente
  if (field.includes('adoption') || field.includes('pflege') && field.includes('kind')) {
    return { table: 'adoptions_pflege_dokumente', field: zielFeld };
  }

  // Ehe/Sorgerecht Nachweise
  if (field.includes('heirat') || field.includes('ehe') || field.includes('sorgerecht') ||
      field.includes('lebenspartner')) {
    return { table: 'ehe_sorgerecht_nachweise', field: zielFeld };
  }

  // All other fields (eltern1_*, eltern2_*, kind_*, haushalt_*, monatsplan_*, geschwisterbonus_*, etc.)
  // These are the main application form fields
  return { table: 'elterngeldantrag_data', field: zielFeld };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role (or allow if no admins exist yet for initial setup)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    // If no admins exist at all, allow the first authenticated user
    const { count: adminCount } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    const noAdminsExist = (adminCount === null || adminCount === 0);
    
    if (!roleData && !noAdminsExist) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If first user, auto-promote to admin
    if (noAdminsExist && !roleData) {
      await supabaseAdmin.from('user_roles').insert({ user_id: user.id, role: 'admin' });
      console.log(`Auto-promoted user ${user.id} to admin (first user)`);
    }

    // Parse request
    const { mappings, documentType, mode = 'upsert' } = await req.json();

    if (!mappings || !Array.isArray(mappings)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mappings data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${mappings.length} mappings for document type: ${documentType || 'elterngeldantrag'}`);

    // Transform Excel rows to DB format
    const mappingsToInsert: MappingInsert[] = [];
    const errors: string[] = [];
    const skipped: string[] = [];

    for (const row of mappings as ExcelMappingRow[]) {
      try {
        // Skip rows without technical name (PDF field name)
        const techName = row.technischer_name?.toString().trim();
        if (!techName || techName === '') {
          skipped.push(`Row ${row.lfd_nr_json || 'unknown'}: Missing technical name`);
          continue;
        }

        // Derive source table and field from ziel_feld_de
        const zielFeld = row.ziel_feld_de?.toString().trim() || '';
        const { table, field, isCount } = deriveSourceTable(zielFeld);

        const mapping: MappingInsert = {
          pdf_field_name: techName,
          source_table: table,
          source_field: isCount ? 'COUNT' : (field || techName),
          document_type: documentType || 'elterngeldantrag',
          page_number: typeof row.seite === 'number' ? row.seite : null,
          section_visual: row.abschnitt_visuell?.toString() || null,
          field_label_de: row.visueller_feldname_de?.toString() || null,
          field_type: row.feldtyp?.toString() || null,
          format_hint: row.format?.toString() || null,
          coord_x: typeof row.koord_x === 'number' ? row.koord_x : null,
          coord_y: typeof row.koord_y === 'number' ? row.koord_y : null,
          width: typeof row.breite === 'number' ? row.breite : null,
          height: typeof row.hoehe === 'number' ? row.hoehe : null,
          validation_rule_de: row.validierung_de?.toString() || null,
          hint_de: row.hinweis_de?.toString() || null,
          reading_order: typeof row.lfd_nr_json === 'number' ? row.lfd_nr_json : null,
          confidence_score: 1.0,
          mapping_status: 'imported',
          is_active: true,
          created_by: user.id,
        };

        mappingsToInsert.push(mapping);
      } catch (err) {
        errors.push(`Row ${row.lfd_nr_json || 'unknown'}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log(`Prepared ${mappingsToInsert.length} mappings for insert, ${skipped.length} skipped, ${errors.length} errors`);

    // Log derived tables distribution for debugging
    const tableDistribution: Record<string, number> = {};
    mappingsToInsert.forEach(m => {
      tableDistribution[m.source_table] = (tableDistribution[m.source_table] || 0) + 1;
    });
    console.log('Table distribution:', JSON.stringify(tableDistribution));

    // Clear existing mappings if mode is 'replace'
    if (mode === 'replace') {
      const { error: deleteError } = await supabaseAdmin
        .from('pdf_field_mappings')
        .delete()
        .eq('document_type', documentType || 'elterngeldantrag');

      if (deleteError) {
        console.error('Error clearing existing mappings:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to clear existing mappings', details: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Cleared existing mappings');
    }

    // Batch insert/upsert mappings
    const batchSize = 50;
    let insertedCount = 0;
    let batchErrors: string[] = [];

    for (let i = 0; i < mappingsToInsert.length; i += batchSize) {
      const batch = mappingsToInsert.slice(i, i + batchSize);
      
      const { data, error: insertError } = await supabaseAdmin
        .from('pdf_field_mappings')
        .upsert(batch, {
          onConflict: 'pdf_field_name,document_type',
          ignoreDuplicates: false,
        })
        .select();

      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
        batchErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
      } else {
        insertedCount += data?.length || 0;
        console.log(`Batch ${Math.floor(i / batchSize) + 1}: Inserted ${data?.length || 0} records`);
      }
    }

    // Get final count
    const { count } = await supabaseAdmin
      .from('pdf_field_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('document_type', documentType || 'elterngeldantrag');

    const result = {
      success: batchErrors.length === 0,
      summary: {
        totalReceived: mappings.length,
        processed: mappingsToInsert.length,
        inserted: insertedCount,
        skipped: skipped.length,
        errors: errors.length + batchErrors.length,
        totalInDatabase: count,
        tableDistribution,
      },
      skippedDetails: skipped.slice(0, 20),
      errorDetails: [...errors.slice(0, 10), ...batchErrors],
    };

    console.log('Import completed:', JSON.stringify(result.summary));

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Import failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
