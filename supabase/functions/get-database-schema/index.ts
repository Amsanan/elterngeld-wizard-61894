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

    // Get all user-defined tables by testing known tables
    console.log('Discovering database tables...');
    const potentialTables = [
      'geburtsurkunden', 'eltern_dokumente', 'meldebescheinigungen', 'bankverbindungen',
      'arbeitgeberbescheinigungen', 'gehaltsnachweise', 'einkommensteuerbescheide',
      'selbststaendigen_nachweise', 'krankenversicherung_nachweise', 'mutterschaftsgeld',
      'leistungsbescheide', 'ehe_sorgerecht_nachweise', 'adoptions_pflege_dokumente',
      'antraege', 'antrag_geburtsurkunden', 'pdf_field_mappings', 'elterngeldantrag_progress'
    ];
    
    const relevantTables: string[] = [];
    
    // Test which tables exist by trying to query them
    for (const tableName of potentialTables) {
      const { error } = await supabase.from(tableName).select('id').limit(0);
      if (!error) {
        relevantTables.push(tableName);
      }
    }

    relevantTables.sort();

    // Get schema info by querying each table
    const schema: any[] = [];
    
    for (const tableName of relevantTables) {
      try {
        // Query the table with limit 1 to get column structure
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data !== null) {
          // Get column names and infer basic types
          const sampleRow = data[0] || {};
          const columns = Object.keys(sampleRow).map(columnName => {
            const value = sampleRow[columnName];
            let type = 'text';
            
            // Infer type from value
            if (value !== null && value !== undefined) {
              if (typeof value === 'number') {
                type = Number.isInteger(value) ? 'integer' : 'numeric';
              } else if (typeof value === 'boolean') {
                type = 'boolean';
              } else if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(value)) {
                type = 'date';
              } else if (typeof value === 'object') {
                type = 'jsonb';
              }
            }
            
            return {
              name: columnName,
              type,
              nullable: true
            };
          });
          
          // Filter out system columns we don't want to map
          const filteredColumns = columns.filter(col => 
            !['id', 'user_id', 'created_at', 'updated_at', 'file_path', 'confidence_scores', 'antrag_id'].includes(col.name)
          );
          
          if (filteredColumns.length > 0) {
            schema.push({
              table_name: tableName,
              columns: filteredColumns
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching schema for ${tableName}:`, error);
      }
    }

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