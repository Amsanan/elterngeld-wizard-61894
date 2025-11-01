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
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY')!;
    
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

    // Perform OCR
    // Extract original filename from path to preserve file extension
    const fileName = filePath.split('/').pop() || 'document.pdf';
    
    const formData = new FormData();
    formData.append('file', fileData, fileName);  // Include filename so OCR can detect file type
    formData.append('language', 'ger');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrApiKey,
      },
      body: formData,
    });

    const ocrResult = await ocrResponse.json();
    console.log('OCR API response:', JSON.stringify(ocrResult, null, 2));

    if (!ocrResult.IsErroredOnProcessing && ocrResult.ParsedResults?.[0]) {
      const ocrText = ocrResult.ParsedResults[0].ParsedText;
      console.log('OCR Text:', ocrText);

      // Extract data based on document type
      const extractedData: any = {
        user_id: user.id,
        document_type: documentType,
        person_type: personType,
        file_path: filePath,
      };

      const lines = ocrText.split('\n').map((l: string) => l.trim()).filter((l: string) => l);

      if (documentType === 'personalausweis') {
        // Extract from ID card
        // Nachname
        const nachnameMatch = ocrText.match(/(?:Nachname|Name)[:\s]*\n?\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+)/i);
        if (nachnameMatch) extractedData.nachname = nachnameMatch[1].trim();

        // Vorname
        const vornameMatch = ocrText.match(/(?:Vorname|Vornamen)[:\s]*\n?\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+)/i);
        if (vornameMatch) extractedData.vorname = vornameMatch[1].trim();

        // Geburtsname
        const geburtsnameMatch = ocrText.match(/Geburtsname[:\s]*\n?\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+)/i);
        if (geburtsnameMatch) extractedData.geburtsname = geburtsnameMatch[1].trim();

        // Geburtsdatum
        const geburtsdatumMatch = ocrText.match(/Geburtsdatum[:\s]*\n?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i);
        if (geburtsdatumMatch) extractedData.geburtsdatum = geburtsdatumMatch[1];

        // Geburtsort
        const geburtsortMatch = ocrText.match(/Geburtsort[:\s]*\n?\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+)/i);
        if (geburtsortMatch) extractedData.geburtsort = geburtsortMatch[1].trim();

        // Staatsangehörigkeit
        const staatsMatch = ocrText.match(/Staatsangeh[öo]rigkeit[:\s]*\n?\s*(DEUTSCH|[A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+)/i);
        if (staatsMatch) extractedData.staatsangehoerigkeit = staatsMatch[1].trim();

        // Ausweisnummer
        const ausweisMatch = ocrText.match(/(?:Ausweis-?Nr|Seriennummer)[.:\s]*\n?\s*([A-Z0-9]+)/i);
        if (ausweisMatch) extractedData.ausweisnummer = ausweisMatch[1].trim();

        // Gültig bis
        const gueltigMatch = ocrText.match(/(?:G[üu]ltig bis|Ablaufdatum)[:\s]*\n?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i);
        if (gueltigMatch) extractedData.gueltig_bis = gueltigMatch[1];

      } else if (documentType === 'reisepass') {
        // Extract from passport (MRZ format)
        // Try to find MRZ lines (Machine Readable Zone)
        const mrzMatch = ocrText.match(/P<D<<([A-Z<]+)<<([A-Z<\s]+)/);
        if (mrzMatch) {
          extractedData.nachname = mrzMatch[1].replace(/</g, ' ').trim();
          extractedData.vorname = mrzMatch[2].replace(/</g, ' ').trim();
        } else {
          // Fallback to regular text extraction
          const nachnameMatch = ocrText.match(/(?:Name|Nachname|Surname)[:\s]*\n?\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+)/i);
          if (nachnameMatch) extractedData.nachname = nachnameMatch[1].trim();

          const vornameMatch = ocrText.match(/(?:Vorname|Given names)[:\s]*\n?\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+)/i);
          if (vornameMatch) extractedData.vorname = vornameMatch[1].trim();
        }

        // Geburtsdatum
        const geburtsdatumMatch = ocrText.match(/(?:Geburtsdatum|Date of birth)[:\s]*\n?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i);
        if (geburtsdatumMatch) extractedData.geburtsdatum = geburtsdatumMatch[1];

        // Reisepassnummer
        const passMatch = ocrText.match(/(?:Reisepass-?Nr|Passport No)[.:\s]*\n?\s*([A-Z0-9]+)/i);
        if (passMatch) extractedData.ausweisnummer = passMatch[1].trim();

        // Gültig bis
        const gueltigMatch = ocrText.match(/(?:G[üu]ltig bis|Date of expiry)[:\s]*\n?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i);
        if (gueltigMatch) extractedData.gueltig_bis = gueltigMatch[1];

        // Staatsangehörigkeit
        const staatsMatch = ocrText.match(/(?:Staatsangeh[öo]rigkeit|Nationality)[:\s]*\n?\s*(DEUTSCH|GERMAN|[A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+)/i);
        if (staatsMatch) extractedData.staatsangehoerigkeit = staatsMatch[1].trim();
      }

      // Insert into database
      const { data: insertedData, error: insertError } = await supabase
        .from('eltern_dokumente')
        .insert(extractedData)
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
          ocrText: ocrText,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('OCR processing failed');
    }
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});