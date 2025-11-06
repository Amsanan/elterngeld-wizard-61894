import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

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
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { pdf_template_path } = await req.json();

    console.log(`Loading PDF template: ${pdf_template_path}`);

    // Download PDF from storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('form-templates')
      .download(pdf_template_path);

    if (downloadError) {
      console.error('Error downloading PDF:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    // Load PDF
    const pdfBytes = await pdfData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Extract all field names
    const fieldNames = fields.map(field => field.getName()).sort();

    console.log(`Found ${fieldNames.length} PDF fields`);

    return new Response(JSON.stringify({ 
      fields: fieldNames,
      total_fields: fieldNames.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-pdf-fields:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
