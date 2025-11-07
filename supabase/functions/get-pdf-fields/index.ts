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

    // Load PDF with pdf-lib to extract field coordinates
    const pdfBytes = await pdfData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const pages = pdfDoc.getPages();

    console.log(`PDF has ${pages.length} pages and ${fields.length} fields`);

    // Extract field coordinates for positional sorting
    const fieldData: Array<{
      name: string;
      type: string;
      page: number;
      x: number;
      y: number;
    }> = [];

    for (const field of fields) {
      try {
        const fieldName = field.getName();
        const widgets = (field as any).acroField.getWidgets();

        // Take the first widget for each field
        if (widgets.length > 0) {
          const widget = widgets[0];
          const rect = widget.getRectangle();
          const pageRef = widget.P();
          
          // Find which page this field is on
          let pageIndex = 0;
          for (let i = 0; i < pages.length; i++) {
            if (pages[i].ref === pageRef) {
              pageIndex = i;
              break;
            }
          }

          const page = pages[pageIndex];
          const pageHeight = page.getHeight();

          // PDF coordinates are from bottom-left, convert to top-left
          const x = rect.x;
          const y = pageHeight - rect.y - rect.height;

          fieldData.push({
            name: fieldName,
            type: field.constructor.name,
            page: pageIndex,
            x: Math.round(x),
            y: Math.round(y)
          });
        }
      } catch (error) {
        console.error(`Error extracting coordinates for field:`, error);
        // Add field without coordinates as fallback
        fieldData.push({
          name: field.getName(),
          type: field.constructor.name,
          page: 0,
          x: 0,
          y: 0
        });
      }
    }

    // Sort fields: page → Y coordinate (top to bottom) → X coordinate (left to right)
    fieldData.sort((a, b) => {
      // First by page
      if (a.page !== b.page) return a.page - b.page;
      
      // Then by Y coordinate (top to bottom)
      if (Math.abs(a.y - b.y) > 10) { // 10px tolerance for same row
        return a.y - b.y;
      }
      
      // Finally by X coordinate (left to right) for same row
      return a.x - b.x;
    });

    console.log(`Found ${fieldData.length} PDF fields, sorted by position`);

    return new Response(JSON.stringify({ 
      fields: fieldData,
      total_fields: fieldData.length
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
