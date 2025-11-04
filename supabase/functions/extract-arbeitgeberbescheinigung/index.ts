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

    console.log(`Processing Arbeitgeberbescheinigung for ${personType}, file: ${filePath}`);

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

      // Extract employer name
      const arbeitgeberMatch = ocrText.match(/(?:Arbeitgeber|Firma|Unternehmen)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s&.,-]+?)(?=\n)/i);
      if (arbeitgeberMatch) extractedData.arbeitgeber_name = arbeitgeberMatch[1].trim();

      // Extract employer address
      const adresseMatch = ocrText.match(/(\d{5})\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+)/);
      if (adresseMatch) extractedData.arbeitgeber_adresse = `${adresseMatch[1]} ${adresseMatch[2]}`.trim();

      // Extract contact person
      const ansprechpartnerMatch = ocrText.match(/(?:Ansprechpartner|Kontakt)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s.-]+?)(?=\n)/i);
      if (ansprechpartnerMatch) extractedData.ansprechpartner = ansprechpartnerMatch[1].trim();

      // Extract employee name
      const arbeitnehmerMatch = ocrText.match(/(?:Arbeitnehmer|Mitarbeiter|Name)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (arbeitnehmerMatch) extractedData.arbeitnehmer_name = arbeitnehmerMatch[1].trim();

      // Extract personnel number
      const personalnummerMatch = ocrText.match(/(?:Personalnummer|Personal-Nr)[.:\s]*([A-Z0-9]+)/i);
      if (personalnummerMatch) extractedData.personalnummer = personalnummerMatch[1].trim();

      // Extract employment start date
      const beschaeftigtMatch = ocrText.match(/(?:beschäftigt seit|Eintrittsdatum)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (beschaeftigtMatch) extractedData.beschaeftigt_seit = convertDate(beschaeftigtMatch[1]);

      // Extract parental leave period
      const elternzeitVonMatch = ocrText.match(/(?:Elternzeit vom|Beginn)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (elternzeitVonMatch) extractedData.elternzeit_von = convertDate(elternzeitVonMatch[1]);

      const elternzeitBisMatch = ocrText.match(/(?:Elternzeit bis|Ende)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (elternzeitBisMatch) extractedData.elternzeit_bis = convertDate(elternzeitBisMatch[1]);

      // Check for part-time during parental leave
      if (ocrText.match(/Teilzeit.*Elternzeit/i)) {
        extractedData.teilzeit_waehrend_elternzeit = true;
        const stundenMatch = ocrText.match(/(\d{1,2})\s*(?:Stunden|h)/i);
        if (stundenMatch) extractedData.teilzeit_stunden_pro_woche = parseFloat(stundenMatch[1]);
      }

      // Extract issue date
      const ausstelldatumMatch = ocrText.match(/(?:Datum|Ausgestellt am)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      if (ausstelldatumMatch) extractedData.ausstelldatum = convertDate(ausstelldatumMatch[1]);

      // Check for stamp
      if (ocrText.match(/Stempel|Firmenstempel|Siegel/i)) {
        extractedData.stempel_vorhanden = true;
      }

      const { data: insertedData, error: insertError } = await supabase
        .from("arbeitgeberbescheinigungen")
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
          message: "Arbeitgeberbescheinigung erfolgreich extrahiert",
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
