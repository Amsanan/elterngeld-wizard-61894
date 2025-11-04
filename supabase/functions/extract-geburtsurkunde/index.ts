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

    const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY2');
    if (!ocrSpaceApiKey) {
      throw new Error('OCR_SPACE_API_KEY not configured');
    }
    
    // Detect file type from path
    const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
    const isPDF = fileExtension === 'pdf';
    
    console.log(`Processing ${fileExtension.toUpperCase()} file...`);
    
    // Convert to base64 for OCR.space (works better than FormData upload)
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
    
    console.log('Calling OCR.space API with base64 encoding...');
    
    // Call OCR.space API with base64
    const formData = new FormData();
    formData.append('base64Image', `data:${mimeType};base64,${base64File}`);
    formData.append('language', 'ger');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    if (isPDF) {
      formData.append('filetype', 'PDF');
    }

    const ocrResponse = await fetch('https://apipro1.ocr.space/parse/image', {
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
      
      // Parse OCR text to extract structured data with improved patterns
      const extractedData: ExtractedData = {};
      
      // Split into lines for better parsing
      const lines = ocrText.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
      
      // Find the "Kind" section boundary to avoid picking up Mutter/Vater labels
      const kindIdx = lines.findIndex((l: string) => l.match(/^Kind\s*$/i));
      const mutterIdx = lines.findIndex((l: string) => l.match(/^Mutter\s*$/i));
      const kindSection = kindIdx >= 0 && mutterIdx > kindIdx ? lines.slice(kindIdx, mutterIdx) : lines;
      
      // Extract Standesamt/Behörde
      const standesamtMatch = ocrText.match(/Standesamt\s+([^\n]+)/i);
      if (standesamtMatch) extractedData.behoerde_name = standesamtMatch[1].trim();
      
      // Extract Registernummer (e.g., "G 3454/2003")
      const registerMatch = ocrText.match(/(?:Registernummer|Register-?Nr\.?)[:\s]*([A-Z]?\s*\d+\/\d+)/i);
      if (registerMatch) extractedData.urkundennummer = registerMatch[1].trim();
      
      // Extract Kind Familienname - look ONLY in Kind section
      // Try inline pattern first (most reliable for Kind section)
      const nachnameInlineMatch = ocrText.match(/Kind[\s\S]*?Familienname\s+([A-Za-zäöüÄÖÜß]+)(?:\s|$)/i);
      if (nachnameInlineMatch) {
        extractedData.kind_nachname = nachnameInlineMatch[1].trim();
      } else {
        // Fallback: look for line after "Familienname" in Kind section only
        const familiennameIdx = kindSection.findIndex((l: string) => l.match(/^Familienname\s*$/i));
        if (familiennameIdx >= 0 && familiennameIdx + 1 < kindSection.length) {
          const nextLine = kindSection[familiennameIdx + 1];
          if (!nextLine.match(/^(Geburtsname|Vorname|Religion|Geschlecht)/i)) {
            extractedData.kind_nachname = nextLine;
          }
        }
      }
      
      // Extract Kind Vorname(n) - look for line after "Vorname(n)" in Kind section
      const vornameIdx = kindSection.findIndex((l: string) => l.match(/^Vorname\(n\)\s*$/i));
      if (vornameIdx >= 0 && vornameIdx + 1 < kindSection.length) {
        const nextLine = kindSection[vornameIdx + 1];
        if (!nextLine.match(/^(Geburtsname|Familienname|Religion|Geschlecht)/i)) {
          extractedData.kind_vorname = nextLine;
        }
      } else {
        // Fallback: try inline pattern (but skip "(n)" in capture)
        const vornameMatch = ocrText.match(/Kind[\s\S]*?Vorname\(n\)[:\s]*\n?\s*([A-Za-zäöüÄÖÜß]+)/i);
        if (vornameMatch && vornameMatch[1] !== '(n)') {
          extractedData.kind_vorname = vornameMatch[1].trim();
        }
      }
      
      // Extract Geburtstag - look for line after "Geburtstag"
      const geburtstagIdx = kindSection.findIndex((l: string) => l.match(/^Geburtstag\s*$/i));
      if (geburtstagIdx >= 0 && geburtstagIdx + 1 < kindSection.length) {
        const dateStr = kindSection[geburtstagIdx + 1];
        if (dateStr.match(/\d{1,2}\.\d{1,2}\.\d{2,4}/)) {
          extractedData.kind_geburtsdatum = dateStr;
        }
      } else {
        // Fallback: inline pattern
        const geburtsdatumMatch = ocrText.match(/(?:Geburtstag|Geburtsdatum)[:\s]*\n?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i);
        if (geburtsdatumMatch) extractedData.kind_geburtsdatum = geburtsdatumMatch[1].trim();
      }
      
      // Extract Geburtsort
      const geburtsortIdx = kindSection.findIndex((l: string) => l.match(/^Geburtsort\s*$/i));
      if (geburtsortIdx >= 0 && geburtsortIdx + 1 < kindSection.length) {
        extractedData.kind_geburtsort = kindSection[geburtsortIdx + 1];
      } else {
        const geburtsortMatch = ocrText.match(/Geburtsort[:\s]+([^\n]+)/i);
        if (geburtsortMatch) extractedData.kind_geburtsort = geburtsortMatch[1].trim();
      }
      
      // Extract Mutter - look for text after "Mutter" section
      const mutterMatch = ocrText.match(/Mutter\s*\n\s*([^\n]+)/i);
      if (mutterMatch) {
        const mutterName = mutterMatch[1].replace(/\(Eigennamen\)/i, '').trim();
        const nameParts = mutterName.split(/\s+/);
        if (nameParts.length >= 2) {
          extractedData.mutter_nachname = nameParts[0];
          extractedData.mutter_vorname = nameParts.slice(1).join(' ');
        }
      }
      
      // Extract Vater - look for text after "Vater" section
      const vaterMatch = ocrText.match(/Vater\s*\n[\s\S]*?\n\s*([^\n]+?)\s*\(Eigennamen\)/i);
      if (vaterMatch) {
        const vaterName = vaterMatch[1].trim();
        const nameParts = vaterName.split(/\s+/);
        if (nameParts.length >= 2) {
          extractedData.vater_nachname = nameParts[0];
          extractedData.vater_vorname = nameParts.slice(1).join(' ');
        }
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