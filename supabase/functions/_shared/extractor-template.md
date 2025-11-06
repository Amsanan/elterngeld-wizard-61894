# Template: LLM-Integration für Extract-Funktionen

## Zentrale Konfiguration
Alle Extraktoren verwenden `_shared/llm-config.ts` für:
- Model: `Deno.env.get("LLM_MODEL")` oder default model
- Retry-Delays: `LLM_CONFIG.baseDelayMs` (konfigurierbar)
- Max Retries: `LLM_CONFIG.maxRetries`

## Index.ts Template

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { mapWithLLM } from './mapWithLLM.ts';

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY2')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const { filePath, personType, useLLM = true } = await req.json();
    if (!filePath) throw new Error('Missing required fields');

    console.log(`Processing with LLM: ${useLLM}`);

    // Download file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-documents')
      .download(filePath);
    if (downloadError) throw downloadError;

    // Perform OCR
    const fileName = filePath.split('/').pop() || 'document.pdf';
    const formData = new FormData();
    formData.append('file', fileData, fileName);
    formData.append('language', 'ger');
    formData.append('isOverlayRequired', 'true');
    formData.append('OCREngine', '2');

    const ocrResponse = await fetch('https://apipro1.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: ocrApiKey },
      body: formData,
    });

    const ocrResult = await ocrResponse.json();
    if (!ocrResult.ParsedResults?.[0]?.ParsedText) {
      throw new Error('OCR failed');
    }

    const ocrText = ocrResult.ParsedResults[0].ParsedText;
    const overlayLines = ocrResult.ParsedResults[0].TextOverlay?.Lines || [];

    let extractedData: any = {
      user_id: user.id,
      person_type: personType, // only if needed
      file_path: filePath,
    };
    let confidenceScores: any = {};

    if (useLLM) {
      console.log('Using LLM extraction...');
      const llmResult = await mapWithLLM({
        schema: null,
        ocrText: ocrText,
        overlayLines: overlayLines,
      });
      
      extractedData = { ...extractedData, ...llmResult.data };
      confidenceScores = llmResult.confidence || {};
    }

    if (Object.keys(confidenceScores).length > 0) {
      extractedData.confidence_scores = confidenceScores;
    }

    // Insert into database (adjust table name!)
    const { data: insertedData, error: insertError } = await supabase
      .from('YOUR_TABLE_NAME_HERE') // ← CHANGE THIS
      .insert(extractedData)
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedData,
        message: 'Document extracted successfully',
        ocrText: ocrText,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Zu aktualisierende Funktionen:
- ✅ extract-geburtsurkunde (done)
- ✅ extract-steuerbescheid (done)
- ⏳ extract-gehaltsnachweis
- ⏳ extract-arbeitgeberbescheinigung
- ⏳ extract-bankverbindung
- ⏳ extract-meldebescheinigung
- ⏳ extract-krankenversicherung
- ⏳ extract-mutterschaftsgeld
- ⏳ extract-leistungsbescheid
- ⏳ extract-selbststaendigen-nachweis
- ⏳ extract-ehe-sorgerecht
- ⏳ extract-adoptions-pflege
- ⏳ extract-eltern-dokument

## Environment Variables für LLM-Config

Füge in Supabase Secrets hinzu:
- `LLM_MODEL` (optional): Überschreibt default model
- `USE_LLM_MAPPING`: OpenRouter API Key (bereits vorhanden)
