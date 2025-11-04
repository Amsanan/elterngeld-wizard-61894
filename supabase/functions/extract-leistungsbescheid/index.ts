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
    const ocrApiKey = Deno.env.get("OCR_SPACE_API_KEY2")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
    } = (await req.headers.get("Authorization"))
      ? await supabase.auth.getUser(req.headers.get("Authorization")!.replace("Bearer ", ""))
      : { data: { user: null } };

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { filePath, personType, leistungstyp } = await req.json();

    if (!filePath || !personType || !leistungstyp) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${leistungstyp} for ${personType}, file: ${filePath}`);

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

    const ocrResponse = await fetch("https://apipro1.ocr.space/parse/image", {
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

      const parseAmount = (text: string): number | undefined => {
        const cleaned = text?.replace(/\./g, "").replace(",", ".");
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? undefined : parsed;
      };

      const extractedData: any = {
        user_id: user.id,
        person_type: personType,
        file_path: filePath,
        leistungstyp: leistungstyp,
      };

      // Extract agency name
      const behoerdeMatch = ocrText.match(/(?:Agentur für Arbeit|Jobcenter|Krankenkasse)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (behoerdeMatch) extractedData.behoerde_name = behoerdeMatch[1].trim();

      // Extract case number
      const aktenzeichenMatch = ocrText.match(/(?:Aktenzeichen|Az\.|Geschäftszeichen)[:\s]*([A-Z0-9\/\-]+)/i);
      if (aktenzeichenMatch) extractedData.aktenzeichen = aktenzeichenMatch[1].trim();

      // Extract recipient name
      const empfaengerMatch = ocrText.match(/(?:Name|Empfänger|Leistungsempfänger)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (empfaengerMatch) extractedData.empfaenger_name = empfaengerMatch[1].trim();

      // Extract benefit period
      const vonMatch = ocrText.match(/(?:Bewilligungszeitraum vom|Leistungszeitraum vom|vom)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (vonMatch) extractedData.bewilligungszeitraum_von = convertDate(vonMatch[1]);

      const bisMatch = ocrText.match(/(?:Bewilligungszeitraum bis|Leistungszeitraum bis|bis)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (bisMatch) extractedData.bewilligungszeitraum_bis = convertDate(bisMatch[1]);

      // Extract monthly amount
      const betragMatch = ocrText.match(/(?:monatlich|pro Monat|Regelbedarf)[^\d]*?€?\s*([0-9.,]+)/i);
      if (betragMatch) extractedData.monatlicher_betrag = parseAmount(betragMatch[1]);

      // Extract decision date
      const bescheidMatch = ocrText.match(/(?:Bescheid vom|Datum)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (bescheidMatch) extractedData.bescheiddatum = convertDate(bescheidMatch[1]);

      // Check if first decision
      if (ocrText.match(/Erstbescheid|Erstbewilligung/i)) {
        extractedData.erstbescheid = true;
      } else if (ocrText.match(/Änderungsbescheid|Weiterbewilligung/i)) {
        extractedData.erstbescheid = false;
      }

      const { data: insertedData, error: insertError } = await supabase
        .from("leistungsbescheide")
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
          message: "Leistungsbescheid erfolgreich extrahiert",
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
