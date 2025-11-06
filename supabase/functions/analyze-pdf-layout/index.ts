import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FieldCoordinate {
  name: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rect?: number[];
}

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

    console.log(`Analyzing PDF layout: ${pdf_template_path}`);

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

    // Extract field coordinates
    const fieldCoordinates: FieldCoordinate[] = [];

    for (const field of fields) {
      try {
        const fieldName = field.getName();
        const widgets = (field as any).acroField.getWidgets();

        for (const widget of widgets) {
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

          // PDF coordinates are from bottom-left, convert to top-left for easier visualization
          const x = rect.x;
          const y = pageHeight - rect.y - rect.height;
          const width = rect.width;
          const height = rect.height;

          fieldCoordinates.push({
            name: fieldName,
            type: field.constructor.name,
            page: pageIndex,
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            rect: [rect.x, rect.y, rect.width, rect.height]
          });
        }
      } catch (error) {
        console.error(`Error extracting coordinates for field:`, error);
      }
    }

    console.log(`Extracted coordinates for ${fieldCoordinates.length} field instances`);

    // Get PDF metadata for rendering
    const pageMetadata = pages.map((page, index) => ({
      page: index,
      width: page.getWidth(),
      height: page.getHeight()
    }));

    // Store the PDF in a temporary location for image rendering
    // For now, we'll return the field coordinates and page metadata
    // Phase 2 will handle the actual image rendering with vision AI

    return new Response(JSON.stringify({ 
      success: true,
      field_coordinates: fieldCoordinates,
      page_metadata: pageMetadata,
      total_pages: pages.length,
      total_fields: fieldCoordinates.length,
      pdf_path: pdf_template_path
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-pdf-layout:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
