import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FieldData {
  id: number;
  acroform_name: string;
  field_type: string;
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    raw_rect: number[];
  };
  properties: any;
  reading_order: number;
  section?: string;
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
    const pdfPath = pdf_template_path || 'elterngeldantrag_bis_Maerz25.pdf';

    console.log(`[Export] Loading PDF template: ${pdfPath}`);

    // Download PDF from storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('form-templates')
      .download(pdfPath);

    if (downloadError) {
      console.error('Error downloading PDF:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    // Load PDF with pdf-lib
    const pdfBytes = await pdfData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const pages = pdfDoc.getPages();

    console.log(`[Export] PDF has ${pages.length} pages and ${fields.length} fields`);

    // Extract page metadata
    const pageMetadata = pages.map((page, index) => ({
      page_number: index,
      width: page.getWidth(),
      height: page.getHeight(),
      fields_count: 0 // Will be calculated later
    }));

    // Extract all field data
    const fieldDataArray: FieldData[] = [];
    let fieldId = 1;

    for (const field of fields) {
      try {
        const fieldName = field.getName();
        const fieldType = field.constructor.name;
        const widgets = (field as any).acroField.getWidgets();

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

          // Extract field-specific properties
          let properties: any = {};

          if (field instanceof PDFTextField) {
            const textField = field as PDFTextField;
            properties = {
              maxLength: textField.getMaxLength() || null,
              default_value: textField.getText() || null,
              alignment: textField.getAlignment()?.toString() || 'left',
              multiline: textField.isMultiline(),
              readonly: textField.isReadOnly()
            };
          } else if (field instanceof PDFCheckBox) {
            const checkBox = field as PDFCheckBox;
            properties = {
              is_checked: checkBox.isChecked(),
              default_state: checkBox.isChecked() ? 'On' : 'Off'
            };
          } else if (field instanceof PDFDropdown) {
            const dropdown = field as PDFDropdown;
            properties = {
              options: dropdown.getOptions(),
              selected_option: dropdown.getSelected() || null,
              editable: dropdown.isEditable(),
              multiselect: dropdown.isMultiselect()
            };
          } else if (field instanceof PDFRadioGroup) {
            const radioGroup = field as PDFRadioGroup;
            properties = {
              options: radioGroup.getOptions(),
              selected_value: radioGroup.getSelected() || null
            };
          }

          // Extract section from field name (e.g., "Topmostsubform[0].Page1[0]" → "Page 1")
          let section = undefined;
          const pageMatch = fieldName.match(/Page(\d+)\[0\]/);
          if (pageMatch) {
            section = `Page ${parseInt(pageMatch[1])} - Section`;
          }

          fieldDataArray.push({
            id: fieldId++,
            acroform_name: fieldName,
            field_type: fieldType,
            position: {
              page: pageIndex,
              x: Math.round(x),
              y: Math.round(y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              raw_rect: [rect.x, rect.y, rect.width, rect.height]
            },
            properties,
            reading_order: 0, // Will be set after sorting
            section
          });

          // Update page field count
          pageMetadata[pageIndex].fields_count++;
        }
      } catch (error) {
        console.error(`[Export] Error extracting field "${field.getName()}":`, error);
      }
    }

    // Sort fields by reading order (page → Y → X)
    fieldDataArray.sort((a, b) => {
      if (a.position.page !== b.position.page) return a.position.page - b.position.page;
      if (Math.abs(a.position.y - b.position.y) > 10) return a.position.y - b.position.y;
      return a.position.x - b.position.x;
    });

    // Assign reading order
    fieldDataArray.forEach((field, index) => {
      field.reading_order = index + 1;
    });

    // Calculate statistics
    const byType: Record<string, number> = {};
    const byPage: Record<string, number> = {};

    fieldDataArray.forEach(field => {
      byType[field.field_type] = (byType[field.field_type] || 0) + 1;
      byPage[field.position.page.toString()] = (byPage[field.position.page.toString()] || 0) + 1;
    });

    // Build comprehensive JSON
    const exportData = {
      metadata: {
        pdf_name: pdfPath,
        generated_at: new Date().toISOString(),
        total_fields: fieldDataArray.length,
        total_pages: pages.length,
        pdf_info: {
          title: pdfDoc.getTitle() || 'Antrag auf Elterngeld',
          author: pdfDoc.getAuthor() || null,
          page_count: pages.length
        }
      },
      pages: pageMetadata,
      fields: fieldDataArray,
      statistics: {
        by_type: byType,
        by_page: byPage
      },
      export_info: {
        version: '1.0',
        generated_by: 'export-pdf-fields-json',
        purpose: 'Complete AcroForm field reference for Elterngeldantrag PDF'
      }
    };

    // Save JSON to storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `elterngeld_fields_complete_${timestamp}.json`;
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('form-templates')
      .upload(`exports/${fileName}`, jsonBlob, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      console.error('[Export] Error uploading JSON:', uploadError);
      throw new Error(`Failed to save JSON: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('form-templates')
      .getPublicUrl(`exports/${fileName}`);

    console.log(`[Export] Successfully exported ${fieldDataArray.length} fields to ${fileName}`);

    return new Response(JSON.stringify({ 
      success: true,
      download_url: urlData.publicUrl,
      file_name: fileName,
      file_path: `exports/${fileName}`,
      summary: {
        total_fields: fieldDataArray.length,
        total_pages: pages.length,
        file_size: Math.round(JSON.stringify(exportData).length / 1024) + ' KB',
        by_type: byType
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Export] Error in export-pdf-fields-json:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
