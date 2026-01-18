import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { LLM_CONFIG, getRetryDelay } from '../_shared/llm-config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Document type configurations with specific extraction schemas
const DOKUMENT_TYPE_SCHEMAS: Record<string, { label: string; fields: string[] }> = {
  aerztliches_attest: {
    label: "Ärztliches Attest",
    fields: ["arzt_name", "arzt_adresse", "patient_name", "diagnose", "ausstelldatum", "gueltig_bis", "beschreibung"]
  },
  hebammenzeugnis: {
    label: "Hebammenzeugnis / Zeugnis errechneter Termin",
    fields: ["hebamme_name", "errechneter_termin", "ausstelldatum", "patient_name", "beschreibung"]
  },
  schwerbehindertenausweis: {
    label: "Schwerbehindertenausweis",
    fields: ["inhaber_name", "gdb_grad", "merkzeichen", "gueltig_ab", "gueltig_bis", "ausstellende_behoerde"]
  },
  sterbeurkunde: {
    label: "Sterbeurkunde",
    fields: ["verstorbener_name", "sterbedatum", "sterbeort", "standesamt", "urkundennummer", "ausstelldatum"]
  },
  haftbescheinigung: {
    label: "Haftbescheinigung",
    fields: ["inhaftierter_name", "anstalt_name", "haftbeginn", "haftende", "ausstelldatum"]
  },
  elstam_auszug: {
    label: "ELStAM-Auszug",
    fields: ["name", "steuer_id", "steuerklasse", "kinderfreibetraege", "gueltig_ab", "ausstelldatum"]
  },
  kindergeldbescheid: {
    label: "Kindergeldbescheid",
    fields: ["empfaenger_name", "kinder_namen", "monatsbetrag", "bewilligungszeitraum_von", "bewilligungszeitraum_bis", "familienkasse", "bescheiddatum"]
  },
  rentenbescheid: {
    label: "Rentenbescheid",
    fields: ["empfaenger_name", "rentenart", "monatsbetrag", "rentenbeginn", "versicherungsnummer", "bescheiddatum"]
  },
  elterngeldbescheid_aelteres_kind: {
    label: "Elterngeldbescheid (älteres Kind)",
    fields: ["empfaenger_name", "kind_name", "monatsbetrag", "bezugszeitraum_von", "bezugszeitraum_bis", "elterngeldstelle", "bescheiddatum"]
  },
  beschaeftigungsverbot: {
    label: "Beschäftigungsverbot",
    fields: ["arbeitnehmer_name", "arbeitgeber_name", "verbot_beginn", "verbot_ende", "grund", "ausstelldatum", "aussteller"]
  },
  entsendungsbescheinigung: {
    label: "Entsendungsbescheinigung",
    fields: ["arbeitnehmer_name", "arbeitgeber_name", "entsendungsland", "entsendung_von", "entsendung_bis", "ausstelldatum"]
  },
  vaterschaftsanerkennung: {
    label: "Vaterschaftsanerkennung",
    fields: ["vater_name", "kind_name", "kind_geburtsdatum", "mutter_name", "anerkennungsdatum", "standesamt", "urkundennummer"]
  },
  einnahmen_ueberschuss_rechnung: {
    label: "Einnahmen-Überschuss-Rechnung (EÜR)",
    fields: ["steuerpflichtiger_name", "zeitraum_von", "zeitraum_bis", "einnahmen_gesamt", "ausgaben_gesamt", "gewinn", "steuernummer"]
  },
  krankentagegeld_bescheinigung: {
    label: "Krankentagegeld-Bescheinigung",
    fields: ["versicherter_name", "versicherung_name", "tagessatz", "bezug_von", "bezug_bis", "bescheiddatum"]
  },
  arbeitsvertrag: {
    label: "Arbeitsvertrag",
    fields: ["arbeitnehmer_name", "arbeitgeber_name", "vertragsbeginn", "befristet_bis", "woechentliche_arbeitszeit", "bruttogehalt", "taetigkeit"]
  },
  ausbildungsvertrag: {
    label: "Ausbildungsvertrag",
    fields: ["auszubildender_name", "ausbildungsbetrieb", "ausbildungsberuf", "ausbildungsbeginn", "ausbildungsende", "verguetung"]
  },
  bezuegemitteilung_beamte: {
    label: "Bezügemitteilung (Beamte/Soldaten)",
    fields: ["beamter_name", "dienstherr", "besoldungsgruppe", "bruttobeträge", "nettobeträge", "abrechnungsmonat"]
  },
  tagespflege_eignung: {
    label: "Eignungsnachweis Tagespflege",
    fields: ["pflegeperson_name", "jugendamt", "eignung_festgestellt_am", "gueltig_bis", "beschreibung"]
  },
  leistungsnachweis_ausland: {
    label: "Leistungsnachweis aus dem Ausland",
    fields: ["empfaenger_name", "leistungsart", "land", "betrag", "waehrung", "bezugszeitraum", "ausstelldatum"]
  },
  vertretungsnachweis: {
    label: "Vertretungsnachweis (Betreuer/Vormund)",
    fields: ["vertreter_name", "vertretene_person", "vertretungsart", "gericht", "aktenzeichen", "bestellungsdatum", "gueltig_bis"]
  },
  feststellungsbeschluss_familiengericht: {
    label: "Feststellungsbeschluss Familiengericht",
    fields: ["kind_name", "adoptierter_name", "adoptiveltern", "gericht", "aktenzeichen", "beschlussdatum", "rechtskraft_datum"]
  },
  sonstige: {
    label: "Sonstiges Dokument",
    fields: ["titel", "aussteller", "ausstelldatum", "gueltig_bis", "betrag", "beschreibung"]
  }
};

