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

      // Extract Steuer-IdNr (Tax ID number)
      const idNrMatch = ocrText.match(/IdNr\.?\s+(?:Ehemann|Ehefrau|Steuerpflichtige)?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
      if (idNrMatch) extractedData.steuer_id_nummer = idNrMatch[1].replace(/\s/g, "");

      // Extract Finanzamt (tax office)
      const finanzamtMatch = ocrText.match(/Finanzamt\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?:\n|\d{5})/i);
      if (finanzamtMatch) extractedData.finanzamt_name = finanzamtMatch[1].trim();

      // Extract Finanzamt address
      const finanzamtAdresseMatch = ocrText.match(/Finanzamt[^\n]+\n\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s.]+?\d+)/i);
      if (finanzamtAdresseMatch) extractedData.finanzamt_adresse = finanzamtAdresseMatch[1].trim();

      // Extract Bescheiddatum (date of assessment)
      const bescheiddatumMatch = ocrText.match(/(?:vom|Bescheid für \d{4}.*?vom)\s+(\d{2}\.\d{2}\.\d{4})/i);
      if (bescheiddatumMatch) {
        const [day, month, year] = bescheiddatumMatch[1].split(".");
        extractedData.bescheiddatum = `${year}-${month}-${day}`;
      }

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

      // Extract Gesamtbetrag der Einkünfte
      const gesamtbetragMatch = ocrText.match(/Gesamtbetrag der Einkünfte[^\d]*?([0-9.,]+)/i);
      if (gesamtbetragMatch) extractedData.gesamtbetrag_der_einkuenfte = gesamtbetragMatch[1].replace(/\./g, "").replace(",", ".");

      // Extract Summe der Einkünfte
      const summeEinkuenfteMatch = ocrText.match(/Summe der Einkünfte[^\d]*?([0-9.,]+)/i);
      if (summeEinkuenfteMatch) extractedData.summe_der_einkuenfte = summeEinkuenfteMatch[1].replace(/\./g, "").replace(",", ".");

      // Extract zu versteuerndes Einkommen (taxable income)
      const zvEMatch = ocrText.match(/zu versteuerndes Einkommen[^\d]*?([0-9.,]+)/i);
      if (zvEMatch) extractedData.zu_versteuerndes_einkommen = zvEMatch[1].replace(/\./g, "").replace(",", ".");

      // Extract festgesetzte Einkommensteuer
      const steuerMatch = ocrText.match(/(?:festzusetzende|Festgesetzt werden)\s+(?:Einkommensteuer)[^\d]*?€?\s*([0-9.,]+)/i);
      if (steuerMatch) extractedData.festgesetzte_steuer = steuerMatch[1].replace(/\./g, "").replace(",", ".");

      // Extract Solidaritätszuschlag
      const soliMatch = ocrText.match(/Solidaritätszuschlag[^\d]*?€?\s*([0-9.,]+)/i);
      if (soliMatch) extractedData.solidaritaetszuschlag = soliMatch[1].replace(/\./g, "").replace(",", ".");

      // Extract Steuerabzug vom Lohn
      const steuerabzugMatch = ocrText.match(/(?:ab\s+)?Steuerabzug vom Lohn[^\d]*?€?\s*([0-9.,]+)/i);
      if (steuerabzugMatch) extractedData.steuerabzug_vom_lohn = steuerabzugMatch[1].replace(/\./g, "").replace(",", ".");

      // Extract verbleibende Steuer
      const verbleibendeMatch = ocrText.match(/verbleibende Steuer[^\d]*?€?\s*([0-9.,]+)/i);
      if (verbleibendeMatch) extractedData.verbleibende_steuer = verbleibendeMatch[1].replace(/\./g, "").replace(",", ".");

      // Extract Einkünfte aus selbständiger Arbeit
      const selbstaendigMatch = ocrText.match(/Einkünfte aus selbständiger Arbeit[^\d]*?([0-9.,]+)/i);
      if (selbstaendigMatch) extractedData.einkuenfte_selbstaendig = selbstaendigMatch[1].replace(/\./g, "").replace(",", ".");

      // Extract Einkünfte aus nichtselbständiger Arbeit (Bruttoarbeitslohn)
      const bruttoMatch = ocrText.match(/Bruttoarbeitslohn[^\d]*?([0-9.,]+)/i);
      if (bruttoMatch) {
        extractedData.bruttoarbeitslohn = bruttoMatch[1].replace(/\./g, "").replace(",", ".");
        extractedData.einkuenfte_nichtselbstaendig = bruttoMatch[1].replace(/\./g, "").replace(",", ".");
      }

      // Extract Werbungskosten
      const werbungskostenMatch = ocrText.match(/(?:ab\s+)?Werbungskosten[^\d]*?([0-9.,]+)/i);
      if (werbungskostenMatch) extractedData.werbungskosten = werbungskostenMatch[1].replace(/\./g, "").replace(",", ".");

      // Check for gemeinsame Veranlagung (joint assessment)
      if (ocrText.match(/(?:Ehemann|Ehefrau|Splittingtarif)/i)) {
        extractedData.gemeinsame_veranlagung = true;
      }

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
