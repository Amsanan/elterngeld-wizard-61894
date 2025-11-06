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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Define tables relevant for Elterngeld mapping
    const relevantTables = [
      'geburtsurkunden',
      'eltern_dokumente',
      'meldebescheinigungen',
      'bankverbindungen',
      'arbeitgeberbescheinigungen',
      'gehaltsnachweise',
      'einkommensteuerbescheide',
      'selbststaendigen_nachweise',
      'krankenversicherung_nachweise',
      'mutterschaftsgeld',
      'leistungsbescheide',
      'ehe_sorgerecht_nachweise',
      'adoptions_pflege_dokumente'
    ];

    // Query information_schema to get columns for each table
    const { data: columnsData, error: columnsError } = await supabase.rpc('execute_query', {
      query: `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY($1)
        ORDER BY table_name, ordinal_position
      `,
      params: [relevantTables]
    });

    if (columnsError) {
      // Fallback: get schema info manually for each table
      const schema: any[] = [];
      
      for (const tableName of relevantTables) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (!error && data !== null) {
          // Extract column names from the query metadata
          schema.push({
            table_name: tableName,
            columns: Object.keys(data[0] || {}).map(col => ({
              name: col,
              type: 'unknown',
              nullable: true
            }))
          });
        }
      }

      return new Response(JSON.stringify({ schema }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group columns by table
    const schemaByTable = relevantTables.map(tableName => {
      const tableColumns = (columnsData || [])
        .filter((col: any) => col.table_name === tableName)
        .map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES'
        }));

      return {
        table_name: tableName,
        columns: tableColumns
      };
    }).filter(table => table.columns.length > 0);

    return new Response(JSON.stringify({ schema: schemaByTable }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-database-schema:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});