async function extractWithLLM(ocrText: string, dokumentTyp: string): Promise<{ data: Record<string, any>; confidence: Record<string, number> }> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  if (!apiKey) throw new Error("USE_LLM_MAPPING not configured");

  const schema = DOKUMENT_TYPE_SCHEMAS[dokumentTyp] || DOKUMENT_TYPE_SCHEMAS.sonstige;
  
  const systemPrompt = `You are a specialized German document data extractor for "${schema.label}".

CRITICAL RULES:
1. Extract ONLY explicitly present information from the OCR text
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD"
3. Numbers: Use dot as decimal separator (e.g., 1234.56)
4. Return ONLY valid JSON - no markdown, no explanation
5. If a field is not found, omit it entirely

Expected fields for this document type:
${schema.fields.map(f => `- ${f}`).join('\n')}

Output format:
{
  "data": { <extracted fields as key-value pairs> },
  "confidence": { <field_name>: <0-100 confidence score> }
}`;

  let response;
  for (let i = 0; i <= LLM_CONFIG.maxRetries; i++) {
    try {
      if (i > 0) await new Promise(r => setTimeout(r, getRetryDelay(i)));
      response = await fetch(LLM_CONFIG.apiEndpoint, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${apiKey}`, 
          "Content-Type": "application/json", 
          "HTTP-Referer": "https://lovable.dev" 
        },
        body: JSON.stringify({
          model: LLM_CONFIG.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Extract data from this OCR text:\n\n${ocrText}` },
          ],
          temperature: LLM_CONFIG.temperature,
        }),
      });
      if (response.ok) break;
      if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
    } catch (e: any) {
      console.error(`LLM attempt ${i + 1} failed:`, e.message);
      if (i === LLM_CONFIG.maxRetries) throw new Error(`API failed after ${LLM_CONFIG.maxRetries} retries`);
    }
  }

  if (!response || !response.ok) {
    console.error("LLM API error:", await response?.text());
    throw new Error(`LLM API error: ${response?.status}`);
  }
  
  const responseJson = await response.json();
  const content = responseJson.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in LLM response");

  // Parse JSON from response
  let json = content.trim();
  const m1 = json.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (m1) json = m1[1].trim();
  const m2 = json.match(/\{[\s\S]*\}/);
  if (m2 && !json.startsWith('{')) json = m2[0];

  const parsed = JSON.parse(json);
  if (!parsed.data) throw new Error("Missing 'data' in LLM response");

  console.log("LLM extraction result:", JSON.stringify(parsed, null, 2));
  return { data: parsed.data, confidence: parsed.confidence || {} };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ocrApiKey = Deno.env.get("OCR_SPACE_API_KEY2")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    const { data: { user } } = authHeader
      ? await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
      : { data: { user: null } };

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { filePath, dokumentTyp, personType } = await req.json();

    if (!filePath || !dokumentTyp) {
      return new Response(JSON.stringify({ error: "Missing required fields: filePath, dokumentTyp" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${dokumentTyp} for ${personType || 'unknown'}, file: ${filePath}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("application-documents")
      .download(filePath);

    if (downloadError) {
      console.error("Download error:", downloadError);
      throw downloadError;
    }

    // OCR processing
    const fileName = filePath.split("/").pop() || "document.pdf";
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "pdf";

    const formData = new FormData();
    formData.append("file", fileData, fileName);
    formData.append("filetype", fileExtension.toUpperCase());
    formData.append("language", "ger");
    formData.append("isOverlayRequired", "true");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    const ocrResponse = await fetch("https://apipro1.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: ocrApiKey },
      body: formData,
    });

    const ocrResult = await ocrResponse.json();
    console.log("OCR completed, IsErrored:", ocrResult.IsErroredOnProcessing);

    if (!ocrResult.ParsedResults?.length || ocrResult.IsErroredOnProcessing) {
      throw new Error("OCR processing failed");
    }

    const ocrText = ocrResult.ParsedResults.map((result: any) => result.ParsedText).join("\n\n");
    console.log("OCR Text length:", ocrText.length);

    // LLM extraction
    const llmResult = await extractWithLLM(ocrText, dokumentTyp);

    // Build record for insertion
    const insertData: Record<string, any> = {
      user_id: user.id,
      dokument_typ: dokumentTyp,
      file_path: filePath,
      extracted_data: llmResult.data,
      confidence_scores: llmResult.confidence,
    };

    // Map common fields if extracted
    if (llmResult.data.ausstelldatum) insertData.ausstelldatum = llmResult.data.ausstelldatum;
    if (llmResult.data.gueltig_von) insertData.gueltig_von = llmResult.data.gueltig_von;
    if (llmResult.data.gueltig_bis) insertData.gueltig_bis = llmResult.data.gueltig_bis;
    if (llmResult.data.aussteller) insertData.aussteller = llmResult.data.aussteller;
    if (llmResult.data.betrag) insertData.betrag = parseFloat(llmResult.data.betrag);
    if (llmResult.data.beschreibung) insertData.beschreibung = llmResult.data.beschreibung;
    if (personType) insertData.person_type = personType;

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from("sonstige_nachweise")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log("Successfully inserted sonstige_nachweise:", insertedData.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedData,
        message: `${DOKUMENT_TYPE_SCHEMAS[dokumentTyp]?.label || 'Dokument'} erfolgreich extrahiert`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
