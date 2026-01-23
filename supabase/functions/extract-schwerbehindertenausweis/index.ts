import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mapWithLLM } from "./mapWithLLM.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { filePath, antragId, personType, kindOrdnungszahl } = await req.json();

    if (!filePath) {
      return new Response(JSON.stringify({ error: 'filePath is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing disability certificate: ${filePath}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-documents')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Convert to base64 for OCR
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Call OCR API
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY') || Deno.env.get('OCR_SPACE_API_KEY2');
    if (!ocrApiKey) {
      return new Response(JSON.stringify({ error: 'OCR API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const formData = new FormData();
    formData.append('base64Image', `data:application/pdf;base64,${base64}`);
    formData.append('language', 'ger');
    formData.append('isOverlayRequired', 'true');
    formData.append('OCREngine', '2');
    formData.append('scale', 'true');
    formData.append('isTable', 'true');

    const ocrResponse = await fetch('https://apipro1.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': ocrApiKey },
      body: formData
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('OCR API error:', errorText);
      return new Response(JSON.stringify({ error: 'OCR processing failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ocrResult = await ocrResponse.json();
    const parsedResults = ocrResult.ParsedResults || [];
    const ocrText = parsedResults.map((r: any) => r.ParsedText || '').join('\n');
    const overlayLines: string[] = [];

    // Extract overlay text lines
    for (const result of parsedResults) {
      if (result.TextOverlay?.Lines) {
        for (const line of result.TextOverlay.Lines) {
          const lineText = line.Words?.map((w: any) => w.WordText).join(' ') || '';
          if (lineText.trim()) {
            overlayLines.push(lineText);
          }
        }
      }
    }

    console.log(`OCR extracted ${ocrText.length} chars, ${overlayLines.length} overlay lines`);

    // Extract data with LLM
    const extractedData = await mapWithLLM({ ocrText, overlayLines });

    // Prepare record for insertion
    const record: Record<string, any> = {
      user_id: user.id,
      file_path: filePath,
      person_type: personType || null,
      kind_ordnungszahl: kindOrdnungszahl ?? null,
      antrag_id: antragId || null,
      confidence_scores: {}
    };

    // Map extracted fields
    const fieldMappings: Record<string, string> = {
      name_inhaber: 'name_inhaber',
      vorname_inhaber: 'vorname_inhaber',
      geburtsdatum: 'geburtsdatum',
      geschlecht: 'geschlecht',
      grad_der_behinderung: 'grad_der_behinderung',
      gdb_ab_datum: 'gdb_ab_datum',
      gueltig_bis: 'gueltig_bis',
      unbefristet: 'unbefristet',
      merkzeichen_g: 'merkzeichen_g',
      merkzeichen_ag: 'merkzeichen_ag',
      merkzeichen_b: 'merkzeichen_b',
      merkzeichen_bl: 'merkzeichen_bl',
      merkzeichen_gl: 'merkzeichen_gl',
      merkzeichen_h: 'merkzeichen_h',
      merkzeichen_rf: 'merkzeichen_rf',
      merkzeichen_tbl: 'merkzeichen_tbl',
      merkzeichen_1kl: 'merkzeichen_1kl',
      ausstellende_behoerde: 'ausstellende_behoerde',
      aktenzeichen: 'aktenzeichen',
      ausstellungsdatum: 'ausstellungsdatum'
    };

    for (const [llmField, dbField] of Object.entries(fieldMappings)) {
      if (extractedData[llmField] !== undefined && extractedData[llmField] !== null) {
        record[dbField] = extractedData[llmField];
      }
    }

    // Insert into database
    const { data: insertedRecord, error: insertError } = await supabase
      .from('schwerbehindertenausweise')
      .insert(record)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save extracted data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Successfully extracted and saved disability certificate:', insertedRecord.id);

    return new Response(JSON.stringify({ 
      success: true, 
      data: insertedRecord,
      ocrLength: ocrText.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
