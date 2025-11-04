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

    const { filePath, dokumenttyp } = await req.json();

    if (!filePath || !dokumenttyp) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${dokumenttyp}, file: ${filePath}`);

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

      const extractedData: any = {
        user_id: user.id,
        file_path: filePath,
        dokumenttyp: dokumenttyp,
      };

      // Extract names - looking for two people
      const names = ocrText.match(/([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)\s+und\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+)/i);
      if (names) {
        const [vorname1, nachname1] = names[1].trim().split(/\s+(?=[A-ZÄÖÜ])/);
        const [vorname2, nachname2] = names[2].trim().split(/\s+(?=[A-ZÄÖÜ])/);
        
        if (vorname1 && nachname1) {
          extractedData.partner1_vorname = vorname1;
          extractedData.partner1_nachname = nachname1;
        }
        if (vorname2 && nachname2) {
          extractedData.partner2_vorname = vorname2;
          extractedData.partner2_nachname = nachname2;
        }
      }

      // Extract date based on document type
      let datumMatch;
      if (dokumenttyp === 'heiratsurkunde') {
        datumMatch = ocrText.match(/(?:geheiratet am|Eheschließung am|Datum der Eheschließung)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      } else if (dokumenttyp === 'scheidungsurteil') {
        datumMatch = ocrText.match(/(?:geschieden am|Datum der Scheidung|rechtskräftig seit)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      } else if (dokumenttyp === 'sorgerechtserklaerung') {
        datumMatch = ocrText.match(/(?:Datum der Erklärung|erklärt am)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      } else if (dokumenttyp === 'vaterschaftsanerkennung') {
        datumMatch = ocrText.match(/(?:Datum der Anerkennung|anerkannt am)[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
      }
      if (datumMatch) extractedData.datum = convertDate(datumMatch[1]);

      // Extract registry office
      const standesamtMatch = ocrText.match(/(?:Standesamt|Amtsgericht)[:\s]*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
      if (standesamtMatch) extractedData.standesamt = standesamtMatch[1].trim();

      // Extract certificate number
      const nummerMatch = ocrText.match(/(?:Urkunden-?Nr|Registernummer)[.:\s]*([A-Z0-9\/\-]+)/i);
      if (nummerMatch) extractedData.urkundennummer = nummerMatch[1].trim();

      // Check for joint custody
      if (ocrText.match(/gemeinsames Sorgerecht|gemeinsame elterliche Sorge/i)) {
        extractedData.gemeinsames_sorgerecht = true;
      }

      const { data: insertedData, error: insertError } = await supabase
        .from("ehe_sorgerecht_nachweise")
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
          message: "Ehe/Sorgerecht-Dokument erfolgreich extrahiert",
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
