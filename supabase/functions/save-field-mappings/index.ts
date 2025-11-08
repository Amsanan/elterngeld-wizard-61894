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

    // Filter out invalid mappings with document_type "all"
    const validMappings = mappings.filter((m: any) => {
      if (m.document_type === 'all') {
        console.warn('Skipping invalid mapping with document_type "all":', JSON.stringify(m, null, 2));
        return false;
      }
      return true;
    });

    if (validMappings.length < mappings.length) {
      console.log(`Filtered out ${mappings.length - validMappings.length} invalid mappings`);
    }

    if (validMappings.length === 0) {
      throw new Error('No valid mappings to save. Please select a specific document type.');
    }

    // Batch upsert mappings - generate UUID for new records
    const mappingsWithUser = validMappings.map((m: any) => {
      console.log(`Processing mapping - ID: ${m.id}, document_type: ${m.document_type}, source_field: ${m.source_field}`);
      
      const { id, created_at, ...rest } = m;
      
      // For new records (no id or null id), generate a new UUID
      // For existing records, keep the existing id
      const finalId = (id && id !== null) ? id : crypto.randomUUID();
      
      return {
        ...rest,
        id: finalId,
        created_by: user.id,
        updated_at: new Date().toISOString()
      };
    });

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