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

    const { filePath } = await req.json();

    if (!filePath) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing Bankverbindung, file: ${filePath}`);

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
        file_path: filePath,
      };

      // Extract account holder
      const kontoinhaberMatch = ocrText.match(/(?:Kontoinhaber|Inhaber)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (kontoinhaberMatch) extractedData.kontoinhaber = kontoinhaberMatch[1].trim();

      // Extract IBAN
      const ibanMatch = ocrText.match(/IBAN[:\s]*([A-Z]{2}\d{2}[\s]?(?:\d{4}[\s]?){4}\d{2}|\w{22})/i);
      if (ibanMatch) {
        extractedData.iban = ibanMatch[1].replace(/\s/g, "").toUpperCase();
      }

      // Extract BIC
      const bicMatch = ocrText.match(/BIC[:\s]*([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)/i);
      if (bicMatch) {
        extractedData.bic = bicMatch[1].toUpperCase();
      }

      // Extract bank name
      const bankMatch = ocrText.match(/(?:Bank|Kreditinstitut)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s&.,-]+?)(?=\n)/i);
      if (bankMatch) extractedData.bank_name = bankMatch[1].trim();

      // Determine account type
      if (ocrText.match(/Girokonto/i)) {
        extractedData.kontoart = 'girokonto';
      } else if (ocrText.match(/Sparkonto|Tagesgeld/i)) {
        extractedData.kontoart = 'sparkonto';
      }

      // Extract proof date
      const datumMatch = ocrText.match(/(?:Datum|Stand)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (datumMatch) extractedData.nachweisdatum = convertDate(datumMatch[1]);

      const { data: insertedData, error: insertError } = await supabase
        .from("bankverbindungen")
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
          message: "Bankverbindung erfolgreich extrahiert",
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
