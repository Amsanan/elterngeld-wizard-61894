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
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'pdf';
    
    const formData = new FormData();
    formData.append('file', fileData, fileName);
    formData.append('filetype', fileExtension.toUpperCase());  // Explicitly set file type (PDF, JPG, PNG, etc.)
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

    // Helper function to convert DD.MM.YYYY to YYYY-MM-DD
    const convertDate = (dateStr: string): string => {
      if (!dateStr) return '';
      const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    };

    if (!ocrResult.IsErroredOnProcessing && ocrResult.ParsedResults?.length > 0) {
      // Combine text from all pages (front and back of ID card)
      const ocrText = ocrResult.ParsedResults
        .map((result: any) => result.ParsedText)
        .join('\n\n');
      console.log('OCR Text (all pages):', ocrText);

      // Extract data based on document type
      const extractedData: any = {
        user_id: user.id,
        document_type: documentType,
        person_type: personType,
        file_path: filePath,
      };

      const lines = ocrText.split('\n').map((l: string) => l.trim()).filter((l: string) => l);

      if (documentType === 'personalausweis') {
        // Extract from ID card - Page 1 (Front)
        // Nachname - look for pattern after "(a)" marker
        const nachnameMatch = ocrText.match(/\(a\)\s*([A-ZÄÖÜ][A-ZÄÖÜ\s]+?)(?=\n)/);
        if (nachnameMatch) extractedData.nachname = nachnameMatch[1].trim();

        // Vorname - look for pattern after "Vornamen" or "Given names"
        const vornameMatch = ocrText.match(/(?:Vornamen|Given names)[^\n]*\n\s*([A-ZÄÖÜ][A-ZÄÖÜ\s]+?)(?=\n)/i);
        if (vornameMatch) extractedData.vorname = vornameMatch[1].trim();

        // Geburtsname - look for text after the Geburtsname label, but skip if it's empty or shows form text
        const geburtsnameMatch = ocrText.match(/\(b\][^\n]*\n\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
        if (geburtsnameMatch && geburtsnameMatch[1].trim().length > 0) {
          const geburtsname = geburtsnameMatch[1].trim();
          // Only set if it's not a serial number or form text
          if (!/^[A-Z0-9<]+$/.test(geburtsname) && geburtsname !== 'Name at birth') {
            extractedData.geburtsname = geburtsname;
          }
        }

        // Geburtsdatum - find date in DD.MM.YYYY format (first occurrence)
        const geburtsdatumMatch = ocrText.match(/(\d{2}\.\d{2}\.\d{4})/);
        if (geburtsdatumMatch) extractedData.geburtsdatum = convertDate(geburtsdatumMatch[1]);

        // Geburtsort - look after "Geburtsort" or "Place of birth"
        const geburtsortMatch = ocrText.match(/(?:Geburtsort|Place of birth)[^\n]*\n\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
        if (geburtsortMatch) extractedData.geburtsort = geburtsortMatch[1].trim();

        // Staatsangehörigkeit - look for DEUTSCH or other nationality
        const staatsMatch = ocrText.match(/(?:Staatsangeh[öo]rigkeit|Nationality)[^\n]*\n\s*(DEUTSCH|GERMAN|[A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
        if (staatsMatch) extractedData.staatsangehoerigkeit = staatsMatch[1].trim();

        // Ausweisnummer - look for serial number pattern (letters and numbers like L3GF5CY11)
        const ausweisMatch = ocrText.match(/\b([A-Z][0-9][A-Z0-9]{7,9})\b/);
        if (ausweisMatch) extractedData.ausweisnummer = ausweisMatch[1].trim();

        // Gültig bis - find second date (first is birth date, second is expiry)
        const allDates = ocrText.match(/\d{2}\.\d{2}\.\d{4}/g);
        if (allDates && allDates.length > 1) {
          extractedData.gueltig_bis = convertDate(allDates[1]); // Second date is expiry
        }

        // Extract from ID card - Page 2 (Back) - Address information
        // Anschrift/Address - look for postal code and city
        const addressMatch = ocrText.match(/(?:Anschrift|Address)[^\n]*\n\s*(\d{5})\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
        if (addressMatch) {
          extractedData.plz = addressMatch[1].trim();
          extractedData.wohnort = addressMatch[2].trim();
        }

        // Street and house number - look for street name followed by numbers
        const streetMatch = ocrText.match(/(?:Anschrift|Address)[^\n]*\n[^\n]*\n\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)\s+(\d+[A-Za-z]?)\s*(?:\n|$)/i);
        if (streetMatch) {
          extractedData.strasse = streetMatch[1].trim();
          extractedData.hausnummer = streetMatch[2].trim();
        }

        // Wohnungsnummer - look for additional number after street (if present on next line)
        const wohnungMatch = ocrText.match(/(?:Anschrift|Address)[^\n]*\n[^\n]*\n[^\n]*\n\s*(\d+)\s*(?:\n|$)/i);
        if (wohnungMatch && wohnungMatch[1] !== extractedData.hausnummer) {
          extractedData.wohnungsnummer = wohnungMatch[1].trim();
        }

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
        if (geburtsdatumMatch) extractedData.geburtsdatum = convertDate(geburtsdatumMatch[1]);

        // Reisepassnummer
        const passMatch = ocrText.match(/(?:Reisepass-?Nr|Passport No)[.:\s]*\n?\s*([A-Z0-9]+)/i);
        if (passMatch) extractedData.ausweisnummer = passMatch[1].trim();

        // Gültig bis
        const gueltigMatch = ocrText.match(/(?:G[üu]ltig bis|Date of expiry)[:\s]*\n?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i);
        if (gueltigMatch) extractedData.gueltig_bis = convertDate(gueltigMatch[1]);

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