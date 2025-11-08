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
        // If mapping has no filter_condition, it applies to all (like geburtsurkunden)
        if (!mapping.filter_condition || Object.keys(mapping.filter_condition).length === 0) {
          return true;
        }
        
        // ALL keys in mapping's filter_condition must match the workflow filter
        // But workflow can have additional keys (like document_type)
        return Object.entries(mapping.filter_condition).every(([key, value]) => {
          // Case-insensitive comparison for person_type
          if (key === 'person_type' && typeof value === 'string' && typeof filter[key] === 'string') {
            return filter[key].toLowerCase() === value.toLowerCase();
          }
          return filter[key] === value;
        });
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
    console.log(`Total mappings to process: ${filteredMappings.length}`);
    
    for (let i = 0; i < filteredMappings.length; i++) {
      try {
        const mapping = filteredMappings[i];
        const { source_table, source_field, pdf_field_name, filter_condition } = mapping;
        
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`[Mapping ${i+1}/${filteredMappings.length}] STARTING`);
        console.log(`  Source: ${source_table}.${source_field}`);
        console.log(`  Target PDF field: "${pdf_field_name}"`);
        console.log(`  Filter condition:`, filter_condition || 'none');
        
        // ALWAYS query database for this mapping
        console.log(`  → STEP 1: Querying database for data...`);
        let value;
        
        try {
          let query = supabase
            .from(source_table)
            .select(source_field)
            .eq('user_id', user.id);
          
          // Apply filter condition if present
          if (filter_condition && Object.keys(filter_condition).length > 0) {
            console.log(`    → Applying filter conditions:`, filter_condition);
            for (const [filterField, filterValue] of Object.entries(filter_condition)) {
              if (filterField === 'person_type') {
                // ENUM values are lowercase: 'mutter', 'vater'
                const normalizedValue = String(filterValue).toLowerCase();
                console.log(`    → Filter: ${filterField} = ${normalizedValue} (normalized)`);
                query = query.eq(filterField, normalizedValue);
              } else {
                console.log(`    → Filter: ${filterField} = ${filterValue}`);
                query = query.eq(filterField, filterValue);
              }
            }
          }
          
          console.log(`    → Executing database query...`);
          const { data: queryResult, error: queryError } = await query.maybeSingle();
          
          if (queryError) {
            console.error(`    ✗ Database query error:`, queryError);
            failedFields.push({ field: pdf_field_name, reason: `Query failed: ${queryError.message}` });
            console.log(`[Mapping ${i+1}/${filteredMappings.length}] FAILED - Query error`);
            continue;
          }
          
          if (!queryResult || !queryResult[source_field]) {
            console.log(`    ⊘ No data found in database for ${source_table}.${source_field}`);
            skippedFields.push(`${source_field} -> ${pdf_field_name}`);
            console.log(`[Mapping ${i+1}/${filteredMappings.length}] SKIPPED - No data in database`);
            continue;
          }
          
          value = queryResult[source_field];
          console.log(`    ✓ Data fetched from database:`, value, `(type: ${typeof value})`);
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          failedFields.push({ field: pdf_field_name, reason: `Database error: ${errorMsg}` });
          console.error(`    ✗ Database query exception:`, error);
          console.log(`[Mapping ${i+1}/${filteredMappings.length}] FAILED - Exception in query`);
          continue;
        }
        
        // Check if value is valid
        console.log(`  → STEP 2: Validating value...`);
        const isValid = value !== null && value !== undefined && value !== '';
        console.log(`    Value validation: ${isValid ? '✓ VALID' : '✗ INVALID (null/undefined/empty)'}`);
        console.log(`    Value content:`, JSON.stringify(value));
        
        if (!isValid) {
          skippedFields.push(`${source_field} -> ${pdf_field_name}`);
          console.log(`    → SKIPPED (no valid data)`);
          console.log(`[Mapping ${i+1}/${filteredMappings.length}] SKIPPED - Invalid value`);
          continue;
        }
        
        // Try to fill the PDF field
        console.log(`  → STEP 3: Attempting to fill PDF field "${pdf_field_name}"...`);
        try {
          // Try to get the PDF field
          console.log(`    → Looking up PDF field in form...`);
          let field;
          try {
            field = form.getField(pdf_field_name);
            console.log(`    ✓ PDF field found in form`);
          } catch (fieldError) {
            const errorMsg = fieldError instanceof Error ? fieldError.message : 'Unknown error';
            console.log(`    ✗ PDF field NOT FOUND: ${errorMsg}`);
            failedFields.push({ field: pdf_field_name, reason: `Field not found in PDF: ${errorMsg}` });
            console.log(`[Mapping ${i+1}/${filteredMappings.length}] FAILED - Field not found`);
            continue;
          }
          
          const fieldType = field.constructor.name;
          console.log(`    → Field type: ${fieldType}`);

          // Handle both full class names and shorthand types
          if (fieldType === 'PDFTextField' || fieldType === 't') {
            console.log(`    → Processing as TEXT field...`);
            const textField = field as any;
            
            // Format dates if the source field appears to be a date field
            let stringValue = String(value);
            if (source_field.toLowerCase().includes('datum') || source_field.toLowerCase().includes('date')) {
              stringValue = formatDateForPDF(value);
              console.log(`    → Date formatted: ${value} → ${stringValue}`);
            }
            
            console.log(`    → Setting text value: "${stringValue}"`);
            textField.setText(stringValue);
            filledFieldsList.push(pdf_field_name);
            filledFieldsCount++;
            console.log(`    ✓ SUCCESS: Filled text field with "${stringValue}"`);
            console.log(`[Mapping ${i+1}/${filteredMappings.length}] ✓ COMPLETED SUCCESSFULLY`);
            
          } else if (fieldType === 'PDFCheckBox' || fieldType === 'c' || fieldType === 'ch') {
            console.log(`    → Processing as CHECKBOX field...`);
            const checkbox = field as any;
            if (value === true || value === 'true' || value === 'ja' || value === 'yes') {
              console.log(`    → Checking checkbox...`);
              checkbox.check();
              filledFieldsList.push(pdf_field_name);
              filledFieldsCount++;
              console.log(`    ✓ SUCCESS: Checked checkbox`);
              console.log(`[Mapping ${i+1}/${filteredMappings.length}] ✓ COMPLETED SUCCESSFULLY`);
            } else {
              console.log(`    ⊘ Checkbox value not truthy (${value}), leaving unchecked`);
              console.log(`[Mapping ${i+1}/${filteredMappings.length}] SKIPPED - Checkbox not checked`);
            }
            
          } else if (fieldType === 'PDFDropdown' || fieldType === 'd') {
            console.log(`    → Processing as DROPDOWN field...`);
            const dropdown = field as any;
            console.log(`    → Selecting value: "${value}"`);
            dropdown.select(String(value));
            filledFieldsList.push(pdf_field_name);
            filledFieldsCount++;
            console.log(`    ✓ SUCCESS: Selected dropdown value "${value}"`);
            console.log(`[Mapping ${i+1}/${filteredMappings.length}] ✓ COMPLETED SUCCESSFULLY`);
            
          } else {
            console.log(`    ⚠ Unknown field type: ${fieldType}`);
            failedFields.push({ field: pdf_field_name, reason: `Unknown field type: ${fieldType}` });
            console.log(`[Mapping ${i+1}/${filteredMappings.length}] FAILED - Unknown field type`);
          }
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : '';
          failedFields.push({ field: pdf_field_name, reason: errorMsg });
          console.log(`    ✗ FAILED to fill field: ${errorMsg}`);
          console.log(`    Error stack:`, errorStack);
          console.log(`[Mapping ${i+1}/${filteredMappings.length}] FAILED - Exception during fill`);
        }
        
      } catch (outerError) {
        const errorMsg = outerError instanceof Error ? outerError.message : 'Unknown error';
        const errorStack = outerError instanceof Error ? outerError.stack : '';
        console.error(`\n❌ CRITICAL ERROR processing mapping ${i+1}/${filteredMappings.length}:`);
        console.error(`   Error: ${errorMsg}`);
        console.error(`   Stack: ${errorStack}`);
        console.log(`[Mapping ${i+1}/${filteredMappings.length}] FAILED - Outer exception`);
        // Continue to next mapping even if this one fails catastrophically
        continue;
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
