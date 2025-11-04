import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ocrApiKey = Deno.env.get("OCR_SPACE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
    } = (await req.headers.get("Authorization"))
      ? await supabase.auth.getUser(req.headers.get("Authorization")!.replace("Bearer ", ""))
      : { data: { user: null }, error: null };

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { filePath, personType } = await req.json();

    if (!filePath || !personType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing Meldebescheinigung for ${personType}, file: ${filePath}`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("application-documents")
      .download(filePath);

    if (downloadError) {
      console.error("Download error:", downloadError);
      throw downloadError;
    }

    const fileName = filePath.split("/").pop() || "document.pdf";
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "pdf";

    const formData = new FormData();
    formData.append("file", fileData, fileName);
    formData.append("filetype", fileExtension.toUpperCase());
    formData.append("language", "ger");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: ocrApiKey },
      body: formData,
    });

    const ocrResult = await ocrResponse.json();
    console.log("OCR API response:", JSON.stringify(ocrResult, null, 2));

    if (!ocrResult.IsErroredOnProcessing && ocrResult.ParsedResults?.length > 0) {
      const ocrText = ocrResult.ParsedResults.map((result: any) => result.ParsedText).join("\n\n");
      console.log("OCR Text:", ocrText);

      const convertDate = (dateStr: string): string => {
        const match = dateStr?.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (match) {
          const [, day, month, year] = match;
          return `${year}-${month}-${day}`;
        }
        return dateStr;
      };

      const extractedData: any = {
        user_id: user.id,
        person_type: personType,
        file_path: filePath,
      };

      // Extract first name
      const vornameMatch = ocrText.match(/(?:Vorname|Vornamen)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (vornameMatch) extractedData.vorname = vornameMatch[1].trim();

      // Extract last name
      const nachnameMatch = ocrText.match(/(?:Nachname|Familienname)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (nachnameMatch) extractedData.nachname = nachnameMatch[1].trim();

      // Extract birth date
      const geburtsdatumMatch = ocrText.match(/(?:Geburtsdatum|geboren am)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (geburtsdatumMatch) extractedData.geburtsdatum = convertDate(geburtsdatumMatch[1]);

      // Extract birth place
      const geburtsortMatch = ocrText.match(/(?:Geburtsort)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (geburtsortMatch) extractedData.geburtsort = geburtsortMatch[1].trim();

      // Extract nationality
      const staatsMatch = ocrText.match(/(?:Staatsangehörigkeit|Nationalität)[:\s]*(DEUTSCH|GERMAN|[A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (staatsMatch) extractedData.staatsangehoerigkeit = staatsMatch[1].trim();

      // Extract address
      const strasseMatch = ocrText.match(/(?:Straße|Anschrift)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s.-]+?)\s+(\d+[A-Za-z]?)/i);
      if (strasseMatch) {
        extractedData.adresse_strasse = strasseMatch[1].trim();
        extractedData.adresse_hausnummer = strasseMatch[2].trim();
      }

      const plzOrtMatch = ocrText.match(/(\d{5})\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/);
      if (plzOrtMatch) {
        extractedData.adresse_plz = plzOrtMatch[1];
        extractedData.adresse_ort = plzOrtMatch[2].trim();
      }

      // Extract registration date
      const gemeldetMatch = ocrText.match(/(?:gemeldet seit|Anmeldedatum)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (gemeldetMatch) extractedData.gemeldet_seit = convertDate(gemeldetMatch[1]);

      // Extract marital status
      const familienstandMatch = ocrText.match(/(?:Familienstand)[:\s]*(ledig|verheiratet|geschieden|verwitwet)/i);
      if (familienstandMatch) extractedData.familienstand = familienstandMatch[1].toLowerCase();

      // Extract issuing authority
      const behoerdeMatch = ocrText.match(/(?:Meldebehörde|Bürgeramt)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (behoerdeMatch) extractedData.ausstellende_behoerde = behoerdeMatch[1].trim();

      // Extract issue date
      const ausstellMatch = ocrText.match(/(?:Ausstellungsdatum|ausgestellt am)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (ausstellMatch) extractedData.ausstelldatum = convertDate(ausstellMatch[1]);

      const { data: insertedData, error: insertError } = await supabase
        .from("meldebescheinigungen")
        .insert(extractedData)
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: insertedData,
          message: "Meldebescheinigung erfolgreich extrahiert",
          ocrText: ocrText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      throw new Error("OCR processing failed");
    }
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
