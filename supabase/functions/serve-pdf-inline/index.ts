import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Initialize Supabase client with service role (no auth needed - function is public)
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get file path from query parameter
    const url = new URL(req.url);
    const filePath = url.searchParams.get('path');
    
    if (!filePath) {
      throw new Error('Missing file path parameter');
    }

    console.log(`Fetching PDF: ${filePath}`);

    // Security: Verify file path format (must contain user ID prefix)
    // File paths are in format: {user_id}/step-{N}.pdf
    // Only authenticated users can generate these paths via fill-elterngeld-form
    const pathParts = filePath.split('/');
    if (pathParts.length !== 2 || !pathParts[0] || !pathParts[1].startsWith('step-')) {
      throw new Error('Invalid file path format');
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('elterngeldantrag-drafts')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    console.log(`PDF fetched successfully, size: ${fileData.size} bytes`);

    // Convert blob to array buffer for streaming
    const arrayBuffer = await fileData.arrayBuffer();

    // Return PDF with inline disposition header
    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="elterngeldantrag.pdf"',
        'Content-Length': fileData.size.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error in serve-pdf-inline:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: errorMessage === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
