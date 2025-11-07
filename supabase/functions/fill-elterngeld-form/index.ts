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
    const { step, tableName, filter, extractedData, previousPdfPath } = await req.json();
    console.log(`Request params - Step: ${step}, TableName: ${tableName}, Filter:`, filter, `HasPreviousPdf: ${!!previousPdfPath}`);
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
    
    // Fetch field mappings from database for this table
    console.log(`Fetching mappings for table: ${tableName} with filter:`, filter);
    const { data: mappingsData, error: mappingsError } = await supabase
      .from('pdf_field_mappings')
      .select('source_table, source_field, pdf_field_name, filter_condition')
      .eq('document_type', tableName)
      .eq('is_active', true);
    
    if (mappingsError) {
      console.error('Error fetching mappings:', mappingsError);
      throw new Error(`Failed to fetch field mappings: ${mappingsError.message}`);
    }
    
    // Filter mappings to only those matching the workflow step's filter
    let filteredMappings = mappingsData || [];
    if (filter && Object.keys(filter).length > 0) {
      filteredMappings = filteredMappings.filter(mapping => {
        // If mapping has no filter_condition, it's a general field (applies to all)
        if (!mapping.filter_condition || Object.keys(mapping.filter_condition).length === 0) {
          return true;
        }
        
        // Check if mapping's filter matches the workflow step's filter
        return Object.entries(filter).every(([key, value]) => 
          mapping.filter_condition[key] === value
        );
      });
    }
    
    console.log(`Loaded ${filteredMappings.length} mappings (${mappingsData?.length || 0} total) for table: ${tableName} with filter:`, filter);
    
    let filledFieldsCount = 0;
    const filledFieldsList: string[] = [];
    const skippedFields: string[] = [];
    const failedFields: { field: string; reason: string }[] = [];

    console.log(`Processing ${filteredMappings.length} mapped fields for table: ${tableName}`);

    // Helper function to format dates for German PDFs
    const formatDateForPDF = (value: any): string => {
      if (!value) return '';
      
      // Check if it's a date string in ISO format (YYYY-MM-DD)
      const dateMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [_, year, month, day] = dateMatch;
        return `${day}.${month}.${year}`; // Convert to DD.MM.YYYY
      }
      
      return String(value);
    };

    // Fill fields based on mapping with filter conditions
    console.log('\n=== STARTING FIELD FILLING LOOP ===');
    for (let i = 0; i < filteredMappings.length; i++) {
      const mapping = filteredMappings[i];
      const { source_table, source_field, pdf_field_name, filter_condition } = mapping;
      
      console.log(`\n[Mapping ${i+1}/${filteredMappings.length}]`);
      console.log(`  Source: ${source_table}.${source_field}`);
      console.log(`  Target PDF field: "${pdf_field_name}"`);
      console.log(`  Filter condition:`, filter_condition || 'none');
      
      let value = extractedData[source_field];
      console.log(`  Initial value from extractedData:`, value, `(type: ${typeof value})`);
      
      // If there's a filter condition, we need to fetch filtered data from the table
      if (filter_condition && Object.keys(filter_condition).length > 0) {
        console.log(`  → Applying filter condition...`);
        
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
            console.error(`  ✗ Error fetching filtered data:`, filterError);
            failedFields.push({ field: pdf_field_name, reason: `Filter query failed: ${filterError.message}` });
            continue;
          }
          
          if (filteredData && filteredData[source_field]) {
            value = filteredData[source_field];
            console.log(`  ✓ Fetched filtered value:`, value);
          } else {
            console.log(`  ⊘ No filtered data found, skipping`);
            skippedFields.push(`${source_field} (filtered) -> ${pdf_field_name}`);
            continue;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          failedFields.push({ field: pdf_field_name, reason: `Filter error: ${errorMsg}` });
          console.error(`  ✗ Filter error:`, error);
          continue;
        }
      }
      
      // Check if value is valid
      const isValid = value !== null && value !== undefined && value !== '';
      console.log(`  Value validation: ${isValid ? '✓ VALID' : '✗ INVALID (null/undefined/empty)'}`);
      
      if (!isValid) {
        skippedFields.push(`${source_field} -> ${pdf_field_name}`);
        console.log(`  → SKIPPED (no data)`);
        continue;
      }
      
      // Try to fill the PDF field
      console.log(`  → Attempting to fill PDF field...`);
      try {
        // Try to get the PDF field
        let field;
        try {
          field = form.getField(pdf_field_name);
          console.log(`  ✓ PDF field found in form`);
        } catch (fieldError) {
          const errorMsg = fieldError instanceof Error ? fieldError.message : 'Unknown error';
          console.log(`  ✗ PDF field NOT FOUND: ${errorMsg}`);
          failedFields.push({ field: pdf_field_name, reason: `Field not found in PDF: ${errorMsg}` });
          continue;
        }
        
        const fieldType = field.constructor.name;
        console.log(`  Field type: ${fieldType}`);

        // Handle both full class names and shorthand types
        if (fieldType === 'PDFTextField' || fieldType === 't') {
          const textField = field as any;
          
          // Format dates if the source field appears to be a date field
          let stringValue = String(value);
          if (source_field.toLowerCase().includes('datum') || source_field.toLowerCase().includes('date')) {
            stringValue = formatDateForPDF(value);
            console.log(`  Date formatted: ${value} → ${stringValue}`);
          }
          
          textField.setText(stringValue);
          filledFieldsList.push(pdf_field_name);
          filledFieldsCount++;
          console.log(`  ✓ SUCCESS: Filled text field with "${stringValue}"`);
          
        } else if (fieldType === 'PDFCheckBox' || fieldType === 'c' || fieldType === 'ch') {
          const checkbox = field as any;
          if (value === true || value === 'true' || value === 'ja' || value === 'yes') {
            checkbox.check();
            filledFieldsList.push(pdf_field_name);
            filledFieldsCount++;
            console.log(`  ✓ SUCCESS: Checked checkbox`);
          } else {
            console.log(`  ⊘ Checkbox value not truthy, leaving unchecked`);
          }
          
        } else if (fieldType === 'PDFDropdown' || fieldType === 'd') {
          const dropdown = field as any;
          dropdown.select(String(value));
          filledFieldsList.push(pdf_field_name);
          filledFieldsCount++;
          console.log(`  ✓ SUCCESS: Selected dropdown value "${value}"`);
          
        } else {
          console.log(`  ⚠ Unknown field type: ${fieldType}`);
          failedFields.push({ field: pdf_field_name, reason: `Unknown field type: ${fieldType}` });
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        failedFields.push({ field: pdf_field_name, reason: errorMsg });
        console.log(`  ✗ FAILED to fill field: ${errorMsg}`);
      }
    }
    
    console.log('\n=== END OF FIELD FILLING LOOP ===\n');

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
