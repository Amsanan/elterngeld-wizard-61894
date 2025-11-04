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
      : { data: { user: null } };

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

    console.log(`Processing Krankenversicherung for ${personType}, file: ${filePath}`);

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

      // Extract insurance name
      const versicherungMatch = ocrText.match(/(?:Krankenkasse|Versicherung)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s&.,-]+?)(?=\n)/i);
      if (versicherungMatch) extractedData.versicherung_name = versicherungMatch[1].trim();

      // Extract insurance number
      const versicherungsnummerMatch = ocrText.match(/(?:Versichertennummer|Vers.-Nr)[.:\s]*([A-Z0-9]+)/i);
      if (versicherungsnummerMatch) extractedData.versicherungsnummer = versicherungsnummerMatch[1].trim();

      // Extract insured person name
      const versicherterMatch = ocrText.match(/(?:Name|Versicherte\/r)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (versicherterMatch) extractedData.versicherter_name = versicherterMatch[1].trim();

      // Determine insurance type
      if (ocrText.match(/gesetzlich versichert|GKV/i)) {
        extractedData.versicherungsart = 'gesetzlich';
      } else if (ocrText.match(/privat versichert|PKV/i)) {
        extractedData.versicherungsart = 'privat';
      } else if (ocrText.match(/familienversichert/i)) {
        extractedData.versicherungsart = 'familienversichert';
      }

      // Extract insurance start date
      const versichertSeitMatch = ocrText.match(/(?:versichert seit|Beginn der Versicherung)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (versichertSeitMatch) extractedData.versichert_seit = convertDate(versichertSeitMatch[1]);

      // Extract contribution rate (Beitragssatz)
      const beitragssatzMatch = ocrText.match(/(?:Beitragssatz)[:\s]*(\d{1,2}[.,]\d{1,2})\s*%/i);
      if (beitragssatzMatch) {
        extractedData.beitragssatz = parseFloat(beitragssatzMatch[1].replace(",", "."));
      }

      // Extract additional contribution (Zusatzbeitrag)
      const zusatzbeitragMatch = ocrText.match(/(?:Zusatzbeitrag)[:\s]*(\d{1,2}[.,]\d{1,2})\s*%/i);
      if (zusatzbeitragMatch) {
        extractedData.zusatzbeitrag = parseFloat(zusatzbeitragMatch[1].replace(",", "."));
      }

      // Extract certificate date
      const bescheinigungMatch = ocrText.match(/(?:Bescheinigung vom|Datum)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (bescheinigungMatch) extractedData.bescheinigungsdatum = convertDate(bescheinigungMatch[1]);

      const { data: insertedData, error: insertError } = await supabase
        .from("krankenversicherung_nachweise")
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
          message: "Krankenversicherungs-Nachweis erfolgreich extrahiert",
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
