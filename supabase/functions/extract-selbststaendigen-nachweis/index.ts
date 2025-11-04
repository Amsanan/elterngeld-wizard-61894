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

    const { filePath, personType, dokumenttyp } = await req.json();

    if (!filePath || !personType || !dokumenttyp) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${dokumenttyp} for ${personType}, file: ${filePath}`);

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

      const parseAmount = (text: string): number | undefined => {
        const cleaned = text?.replace(/\./g, "").replace(",", ".");
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? undefined : parsed;
      };

      const extractedData: any = {
        user_id: user.id,
        person_type: personType,
        file_path: filePath,
        dokumenttyp: dokumenttyp,
      };

      // Extract business year
      const jahrMatch = ocrText.match(/(?:Geschäftsjahr|Wirtschaftsjahr|Jahr)[:\s]*(\d{4})/i);
      if (jahrMatch) extractedData.geschaeftsjahr = jahrMatch[1];

      // Extract company name
      const firmaMatch = ocrText.match(/(?:Firma|Unternehmen|Betrieb)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s&.,-]+?)(?=\n)/i);
      if (firmaMatch) extractedData.firma_name = firmaMatch[1].trim();

      // Extract legal form
      const rechtsformMatch = ocrText.match(/(?:Rechtsform)[:\s]*(Einzelunternehmen|GbR|UG|GmbH|AG|KG|OHG)/i);
      if (rechtsformMatch) extractedData.rechtsform = rechtsformMatch[1].trim();

      // Extract tax number
      const steuernummerMatch = ocrText.match(/(?:Steuernummer|St[.-]Nr\.?)[:\s]+(\d{2,3}\/\d{3,4}\/\d{4,5}|\d{10,13})/i);
      if (steuernummerMatch) extractedData.steuernummer = steuernummerMatch[1];

      // Extract income (Betriebseinnahmen)
      const einnahmenMatch = ocrText.match(/(?:Betriebseinnahmen|Einnahmen)[^\d]*?€?\s*([0-9.,]+)/i);
      if (einnahmenMatch) extractedData.betriebseinnahmen = parseAmount(einnahmenMatch[1]);

      // Extract expenses (Betriebsausgaben)
      const ausgabenMatch = ocrText.match(/(?:Betriebsausgaben|Ausgaben)[^\d]*?€?\s*([0-9.,]+)/i);
      if (ausgabenMatch) extractedData.betriebsausgaben = parseAmount(ausgabenMatch[1]);

      // Extract profit (Gewinn)
      const gewinnMatch = ocrText.match(/(?:Gewinn|Jahresüberschuss)[^\d]*?€?\s*([0-9.,]+)/i);
      if (gewinnMatch) extractedData.gewinn = parseAmount(gewinnMatch[1]);

      // Extract creation date
      const datumMatch = ocrText.match(/(?:Erstellt am|Datum)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (datumMatch) extractedData.erstellungsdatum = convertDate(datumMatch[1]);

      const { data: insertedData, error: insertError } = await supabase
        .from("selbststaendigen_nachweise")
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
          message: "Selbstständigen-Nachweis erfolgreich extrahiert",
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
