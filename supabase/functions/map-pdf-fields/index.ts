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

// Document-to-table mapping configuration
const DOCUMENT_TABLE_MAPPING: Record<string, { tables: string[]; requiresParent: boolean }> = {
  geburtsurkunde: { tables: ["kind"], requiresParent: false },
  personalausweis: { tables: ["elternteil", "antrag_2c_wohnsitz"], requiresParent: true },
  gehaltsnachweis: { tables: ["elternteil", "antrag_7a_bisherige_erwerbstaetigkeit"], requiresParent: true },
  krankenversicherung: { tables: ["elternteil", "antrag_5_krankenversicherung"], requiresParent: true },
  adresse: { tables: ["antrag_2c_wohnsitz", "antrag_2c_wohnsitz_aufenthalt"], requiresParent: true },
  versicherungsnachweis: { tables: ["elternteil", "antrag_5_krankenversicherung"], requiresParent: true },
};

// Table field mappings - define which fields belong to each table
const TABLE_FIELDS: Record<string, string[]> = {
  elternteil: ["vorname", "nachname", "geburtsdatum", "geschlecht", "steuer_identifikationsnummer"],
  antrag_2c_wohnsitz: ["strasse", "hausnr", "plz", "ort", "adresszusatz", "wohnsitz_ausland"],
  antrag_2c_wohnsitz_aufenthalt: ["wohnsitz_in_deutschland", "seit_meiner_geburt", "seit_in_deutschland", "seit_datum_deutschland"],
  antrag_5_krankenversicherung: ["gesetzlich_ver", "privat_ver", "krankenkassename", "versichertennummer"],
  antrag_7a_bisherige_erwerbstaetigkeit: ["einkuenfte_nicht_selbststaendig", "selbststaendig_einkuenfte", "keine_einkuenfte"],
  kind: ["vorname", "nachname", "geburtsdatum", "anzahl_mehrlinge", "fruehgeboren", "errechneter_geburtsdatum", "behinderung", "anzahl_weitere_kinder", "keine_weitere_kinder", "insgesamt"]
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

BEISPIEL 1:
Text auf Ausweis:
"(a) Name: MÜLLER
Vornamen: ANNA MARIA"

→ nachname: "Müller"
→ vorname: "Anna Maria"

BEISPIEL 2:
Text auf Ausweis:
"(a) Name: SARUJAN
(b) Geburtsname: BALACHANDRAN
Vornamen: NILANDINI"

→ nachname: "Sarujan" (verwende Feld a, NICHT Feld b!)
→ vorname: "Nilandini"

BEISPIEL 3:
Text auf Ausweis:
"(a) Name: SIVAGANASUNDRAM
Vornamen: SARUJAN"

→ nachname: "Sivaganasundram"
→ vorname: "Sarujan"

⚠️ EXTRAHIERE NUR DIESE DATEN:

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

EXTRAKTIONSSCHRITTE:
1. Finde "Anschrift" / "Address" / "Adresse" auf der Rückseite
2. Zeile darunter: PLZ (erste 5 Ziffern) + ORT (der Rest)
3. Nächste Zeile: STRASSE + HAUSNUMMER (letzte Zahl/Buchstabenkombination)

ANTRAG_2C_WOHNSITZ-TABELLE DATABASE COLUMNS:
- plz: 5-stellige Postleitzahl (z.B. "13599")
- ort: Stadtname (z.B. "Berlin")
- strasse: Straßenname (z.B. "Straussenweg")
- hausnr: Hausnummer (z.B. "6")

BEISPIEL:
Text: "13599 BERLIN\nSTRAUSSENWEG 6"
→ plz: "13599"
→ ort: "Berlin"
→ strasse: "Straussenweg"
→ hausnr: "6"

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

// Prompt for birth certificate (Geburtsurkunde)
function getBirthCertificatePrompt(): string {
  return `Du bist ein Datenextraktionsassistent für deutsche Geburtsurkunden.

🚨 KRITISCHE ANLEITUNG FÜR GEBURTSURKUNDE:

Deutsche Geburtsurkunden enthalten folgende Informationen über das Kind:
- Vorname(n) des Kindes
- Nachname / Familienname des Kindes
- Geburtsdatum
- Geburtsort
- Optional: Angaben zu Mehrlingen oder Frühgeburt

EXTRAKTIONSSCHRITTE:
1. Suche nach "Vorname(n)" oder "Vornamen" für den/die Vornamen
2. Suche nach "Nachname", "Familienname" oder "Name" für den Nachnamen
3. Suche nach "geboren am" oder "Geburtsdatum" für das Datum (Format: DD.MM.YYYY)
4. Suche nach "Geburtsort" oder "in" für den Ort
5. Prüfe auf Hinweise zu Mehrlingen (Zwillinge, Drillinge)

KIND-TABELLE DATABASE COLUMNS:
- vorname: Vorname(n) des Kindes - formatiere zu Title Case
- nachname: Nachname/Familienname des Kindes - formatiere zu Title Case
- geburtsdatum: Format YYYY-MM-DD
- anzahl_mehrlinge: Anzahl bei Mehrlingen (2 für Zwillinge, 3 für Drillinge, etc.)
- fruehgeboren: true wenn Frühgeburt erwähnt wird

BEISPIEL:
Text: "Vorname: ANNA MARIA\nNachname: SCHMIDT\ngeboren am 15.03.2024\nin Berlin"

→ vorname: "Anna Maria"
→ nachname: "Schmidt"
→ geburtsdatum: "2024-03-15"

AUSGABEFORMAT (NUR JSON, kein weiterer Text):
{
  "mapped_fields": {
    "vorname": "extrahierter Vorname",
    "nachname": "extrahierter Nachname",
    "geburtsdatum": "YYYY-MM-DD",
    "anzahl_mehrlinge": null,
    "fruehgeboren": false
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
    const { pages, documentType, antragId, parentNumber = 1 } = await req.json();
    console.log("Processing document type:", documentType, "Pages:", pages?.length || 0);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    // pages is an array of {imageData: base64string, pageNumber: number}
    const imagesToProcess = pages || [];

    if (imagesToProcess.length === 0) {
      throw new Error("No pages provided for processing");
    }

    console.log(`Processing ${imagesToProcess.length} page(s)`);

    // Process each page with appropriate prompt
    const allResults: any[] = [];
    
    for (const page of imagesToProcess) {
      const isFirstPage = page.pageNumber === 1;
      let prompt: string;
      let promptType: string;

      // Select prompt based on document type
      if (documentType === "personalausweis") {
        if (imagesToProcess.length > 1) {
          // Multi-page ID card: page 1 = personal data, page 2 = address
          prompt = isFirstPage ? getPersonalDataPrompt() : getAddressDataPrompt();
          promptType = isFirstPage ? 'personal data' : 'address';
        } else {
          // Single page: assume front (personal data)
          prompt = getPersonalDataPrompt();
          promptType = 'personal data';
        }
      } else if (documentType === "geburtsurkunde") {
        prompt = getBirthCertificatePrompt();
        promptType = 'birth certificate';
      } else {
        // Default fallback
        prompt = getPersonalDataPrompt();
        promptType = 'default personal data';
      }

      console.log(`Processing ${documentType} page ${page.pageNumber} with ${promptType} prompt`);

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
      
      // Log detailed extraction based on document type
      if (documentType === "personalausweis") {
        if (page.pageNumber === 2) {
          console.log(`Page 2 (Personalausweis) Address Data:`, JSON.stringify({
            plz: pageData.mapped_fields?.plz,
            ort: pageData.mapped_fields?.ort,
            strasse: pageData.mapped_fields?.strasse,
            hausnr: pageData.mapped_fields?.hausnr,
            wohnsitz_ausland: pageData.mapped_fields?.wohnsitz_ausland
          }, null, 2));
        } else {
          console.log(`Page ${page.pageNumber} (Personalausweis) Personal Data:`, JSON.stringify({
            vorname: pageData.mapped_fields?.vorname,
            nachname: pageData.mapped_fields?.nachname,
            geburtsdatum: pageData.mapped_fields?.geburtsdatum,
            geschlecht: pageData.mapped_fields?.geschlecht
          }, null, 2));
        }
      } else if (documentType === "geburtsurkunde") {
        console.log(`Page ${page.pageNumber} (Geburtsurkunde) Child Data:`, JSON.stringify({
          vorname: pageData.mapped_fields?.vorname,
          nachname: pageData.mapped_fields?.nachname,
          geburtsdatum: pageData.mapped_fields?.geburtsdatum,
          anzahl_mehrlinge: pageData.mapped_fields?.anzahl_mehrlinge,
          fruehgeboren: pageData.mapped_fields?.fruehgeboren
        }, null, 2));
      } else {
        console.log(`Page ${page.pageNumber} (${documentType}) Extracted Data:`, JSON.stringify(pageData.mapped_fields, null, 2));
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
    const tablesConfig = DOCUMENT_TABLE_MAPPING[documentType];

    if (!tablesConfig) {
      console.warn(`No table mapping for document type: ${documentType}`);
      return new Response(JSON.stringify(finalResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle elternteil if needed
    let elternteilId = null;
    if (tablesConfig.requiresParent && tablesConfig.tables.includes("elternteil")) {
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
    }

    // Handle other tables
    for (const tableName of tablesConfig.tables) {
      if (tableName === "elternteil") continue; // Already handled

      const tableData: any = {
        antrag_id: antragId,
      };

      if (elternteilId && (tableName === "antrag_2c_wohnsitz" || tableName === "antrag_5_krankenversicherung" 
          || tableName === "antrag_7a_bisherige_erwerbstaetigkeit")) {
        tableData.elternteil_id = elternteilId;
      }

      // Only map fields that belong to this specific table
      const allowedFields = TABLE_FIELDS[tableName] || [];
      let hasData = false;
      
      for (const [key, value] of Object.entries(mapped_fields)) {
        if (allowedFields.includes(key) && value !== null && value !== undefined) {
          tableData[key] = value;
          hasData = true;
        }
      }

      if (hasData) {
        // For antrag_2c_wohnsitz, use elternteil_id as match criteria if available
        const matchCriteria = (tableName === "antrag_2c_wohnsitz" && elternteilId)
          ? { antrag_id: antragId, elternteil_id: elternteilId }
          : { antrag_id: antragId };
        
        await upsertRecord(supabase, tableName, tableData, matchCriteria);
      }
    }

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in map-pdf-fields function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
