import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedData {
  kind_vorname?: string;
  kind_nachname?: string;
  kind_geburtsdatum?: string;
  kind_geburtsort?: string;
  kind_geburtsnummer?: string;
  mutter_vorname?: string;
  mutter_nachname?: string;
  mutter_geburtsname?: string;
  vater_vorname?: string;
  vater_nachname?: string;
  behoerde_name?: string;
  urkundennummer?: string;
  ausstelldatum?: string;
  verwendungszweck?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { filePath } = await req.json();
    
    if (!filePath) {
      throw new Error('No file path provided');
    }

    console.log('Processing file:', filePath);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-documents')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      throw new Error('Failed to download file');
    }

    console.log('File downloaded, size:', fileData.size);

    // Convert file to base64 for OCR
    const arrayBuffer = await fileData.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // TODO: Call PaddleOCR API here
    // For now, we'll use a placeholder that returns mock data
    // Replace this with actual PaddleOCR API call
    const paddleOcrApiKey = Deno.env.get('PADDLE_OCR_API_KEY');
    
    console.log('Calling PaddleOCR API...');
    
    // Placeholder for PaddleOCR API call
    // const ocrResponse = await fetch('PADDLE_OCR_API_ENDPOINT', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${paddleOcrApiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     image: base64File,
    //     // Add other required parameters
    //   }),
    // });

    // const ocrResult = await ocrResponse.json();
    // console.log('OCR Result:', ocrResult);

    // Parse OCR text using XML schema structure
    // This is a placeholder - actual implementation will depend on PaddleOCR response format
    const extractedData: ExtractedData = {
      // These would be extracted from OCR text based on XML schema
      // For now returning empty values
    };

    // Load XML schema to guide extraction
    const { data: schemaData } = await supabase.storage
      .from('xml-schemas')
      .download('public/schemas/Geburtsurkunden.xml');

    if (schemaData) {
      const schemaText = await schemaData.text();
      console.log('Loaded XML schema for guided extraction');
      // TODO: Use schema to guide field extraction from OCR text
    }

    // Insert extracted data into database
    const { data: insertedData, error: insertError } = await supabase
      .from('geburtsurkunden')
      .insert({
        user_id: user.id,
        file_path: filePath,
        ...extractedData,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting data:', insertError);
      throw insertError;
    }

    console.log('Successfully extracted and saved data:', insertedData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: insertedData,
        message: 'Geburtsurkunde erfolgreich extrahiert'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-geburtsurkunde function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});