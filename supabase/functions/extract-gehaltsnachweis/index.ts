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

    const { filePath, personType } = await req.json();

    if (!filePath || !personType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing Gehaltsnachweis for ${personType}, file: ${filePath}`);

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

    if (ocrResult.ParsedResults?.length > 0 && !ocrResult.IsErroredOnProcessing) {
      const ocrText = ocrResult.ParsedResults.map((result: any) => result.ParsedText).join("\n\n");
      console.log("OCR Text:", ocrText);

      const parseAmount = (text: string): number | undefined => {
        const cleaned = text?.replace(/\./g, "").replace(",", ".");
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? undefined : parsed;
      };

      const extractedData: any = {
        user_id: user.id,
        person_type: personType,
        file_path: filePath,
      };

      // Extract month (YYYY-MM)
      const monatMatch = ocrText.match(/(\d{2})\.(\d{4})|(\d{4})-(\d{2})/);
      if (monatMatch) {
        extractedData.monat = monatMatch[3] ? `${monatMatch[3]}-${monatMatch[4]}` : `${monatMatch[2]}-${monatMatch[1]}`;
      }

      // Extract employer name
      const arbeitgeberMatch = ocrText.match(/(?:Arbeitgeber|Firma)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s&.,-]+?)(?=\n)/i);
      if (arbeitgeberMatch) extractedData.arbeitgeber_name = arbeitgeberMatch[1].trim();

      // Extract employee name
      const arbeitnehmerMatch = ocrText.match(/(?:Name|Arbeitnehmer)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (arbeitnehmerMatch) extractedData.arbeitnehmer_name = arbeitnehmerMatch[1].trim();

      // Extract personnel number
      const personalnummerMatch = ocrText.match(/(?:Personalnummer|Personal-Nr)[.:\s]*([A-Z0-9]+)/i);
      if (personalnummerMatch) extractedData.personalnummer = personalnummerMatch[1].trim();

      // Extract gross salary
      const bruttoMatch = ocrText.match(/(?:Brutto|Bruttogehalt)[^\d]*?€?\s*([0-9.,]+)/i);
      if (bruttoMatch) extractedData.brutto_gehalt = parseAmount(bruttoMatch[1]);

      // Extract net salary
      const nettoMatch = ocrText.match(/(?:Netto|Nettogehalt|Auszahlung)[^\d]*?€?\s*([0-9.,]+)/i);
      if (nettoMatch) extractedData.netto_gehalt = parseAmount(nettoMatch[1]);

      // Extract tax class
      const steuerklasseMatch = ocrText.match(/(?:Steuerklasse|StKl)[.:\s]*([1-6])/i);
      if (steuerklasseMatch) extractedData.steuerklasse = steuerklasseMatch[1];

      // Extract social insurance
      const sozialversicherungMatch = ocrText.match(/(?:Sozialversicherung|SV-Beiträge)[^\d]*?€?\s*([0-9.,]+)/i);
      if (sozialversicherungMatch) extractedData.sozialversicherung_gesamt = parseAmount(sozialversicherungMatch[1]);

      // Extract wage tax
      const lohnsteuerMatch = ocrText.match(/(?:Lohnsteuer|LSt)[^\d]*?€?\s*([0-9.,]+)/i);
      if (lohnsteuerMatch) extractedData.lohnsteuer = parseAmount(lohnsteuerMatch[1]);

      // Extract solidarity surcharge
      const soliMatch = ocrText.match(/(?:Solidaritätszuschlag|SolZ)[^\d]*?€?\s*([0-9.,]+)/i);
      if (soliMatch) extractedData.solidaritaetszuschlag = parseAmount(soliMatch[1]);

      // Extract church tax
      const kirchensteuerMatch = ocrText.match(/(?:Kirchensteuer|KiSt)[^\d]*?€?\s*([0-9.,]+)/i);
      if (kirchensteuerMatch) extractedData.kirchensteuer = parseAmount(kirchensteuerMatch[1]);

      // Extract unemployment insurance
      const arbeitslosenMatch = ocrText.match(/(?:Arbeitslosenversicherung|AV)[^\d]*?€?\s*([0-9.,]+)/i);
      if (arbeitslosenMatch) extractedData.arbeitslosenversicherung = parseAmount(arbeitslosenMatch[1]);

      // Extract pension insurance
      const rentenMatch = ocrText.match(/(?:Rentenversicherung|RV)[^\d]*?€?\s*([0-9.,]+)/i);
      if (rentenMatch) extractedData.rentenversicherung = parseAmount(rentenMatch[1]);

      // Extract health insurance
      const krankenMatch = ocrText.match(/(?:Krankenversicherung|KV)[^\d]*?€?\s*([0-9.,]+)/i);
      if (krankenMatch) extractedData.krankenversicherung = parseAmount(krankenMatch[1]);

      // Extract care insurance
      const pflegeMatch = ocrText.match(/(?:Pflegeversicherung|PV)[^\d]*?€?\s*([0-9.,]+)/i);
      if (pflegeMatch) extractedData.pflegeversicherung = parseAmount(pflegeMatch[1]);

      const { data: insertedData, error: insertError } = await supabase
        .from("gehaltsnachweise")
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
          message: "Gehaltsnachweis erfolgreich extrahiert",
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
