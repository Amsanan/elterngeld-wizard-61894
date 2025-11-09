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
    
    // Fetch ALL field mappings to apply data from ALL steps
    console.log(`Fetching ALL active mappings to apply data from all completed steps`);
    const { data: mappingsData, error: mappingsError } = await supabase
      .from('pdf_field_mappings')
      .select('source_table, source_field, pdf_field_name, filter_condition')
      .eq('is_active', true);
    
    if (mappingsError) {
      console.error('Error fetching mappings:', mappingsError);
      throw new Error(`Failed to fetch field mappings: ${mappingsError.message}`);
    }
    
    // Use ALL mappings - each mapping will check if data exists in DB
    // This ensures all previously entered data is applied to the PDF
    const filteredMappings = mappingsData || [];
    
    console.log(`Loaded ${filteredMappings.length} mappings - will apply ALL available data from database`);
    
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
    console.log('\n==========================================');
    console.log('STARTING FIELD MAPPING PROCESS');
    console.log('==========================================');
    console.log(`Total mappings to process: ${filteredMappings.length}\n`);
    
    for (let i = 0; i < filteredMappings.length; i++) {
      try {
        const mapping = filteredMappings[i];
        const { source_table, source_field, pdf_field_name, filter_condition } = mapping;
        
        console.log('==========================================');
        console.log(`[Mapping ${i+1}/${filteredMappings.length}] Processing Field`);
        console.log('==========================================');
        
        // 1. FETCH DATA
        console.log('📊 FETCH DATA');
        console.log(`   Source Table: ${source_table}`);
        console.log(`   Source Field: ${source_field}`);
        console.log('');
        
        // 2. FILTER
        console.log('🔍 FILTER');
        const hasFilter = filter_condition && Object.keys(filter_condition).length > 0;
        console.log(`   Has Filter: ${hasFilter ? 'Yes' : 'No'}`);
        if (hasFilter) {
          console.log(`   Filter Value: ${JSON.stringify(filter_condition)}`);
        } else {
          console.log(`   Filter Value: None`);
        }
        console.log('');
        
        // 3. PDF TARGET
        console.log('📄 PDF TARGET');
        console.log(`   PDF Field Name: ${pdf_field_name}`);
        console.log('');
        
        // 4. DATABASE QUERY
        console.log('💾 DATABASE QUERY');
        let value;
        
        try {
          let query = supabase
            .from(source_table)
            .select(source_field)
            .eq('user_id', user.id);
          
          let queryString = `SELECT ${source_field} FROM ${source_table} WHERE user_id = '${user.id}'`;
          
          // Apply filter condition if present
          if (hasFilter) {
            for (const [filterField, filterValue] of Object.entries(filter_condition)) {
              if (filterField === 'person_type') {
                const normalizedValue = String(filterValue).toLowerCase();
                query = query.eq(filterField, normalizedValue);
                queryString += ` AND ${filterField} = '${normalizedValue}'`;
              } else {
                query = query.eq(filterField, filterValue);
                queryString += ` AND ${filterField} = '${filterValue}'`;
              }
            }
          }
          
          console.log(`   Query: ${queryString}`);
          
          const { data: queryResult, error: queryError } = await query.maybeSingle();
          
          if (queryError) {
            console.log(`   Result: ERROR - ${queryError.message}`);
            console.log('');
            console.log('✅ PARSING STATUS');
            console.log(`   Status: FAILED`);
            console.log(`   Error: Database query failed - ${queryError.message}`);
            console.log('==========================================\n');
            failedFields.push({ field: pdf_field_name, reason: `Query failed: ${queryError.message}` });
            continue;
          }
          
          if (!queryResult || !queryResult[source_field]) {
            console.log(`   Result: No data`);
            console.log('');
            console.log('✅ PARSING STATUS');
            console.log(`   Status: SKIPPED`);
            console.log(`   Value Filled: (no data in database)`);
            console.log('==========================================\n');
            skippedFields.push(`${source_field} -> ${pdf_field_name}`);
            continue;
          }
          
          value = queryResult[source_field];
          console.log(`   Result: ${JSON.stringify(value)}`);
          console.log('');
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.log(`   Result: EXCEPTION - ${errorMsg}`);
          console.log('');
          console.log('✅ PARSING STATUS');
          console.log(`   Status: FAILED`);
          console.log(`   Error: ${errorMsg}`);
          console.log('==========================================\n');
          failedFields.push({ field: pdf_field_name, reason: `Database error: ${errorMsg}` });
          continue;
        }
        
        // Check if value is valid
        const isValid = value !== null && value !== undefined && value !== '';
        
        if (!isValid) {
          console.log('✅ PARSING STATUS');
          console.log(`   Status: SKIPPED`);
          console.log(`   Value Filled: (invalid value - null/undefined/empty)`);
          console.log('==========================================\n');
          skippedFields.push(`${source_field} -> ${pdf_field_name}`);
          continue;
        }
        
        // Try to fill the PDF field
        try {
          let field;
          try {
            field = form.getField(pdf_field_name);
          } catch (fieldError) {
            const errorMsg = fieldError instanceof Error ? fieldError.message : 'Unknown error';
            console.log('✅ PARSING STATUS');
            console.log(`   Status: FAILED`);
            console.log(`   Error: PDF field not found - ${errorMsg}`);
            console.log('==========================================\n');
            failedFields.push({ field: pdf_field_name, reason: `Field not found in PDF: ${errorMsg}` });
            continue;
          }
          
          const fieldType = field.constructor.name;

          // Handle both full class names and shorthand types
          if (fieldType === 'PDFTextField' || fieldType === 't') {
            const textField = field as any;
            
            // Format dates if the source field appears to be a date field
            let stringValue = String(value);
            if (source_field.toLowerCase().includes('datum') || source_field.toLowerCase().includes('date')) {
              stringValue = formatDateForPDF(value);
            }
            
            textField.setText(stringValue);
            filledFieldsList.push(pdf_field_name);
            filledFieldsCount++;
            
            console.log('✅ PARSING STATUS');
            console.log(`   Status: SUCCESS`);
            console.log(`   Value Filled: "${stringValue}"`);
            console.log('==========================================\n');
            
          } else if (fieldType === 'PDFCheckBox' || fieldType === 'c' || fieldType === 'ch') {
            const checkbox = field as any;
            const stringValue = String(value).toLowerCase();
            const isChecked = (typeof value === 'boolean' && value === true) || 
                            stringValue === 'true' || 
                            stringValue === 'ja' || 
                            stringValue === 'yes';
            if (isChecked) {
              checkbox.check();
              filledFieldsList.push(pdf_field_name);
              filledFieldsCount++;
              
              console.log('✅ PARSING STATUS');
              console.log(`   Status: SUCCESS`);
              console.log(`   Value Filled: [CHECKED]`);
              console.log('==========================================\n');
            } else {
              console.log('✅ PARSING STATUS');
              console.log(`   Status: SKIPPED`);
              console.log(`   Value Filled: (checkbox value not truthy)`);
              console.log('==========================================\n');
            }
            
          } else if (fieldType === 'PDFDropdown' || fieldType === 'd') {
            const dropdown = field as any;
            dropdown.select(String(value));
            filledFieldsList.push(pdf_field_name);
            filledFieldsCount++;
            
            console.log('✅ PARSING STATUS');
            console.log(`   Status: SUCCESS`);
            console.log(`   Value Filled: "${value}"`);
            console.log('==========================================\n');
            
          } else {
            console.log('✅ PARSING STATUS');
            console.log(`   Status: FAILED`);
            console.log(`   Error: Unknown field type - ${fieldType}`);
            console.log('==========================================\n');
            failedFields.push({ field: pdf_field_name, reason: `Unknown field type: ${fieldType}` });
          }
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.log('✅ PARSING STATUS');
          console.log(`   Status: FAILED`);
          console.log(`   Error: ${errorMsg}`);
          console.log('==========================================\n');
          failedFields.push({ field: pdf_field_name, reason: errorMsg });
        }
        
      } catch (outerError) {
        const errorMsg = outerError instanceof Error ? outerError.message : 'Unknown error';
        console.log('✅ PARSING STATUS');
        console.log(`   Status: FAILED`);
        console.log(`   Error: Critical error - ${errorMsg}`);
        console.log('==========================================\n');
        continue;
      }
    }
    
    console.log('========================================');
    console.log('STEP COMPLETION SUMMARY');
    console.log('========================================');
    console.log(`Total Mappings: ${filteredMappings.length}`);
    console.log(`✓ Successfully Filled: ${filledFieldsCount} fields`);
    console.log(`⊘ Skipped (No Data): ${skippedFields.length} fields`);
    console.log(`✗ Failed: ${failedFields.length} fields`);
    if (failedFields.length > 0) {
      console.log('\nFailed fields details:');
      failedFields.forEach(f => console.log(`  - ${f.field}: ${f.reason}`));
    }
    console.log('========================================\n');

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
