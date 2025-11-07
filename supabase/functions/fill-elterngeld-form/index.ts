import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import { FIELD_MAPPINGS } from "../_shared/elterngeld-field-mappings.ts";

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
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { step, documentType, extractedData, previousPdfPath } = await req.json();

    console.log(`Processing step ${step} for document type: ${documentType}`);

    let pdfDoc: any;

    // Load previous PDF or template
    if (previousPdfPath) {
      console.log('Loading previous PDF from:', previousPdfPath);
      const { data: prevPdf, error: loadError } = await supabase.storage
        .from('elterngeldantrag-drafts')
        .download(previousPdfPath);

      if (loadError || !prevPdf) {
        console.error('Error loading previous PDF:', loadError);
        throw new Error('Failed to load previous PDF');
      }

      const arrayBuffer = await prevPdf.arrayBuffer();
      pdfDoc = await PDFDocument.load(arrayBuffer);
    } else {
      console.log('Loading template PDF...');
      const { data: templatePdf, error: templateError } = await supabase.storage
        .from('form-templates')
        .download('elterngeldantrag_bis_Maerz25.pdf');

      if (templateError || !templatePdf) {
        console.error('Error loading template:', templateError);
        throw new Error(`Failed to load PDF template: ${templateError?.message || 'Unknown error'}`);
      }

      const arrayBuffer = await templatePdf.arrayBuffer();
      pdfDoc = await PDFDocument.load(arrayBuffer);
    }

    console.log('PDF loaded, filling fields...');

    const form = pdfDoc.getForm();
    const formFields = form.getFields();
    
    // Log first 20 field names to understand the naming pattern
    console.log('=== AVAILABLE PDF FIELDS (first 20) ===');
    formFields.slice(0, 20).forEach((field: any) => {
      console.log(`Field: "${field.getName()}" | Type: ${field.constructor.name}`);
    });
    console.log('=== END OF FIELD LIST ===');
    
    const fieldMapping = FIELD_MAPPINGS[documentType] || {};
    
    let filledFieldsCount = 0;
    const filledFieldsList: string[] = [];
    const skippedFields: string[] = [];
    const failedFields: { field: string; reason: string }[] = [];

    console.log(`Processing ${Object.keys(fieldMapping).length} mapped fields for documentType: ${documentType}`);

    // Fill fields based on mapping
    for (const [dataKey, pdfFieldName] of Object.entries(fieldMapping)) {
      const value = extractedData[dataKey];
      
      if (value !== null && value !== undefined && value !== '') {
        try {
          const field = form.getField(pdfFieldName);
          const fieldType = field.constructor.name;

          if (fieldType === 'PDFTextField') {
            const textField = field as any;
            const stringValue = String(value);
            textField.setText(stringValue);
            filledFieldsList.push(pdfFieldName);
            filledFieldsCount++;
            console.log(`✓ Filled text field "${pdfFieldName}" with: "${stringValue}"`);
          } else if (fieldType === 'PDFCheckBox') {
            const checkbox = field as any;
            if (value === true || value === 'true' || value === 'ja' || value === 'yes') {
              checkbox.check();
              filledFieldsList.push(pdfFieldName);
              filledFieldsCount++;
              console.log(`✓ Checked checkbox: "${pdfFieldName}"`);
            }
          } else if (fieldType === 'PDFDropdown') {
            const dropdown = field as any;
            dropdown.select(String(value));
            filledFieldsList.push(pdfFieldName);
            filledFieldsCount++;
            console.log(`✓ Selected dropdown "${pdfFieldName}": "${value}"`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          failedFields.push({ field: pdfFieldName, reason: errorMsg });
          console.log(`✗ Could not fill field "${pdfFieldName}" (dataKey: ${dataKey}): ${errorMsg}`);
        }
      } else {
        skippedFields.push(`${dataKey} -> ${pdfFieldName}`);
      }
    }

    console.log(`=== FILL SUMMARY ===`);
    console.log(`Successfully filled: ${filledFieldsCount} fields`);
    console.log(`Skipped (no data): ${skippedFields.length} fields`);
    console.log(`Failed: ${failedFields.length} fields`);
    if (failedFields.length > 0) {
      console.log('Failed fields:', JSON.stringify(failedFields, null, 2));
    }

    console.log(`Filled ${filledFieldsCount} fields`);

    // Save PDF to storage
    const pdfBytes = await pdfDoc.save();
    const fileName = `${user.id}/step-${step}.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from('elterngeldantrag-drafts')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      throw new Error('Failed to upload PDF');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('elterngeldantrag-drafts')
      .getPublicUrl(fileName);

    // Update progress in database
    const { error: progressError } = await supabase
      .from('elterngeldantrag_progress')
      .upsert({
        user_id: user.id,
        current_step: step,
        completed_steps: Array.from({ length: step }, (_, i) => i + 1),
        partial_pdf_path: fileName,
        field_mappings: extractedData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (progressError) {
      console.error('Error updating progress:', progressError);
    }

    const allFields = form.getFields();
    const completionPercentage = Math.round((filledFieldsCount / allFields.length) * 100);

    return new Response(
      JSON.stringify({
        success: true,
        pdfPath: fileName,
        pdfUrl: urlData.publicUrl,
        filledFields: filledFieldsList,
        filledFieldsCount,
        totalFields: allFields.length,
        completionPercentage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in fill-elterngeld-form:', error);
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
