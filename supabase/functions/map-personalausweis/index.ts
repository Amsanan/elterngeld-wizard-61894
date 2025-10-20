import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generic upsert helper function
async function upsertRecord(supabase: any, tableName: string, data: any, matchCriteria: any) {
  const { data: existing } = await supabase.from(tableName).select("id").match(matchCriteria).maybeSingle();

  if (existing) {
    const { error } = await supabase.from(tableName).update(data).eq("id", existing.id);
    if (error) {
      console.error(`Error updating ${tableName}:`, error);
    } else {
      console.log(`${tableName} updated successfully`);
    }
    return existing;
  } else {
    const { data: inserted, error } = await supabase.from(tableName).insert(data).select().single();
    if (error) {
      console.error(`Error inserting ${tableName}:`, error);
    } else {
      console.log(`${tableName} inserted successfully`);
    }
    return inserted;
  }
}

// Table field mappings
const TABLE_FIELDS: Record<string, string[]> = {
  elternteil: ["vorname", "nachname", "geburtsdatum", "geschlecht", "steuer_identifikationsnummer"],
  antrag_2c_wohnsitz: ["strasse", "hausnr", "plz", "ort", "adresszusatz", "wohnsitz_ausland"],
};

// Prompt for ID card front page (personal data)
function getPersonalDataPrompt(): string {
  return `Du bist ein Datenextraktionsassistent für deutsche Personalausweise.
Dies ist die VORDERSEITE eines Personalausweises mit persönlichen Daten.

🚨 KRITISCHE ANLEITUNG FÜR NAMEN:

Deutsche Personalausweise haben MEHRERE Namensfelder:
1. Feld (a) "Name" / "Surname" / "Nom" = AKTUELLER NACHNAME (in GROSSBUCHSTABEN)
2. Feld (b) "Geburtsname" / "Name at birth" / "Nom de naissance" = GEBURTSNAME (falls vorhanden, in GROSSBUCHSTABEN)
3. Feld "Vornamen" / "Given names" / "Prénoms" = VORNAMEN (in GROSSBUCHSTABEN)

WICHTIG: 
- Feld (a) enthält den AKTUELLEN Nachnamen → verwende diesen für "nachname"
- Feld (b) enthält den Geburtsnamen (falls abweichend) → IGNORIERE diesen
- Vornamen-Feld enthält alle Vornamen → verwende diese für "vorname"

ELTERNTEIL-TABELLE DATABASE COLUMNS:
- vorname: Vorname(n) aus "Vornamen" / "Given names" / "Prénoms" - formatiere zu Title Case
- nachname: Aktueller Name aus Feld (a) "Name" / "Surname" / "Nom" - formatiere zu Title Case
- geburtsdatum: Format YYYY-MM-DD, aus "Geburtstag" / "Date of birth"
- geschlecht: "weiblich", "maennlich", "divers", oder "ohne_angabe"

AUSGABEFORMAT (NUR JSON, kein weiterer Text):
{
  "mapped_fields": {
    "vorname": "extrahierter Vorname",
    "nachname": "extrahierter Nachname (aus Feld a!)",
    "geburtsdatum": "YYYY-MM-DD",
    "geschlecht": "weiblich/maennlich/divers/ohne_angabe"
  },
  "confidence": 0.XX,
  "suggestions": []
}`;
}

