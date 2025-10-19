import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, mimeType, documentType, antragId, parentNumber = 1 } = await req.json();
    
    console.log("Processing image for document type:", documentType, "MIME:", mimeType);

    // Field mapping reference from Mapping032025_1.xlsx
    const mappingReference = `
KRITISCHE MAPPING-REGELN basierend auf Mapping032025_1.xlsx:

WICHTIG: Verwende immer die DATABASE COLUMN NAMES (links vom →), NICHT die Display-Namen!

⚠️ CRITICAL: Geburtsurkunde (Birth Certificate) → NUR KIND-TABELLE!
Geburtsurkunden enthalten KEINE Informationen über Eltern, Adressen oder andere Daten.
Extrahiere NUR Daten für die KIND-Tabelle, NICHTS ANDERES!

KIND-TABELLE (aus Geburtsurkunde) - DATABASE COLUMN NAMES:
- vorname (extrahiere aus: Kind Vorname)
- nachname (extrahiere aus: Kind Nachname)
- geburtsdatum (extrahiere aus: Geburtsdatum, Format: YYYY-MM-DD)
- anzahl_mehrlinge (extrahiere aus: Anzahl Mehrlinge/Zwillinge)
- fruehgeboren (extrahiere aus: Frühgeboren, BOOLEAN)
- errechneter_geburtsdatum (extrahiere aus: Errechnetes Geburtsdatum, Format: YYYY-MM-DD)
- behinderung (extrahiere aus: Behinderung, BOOLEAN)
- anzahl_weitere_kinder (extrahiere aus: Anzahl weitere Kinder, INTEGER)
- keine_weitere_kinder (extrahiere aus: Keine weiteren Kinder, BOOLEAN)
- insgesamt (extrahiere aus: Gesamtzahl Kinder, BOOLEAN)

ANTRAG_2B_ELTERNTEIL-TABELLE (aus Personalausweis/ID) - DATABASE COLUMN NAMES:
- vorname (extrahiere aus: Elternteil Vorname)
- nachname (extrahiere aus: Elternteil Nachname)
- geburtsdatum (extrahiere aus: Geburtsdatum, Format: YYYY-MM-DD)
- geschlecht (extrahiere aus: Geschlecht, Werte: "weiblich", "maennlich", "divers", "ohne_angabe")
- steuer_identifikationsnummer (extrahiere aus: Steuer-ID, 11-stellig)
- vorname_2 (extrahiere aus: Zweiter Elternteil Vorname)
- nachname_2 (extrahiere aus: Zweiter Elternteil Nachname)
- geburtsdatum_2 (extrahiere aus: Zweiter Elternteil Geburtsdatum, Format: YYYY-MM-DD)
- geschlecht_2 (extrahiere aus: Zweiter Elternteil Geschlecht)
- steuer_identifikationsnummer_2 (extrahiere aus: Zweiter Elternteil Steuer-ID)

ANTRAG_2C_WOHNSITZ-TABELLE (aus Adressdokumenten/Personalausweis) - DATABASE COLUMN NAMES:
- strasse (extrahiere aus: Straßenname)
- hausnr (extrahiere aus: Hausnummer)
- plz (extrahiere aus: Postleitzahl, 5-stellig)
- ort (extrahiere aus: Wohnort)
- adresszusatz (extrahiere aus: Adresszusatz, optional)
- wohnsitz_ausland (extrahiere aus: Wohnsitz im Ausland, BOOLEAN)
- ausland_staat (extrahiere aus: Staat des Auslandswohnsitzes)
- ausland_strasse (extrahiere aus: Auslandsadresse)
- ausland_aufenthaltsgrund (extrahiere aus: Grund für Auslandsaufenthalt)

ANTRAG_2C_WOHNSITZAUFENTHALT-TABELLE - DATABASE COLUMN NAMES:
- wohnsitz_in_deutschland (extrahiere aus: Wohnsitz in Deutschland, BOOLEAN)
- seit_meiner_geburt (extrahiere aus: Seit Geburt in Deutschland, BOOLEAN)
- seit_in_deutschland (extrahiere aus: Seit bestimmtem Datum, BOOLEAN)
- seit_datum_deutschland (extrahiere aus: Datum seit wann in Deutschland, Format: YYYY-MM-DD)

ANTRAG_2A_ALLEINERZIEHENDE-TABELLE - DATABASE COLUMN NAMES:
- ist_alleinerziehend (extrahiere aus: Alleinerziehend, BOOLEAN)
- anderer_unmoeglich_betreuung (extrahiere aus: Andere Person kann nicht betreuen, BOOLEAN)
- betreuung_gefaehrdet_wohl (extrahiere aus: Betreuung gefährdet Kindeswohl, BOOLEAN)

WICHTIG:
- Extrahiere NUR Daten die tatsächlich im OCR-Text vorhanden sind
- Verwende NULL für fehlende optionale Felder
- Beachte Datentypen: BOOLEAN, DATE, INT, VARCHAR
- Wenn unsicher, setze confidence niedriger
- Ignoriere "Geburtsort" - wir brauchen nur aktuellen Wohnsitz
`;

    // System prompt for intelligent field mapping
    const systemPrompt = `Du bist ein Experte für das Ausfüllen deutscher Elterngeldanträge mit Zugriff auf die offizielle Mapping-Referenz.

${mappingReference}

KRITISCH: Deine Antwort MUSS die exakten DATABASE COLUMN NAMES verwenden!
Beispiel für kind-Tabelle:
- RICHTIG: "vorname": "Max"
- FALSCH: "Kind Vorname": "Max"

Deine Aufgabe: Analysiere die OCR-Daten und mappe sie PRÄZISE zu den SQL-Tabellen basierend auf der Mapping-Referenz oben.

Antworte NUR mit einem JSON-Objekt ohne zusätzlichen Text:
{
  "mapped_fields": {
    "database_column_name": "value"
  },
  "confidence": 0.95,
  "suggestions": ["Optional: Hinweise"]
}`;

    const userPrompt = `Dokumenttyp: ${documentType}

Bitte analysiere das hochgeladene Bild und extrahiere die relevanten Daten für den Elterngeldantrag.
Nutze die Mapping-Referenz, um die korrekten DATABASE COLUMN NAMES zu verwenden.`;

    // Retry function with exponential backoff for rate limiting
    async function fetchWithRetry(maxRetries = 3, initialDelay = 2000) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`API attempt ${attempt}/${maxRetries}`);
          
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "mistralai/mistral-small-3.2-24b-instruct:free",
              messages: [
                { role: "system", content: systemPrompt },
                { 
                  role: "user", 
                  content: [
                    { type: "text", text: userPrompt },
                    { 
                      type: "image_url", 
                      image_url: { 
                        url: `data:${mimeType};base64,${imageData}` 
                      } 
                    }
                  ]
                }
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
            await new Promise(resolve => setTimeout(resolve, delay));
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
          JSON.stringify({ error: "Rate limit erreicht nach mehreren Versuchen. Bitte versuchen Sie es in einigen Minuten erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (error?.status === 402) {
        return new Response(
          JSON.stringify({ error: "API Fehler. Bitte versuchen Sie es später erneut." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (error?.status === 400) {
        return new Response(
          JSON.stringify({ error: `Vision API Fehler: ${error?.errorText}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `OpenRouter Fehler: ${error?.message || 'Unbekannter Fehler'}` }),
        { status: error?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

      // Update appropriate tables based on document type
      const fields = mappedData.mapped_fields;
      
      // CRITICAL: Geburtsurkunde only affects kind table
      if (documentType === "geburtsurkunde") {
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

        console.log("Saving kind data from Geburtsurkunde:", kindData);

        // Check if kind entry already exists for this antrag
        const { data: existingKind } = await supabase
          .from("kind")
          .select("id")
          .eq("antrag_id", antragId)
          .maybeSingle();

        let kindError;
        if (existingKind) {
          // Update existing
          const { error } = await supabase
            .from("kind")
            .update(kindData)
            .eq("id", existingKind.id);
          kindError = error;
        } else {
          // Insert new
          const { error } = await supabase
            .from("kind")
            .insert(kindData);
          kindError = error;
        }

        if (kindError) {
          console.error("Error saving kind:", kindError);
        } else {
          console.log("Kind data saved successfully from Geburtsurkunde");
        }
      }
      
      // IMPORTANT: Geburtsurkunde only affects kind table - skip other table processing
      if (documentType !== "geburtsurkunde") {

        // Process parent/address data for personalausweis or adresse documents
        if (documentType === "personalausweis" || documentType === "adresse") {
        const elternteilData: any = { antrag_id: antragId };
        
        // Map to correct parent fields based on parentNumber (1 or 2)
        if (parentNumber === 2) {
          // Save to Parent 2 fields (with _2 suffix)
          if (fields.vorname) elternteilData.vorname_2 = fields.vorname;
          if (fields.nachname) elternteilData.nachname_2 = fields.nachname;
          if (fields.geburtsdatum) elternteilData.geburtsdatum_2 = fields.geburtsdatum;
          if (fields.geschlecht) elternteilData.geschlecht_2 = fields.geschlecht;
          if (fields.steuer_identifikationsnummer) elternteilData.steuer_identifikationsnummer_2 = fields.steuer_identifikationsnummer;
        } else {
          // Save to Parent 1 fields (default, no suffix)
          if (fields.vorname) elternteilData.vorname = fields.vorname;
          if (fields.nachname) elternteilData.nachname = fields.nachname;
          if (fields.geburtsdatum) elternteilData.geburtsdatum = fields.geburtsdatum;
          if (fields.geschlecht) elternteilData.geschlecht = fields.geschlecht;
          if (fields.steuer_identifikationsnummer) elternteilData.steuer_identifikationsnummer = fields.steuer_identifikationsnummer;
        }

        if (Object.keys(elternteilData).length > 1) {
          console.log("Saving elternteil data:", elternteilData);

          const { data: existingElternteil } = await supabase
            .from("antrag_2b_elternteil")
            .select("id")
            .eq("antrag_id", antragId)
            .maybeSingle();

          let elternteilError;
          if (existingElternteil) {
            const { error } = await supabase
              .from("antrag_2b_elternteil")
              .update(elternteilData)
              .eq("id", existingElternteil.id);
            elternteilError = error;
          } else {
            const { error } = await supabase
              .from("antrag_2b_elternteil")
              .insert(elternteilData);
            elternteilError = error;
          }

          if (elternteilError) console.error("Error saving elternteil:", elternteilError);
          else console.log("Elternteil data saved successfully");
        }

        // Insert address data if present
        const wohnsitzData: any = { antrag_id: antragId };
        if (fields.strasse) wohnsitzData.strasse = fields.strasse;
        if (fields.hausnr) wohnsitzData.hausnr = fields.hausnr;
        if (fields.plz) wohnsitzData.plz = fields.plz;
        if (fields.ort) wohnsitzData.ort = fields.ort;
        if (fields.adresszusatz) wohnsitzData.adresszusatz = fields.adresszusatz;
        if (fields.wohnsitz_ausland !== undefined) wohnsitzData.wohnsitz_ausland = fields.wohnsitz_ausland;
        if (fields.ausland_staat) wohnsitzData.ausland_staat = fields.ausland_staat;
        if (fields.ausland_strasse) wohnsitzData.ausland_strasse = fields.ausland_strasse;
        if (fields.ausland_aufenthaltsgrund) wohnsitzData.ausland_aufenthaltsgrund = fields.ausland_aufenthaltsgrund;

        if (Object.keys(wohnsitzData).length > 1) {
          console.log("Saving wohnsitz data:", wohnsitzData);

          const { data: existingWohnsitz } = await supabase
            .from("antrag_2c_wohnsitz")
            .select("id")
            .eq("antrag_id", antragId)
            .maybeSingle();

          let wohnsitzError;
          if (existingWohnsitz) {
            const { error } = await supabase
              .from("antrag_2c_wohnsitz")
              .update(wohnsitzData)
              .eq("id", existingWohnsitz.id);
            wohnsitzError = error;
          } else {
            const { error } = await supabase
              .from("antrag_2c_wohnsitz")
              .insert(wohnsitzData);
            wohnsitzError = error;
          }

          if (wohnsitzError) console.error("Error saving wohnsitz:", wohnsitzError);
          else console.log("Wohnsitz data saved successfully");
        }

        // Insert residence status data if present
        const aufenthaltData: any = { antrag_id: antragId };
        if (fields.wohnsitz_in_deutschland !== undefined) aufenthaltData.wohnsitz_in_deutschland = fields.wohnsitz_in_deutschland;
        if (fields.seit_meiner_geburt !== undefined) aufenthaltData.seit_meiner_geburt = fields.seit_meiner_geburt;
        if (fields.seit_in_deutschland !== undefined) aufenthaltData.seit_in_deutschland = fields.seit_in_deutschland;
        if (fields.seit_datum_deutschland) aufenthaltData.seit_datum_deutschland = fields.seit_datum_deutschland;

        if (Object.keys(aufenthaltData).length > 1) {
          console.log("Saving aufenthalt data:", aufenthaltData);

          const { data: existingAufenthalt } = await supabase
            .from("antrag_2c_wohnsitz_aufenthalt")
            .select("id")
            .eq("antrag_id", antragId)
            .maybeSingle();

          let aufenthaltError;
          if (existingAufenthalt) {
            const { error } = await supabase
              .from("antrag_2c_wohnsitz_aufenthalt")
              .update(aufenthaltData)
              .eq("id", existingAufenthalt.id);
            aufenthaltError = error;
          } else {
            const { error } = await supabase
              .from("antrag_2c_wohnsitz_aufenthalt")
              .insert(aufenthaltData);
            aufenthaltError = error;
          }

          if (aufenthaltError) console.error("Error saving aufenthalt:", aufenthaltError);
          else console.log("Aufenthalt data saved successfully");
        }
        }

        // Handle single parent data if detected
        if (fields.ist_alleinerziehend !== undefined) {
        const alleinerziehendData: any = { antrag_id: antragId };
        alleinerziehendData.ist_alleinerziehend = fields.ist_alleinerziehend;
        if (fields.anderer_unmoeglich_betreuung !== undefined) alleinerziehendData.anderer_unmoeglich_betreuung = fields.anderer_unmoeglich_betreuung;
        if (fields.betreuung_gefaehrdet_wohl !== undefined) alleinerziehendData.betreuung_gefaehrdet_wohl = fields.betreuung_gefaehrdet_wohl;

        console.log("Saving alleinerziehend data:", alleinerziehendData);

        const { data: existingAlleinerziehend } = await supabase
          .from("antrag_2a_alleinerziehende")
          .select("id")
          .eq("antrag_id", antragId)
          .maybeSingle();

        let alleinerziehendError;
        if (existingAlleinerziehend) {
          const { error } = await supabase
            .from("antrag_2a_alleinerziehende")
            .update(alleinerziehendData)
            .eq("id", existingAlleinerziehend.id);
          alleinerziehendError = error;
        } else {
          const { error } = await supabase
            .from("antrag_2a_alleinerziehende")
            .insert(alleinerziehendData);
          alleinerziehendError = error;
        }

        if (alleinerziehendError) console.error("Error saving alleinerziehend:", alleinerziehendError);
        else console.log("Alleinerziehend data saved successfully");
        }
      }
    }

    console.log("Successfully mapped fields:", mappedData);

    return new Response(
      JSON.stringify(mappedData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in map-pdf-fields:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
