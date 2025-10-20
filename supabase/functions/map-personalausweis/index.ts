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
  elternteil: ["vorname", "nachname", "geburtsname", "geburtsdatum", "geschlecht", "steuer_identifikationsnummer"],
  antrag_2c_wohnsitz: ["strasse", "hausnr", "plz", "ort", "adresszusatz", "wohnsitz_ausland"],
};

// Unified prompt for both front and back pages
function getUnifiedPrompt(): string {
  return `Du bist ein hochpräziser Datenextraktionsassistent für deutsche Personalausweise (ID-Karten).
Analysiere das Bild und bestimme, ob es die **VORDERSEITE (Personendaten)** oder die **RÜCKSEITE (Adressdaten)** ist. 
Extrahiere anschließend nur die jeweils relevanten Felder gemäß den folgenden Regeln.

---

## 🚫 IGNORIERE IMMER (nicht extrahieren, nicht erwähnen):
- Lichtbild / Foto
- Dokumentennummer
- Zugangsnummer (CAN)
- Unterschrift
- Augenfarbe
- Körpergröße
- Ausstellende Behörde
- Doktorgrad / Ordens- oder Künstlername
- Logo des Online-Ausweises
- Maschinenlesbare Zone (MRZ)

---

## 🧭 SEITEN-ERKENNUNG

Erkenne die Seite anhand typischer Merkmale:

### **Vorderseite (Personendaten)**
- Enthält Felder wie „Name", „Geburtsname", „Vornamen", „Geburtsdatum", „Geburtsort", „Staatsangehörigkeit", „Gültig bis".
- Kein „Anschrift"-, „PLZ"-, oder „Ort"-Label vorhanden.

### **Rückseite (Adressdaten)**
- Enthält Text wie „Anschrift", „Adresse", „Address".
- Zeilen mit PLZ + Ort (z. B. „13599 BERLIN").
- Zeile mit Straße + Hausnummer (z. B. „STRAUSSENWEG 6").

Setze das Feld:
- \`"page_side": "front"\` → Vorderseite
- \`"page_side": "back"\` → Rückseite

Wenn unklar → \`"page_side": "unknown"\` und alle Felder auf \`null\`.

---

## ✅ EXTRAKTION FÜR VORDERSEITE (\`page_side = "front"\`)

Extrahiere folgende Felder:

- **nachname** → Feld (a) „Name" / „Surname" / „Nom" (aktueller Familienname)
- **geburtsname** → **WICHTIG:** Feld (b) „Geburtsname" / „Name at birth" / „Nom de naissance". Auf deutschen Personalausweisen ist dies immer mit [b] markiert und steht unter dem Nachname [a]. **MUSS IMMER EXTRAHIERT WERDEN, auch wenn es dem Nachnamen ähnelt.**
- **vorname** → Feld „Vornamen" / „Given names" / „Prénoms"
- **geburtsdatum** → Feld „Geburtsdatum" / „Date of birth" (Format \`YYYY-MM-DD\`)
- **geburtsort** → Feld „Geburtsort" / „Place of birth"
- **staatsangehoerigkeit** → Feld „Staatsangehörigkeit" / „Nationality"
- **geschlecht** → Feld „Geschlecht" / „Sex" (Werte: \`maennlich\`, \`weiblich\`, \`divers\`, \`ohne_angabe\`)
- **ausstellungsdatum** → Feld „Ausgestellt am" / „Date of issue" (Format \`YYYY-MM-DD\`)
- **gueltig_bis** → Feld „Gültig bis" / „Date of expiry" (Format \`YYYY-MM-DD\`)

### Formatierungsregeln für Namen:
1. **Title Case** (z. B. "Anna-Lena", "Müller-Lüdenscheid").
2. Mehrere **Vornamen** → getrennt durch \`, \` → \`"Anna, Lena, Marie"\`.
3. Mehrere **Nachnamen**:
   - Mit Bindestrich: unverändert → \`"Meier-Schmidt"\`.
   - Mit Leerzeichen: trenne mit \`, \` → \`"Meier, Schmidt"\`.
4. **KRITISCH:** Suche explizit nach dem Feld mit [b] Marker für den Geburtsnamen. Falls **Geburtsname = Nachname**, setze \`geburtsname\` trotzdem auf den gefundenen Wert (nicht null).

---

## ✅ EXTRAKTION FÜR RÜCKSEITE (\`page_side = "back"\`)

Extrahiere nur Adressdaten:

- **plz** → 5-stellige Postleitzahl (\`"13599"\`)
- **ort** → Stadtname (\`"Berlin"\`)
- **strasse** → Straßenname (\`"Straussenweg"\`)
- **hausnr** → Hausnummer inkl. Zusätzen (\`"12a"\`, \`"12-14"\`, \`"12/2"\`)
- **adresszusatz** → optional (z. B. \`"c/o Meyer"\`, \`"Aufgang B"\`)
- **wohnsitz_ausland** → \`true\` falls keine gültige deutsche PLZ erkannt oder ein anderes Land genannt wird; sonst \`false\`.

### Formatierung:
- \`strasse\`, \`ort\`: Title Case (erhalte Umlaute korrekt: ÄÖÜäöüß).
- Entferne Label-Wörter wie „Anschrift", „Adresse".
- PLZ muss genau 5 Ziffern haben, sonst → \`null\` + \`wohnsitz_ausland=true\`.
- Fehlende Felder → \`null\`.

---

## ⚙️ AUSGABEFORMAT (NUR JSON, KEIN WEITERER TEXT)

{
  "page_side": "front" | "back" | "unknown",
  "mapped_fields": {
    "nachname": "",
    "geburtsname": "",
    "vorname": "",
    "geburtsdatum": "",
    "geburtsort": "",
    "staatsangehoerigkeit": "",
    "geschlecht": "",
    "ausstellungsdatum": "",
    "gueltig_bis": "",
    "plz": "",
    "ort": "",
    "strasse": "",
    "hausnr": "",
    "adresszusatz": "",
    "wohnsitz_ausland": false
  },
  "confidence": 0.0,
  "reason": "kurze Erklärung der Entscheidung (z. B. 'Anschrift-Zeile erkannt')",
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

    // Process each page with unified prompt
    const allResults: any[] = [];
    
    for (const page of imagesToProcess) {
      const prompt = getUnifiedPrompt();
      console.log(`Processing page ${page.pageNumber} with unified prompt`);

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
      
      // Log detailed extraction with page side info
      console.log(`Page ${page.pageNumber} detected as: ${pageData.page_side}`);
      console.log(`Reason: ${pageData.reason}`);
      
      if (pageData.page_side === 'back') {
        console.log(`Address Data:`, JSON.stringify({
          plz: pageData.mapped_fields?.plz,
          ort: pageData.mapped_fields?.ort,
          strasse: pageData.mapped_fields?.strasse,
          hausnr: pageData.mapped_fields?.hausnr,
          adresszusatz: pageData.mapped_fields?.adresszusatz,
          wohnsitz_ausland: pageData.mapped_fields?.wohnsitz_ausland
        }, null, 2));
      } else if (pageData.page_side === 'front') {
        console.log(`Personal Data:`, JSON.stringify({
          vorname: pageData.mapped_fields?.vorname,
          nachname: pageData.mapped_fields?.nachname,
          geburtsname: pageData.mapped_fields?.geburtsname,
          geburtsdatum: pageData.mapped_fields?.geburtsdatum,
          geburtsort: pageData.mapped_fields?.geburtsort,
          staatsangehoerigkeit: pageData.mapped_fields?.staatsangehoerigkeit,
          geschlecht: pageData.mapped_fields?.geschlecht,
          ausstellungsdatum: pageData.mapped_fields?.ausstellungsdatum,
          gueltig_bis: pageData.mapped_fields?.gueltig_bis
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
    if (mapped_fields.geburtsname) elternteilFields.geburtsname = mapped_fields.geburtsname;
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