// Prompt for ID card back page (address data)
function getAddressDataPrompt(): string {
  return `Du bist ein Datenextraktionsassistent für deutsche Personalausweise.
Dies ist die RÜCKSEITE eines Personalausweises mit Adressdaten.

🚨 KRITISCHE ANLEITUNG FÜR ADRESSE:

Die Adresse auf deutschen Personalausweisen ist IMMER in diesem Format:
Zeile 1: "Anschrift" / "Address" / "Adresse"
Zeile 2: PLZ ORT (z.B. "13599 BERLIN")
Zeile 3: STRASSE HAUSNUMMER (z.B. "STRAUSSENWEG 6")

ANTRAG_2C_WOHNSITZ-TABELLE DATABASE COLUMNS:
- plz: 5-stellige Postleitzahl (z.B. "13599")
- ort: Stadtname (z.B. "Berlin")
- strasse: Straßenname (z.B. "Straussenweg")
- hausnr: Hausnummer (z.B. "6")

AUSGABEFORMAT (NUR JSON, kein weiterer Text):
{
  "mapped_fields": {
    "plz": "extrahierte PLZ",
    "ort": "extrahierter Ort",
    "strasse": "extrahierte Straße",
    "hausnr": "extrahierte Hausnummer",
    "wohnsitz_ausland": false
  },
  "confidence": 0.XX,
  "suggestions": []
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pages, antragId, parentNumber = 1 } = await req.json();
    console.log("Processing Personalausweis for parent:", parentNumber, "Pages:", pages?.length || 0);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const imagesToProcess = pages || [];

    if (imagesToProcess.length === 0) {
      throw new Error("No pages provided for processing");
    }

    console.log(`Processing ${imagesToProcess.length} page(s) for Personalausweis`);

    // Process each page with appropriate prompt
    const allResults: any[] = [];
    
    for (const page of imagesToProcess) {
      const isFirstPage = page.pageNumber === 1;
      let prompt: string;
      let promptType: string;

      if (imagesToProcess.length > 1) {
        // Multi-page ID card: page 1 = personal data, page 2 = address
        prompt = isFirstPage ? getPersonalDataPrompt() : getAddressDataPrompt();
        promptType = isFirstPage ? 'personal data' : 'address';
      } else {
        // Single page: assume front (personal data)
        prompt = getPersonalDataPrompt();
        promptType = 'personal data';
      }

      console.log(`Processing page ${page.pageNumber} with ${promptType} prompt`);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${page.imageData}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI API error for page ${page.pageNumber}:`, errorText);
        throw new Error(`AI API request failed for page ${page.pageNumber}: ${response.status}`);
      }

      const aiResponse = await response.json();
      console.log(`AI Response for page ${page.pageNumber}:`, JSON.stringify(aiResponse, null, 2));

      const content = aiResponse.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(`No content in AI response for page ${page.pageNumber}`);
      }

      // Extract JSON from markdown code block if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;

      console.log(`Extracted JSON for page ${page.pageNumber}:`, jsonStr);
      const pageData = JSON.parse(jsonStr);
      
      // Log detailed extraction
      if (page.pageNumber === 2) {
        console.log(`Page 2 Address Data:`, JSON.stringify({
          plz: pageData.mapped_fields?.plz,
          ort: pageData.mapped_fields?.ort,
          strasse: pageData.mapped_fields?.strasse,
          hausnr: pageData.mapped_fields?.hausnr,
          wohnsitz_ausland: pageData.mapped_fields?.wohnsitz_ausland
        }, null, 2));
      } else {
        console.log(`Page ${page.pageNumber} Personal Data:`, JSON.stringify({
          vorname: pageData.mapped_fields?.vorname,
          nachname: pageData.mapped_fields?.nachname,
          geburtsdatum: pageData.mapped_fields?.geburtsdatum,
          geschlecht: pageData.mapped_fields?.geschlecht
        }, null, 2));
      }
      
      allResults.push(pageData);
    }

    // Merge results from all pages
    const mergedFields: any = {};
    let totalConfidence = 0;
    const allSuggestions: string[] = [];

    for (const result of allResults) {
      if (result.mapped_fields) {
        Object.assign(mergedFields, result.mapped_fields);
      }
      if (result.confidence) {
        totalConfidence += result.confidence;
      }
      if (result.suggestions) {
        allSuggestions.push(...result.suggestions);
      }
    }

    const finalResult = {
      mapped_fields: mergedFields,
      confidence: allResults.length > 0 ? totalConfidence / allResults.length : 0,
      suggestions: allSuggestions,
    };

    console.log('Merged final result:', JSON.stringify(finalResult, null, 2));

    // Database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mapped_fields } = finalResult;

    // Handle elternteil
    let elternteilId = null;
    const elternteilFields: any = {};
    if (mapped_fields.vorname) elternteilFields.vorname = mapped_fields.vorname;
    if (mapped_fields.nachname) elternteilFields.nachname = mapped_fields.nachname;
    if (mapped_fields.geburtsdatum) elternteilFields.geburtsdatum = mapped_fields.geburtsdatum;
    if (mapped_fields.geschlecht) elternteilFields.geschlecht = mapped_fields.geschlecht;
    if (mapped_fields.steuer_identifikationsnummer) {
      elternteilFields.steuer_identifikationsnummer = mapped_fields.steuer_identifikationsnummer;
    }

    if (Object.keys(elternteilFields).length > 0) {
      elternteilFields.antrag_id = antragId;
      elternteilFields.parent_number = parentNumber;

      const result = await upsertRecord(
        supabase,
        "elternteil",
        elternteilFields,
        { antrag_id: antragId, parent_number: parentNumber }
      );
      elternteilId = result?.id;
    }

    // Handle address data
    const addressFields: any = {
      antrag_id: antragId,
    };

    if (elternteilId) {
      addressFields.elternteil_id = elternteilId;
    }

    const allowedFields = TABLE_FIELDS["antrag_2c_wohnsitz"] || [];
    let hasData = false;
    
    for (const [key, value] of Object.entries(mapped_fields)) {
      if (allowedFields.includes(key) && value !== null && value !== undefined) {
        addressFields[key] = value;
        hasData = true;
      }
    }

    if (hasData) {
      const matchCriteria = elternteilId
        ? { antrag_id: antragId, elternteil_id: elternteilId }
        : { antrag_id: antragId };
      
      await upsertRecord(supabase, "antrag_2c_wohnsitz", addressFields, matchCriteria);
    }

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in map-personalausweis function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
