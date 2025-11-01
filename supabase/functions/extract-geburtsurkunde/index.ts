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

    const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY');
    if (!ocrSpaceApiKey) {
      throw new Error('OCR_SPACE_API_KEY not configured');
    }
    
    console.log('Calling OCR.space API...');
    
    // Call OCR.space API with file upload (not base64)
    const formData = new FormData();
    formData.append('file', fileData, 'document.pdf');
    formData.append('language', 'ger');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    formData.append('filetype', 'PDF');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrSpaceApiKey,
      },
      body: formData,
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('OCR.space API error:', errorText);
      throw new Error('OCR processing failed');
    }

    const ocrResult = await ocrResponse.json();
    console.log('OCR Result:', JSON.stringify(ocrResult, null, 2));

    if (ocrResult.IsErroredOnProcessing) {
      console.error('OCR Error:', ocrResult.ErrorMessage);
      throw new Error(`OCR Error: ${ocrResult.ErrorMessage?.[0] || 'Unknown error'}`);
    }

    if (!ocrResult.IsErroredOnProcessing && ocrResult.ParsedResults?.[0]?.ParsedText) {
      const ocrText = ocrResult.ParsedResults[0].ParsedText;
      console.log('Extracted text:', ocrText);
      
      // Parse OCR text to extract structured data
      // This is a simple regex-based extraction - can be enhanced
      const extractedData: ExtractedData = {};
      
      // Extract common patterns from German birth certificates
      const vornameMatch = ocrText.match(/Vorname[n]?[:\s]+([^\n]+)/i);
      if (vornameMatch) extractedData.kind_vorname = vornameMatch[1].trim();
      
      const nachnameMatch = ocrText.match(/(?:Nachname|Familienname|Name)[:\s]+([^\n]+)/i);
      if (nachnameMatch) extractedData.kind_nachname = nachnameMatch[1].trim();
      
      const geburtsdatumMatch = ocrText.match(/(?:Geburtsdatum|geboren am)[:\s]+(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/i);
      if (geburtsdatumMatch) extractedData.kind_geburtsdatum = geburtsdatumMatch[1].trim();
      
      const geburtsortMatch = ocrText.match(/(?:Geburtsort|geboren in)[:\s]+([^\n]+)/i);
      if (geburtsortMatch) extractedData.kind_geburtsort = geburtsortMatch[1].trim();
      
      const urkundennummerMatch = ocrText.match(/(?:Urkunden-?nummer|Nr\.)[:\s]+([^\n]+)/i);
      if (urkundennummerMatch) extractedData.urkundennummer = urkundennummerMatch[1].trim();

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
          message: 'Geburtsurkunde erfolgreich extrahiert',
          ocrText: ocrText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('OCR processing failed or no text extracted');
    }


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