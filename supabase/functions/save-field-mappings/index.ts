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

    // Extract JWT token from "Bearer <token>" format
    const jwt = authHeader.replace('Bearer ', '');
    console.log('JWT extracted, length:', jwt.length);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client for authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // Verify JWT token by passing it directly to getUser()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);
    console.log('User authenticated:', !!user, 'User ID:', user?.id);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Not authenticated: ' + (authError?.message || 'No user found'));
    }

    // Use service role key for database operations to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { mappings } = await req.json();
    console.log('Received mappings count:', mappings?.length);
    
    if (!mappings || !Array.isArray(mappings)) {
      throw new Error('Invalid mappings data: must be an array');
    }

    // Log first mapping for debugging
    if (mappings.length > 0) {
      console.log('First mapping sample:', JSON.stringify(mappings[0], null, 2));
    }

    // Batch upsert mappings
    const mappingsWithUser = mappings.map((m: any) => ({
      ...m,
      created_by: user.id,
      updated_at: new Date().toISOString()
    }));

    console.log('Prepared mappings for upsert, count:', mappingsWithUser.length);

    // Use admin client for database operations
    const { data, error } = await supabaseAdmin
      .from('pdf_field_mappings')
      .upsert(mappingsWithUser, {
        onConflict: 'document_type,source_field,pdf_field_name',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Database error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('Successfully saved mappings:', data?.length);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in save-field-mappings:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});