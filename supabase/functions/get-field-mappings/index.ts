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
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's JWT to verify authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    console.log('User authenticated:', !!user, 'Auth error:', authError);
    
    if (authError || !user) {
      throw new Error('Not authenticated: ' + (authError?.message || 'No user found'));
    }

    // Use service role key for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { document_type } = await req.json();
    console.log('Fetching mappings for document_type:', document_type);

    const { data: mappings, error } = await supabaseAdmin
      .from('pdf_field_mappings')
      .select('*')
      .eq('document_type', document_type)
      .eq('is_active', true)
      .order('source_field');

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Found mappings:', mappings?.length);

    return new Response(JSON.stringify({ mappings }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-field-mappings:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});