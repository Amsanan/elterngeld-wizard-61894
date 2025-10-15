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
    const { ocrData, documentType, antragId } = await req.json();
    
    console.log("Mapping OCR data for document type:", documentType);

    // Field mapping reference from Mapping032025_1.xlsx
    const mappingReference = `
KRITISCHE MAPPING-REGELN basierend auf Mapping032025_1.xlsx:

KIND-TABELLE (aus Geburtsurkunde):
- vorname → Kind Vorname
- nachname → Kind Nachname
- geburtsdatum → Geburtsdatum (Format: DD.MM.YYYY oder YYYY-MM-DD)
- anzahl_mehrlinge → Anzahl Mehrlinge/Zwillinge
- fruehgeboren → BOOLEAN (mindestens 6 Wochen früh geboren)
- errechneter_geburtsdatum → Errechnetes Geburtsdatum falls frühgeboren
- behinderung → BOOLEAN (Kind hat Behinderung)
- anzahl_weitere_kinder → Anzahl weitere Kinder
- keine_weitere_kinder → BOOLEAN (keine weiteren Kinder)
- insgesamt → BOOLEAN (Gesamtzahl Kinder)

ANTRAG_2B_ELTERNTEIL-TABELLE (aus Personalausweis/ID):
- vorname → Elternteil Vorname
- nachname → Elternteil Nachname
- geburtsdatum → Geburtsdatum (Format: DD.MM.YYYY oder YYYY-MM-DD)
- geschlecht → "weiblich", "maennlich", "divers", "ohne_angabe"
- steuer_identifikationsnummer → 11-stellige Steuer-ID
- vorname_2 → Zweiter Elternteil Vorname
- nachname_2 → Zweiter Elternteil Nachname
- geburtsdatum_2 → Zweiter Elternteil Geburtsdatum
- geschlecht_2 → Zweiter Elternteil Geschlecht
- steuer_identifikationsnummer_2 → Zweiter Elternteil Steuer-ID

ANTRAG_2C_WOHNSITZ-TABELLE (aus Adressdokumenten/Personalausweis):
- strasse → Straßenname
- hausnr → Hausnummer
- plz → 5-stellige Postleitzahl
- ort → Wohnort
- adresszusatz → Adresszusatz (optional)
- wohnsitz_ausland → BOOLEAN (Wohnsitz im Ausland)
- ausland_staat → Staat des Auslandswohnsitzes
- ausland_strasse → Auslandsadresse
- ausland_aufenthaltsgrund → Grund für Auslandsaufenthalt

ANTRAG_2C_WOHNSITZAUFENTHALT-TABELLE:
- wohnsitz_in_deutschland → BOOLEAN (Wohnsitz in Deutschland)
- seit_meiner_geburt → BOOLEAN (seit Geburt in Deutschland)
- seit_in_deutschland → BOOLEAN (seit bestimmtem Datum)
- seit_datum_deutschland → Datum seit wann in Deutschland

ANTRAG_2A_ALLEINERZIEHENDE-TABELLE:
- ist_alleinerziehend → BOOLEAN (ist alleinerziehend)
- anderer_unmoeglich_betreuung → BOOLEAN (andere Person kann nicht betreuen)
- betreuung_gefaehrdet_wohl → BOOLEAN (Betreuung gefährdet Kindeswohl)

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

Deine Aufgabe: Analysiere die OCR-Daten und mappe sie PRÄZISE zu den SQL-Tabellen basierend auf der Mapping-Referenz oben.

Antworte NUR mit einem JSON-Objekt ohne zusätzlichen Text:
{
  "mapped_fields": {
    "field_name": "value"
  },
  "confidence": 0.95,
  "suggestions": ["Optional: Hinweise"]
}`;

    const userPrompt = `Dokumenttyp: ${documentType}
    
OCR-Daten:
${JSON.stringify(ocrData, null, 2)}

Bitte mappe diese Daten intelligent zu den Elterngeldantrag-Feldern.`;

    // Call OpenRouter API with Gemini Thinking model
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht. Bitte versuchen Sie es später erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API Fehler. Bitte versuchen Sie es später erneut." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI Gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    
    // Parse AI response
    let mappedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      mappedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    // Save mapped data to database
    if (antragId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabase = createClient(supabaseUrl!, supabaseKey!);

      // Update appropriate tables based on document type
      const fields = mappedData.mapped_fields;
      
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

        console.log("Saving kind data:", kindData);

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
          console.log("Kind data saved successfully");
        }
      }

      if (documentType === "personalausweis" || documentType === "adresse") {
        const elternteilData: any = { antrag_id: antragId };
        if (fields.vorname) elternteilData.vorname = fields.vorname;
        if (fields.nachname) elternteilData.nachname = fields.nachname;
        if (fields.geburtsdatum) elternteilData.geburtsdatum = fields.geburtsdatum;
        if (fields.geschlecht) elternteilData.geschlecht = fields.geschlecht;
        if (fields.steuer_identifikationsnummer) elternteilData.steuer_identifikationsnummer = fields.steuer_identifikationsnummer;
        if (fields.vorname_2) elternteilData.vorname_2 = fields.vorname_2;
        if (fields.nachname_2) elternteilData.nachname_2 = fields.nachname_2;
        if (fields.geburtsdatum_2) elternteilData.geburtsdatum_2 = fields.geburtsdatum_2;
        if (fields.geschlecht_2) elternteilData.geschlecht_2 = fields.geschlecht_2;
        if (fields.steuer_identifikationsnummer_2) elternteilData.steuer_identifikationsnummer_2 = fields.steuer_identifikationsnummer_2;

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
