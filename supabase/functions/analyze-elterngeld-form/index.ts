import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Loading Elterngeld PDF template...');
    
    // Download the PDF template from storage
    const { data: pdfFile, error: downloadError } = await supabase.storage
      .from('form-templates')
      .download('elterngeldantrag_bis_Maerz25.pdf');

    if (downloadError || !pdfFile) {
      console.error('Error downloading PDF:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to load PDF template', details: downloadError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PDF downloaded, parsing...');
    
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    console.log('PDF loaded, extracting form fields...');
    
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    const fieldInfo = fields.map(field => {
      const name = field.getName();
      const type = field.constructor.name;
      
      let additionalInfo: any = {};
      
      try {
        if (type === 'PDFTextField') {
          const textField = field as any;
          additionalInfo.maxLength = textField.getMaxLength?.() || null;
        } else if (type === 'PDFCheckBox') {
          additionalInfo.isChecked = (field as any).isChecked?.() || false;
        } else if (type === 'PDFDropdown') {
          additionalInfo.options = (field as any).getOptions?.() || [];
        }
      } catch (e) {
        console.log(`Could not get additional info for field ${name}:`, e);
      }
      
      return {
        name,
        type,
        ...additionalInfo
      };
    });

    console.log(`Found ${fieldInfo.length} form fields`);

    return new Response(
      JSON.stringify({
        success: true,
        totalFields: fieldInfo.length,
        fields: fieldInfo,
        pdfInfo: {
          pageCount: pdfDoc.getPageCount(),
          title: pdfDoc.getTitle() || 'Untitled',
          author: pdfDoc.getAuthor() || 'Unknown'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-elterngeld-form:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
