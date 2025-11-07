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

    // Only include actual document tables that users upload and extract data from
    console.log('Loading document tables schema...');
    const relevantTables = [
      'geburtsurkunden',
      'eltern_dokumente',
      'meldebescheinigungen',
      'bankverbindungen',
      'arbeitgeberbescheinigungen',
      'gehaltsnachweise',
      'krankenversicherung_nachweise',
      'mutterschaftsgeld',
      'leistungsbescheide',
      'selbststaendigen_nachweise',
      'einkommensteuerbescheide',
      'ehe_sorgerecht_nachweise',
      'adoptions_pflege_dokumente'
    ];

    relevantTables.sort();

    // Query information_schema for all columns in relevant tables
    console.log('Querying information_schema for column details...');
    const { data: columnsData, error: schemaError } = await supabase
      .rpc('get_table_columns', { 
        table_names: relevantTables 
      });

    if (schemaError) {
      console.error('Error fetching schema:', schemaError);
      throw schemaError;
    }

    console.log(`Retrieved ${columnsData?.length || 0} columns from information_schema`);

    // Group columns by table
    const schema = relevantTables.map(tableName => {
      const tableColumns = (columnsData || [])
        .filter((col: any) => col.table_name === tableName)
        .filter((col: any) => !['id', 'user_id', 'created_at', 'updated_at', 'file_path', 'confidence_scores', 'antrag_id'].includes(col.column_name))
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

    console.log(`Found ${schema.length} tables with ${schema.reduce((sum, t) => sum + t.columns.length, 0)} total fields`);

    return new Response(JSON.stringify({ schema }), {
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