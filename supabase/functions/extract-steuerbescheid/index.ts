import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import { mapWithLLM } from "./mapWithLLM.ts";

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

    const { filePath, personType, useLLM = false } = await req.json();
    console.log('Processing request with useLLM:', useLLM);

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

    const fileName = filePath.split("/").pop() || "document.pdf";
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "pdf";

    let allOcrText = "";
    let allOverlayLines: any[] = [];

    // If it's a PDF, check page count and split if needed
    if (fileExtension === "pdf") {
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();
        console.log(`PDF has ${totalPages} pages`);

        // Process in chunks of 3 pages
        const chunkSize = 3;
        const chunks = Math.ceil(totalPages / chunkSize);

        for (let i = 0; i < chunks; i++) {
          const startPage = i * chunkSize;
          const endPage = Math.min((i + 1) * chunkSize, totalPages);
          console.log(`Processing pages ${startPage + 1} to ${endPage}`);

          // Create a new PDF with just these pages
          const chunkPdf = await PDFDocument.create();
          const copiedPages = await chunkPdf.copyPages(
            pdfDoc,
            Array.from({ length: endPage - startPage }, (_, idx) => startPage + idx),
          );
          copiedPages.forEach((page) => chunkPdf.addPage(page));

          const chunkBytes = await chunkPdf.save();
          const chunkBlob = new Blob([new Uint8Array(chunkBytes)], { type: "application/pdf" });

          // Perform OCR on this chunk
          const formData = new FormData();
          formData.append("file", chunkBlob, `chunk_${i}.pdf`);
          formData.append("filetype", "PDF");
          formData.append("language", "ger");
          formData.append("isOverlayRequired", "true");
          formData.append("detectOrientation", "true");
          formData.append("scale", "true");
          formData.append("isTable", "true");
          formData.append("OCREngine", "2");

          const ocrResponse = await fetch("https://apipro1.ocr.space/parse/image", {
            method: "POST",
            headers: {
              apikey: ocrApiKey,
            },
            body: formData,
          });

          const ocrResult = await ocrResponse.json();
          console.log(`OCR result for chunk ${i}:`, JSON.stringify(ocrResult, null, 2));

          if (ocrResult.ParsedResults?.length > 0) {
            const chunkText = ocrResult.ParsedResults.map((result: any) => result.ParsedText).join("\n\n");
            allOcrText += chunkText + "\n\n";
            
            // Collect overlay data for LLM
            for (const result of ocrResult.ParsedResults) {
              if (result.TextOverlay?.Lines) {
                allOverlayLines.push(...result.TextOverlay.Lines);
              }
            }
            
            console.log(`Chunk ${i} OCR successful, text length: ${chunkText.length}`);
          } else {
            console.warn(`Chunk ${i} OCR failed or empty`);
          }
        }

        console.log(`All chunks processed. Total OCR text length: ${allOcrText.length}`);
      } catch (pdfError) {
        console.error("PDF processing error, falling back to single upload:", pdfError);
        // Fall back to single upload if PDF splitting fails
        const formData = new FormData();
        formData.append("file", fileData, fileName);
        formData.append("filetype", fileExtension.toUpperCase());
        formData.append("language", "ger");
        formData.append("isOverlayRequired", "true");
        formData.append("detectOrientation", "true");
        formData.append("scale", "true");
        formData.append("isTable", "true");
        formData.append("OCREngine", "2");

        const ocrResponse = await fetch("https://apipro1.ocr.space/parse/image", {
          method: "POST",
          headers: {
            apikey: ocrApiKey,
          },
          body: formData,
        });

        const ocrResult = await ocrResponse.json();
        if (ocrResult.ParsedResults?.length > 0) {
          allOcrText = ocrResult.ParsedResults.map((result: any) => result.ParsedText).join("\n\n");
          for (const result of ocrResult.ParsedResults) {
            if (result.TextOverlay?.Lines) {
              allOverlayLines.push(...result.TextOverlay.Lines);
            }
          }
        }
      }
    } else {
      // For images, process normally
      const formData = new FormData();
      formData.append("file", fileData, fileName);
      formData.append("filetype", fileExtension.toUpperCase());
      formData.append("language", "ger");
      formData.append("isOverlayRequired", "true");
      formData.append("detectOrientation", "true");
      formData.append("scale", "true");
      formData.append("isTable", "true");
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

      if (ocrResult.ParsedResults?.length > 0) {
        allOcrText = ocrResult.ParsedResults.map((result: any) => result.ParsedText).join("\n\n");
        for (const result of ocrResult.ParsedResults) {
          if (result.TextOverlay?.Lines) {
            allOverlayLines.push(...result.TextOverlay.Lines);
          }
        }
      }
    }

    // Check if we have any OCR text
    if (allOcrText.trim().length > 0) {
      console.log("Final combined OCR Text length:", allOcrText.length);
      console.log("Overlay lines collected:", allOverlayLines.length);

      // Extract data from tax assessment with confidence scores
      let extractedData: any = {
        user_id: user.id,
        person_type: personType,
        file_path: filePath,
      };

      let confidenceScores: any = {};

      // Try LLM mapping if enabled via UI toggle and API key is configured
      const llmApiKey = Deno.env.get("USE_LLM_MAPPING");
      const shouldUseLLM = useLLM && llmApiKey;
      
      if (!shouldUseLLM) {
        throw new Error("LLM extraction is required but not enabled. Please enable LLM mode in the UI.");
      }
      
      console.log("Using LLM-based extraction...");
      
      const llmResult = await mapWithLLM({
        schema: null, // uses default schema
        ocrText: allOcrText,
        overlayLines: allOverlayLines
      });
      
      extractedData = {
        ...extractedData,
        ...llmResult.data
      };
      
      confidenceScores = llmResult.confidence || {};

      // Add confidence scores to extracted data (applies to both LLM and regex paths)
      if (Object.keys(confidenceScores).length > 0) {
        extractedData.confidence_scores = confidenceScores;
      }

      // Insert into database
      console.log("Attempting database insert with data:", JSON.stringify(extractedData, null, 2));
      const { data: insertedData, error: insertError } = await supabase
        .from("einkommensteuerbescheide")
        .insert(extractedData)
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      console.log("Successfully inserted data with ID:", insertedData.id);

      return new Response(
        JSON.stringify({
          success: true,
          data: insertedData,
          message: "Steuerbescheid erfolgreich extrahiert",
          ocrText: allOcrText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      // No parsed results at all
      console.error("OCR failed - No text extracted from any pages");
      throw new Error("OCR processing failed - no text extracted from document");
    }
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
