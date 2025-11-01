import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

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
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error: userError } = await req.headers.get('Authorization')
      ? await supabase.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''))
      : { data: { user: null }, error: null };

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { filePath, documentType, personType } = await req.json();
    
    if (!filePath || !documentType || !personType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${documentType} for ${personType}, file: ${filePath}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-documents')
      .download(filePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw downloadError;
    }

    console.log('File downloaded, size:', fileData.size);

    // Detect file type from path
    const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
    const isPDF = fileExtension === 'pdf';
    
    console.log(`Processing ${fileExtension.toUpperCase()} file...`);
    
    // Convert to base64 for AI processing
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
    
    console.log('Using Lovable AI for OCR extraction...');
    
    // Use Lovable AI for OCR (no file size limit, no API key needed from user)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiPrompt = documentType === 'personalausweis' 
      ? `Extract all information from this German ID card (Personalausweis). Return a JSON object with these fields:
      - nachname (last name)
      - vorname (first name)
      - geburtsname (birth name, if present)
      - geburtsdatum (date of birth in DD.MM.YYYY format)
      - geburtsort (place of birth)
      - staatsangehoerigkeit (nationality)
      - ausweisnummer (ID card number)
      - gueltig_bis (expiry date in DD.MM.YYYY format)
      
      Return ONLY valid JSON, no markdown formatting.`
      : `Extract all information from this German passport (Reisepass). Return a JSON object with these fields:
      - nachname (last name)
      - vorname (first name)
      - geburtsdatum (date of birth in DD.MM.YYYY format)
      - geburtsort (place of birth, if visible)
      - staatsangehoerigkeit (nationality)
      - ausweisnummer (passport number)
      - gueltig_bis (expiry date in DD.MM.YYYY format)
      
      Return ONLY valid JSON, no markdown formatting.`;

    const aiResponse = await fetch('https://api.lovable.app/v1/ai/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: aiPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64File}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      throw new Error('AI processing failed');
    }

    const aiResult = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiResult, null, 2));
    
    const aiText = aiResult.choices?.[0]?.message?.content;
    if (!aiText) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    let extractedData: any;
    try {
      // Remove markdown code blocks if present
      const jsonText = aiText.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(jsonText);
      console.log('Extracted data:', extractedData);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiText);
      throw new Error('Failed to parse extracted data');
    }

    // Add metadata to extracted data
    const finalData: any = {
      user_id: user.id,
      document_type: documentType,
      person_type: personType,
      file_path: filePath,
      ...extractedData,
    };

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from('eltern_dokumente')
      .insert(finalData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedData,
        message: 'Dokument erfolgreich extrahiert',
        ocrText: JSON.stringify(extractedData, null, 2),
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