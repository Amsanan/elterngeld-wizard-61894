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
      
      console.log(shouldUseLLM ? "Using LLM-based extraction..." : "Using regex-based extraction...");
      
      if (shouldUseLLM) {
        try {
          console.log("Attempting LLM-based extraction...");
          const llmResult = await mapWithLLM({
            schema: null, // uses default schema
            ocrText: allOcrText,
            overlayLines: allOverlayLines
          });
          
          extractedData = {
            ...extractedData,
            ...llmResult.data,
            llm_confidence: llmResult.confidence,
            llm_provenance: llmResult.provenance
          };
          
          confidenceScores = llmResult.confidence || {};
          
          console.log("LLM extraction successful:", Object.keys(llmResult.data).length, "fields extracted");
        } catch (llmError) {
          console.error("LLM extraction failed, falling back to regex:", llmError);
          // Continue to fallback logic below
        }
      }
      
      // Fallback: Use regex/overlay extraction if LLM disabled or failed
      if (!shouldUseLLM || Object.keys(extractedData).length <= 3) {
        console.log("Using regex-based extraction...");
        confidenceScores = {};

      // Helper function to calculate confidence score
      const calculateConfidence = (match: RegExpMatchArray | null, fieldName: string, isNumeric = false): number => {
        if (!match) return 0;

        let score = 0;

        // Base score for finding a match
        score += 40;

        // Score for match quality
        const matchedText = match[1];
        if (matchedText && matchedText.trim().length > 0) {
          score += 20;

          // For numeric fields, check format validity
          if (isNumeric) {
            const hasValidFormat = /^[0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?$/.test(matchedText);
            if (hasValidFormat) score += 20;
            else score += 10;
          } else {
            // For text fields, longer matches with proper capitalization are more confident
            if (matchedText.length > 3) score += 10;
            if (/^[A-ZÄÖÜ]/.test(matchedText)) score += 10;
          }
        }

        // Score for match context (the part before the captured group)
        const fullMatch = match[0];
        if (fullMatch.includes(":") || fullMatch.includes("€")) score += 10;

        // Reduce score if match contains suspicious patterns
        if (matchedText && /\d{2}\.\d{2}\.\d{4}/.test(matchedText) && isNumeric) {
          // Looks like a date was matched instead of a number
          score -= 30;
        }

        return Math.max(0, Math.min(100, score));
      };

      // Extract Steuerjahr (tax year)
      const steuerjahrMatch = allOcrText.match(/(?:Veranlagungszeitraum|Steuerjahr|für)\s+(\d{4})/i);
      if (steuerjahrMatch) {
        extractedData.steuerjahr = steuerjahrMatch[1];
        confidenceScores.steuerjahr = calculateConfidence(steuerjahrMatch, "steuerjahr");
      }

      // Extract Steuernummer
      const steuernummerMatch = allOcrText.match(
        /(?:Steuernummer|St[.-]Nr\.?)[:\s]+(\d{2,3}\/\d{3,4}\/\d{4,5}|\d{10,13})/i,
      );
      if (steuernummerMatch) {
        extractedData.steuernummer = steuernummerMatch[1];
        confidenceScores.steuernummer = calculateConfidence(steuernummerMatch, "steuernummer");
      }

      // Extract Steuer-IdNr (Tax ID number)
      const idNrMatch = allOcrText.match(
        /IdNr\.?\s+(?:Ehemann|Ehefrau|Steuerpflichtige)?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i,
      );
      if (idNrMatch) {
        extractedData.steuer_id_nummer = idNrMatch[1].replace(/\s/g, "");
        confidenceScores.steuer_id_nummer = calculateConfidence(idNrMatch, "steuer_id_nummer");
      }

      // Extract Finanzamt (tax office)
      const finanzamtMatch = allOcrText.match(/Finanzamt\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?:\n|\d{5})/i);
      if (finanzamtMatch) {
        extractedData.finanzamt_name = finanzamtMatch[1].trim();
        confidenceScores.finanzamt_name = calculateConfidence(finanzamtMatch, "finanzamt_name");
      }

      // Extract Finanzamt address - look for street name and number
      const finanzamtAdresseMatch = allOcrText.match(
        /Finanzamt\s+[^\n]+\n\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß]+(?:allee|straße|str\.|weg|platz)[^\n]*?\d+)/i,
      );
      if (finanzamtAdresseMatch) {
        extractedData.finanzamt_adresse = finanzamtAdresseMatch[1].trim();
        confidenceScores.finanzamt_adresse = calculateConfidence(finanzamtAdresseMatch, "finanzamt_adresse");
      }

      // Extract Bescheiddatum (date of assessment)
      const bescheiddatumMatch = allOcrText.match(/(?:vom|Bescheid für \d{4}.*?vom)\s+(\d{2}\.\d{2}\.\d{4})/i);
      if (bescheiddatumMatch) {
        const [day, month, year] = bescheiddatumMatch[1].split(".");
        extractedData.bescheiddatum = `${year}-${month}-${day}`;
        confidenceScores.bescheiddatum = calculateConfidence(bescheiddatumMatch, "bescheiddatum");
      }

      // Extract name
      const nachnameMatch = allOcrText.match(
        /(?:Name|Nachname|Steuerpflichtige(?:r)?)[:\s]+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?:\n|,)/i,
      );
      if (nachnameMatch) {
        extractedData.nachname = nachnameMatch[1].trim();
        confidenceScores.nachname = calculateConfidence(nachnameMatch, "nachname");
      }

      const vornameMatch = allOcrText.match(/(?:Vorname)[:\s]+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?:\n|,)/i);
      if (vornameMatch) {
        extractedData.vorname = vornameMatch[1].trim();
        confidenceScores.vorname = calculateConfidence(vornameMatch, "vorname");
      }

      // Extract address
      const plzWohnortMatch = allOcrText.match(/(\d{5})\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?:\n)/i);
      if (plzWohnortMatch) {
        extractedData.plz = plzWohnortMatch[1];
        extractedData.wohnort = plzWohnortMatch[2].trim();
        confidenceScores.plz = calculateConfidence(plzWohnortMatch, "plz");
        confidenceScores.wohnort = calculateConfidence(plzWohnortMatch, "wohnort");
      }

      // Extract financial amounts with confidence
      const gesamtbetragMatch = allOcrText.match(/Gesamtbetrag der Einkünfte[^\d]*?([0-9.,]+)/i);
      if (gesamtbetragMatch) {
        extractedData.gesamtbetrag_der_einkuenfte = gesamtbetragMatch[1].replace(/\./g, "").replace(",", ".");
        confidenceScores.gesamtbetrag_der_einkuenfte = calculateConfidence(
          gesamtbetragMatch,
          "gesamtbetrag_der_einkuenfte",
          true,
        );
      }

      const summeEinkuenfteMatch = allOcrText.match(/Summe der Einkünfte[^\d]*?([0-9.,]+)/i);
      if (summeEinkuenfteMatch) {
        extractedData.summe_der_einkuenfte = summeEinkuenfteMatch[1].replace(/\./g, "").replace(",", ".");
        confidenceScores.summe_der_einkuenfte = calculateConfidence(summeEinkuenfteMatch, "summe_der_einkuenfte", true);
      }

      const zvEMatch = allOcrText.match(/zu versteuerndes Einkommen[^\d]*?([0-9.,]+)/i);
      if (zvEMatch) {
        extractedData.zu_versteuerndes_einkommen = zvEMatch[1].replace(/\./g, "").replace(",", ".");
        confidenceScores.zu_versteuerndes_einkommen = calculateConfidence(zvEMatch, "zu_versteuerndes_einkommen", true);
      }

      const steuerMatch = allOcrText.match(
        /(?:festzusetzende|Festgesetzt werden)\s+(?:Einkommensteuer)[^\d]*?€?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/i,
      );
      if (steuerMatch) {
        extractedData.festgesetzte_steuer = steuerMatch[1].replace(/\./g, "").replace(",", ".");
        confidenceScores.festgesetzte_steuer = calculateConfidence(steuerMatch, "festgesetzte_steuer", true);
      }

      const soliMatch = allOcrText.match(/Solidaritätszuschlag[^\d]*?€?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/i);
      if (soliMatch) {
        extractedData.solidaritaetszuschlag = soliMatch[1].replace(/\./g, "").replace(",", ".");
        confidenceScores.solidaritaetszuschlag = calculateConfidence(soliMatch, "solidaritaetszuschlag", true);
      }

      const steuerabzugMatch = allOcrText.match(
        /(?:ab\s+)?Steuerabzug vom Lohn[^\d]*?€?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/i,
      );
      if (steuerabzugMatch) {
        extractedData.steuerabzug_vom_lohn = steuerabzugMatch[1].replace(/\./g, "").replace(",", ".");
        confidenceScores.steuerabzug_vom_lohn = calculateConfidence(steuerabzugMatch, "steuerabzug_vom_lohn", true);
      }

      const verbleibendeMatch = allOcrText.match(
        /verbleibende Steuer[^\d]*?€?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/i,
      );
      if (verbleibendeMatch) {
        extractedData.verbleibende_steuer = verbleibendeMatch[1].replace(/\./g, "").replace(",", ".");
        confidenceScores.verbleibende_steuer = calculateConfidence(verbleibendeMatch, "verbleibende_steuer", true);
      }

      const selbstaendigMatch = allOcrText.match(/Einkünfte aus selbständiger Arbeit[^\d]*?([0-9.,]+)/i);
      if (selbstaendigMatch) {
        extractedData.einkuenfte_selbstaendig = selbstaendigMatch[1].replace(/\./g, "").replace(",", ".");
        confidenceScores.einkuenfte_selbstaendig = calculateConfidence(
          selbstaendigMatch,
          "einkuenfte_selbstaendig",
          true,
        );
      }

      const bruttoMatch = allOcrText.match(/Bruttoarbeitslohn[^\d]*?([0-9]{2,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/i);
      if (bruttoMatch) {
        extractedData.bruttoarbeitslohn = bruttoMatch[1].replace(/\./g, "").replace(",", ".");
        extractedData.einkuenfte_nichtselbstaendig = bruttoMatch[1].replace(/\./g, "").replace(",", ".");
        const conf = calculateConfidence(bruttoMatch, "bruttoarbeitslohn", true);
        confidenceScores.bruttoarbeitslohn = conf;
        confidenceScores.einkuenfte_nichtselbstaendig = conf;
      }

      const werbungskostenMatch = allOcrText.match(
        /(?:ab\s+)?Werbungskosten[^\d]*?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/i,
      );
      if (werbungskostenMatch) {
        extractedData.werbungskosten = werbungskostenMatch[1].replace(/\./g, "").replace(",", ".");
        confidenceScores.werbungskosten = calculateConfidence(werbungskostenMatch, "werbungskosten", true);
      }

      // Check for gemeinsame Veranlagung (joint assessment)
      if (allOcrText.match(/(?:Ehemann|Ehefrau|Splittingtarif)/i)) {
        extractedData.gemeinsame_veranlagung = true;
        confidenceScores.gemeinsame_veranlagung = 90; // High confidence if pattern found
      }
      } // End of regex fallback block

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
