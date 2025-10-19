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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, mimeType, documentType, antragId, parentNumber = 1 } = await req.json();

    console.log("Processing image for document type:", documentType, "MIME:", mimeType);

    // Document-specific mapping instructions
    const getDocumentMappingInstructions = (docType: string) => {
      switch (docType) {
        case "geburtsurkunde":
          return `
⚠️ CRITICAL: Geburtsurkunde (Birth Certificate) → NUR KIND-TABELLE!
Geburtsurkunden enthalten KEINE Informationen über Eltern, Adressen oder andere Daten.
Extrahiere NUR Daten für die KIND-TABELLE:

KIND-TABELLE - DATABASE COLUMN NAMES:
- vorname (Kind Vorname, z.B. "Max")
- nachname (Kind Nachname, z.B. "Müller")
- geburtsdatum (Geburtsdatum, Format: YYYY-MM-DD, z.B. "2024-01-15")
- anzahl_mehrlinge (Anzahl Mehrlinge/Zwillinge, INTEGER, z.B. 2)
- fruehgeboren (Frühgeboren, BOOLEAN: true/false)
- errechneter_geburtsdatum (Errechnetes Geburtsdatum bei Frühgeburt, Format: YYYY-MM-DD)
- behinderung (Behinderung, BOOLEAN: true/false)
- anzahl_weitere_kinder (Anzahl weitere Kinder im Haushalt, INTEGER)
- keine_weitere_kinder (Keine weiteren Kinder, BOOLEAN: true/false)
- insgesamt (Gesamtzahl Kinder, BOOLEAN: true/false)`;

        case "personalausweis":
          return `
⚠️ PERSONALAUSWEIS (ID Card) → EXTRAHIERE ALLE SICHTBAREN DATEN!
Ein Personalausweis hat VORDER- und RÜCKSEITE mit verschiedenen Informationen:
- VORDERSEITE: Name, Geburtsdatum, Geschlecht, Augenfarbe, Größe, Foto
- RÜCKSEITE: ADRESSE (Anschrift/Address/Adresse), Ausstellungsdatum, Behörde

⚠️ KRITISCH: Du MUSST ALLE im Bild sichtbaren Felder extrahieren!
Wenn du eine ADRESSE siehst (Straße, PLZ, Ort) → EXTRAHIERE SIE VOLLSTÄNDIG!
Wenn du persönliche Daten siehst (Name, Geburtsdatum) → EXTRAHIERE SIE VOLLSTÄNDIG!

ELTERNTEIL-TABELLE - DATABASE COLUMN NAMES (aus Vorderseite):
- vorname (Vorname, z.B. "Anna", oft unter "Given names"/"Vornamen")
- nachname (Nachname/Familienname, z.B. "Schmidt", oft unter "Surname"/"Name")
- geburtsdatum (Geburtsdatum, Format: YYYY-MM-DD, z.B. "1990-05-20", aus "Date of birth"/"Datum")
- geschlecht (Geschlecht, WERTE: "weiblich", "maennlich", "divers", "ohne_angabe")

ANTRAG_2C_WOHNSITZ-TABELLE - DATABASE COLUMN NAMES (aus Rückseite):

🚨 ULTRA-KRITISCHE ANLEITUNG FÜR PERSONALAUSWEIS ADRESSE:

Das Dokument zeigt auf der Rückseite IMMER dieses exakte Format:

Zeile 1: "Anschrift" / "Address" / "Adresse"
Zeile 2: [5 ZIFFERN] [LEERZEICHEN] [STADTNAME IN GROSSBUCHSTABEN]
Zeile 3: [STRASSENNAME IN GROSSBUCHSTABEN] [LEERZEICHEN] [NUMMER]

🔢 SCHRITT 1 - FINDE PLZ (Postleitzahl):
Suche in Zeile 2 nach "Anschrift":
- Nimm die ERSTEN 5 ZIFFERN der nächsten Zeile
- Beispiel: "13599 BERLIN" → plz = "13599"
- ⚠️ NIEMALS andere Zahlen aus dem Dokument verwenden!

🏙️ SCHRITT 2 - FINDE ORT (Stadt):
In derselben Zeile wie die PLZ:
- Nimm ALLES NACH den 5 Ziffern und dem Leerzeichen
- Konvertiere zu normaler Schreibweise (erster Buchstabe groß)
- Beispiel: "13599 BERLIN" → ort = "Berlin"

🛣️ SCHRITT 3 - FINDE STRASSE (Straßenname):
Zeile DIREKT NACH der PLZ+Ort Zeile:
- Nimm ALLES VOR der letzten Zahl
- Konvertiere zu normaler Schreibweise
- Beispiel: "STRAUSSEEWEG 6" → strasse = "Strausseeweg"
- ⚠️ NIEMALS die Stadt als Straße verwenden!

🏠 SCHRITT 4 - FINDE HAUSNR (Hausnummer):
Dieselbe Zeile wie die Straße:
- Nimm die LETZTE Zahl/Ziffer (kann Buchstaben enthalten)
- Beispiel: "STRAUSSEEWEG 6" → hausnr = "6"
- Beispiel: "HAUPTSTR 42A" → hausnr = "42A"

📊 DATABASE SPALTEN:
- plz: string (genau 5 Ziffern, z.B. "13599")
- ort: string (Stadt, normale Schreibweise, z.B. "Berlin")
- strasse: string (Straßenname OHNE Nummer, z.B. "Strausseeweg")
- hausnr: string (nur die Nummer, z.B. "6" oder "42A")
- adresszusatz: string | null (meist leer)
- wohnsitz_ausland: boolean (false für deutsche Adressen)

✅ VOLLSTÄNDIGES BEISPIEL:

DOKUMENT ZEIGT:
---
Anschrift/Address/Adresse
13599 BERLIN
STRAUSSEEWEG 6
---

KORREKTE EXTRAKTION:
{
  "plz": "13599",
  "ort": "Berlin",
  "strasse": "Strausseeweg",
  "hausnr": "6",
  "adresszusatz": null,
  "wohnsitz_ausland": false
}

❌ FALSCHE EXTRAKTION (NICHT MACHEN!):
{
  "plz": "451398",  // ❌ FALSCH - Das ist keine PLZ!
  "ort": "Berlin",
  "strasse": "Berlin",  // ❌ FALSCH - Das ist die Stadt, nicht die Straße!
  "hausnr": "",  // ❌ FALSCH - Hausnummer fehlt!
}

🎯 VALIDIERUNGSREGELN:
1. PLZ ist IMMER genau 5 Ziffern
2. Straße ist NIEMALS identisch mit Stadt
3. Hausnummer ist NIEMALS leer wenn Straße vorhanden ist
4. Stadt kommt VOR der Straße im Dokument`;

        case "adresse":
          return `
ADRESSDOKUMENT → WOHNSITZ + AUFENTHALT TABELLEN!
Dokumente wie Meldebescheinigung oder Wohnsitznachweis.

ANTRAG_2C_WOHNSITZ-TABELLE - DATABASE COLUMN NAMES:
- strasse (Straßenname, z.B. "Lindenallee")
- hausnr (Hausnummer, z.B. "15")
- plz (Postleitzahl, 5-stellig, z.B. "80331")
- ort (Wohnort/Stadt, z.B. "München")
- adresszusatz (Adresszusatz, optional, z.B. "Hinterhaus")
- wohnsitz_ausland (Wohnsitz im Ausland, BOOLEAN: true/false)
- ausland_staat (Staat des Auslandswohnsitzes, z.B. "Schweiz")
- ausland_strasse (Auslandsadresse, vollständig)
- ausland_aufenthaltsgrund (Grund für Auslandsaufenthalt)

ANTRAG_2C_WOHNSITZ_AUFENTHALT-TABELLE - DATABASE COLUMN NAMES:
- wohnsitz_in_deutschland (Wohnsitz in Deutschland, BOOLEAN: true/false)
- seit_meiner_geburt (Seit Geburt in Deutschland, BOOLEAN: true/false)
- seit_in_deutschland (Seit bestimmtem Datum in Deutschland, BOOLEAN: true/false)
- seit_datum_deutschland (Ab wann in Deutschland, Format: YYYY-MM-DD)`;

        case "krankenversicherung":
        case "versicherungsnachweis":
          return `
KRANKENVERSICHERUNG → ELTERNTEIL + VERSICHERUNG TABELLEN!
Versicherungskarte, Mitgliedsbescheinigung oder Versicherungsnachweis.

ELTERNTEIL-TABELLE (falls Name sichtbar) - DATABASE COLUMN NAMES:
- vorname (Vorname des Versicherten, z.B. "Thomas")
- nachname (Nachname des Versicherten, z.B. "Weber")
- geburtsdatum (Geburtsdatum, Format: YYYY-MM-DD, z.B. "1985-03-12")

ANTRAG_5_KRANKENVERSICHERUNG-TABELLE - DATABASE COLUMN NAMES:
- gesetzlich_ver (Gesetzlich versichert, BOOLEAN: true/false)
- privat_ver (Privat versichert, BOOLEAN: true/false)
- freiwillig_ver (Freiwillig versichert, BOOLEAN: true/false)
- familien_ver (Familienversichert, BOOLEAN: true/false)
- krankenkassename (Name der Krankenkasse, z.B. "AOK Bayern", "TK", "Barmer")
- versichertennummer (Versichertennummer, z.B. "A123456789")
- krankenkasse_strasse (Straße der Krankenkasse)
- krankenkasse_hausnummer (Hausnummer der Krankenkasse)
- krankenkasse_plz (PLZ der Krankenkasse, 5-stellig)
- krankenkasse_ort (Ort der Krankenkasse)`;

        case "gehaltsnachweis":
          return `
GEHALTSNACHWEIS → ELTERNTEIL + ERWERBSTÄTIGKEIT TABELLEN!
Gehaltsabrechnung, Einkommensnachweis, Lohnbescheinigung.

ELTERNTEIL-TABELLE (falls Name sichtbar) - DATABASE COLUMN NAMES:
- vorname (Vorname des Arbeitnehmers, z.B. "Maria")
- nachname (Nachname des Arbeitnehmers, z.B. "Becker")
- geburtsdatum (Geburtsdatum, Format: YYYY-MM-DD)
- steuer_identifikationsnummer (Steuer-ID, 11 Zeichen)

ANTRAG_7A_BISHERIGE_ERWERBSTAETIGKEIT-TABELLE - DATABASE COLUMN NAMES:
- einkuenfte_nicht_selbststaendig (Nicht selbstständige Einkünfte/Angestellter, BOOLEAN: true/false)
- selbststaendig_einkuenfte (Selbstständige Einkünfte, BOOLEAN: true/false)
- gewerbe_einkuenfte (Gewerbliche Einkünfte, BOOLEAN: true/false)
- landwirtschaft_einkuenfte (Land-/Forstwirtschaft Einkünfte, BOOLEAN: true/false)
- keine_einkuenfte (Keine Einkünfte, BOOLEAN: true/false)
- gewinn_einkunft_vorhanden (Gewinn/Einkünfte vorhanden, BOOLEAN: true/false)`;

        default:
          return `
ALLGEMEINE DOKUMENTE:
Extrahiere alle sichtbaren Daten mit korrekten DATABASE COLUMN NAMES.
Mögliche Felder siehe Hauptreferenz unten.`;
      }
    };

    const mappingReference = `
KRITISCHE MAPPING-REGELN für Elterngeldanträge:

═══════════════════════════════════════════════════════════════
⚠️  WICHTIGSTE REGEL: Verwende IMMER die exakten DATABASE COLUMN NAMES!
    NIEMALS Display-Namen oder eigene Bezeichnungen erfinden!
═══════════════════════════════════════════════════════════════

${getDocumentMappingInstructions(documentType)}

═══════════════════════════════════════════════════════════════
WICHTIGE EXTRAKTIONSREGELN:
═══════════════════════════════════════════════════════════════

1. DATENTYPEN BEACHTEN:
   - DATE: Format YYYY-MM-DD (z.B. "2024-01-15")
   - BOOLEAN: nur true oder false (nicht "ja"/"nein")
   - INTEGER: nur Zahlen ohne Einheit (z.B. 2, nicht "2 Kinder")
   - VARCHAR: Text, keine Sonderzeichen wenn möglich
   - CHAR(11): exakt 11 Zeichen (z.B. Steuer-ID)

2. FEHLENDE DATEN:
   - Wenn ein Feld im Dokument nicht sichtbar ist: nicht in mapped_fields aufnehmen
   - NULL nur für optionale Felder verwenden
   - NIEMALS Phantasie-Daten erfinden!

3. GESCHLECHT-WERTE (für elternteil.geschlecht):
   - Nur diese Werte erlaubt: "weiblich", "maennlich", "divers", "ohne_angabe"
   - NICHT: "w", "m", "männlich", "female", "male"

4. CONFIDENCE SCORE:
   - Setze hohe confidence (>0.85) wenn Daten klar lesbar
   - Mittlere confidence (0.6-0.85) bei unsauberer OCR
   - Niedrige confidence (<0.6) bei unleserlichen Feldern

5. SPEZIELLE HINWEISE:
   - Postleitzahlen: immer 5-stellig (z.B. "01234" nicht "1234")
   - Straßennamen: ohne Hausnummer (z.B. "Hauptstraße" nicht "Hauptstraße 42")
   - Deutsche Umlaute: ä, ö, ü, ß korrekt verwenden
   - Steuer-ID: genau 11 Zeichen, nur Zahlen

═══════════════════════════════════════════════════════════════
BEISPIEL KORREKTE ANTWORT:
═══════════════════════════════════════════════════════════════
{
  "mapped_fields": {
    "vorname": "Anna",
    "nachname": "Müller",
    "geburtsdatum": "1990-05-20",
    "geschlecht": "weiblich",
    "strasse": "Hauptstraße",
    "hausnr": "42",
    "plz": "10115",
    "ort": "Berlin"
  },
  "confidence": 0.92,
  "suggestions": ["Geburtsdatum gut lesbar", "Adresse vollständig"]
}
`;

    // System prompt for intelligent field mapping
    const systemPrompt = `Du bist ein hochpräziser OCR-Experte und Datenmapper für deutsche Elterngeldanträge.

${mappingReference}

═══════════════════════════════════════════════════════════════
🎯 DEINE AUFGABE:
═══════════════════════════════════════════════════════════════
1. Analysiere das Bild GRÜNDLICH und erkenne ALLE sichtbaren Textfelder
2. Identifiziere den Dokumenttyp (bereits bekannt: ${documentType})
3. Extrahiere ALLE relevanten Daten mit höchster Genauigkeit
4. Mappe JEDEN Wert auf den exakten DATABASE COLUMN NAME
5. Gebe eine realistische Confidence-Score basierend auf Lesbarkeit

═══════════════════════════════════════════════════════════════
⚠️  KRITISCHE ANFORDERUNGEN:
═══════════════════════════════════════════════════════════════
✓ Verwende EXAKT die DATABASE COLUMN NAMES aus der Referenz oben
✓ Beachte die korrekten Datentypen (DATE, BOOLEAN, INTEGER, VARCHAR)
✓ Konvertiere Datumsangaben zu YYYY-MM-DD Format
✓ Konvertiere Ja/Nein zu true/false bei BOOLEAN-Feldern
✓ Extrahiere KEINE Daten die nicht im Bild sichtbar sind
✓ Setze realistische Confidence-Werte basierend auf OCR-Qualität

✗ NIEMALS Display-Namen verwenden (z.B. "Kind Vorname" ist FALSCH)
✗ NIEMALS Daten erfinden oder raten
✗ NIEMALS generische Platzhalter wie "NATIONALITY" zurückgeben
✗ NIEMALS englische Feldnamen verwenden

═══════════════════════════════════════════════════════════════
📋 ANTWORTFORMAT (NUR JSON, kein weiterer Text):
═══════════════════════════════════════════════════════════════
{
  "mapped_fields": {
    "database_column_name": "extracted_value"
  },
  "confidence": 0.XX,
  "suggestions": ["Optional: Qualitätshinweise zur Extraktion"]
}`;

    const userPrompt = `
═══════════════════════════════════════════════════════════════
📄 DOKUMENT ZUM ANALYSIEREN
═══════════════════════════════════════════════════════════════
Dokumenttyp: ${documentType}

🎯 AUFGABE:
Analysiere das Bild VOLLSTÄNDIG und extrahiere ALLE lesbaren Daten.
Mappe jeden Wert auf den korrekten DATABASE COLUMN NAME gemäß der Referenz oben.

⚠️  WICHTIG:
- Extrahiere echte Werte aus dem Dokument (keine Platzhalter wie "NATIONALITY")
- Verwende exakte DATABASE COLUMN NAMES aus der Mapping-Referenz
- Gebe realistische Confidence-Score basierend auf OCR-Qualität
- Nur JSON zurückgeben, kein zusätzlicher Text

Beginne jetzt mit der Analyse:`;

    // Retry function with exponential backoff for rate limiting
    async function fetchWithRetry(maxRetries = 3, initialDelay = 2000) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`API attempt ${attempt}/${maxRetries}`);

          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-flash-1.5",
              messages: [
                { role: "system", content: systemPrompt },
                {
                  role: "user",
                  content: [
                    { type: "text", text: userPrompt },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:${mimeType};base64,${imageData}`,
                      },
                    },
                  ],
                },
              ],
              temperature: 0.1,
            }),
          });

          // If success, return response
          if (response.ok) {
            console.log(`API call succeeded on attempt ${attempt}`);
            return response;
          }

          const errorText = await response.text();

          // If rate limited (429), retry with exponential backoff
          if (response.status === 429 && attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt - 1);
            console.log(`Rate limited. Retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // For other errors or last attempt, throw with details
          console.error("OpenRouter API error:", response.status, errorText);
          throw { status: response.status, errorText };
        } catch (error: any) {
          // If it's the last attempt or not a retriable error, throw
          if (attempt === maxRetries || !error?.status) {
            throw error;
          }
        }
      }
      throw new Error("Max retries exceeded");
    }

    // Call OpenRouter API with retry logic
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    let response;
    try {
      response = await fetchWithRetry();
    } catch (error: any) {
      if (error?.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit erreicht nach mehreren Versuchen. Bitte versuchen Sie es in einigen Minuten erneut.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (error?.status === 402) {
        return new Response(JSON.stringify({ error: "API Fehler. Bitte versuchen Sie es später erneut." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (error?.status === 400) {
        return new Response(JSON.stringify({ error: `Vision API Fehler: ${error?.errorText}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `OpenRouter Fehler: ${error?.message || "Unbekannter Fehler"}` }), {
        status: error?.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;

    // Parse AI response
    let mappedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      mappedData = JSON.parse(cleanContent);
      console.log("AI returned field names:", Object.keys(mappedData.mapped_fields || {}));
      console.log("AI mapped data:", JSON.stringify(mappedData, null, 2));
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    // Save mapped data to database (only if antragId provided)
    if (antragId && mappedData.mapped_fields) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabase = createClient(supabaseUrl!, supabaseKey!);

      const fields = mappedData.mapped_fields;
      const mapping = DOCUMENT_TABLE_MAPPING[documentType];

      if (!mapping) {
        console.warn(`No mapping found for document type: ${documentType}`);
        return new Response(JSON.stringify(mappedData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Dynamic table population based on mapping
      for (const tableName of mapping.tables) {
        if (tableName === "kind") {
          const kindData: any = { antrag_id: antragId };
          if (fields.vorname) kindData.vorname = fields.vorname;
          if (fields.nachname) kindData.nachname = fields.nachname;
          if (fields.geburtsdatum) kindData.geburtsdatum = fields.geburtsdatum;
          if (fields.anzahl_mehrlinge) kindData.anzahl_mehrlinge = fields.anzahl_mehrlinge;
          if (fields.fruehgeboren !== undefined) kindData.fruehgeboren = fields.fruehgeboren;
          if (fields.errechneter_geburtsdatum) kindData.errechneter_geburtsdatum = fields.errechneter_geburtsdatum;
          if (fields.behinderung !== undefined) kindData.behinderung = fields.behinderung;
          if (fields.anzahl_weitere_kinder) kindData.anzahl_weitere_kinder = fields.anzahl_weitere_kinder;
          if (fields.keine_weitere_kinder !== undefined) kindData.keine_weitere_kinder = fields.keine_weitere_kinder;
          if (fields.insgesamt !== undefined) kindData.insgesamt = fields.insgesamt;

          console.log("Saving kind data:", kindData);
          await upsertRecord(supabase, "kind", kindData, { antrag_id: antragId });
        } else if (tableName === "elternteil") {
          // Create or update elternteil record
          const elternteilData: any = {
            antrag_id: antragId,
            parent_number: parentNumber,
          };
          if (fields.vorname) elternteilData.vorname = fields.vorname;
          if (fields.nachname) elternteilData.nachname = fields.nachname;
          if (fields.geburtsdatum) elternteilData.geburtsdatum = fields.geburtsdatum;
          if (fields.geschlecht) elternteilData.geschlecht = fields.geschlecht;
          if (fields.steuer_identifikationsnummer)
            elternteilData.steuer_identifikationsnummer = fields.steuer_identifikationsnummer;

          if (Object.keys(elternteilData).length > 2) {
            // More than just antrag_id and parent_number
            console.log("Saving elternteil data:", elternteilData);
            const elternteil = await upsertRecord(supabase, "elternteil", elternteilData, {
              antrag_id: antragId,
              parent_number: parentNumber,
            });

            // Store elternteil_id for related tables
            if (elternteil) {
              (fields as any)._elternteil_id = elternteil.id;
            }
          }
        } else if (tableName === "antrag_2c_wohnsitz") {
          const wohnsitzData: any = { antrag_id: antragId };
          if ((fields as any)._elternteil_id) wohnsitzData.elternteil_id = (fields as any)._elternteil_id;
          if (fields.strasse) wohnsitzData.strasse = fields.strasse;
          if (fields.hausnr) wohnsitzData.hausnr = fields.hausnr;
          if (fields.plz) wohnsitzData.plz = fields.plz;
          if (fields.ort) wohnsitzData.ort = fields.ort;
          if (fields.adresszusatz) wohnsitzData.adresszusatz = fields.adresszusatz;
          if (fields.wohnsitz_ausland !== undefined) wohnsitzData.wohnsitz_ausland = fields.wohnsitz_ausland;

          if (Object.keys(wohnsitzData).length > 1) {
            console.log("Saving wohnsitz data:", wohnsitzData);
            await upsertRecord(supabase, "antrag_2c_wohnsitz", wohnsitzData, { antrag_id: antragId });
          }
        } else if (tableName === "antrag_2c_wohnsitz_aufenthalt") {
          const aufenthaltData: any = { antrag_id: antragId };
          if ((fields as any)._elternteil_id) aufenthaltData.elternteil_id = (fields as any)._elternteil_id;
          if (fields.wohnsitz_in_deutschland !== undefined)
            aufenthaltData.wohnsitz_in_deutschland = fields.wohnsitz_in_deutschland;
          if (fields.seit_meiner_geburt !== undefined) aufenthaltData.seit_meiner_geburt = fields.seit_meiner_geburt;
          if (fields.seit_in_deutschland !== undefined) aufenthaltData.seit_in_deutschland = fields.seit_in_deutschland;
          if (fields.seit_datum_deutschland) aufenthaltData.seit_datum_deutschland = fields.seit_datum_deutschland;

          if (Object.keys(aufenthaltData).length > 1) {
            console.log("Saving aufenthalt data:", aufenthaltData);
            await upsertRecord(supabase, "antrag_2c_wohnsitz_aufenthalt", aufenthaltData, { antrag_id: antragId });
          }
        } else if (tableName === "antrag_5_krankenversicherung") {
          const versicherungData: any = { antrag_id: antragId };
          if ((fields as any)._elternteil_id) versicherungData.elternteil_id = (fields as any)._elternteil_id;
          if (fields.gesetzlich_ver !== undefined) versicherungData.gesetzlich_ver = fields.gesetzlich_ver;
          if (fields.privat_ver !== undefined) versicherungData.privat_ver = fields.privat_ver;
          if (fields.krankenkassename) versicherungData.krankenkassename = fields.krankenkassename;
          if (fields.versichertennummer) versicherungData.versichertennummer = fields.versichertennummer;

          if (Object.keys(versicherungData).length > 1) {
            console.log("Saving versicherung data:", versicherungData);
            await upsertRecord(supabase, "antrag_5_krankenversicherung", versicherungData, { antrag_id: antragId });
          }
        } else if (tableName === "antrag_7a_bisherige_erwerbstaetigkeit") {
          const erwerbData: any = { antrag_id: antragId };
          if ((fields as any)._elternteil_id) erwerbData.elternteil_id = (fields as any)._elternteil_id;
          if (fields.einkuenfte_nicht_selbststaendig !== undefined)
            erwerbData.einkuenfte_nicht_selbststaendig = fields.einkuenfte_nicht_selbststaendig;
          if (fields.selbststaendig_einkuenfte !== undefined)
            erwerbData.selbststaendig_einkuenfte = fields.selbststaendig_einkuenfte;
          if (fields.keine_einkuenfte !== undefined) erwerbData.keine_einkuenfte = fields.keine_einkuenfte;

          if (Object.keys(erwerbData).length > 1) {
            console.log("Saving erwerb data:", erwerbData);
            await upsertRecord(supabase, "antrag_7a_bisherige_erwerbstaetigkeit", erwerbData, { antrag_id: antragId });
          }
        }
      }
    }

    console.log("Successfully mapped fields:", mappedData);

    return new Response(JSON.stringify(mappedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in map-pdf-fields:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
