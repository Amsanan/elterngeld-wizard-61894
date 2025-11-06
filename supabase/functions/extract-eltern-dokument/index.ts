import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { mapWithLLM } from './mapWithLLM.ts';

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

    const { filePath, documentType, personType, useLLM = true } = await req.json();

    if (!filePath || !documentType || !personType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${documentType} for ${personType}, file: ${filePath}, LLM: ${useLLM}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("application-documents")
      .download(filePath);

    if (downloadError) {
      console.error("Download error:", downloadError);
      throw downloadError;
    }

    // Perform OCR
    // Extract original filename from path to preserve file extension
    const fileName = filePath.split("/").pop() || "document.pdf";
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "pdf";

    const formData = new FormData();
    formData.append("file", fileData, fileName);
    formData.append("filetype", fileExtension.toUpperCase()); // Explicitly set file type (PDF, JPG, PNG, etc.)
    formData.append("language", "auto");
    formData.append("isOverlayRequired", "true");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    const ocrResponse = await fetch("https://apipro1.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: ocrApiKey,
      },
      body: formData,
    });

    const ocrResult = await ocrResponse.json();
    console.log("OCR API response:", JSON.stringify(ocrResult, null, 2));

    // Helper function to convert DD.MM.YYYY to YYYY-MM-DD
    const convertDate = (dateStr: string): string => {
      if (!dateStr) return "";
      const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    };

    if (ocrResult.ParsedResults?.length > 0 && !ocrResult.IsErroredOnProcessing) {
      const ocrText = ocrResult.ParsedResults.map((result: any) => result.ParsedText).join("\n\n");
      const overlayLines = ocrResult.ParsedResults[0].TextOverlay?.Lines || [];
      console.log("OCR Text (all pages):", ocrText);

      let extractedData: any = {
        user_id: user.id,
        document_type: documentType,
        person_type: personType,
        file_path: filePath,
      };
      let confidenceScores: any = {};

      if (useLLM) {
        console.log('Using LLM extraction...');
        const llmResult = await mapWithLLM({
          schema: null,
          ocrText: ocrText,
          overlayLines: overlayLines,
        });
        
        extractedData = { ...extractedData, ...llmResult.data };
        confidenceScores = llmResult.confidence || {};
      }

      if (Object.keys(confidenceScores).length > 0) {
        extractedData.confidence_scores = confidenceScores;
      }

      // Insert into database
      const { data: insertedData, error: insertError } = await supabase
        .from("eltern_dokumente")
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
          message: "Dokument erfolgreich extrahiert",
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
