import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { mapWithLLM } from './mapWithLLM.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) throw new Error('Unauthorized');

    const { filePath, useLLM = true } = await req.json();
    
    if (!filePath) throw new Error('No file path provided');

    console.log('Processing file:', filePath, 'with LLM:', useLLM);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-documents')
      .download(filePath);

    if (downloadError || !fileData) throw new Error('Failed to download file');

    const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY2');
    if (!ocrSpaceApiKey) throw new Error('OCR_SPACE_API_KEY not configured');
    
    const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
    const isPDF = fileExtension === 'pdf';
    
    // Convert to base64 for OCR
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binaryString = '';
    const chunkSize = 8192;
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
      binaryString += String.fromCharCode(...chunk);
    }
    
    const base64File = btoa(binaryString);
    const mimeType = isPDF ? 'application/pdf' : `image/${fileExtension}`;
    
    const formData = new FormData();
    formData.append('base64Image', `data:${mimeType};base64,${base64File}`);
    formData.append('language', 'ger');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    if (isPDF) formData.append('filetype', 'PDF');

    const ocrResponse = await fetch('https://apipro1.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': ocrSpaceApiKey },
      body: formData,
    });

    if (!ocrResponse.ok) throw new Error('OCR processing failed');

    const ocrResult = await ocrResponse.json();
    console.log('OCR Result received');

    if (ocrResult.IsErroredOnProcessing) {
      throw new Error(`OCR Error: ${ocrResult.ErrorMessage?.[0] || 'Unknown error'}`);
    }

    if (!ocrResult.ParsedResults?.[0]?.ParsedText) {
      throw new Error('No text extracted from document');
    }

    const ocrText = ocrResult.ParsedResults[0].ParsedText;
    console.log('Extracted text length:', ocrText.length);
    
    let extractedData: any = {};
    let confidenceScores: any = {};
    
    if (useLLM) {
      console.log('Using LLM-based extraction...');
      try {
        const llmResult = await mapWithLLM({
          schema: null,
          ocrText: ocrText,
          overlayLines: [],
        });
        
        console.log('LLM extraction successful');
        extractedData = llmResult.data;
        confidenceScores = llmResult.confidence || {};
      } catch (llmError: any) {
        console.error('LLM extraction failed:', llmError);
        throw new Error(`LLM extraction failed: ${llmError.message}`);
      }
    } else {
      console.log('LLM extraction not enabled, returning OCR text only');
      // Minimal fallback - just return the file
    }
    
    // Add confidence scores if available
    if (Object.keys(confidenceScores).length > 0) {
      extractedData.confidence_scores = confidenceScores;
    }

    // Insert into database
    console.log('Inserting into database...');
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

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
