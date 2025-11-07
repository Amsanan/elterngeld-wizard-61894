import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== FILL-ELTERNGELD-FORM CALLED ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Step 1: Checking authorization...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('ERROR: No authorization header');
      throw new Error('No authorization header');
    }

    console.log('Step 2: Initializing Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log('Supabase URL:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Step 3: Verifying user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('ERROR: User verification failed:', userError);
      throw new Error('Unauthorized');
    }
    console.log('User verified:', user.id);

    console.log('Step 4: Parsing request body...');
    const { step, documentType, extractedData, previousPdfPath } = await req.json();
    console.log(`Request params - Step: ${step}, DocumentType: ${documentType}, HasPreviousPdf: ${!!previousPdfPath}`);
    console.log('ExtractedData keys:', Object.keys(extractedData));

    let pdfDoc: any;

    // Load previous PDF or template
    if (previousPdfPath) {
      console.log('Step 5: Loading previous PDF from:', previousPdfPath);
      const { data: prevPdf, error: loadError } = await supabase.storage
        .from('elterngeldantrag-drafts')
        .download(previousPdfPath);

      if (loadError || !prevPdf) {
        console.error('ERROR: Failed to load previous PDF:', loadError);
        throw new Error(`Failed to load previous PDF: ${loadError?.message || 'Unknown error'}`);
      }

      console.log('Previous PDF downloaded, size:', prevPdf.size);
      const arrayBuffer = await prevPdf.arrayBuffer();
      console.log('ArrayBuffer created, loading PDF document...');
      pdfDoc = await PDFDocument.load(arrayBuffer);
      console.log('Previous PDF loaded successfully');
    } else {
      console.log('Step 5: Loading template PDF from form-templates bucket...');
      const { data: templatePdf, error: templateError } = await supabase.storage
        .from('form-templates')
        .download('elterngeldantrag_bis_Maerz25.pdf');

      if (templateError || !templatePdf) {
        console.error('ERROR: Failed to load template:', templateError);
        console.error('Template error details:', JSON.stringify(templateError, null, 2));
        throw new Error(`Failed to load PDF template: ${templateError?.message || 'Unknown error'}`);
      }

      console.log('Template PDF downloaded, size:', templatePdf.size);
      const arrayBuffer = await templatePdf.arrayBuffer();
      console.log('ArrayBuffer created, loading PDF document...');
      pdfDoc = await PDFDocument.load(arrayBuffer);
      console.log('Template PDF loaded successfully, pages:', pdfDoc.getPageCount());
    }

    console.log('Step 6: Getting form and fields...');

    const form = pdfDoc.getForm();
    const formFields = form.getFields();
    
    // Log first 20 field names to understand the naming pattern
    console.log('=== AVAILABLE PDF FIELDS (first 20) ===');
    formFields.slice(0, 20).forEach((field: any) => {
      console.log(`Field: "${field.getName()}" | Type: ${field.constructor.name}`);
    });
    console.log('=== END OF FIELD LIST ===');
    
    // Fetch field mappings from database with filter conditions
    console.log(`Fetching mappings for documentType: ${documentType}`);
    const { data: mappingsData, error: mappingsError } = await supabase
      .from('pdf_field_mappings')
      .select('source_table, source_field, pdf_field_name, filter_condition')
      .eq('document_type', documentType)
      .eq('is_active', true);
    
    if (mappingsError) {
      console.error('Error fetching mappings:', mappingsError);
      throw new Error(`Failed to fetch field mappings: ${mappingsError.message}`);
    }
    
    console.log(`Loaded ${mappingsData?.length || 0} mappings from database for documentType: ${documentType}`);
    
    let filledFieldsCount = 0;
    const filledFieldsList: string[] = [];
    const skippedFields: string[] = [];
    const failedFields: { field: string; reason: string }[] = [];

    console.log(`Processing ${mappingsData?.length || 0} mapped fields for documentType: ${documentType}`);

    // Fill fields based on mapping with filter conditions
    for (const mapping of (mappingsData || [])) {
      const { source_table, source_field, pdf_field_name, filter_condition } = mapping;
      let value = extractedData[source_field];
      
      // If there's a filter condition, we need to fetch filtered data from the table
      if (filter_condition && Object.keys(filter_condition).length > 0) {
        console.log(`Applying filter for ${source_table}.${source_field}:`, filter_condition);
        
        try {
          let query = supabase
            .from(source_table)
            .select(source_field)
            .eq('user_id', user.id);
          
          // Apply each filter condition
          for (const [filterField, filterValue] of Object.entries(filter_condition)) {
            query = query.eq(filterField, filterValue);
          }
          
          const { data: filteredData, error: filterError } = await query.maybeSingle();
          
          if (filterError) {
            console.error(`Error fetching filtered data for ${source_table}.${source_field}:`, filterError);
            failedFields.push({ field: pdf_field_name, reason: `Filter query failed: ${filterError.message}` });
            continue;
          }
          
          if (filteredData && filteredData[source_field]) {
            value = filteredData[source_field];
            console.log(`✓ Fetched filtered value for ${source_field}:`, value);
          } else {
            console.log(`No data found for ${source_table}.${source_field} with filter:`, filter_condition);
            skippedFields.push(`${source_field} (filtered) -> ${pdf_field_name}`);
            continue;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          failedFields.push({ field: pdf_field_name, reason: `Filter error: ${errorMsg}` });
          console.error(`Error applying filter for ${source_field}:`, error);
          continue;
        }
      }
      
      if (value !== null && value !== undefined && value !== '') {
        try {
          const field = form.getField(pdf_field_name);
          const fieldType = field.constructor.name;

          if (fieldType === 'PDFTextField') {
            const textField = field as any;
            const stringValue = String(value);
            textField.setText(stringValue);
            filledFieldsList.push(pdf_field_name);
            filledFieldsCount++;
            console.log(`✓ Filled text field "${pdf_field_name}" with: "${stringValue}"`);
          } else if (fieldType === 'PDFCheckBox') {
            const checkbox = field as any;
            if (value === true || value === 'true' || value === 'ja' || value === 'yes') {
              checkbox.check();
              filledFieldsList.push(pdf_field_name);
              filledFieldsCount++;
              console.log(`✓ Checked checkbox: "${pdf_field_name}"`);
            }
          } else if (fieldType === 'PDFDropdown') {
            const dropdown = field as any;
            dropdown.select(String(value));
            filledFieldsList.push(pdf_field_name);
            filledFieldsCount++;
            console.log(`✓ Selected dropdown "${pdf_field_name}": "${value}"`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          failedFields.push({ field: pdf_field_name, reason: errorMsg });
          console.log(`✗ Could not fill field "${pdf_field_name}" (${source_field}): ${errorMsg}`);
        }
      } else {
        skippedFields.push(`${source_field} -> ${pdf_field_name}`);
      }
    }

    console.log(`=== FILL SUMMARY ===`);
    console.log(`Successfully filled: ${filledFieldsCount} fields`);
    console.log(`Skipped (no data): ${skippedFields.length} fields`);
    console.log(`Failed: ${failedFields.length} fields`);
    if (failedFields.length > 0) {
      console.log('Failed fields:', JSON.stringify(failedFields, null, 2));
    }

    console.log(`Step 7: Filled ${filledFieldsCount} fields`);

    // Save PDF to storage
    console.log('Step 8: Saving PDF...');
    const pdfBytes = await pdfDoc.save();
    console.log('PDF saved to bytes, size:', pdfBytes.length);
    
    const fileName = `${user.id}/step-${step}.pdf`;
    console.log('Uploading to:', fileName);
    
    const { error: uploadError } = await supabase.storage
      .from('elterngeldantrag-drafts')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('ERROR: Failed to upload PDF:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    console.log('PDF uploaded successfully');

    // Get public URL
    console.log('Step 9: Getting public URL...');
    const { data: urlData } = supabase.storage
      .from('elterngeldantrag-drafts')
      .getPublicUrl(fileName);
    
    console.log('Public URL generated:', urlData.publicUrl);

    // Update progress in database
    console.log('Step 10: Updating progress in database...');
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
      console.error('Warning: Error updating progress:', progressError);
    } else {
      console.log('Progress updated successfully');
    }

    const allFields = form.getFields();
    const completionPercentage = Math.round((filledFieldsCount / allFields.length) * 100);

    console.log('=== SUCCESS ===');
    console.log('Response:', {
      pdfPath: fileName,
      pdfUrl: urlData.publicUrl,
      filledFieldsCount,
      totalFields: allFields.length,
      completionPercentage
    });

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
