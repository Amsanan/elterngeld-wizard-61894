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
      error: userError,
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

    console.log(`Processing Steuerbescheid for ${personType}, file: ${filePath}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("application-documents")
      .download(filePath);

    if (downloadError) {
      console.error("Download error:", downloadError);
      throw downloadError;
    }

    // Perform OCR
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
      headers: {
        apikey: ocrApiKey,
      },
      body: formData,
    });

    const ocrResult = await ocrResponse.json();
    console.log("OCR API response:", JSON.stringify(ocrResult, null, 2));

    if (!ocrResult.IsErroredOnProcessing && ocrResult.ParsedResults?.length > 0) {
      const ocrText = ocrResult.ParsedResults.map((result: any) => result.ParsedText).join("\n\n");
      console.log("OCR Text:", ocrText);

      // Extract data from tax assessment
      const extractedData: any = {
        user_id: user.id,
        person_type: personType,
        file_path: filePath,
      };

      // Extract Steuerjahr (tax year) - look for patterns like "2023" or "Veranlagungszeitraum 2023"
      const steuerjahrMatch = ocrText.match(/(?:Veranlagungszeitraum|Steuerjahr|für)\s+(\d{4})/i);
      if (steuerjahrMatch) extractedData.steuerjahr = steuerjahrMatch[1];

      // Extract Steuernummer - German tax numbers have various formats
      const steuernummerMatch = ocrText.match(/(?:Steuernummer|St[.-]Nr\.?)[:\s]+(\d{2,3}\/\d{3,4}\/\d{4,5}|\d{10,13})/i);
      if (steuernummerMatch) extractedData.steuernummer = steuernummerMatch[1];

      // Extract name - look for patterns after "Name" or "Steuerpflichtige/r"
      const nachnameMatch = ocrText.match(/(?:Name|Nachname|Steuerpflichtige(?:r)?)[:\s]+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?:\n|,)/i);
      if (nachnameMatch) extractedData.nachname = nachnameMatch[1].trim();

      const vornameMatch = ocrText.match(/(?:Vorname)[:\s]+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?:\n|,)/i);
      if (vornameMatch) extractedData.vorname = vornameMatch[1].trim();

      // Extract address
      const plzWohnortMatch = ocrText.match(/(\d{5})\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?:\n)/i);
      if (plzWohnortMatch) {
        extractedData.plz = plzWohnortMatch[1];
        extractedData.wohnort = plzWohnortMatch[2].trim();
      }

      // Extract Jahreseinkommen (annual income)
      const jahreseinkommenMatch = ocrText.match(/(?:Summe der Einkünfte|Gesamtbetrag der Einkünfte)[:\s]+(?:EUR\s+)?([0-9.,]+)/i);
      if (jahreseinkommenMatch) extractedData.jahreseinkommen = jahreseinkommenMatch[1].replace(/\./g, "").replace(",", ".");

      // Extract zu versteuerndes Einkommen (taxable income)
      const zvEMatch = ocrText.match(/(?:zu versteuerndes Einkommen|Einkommen)[:\s]+(?:EUR\s+)?([0-9.,]+)/i);
      if (zvEMatch) extractedData.zu_versteuerndes_einkommen = zvEMatch[1].replace(/\./g, "").replace(",", ".");

      // Extract festgesetzte Steuer (assessed tax)
      const steuerMatch = ocrText.match(/(?:festgesetzte|festzusetzende)\s+(?:Einkommensteuer|Steuer)[:\s]+(?:EUR\s+)?([0-9.,]+)/i);
      if (steuerMatch) extractedData.festgesetzte_steuer = steuerMatch[1].replace(/\./g, "").replace(",", ".");

      // Insert into database
      const { data: insertedData, error: insertError } = await supabase
        .from("einkommensteuerbescheide")
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
          message: "Steuerbescheid erfolgreich extrahiert",
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
