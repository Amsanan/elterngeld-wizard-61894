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
- vorname → txt.txt.vorname1A (Kind Vorname)
- nachname → txt.txt.name1A (Kind Nachname)
- geburtsdatum → txt.txt.geburtsdatum1a (Geburtsdatum, Format: DD.MM.YYYY oder YYYY-MM-DD)
- anzahl_mehrlinge → txt.txt.anzahl (Anzahl Mehrlinge)
- fruehgeboren → cb.ja1b (BOOLEAN: mindestens 6 Wochen früh)
- errechneter_geburtsdatum → txt.geburtsdatum_frueh1b (Falls frühgeboren)
- behinderung → cb.nein1b (BOOLEAN: Kind hat Behinderung)
- anzahl_weitere_kinder → txt.anzahl1c (Anzahl weitere Kinder)

ANTRAG_2B_ELTERNTEIL-TABELLE (aus Personalausweis/ID):
- vorname → txt.vorname2b (Elternteil Vorname)
- nachname → txt.name2b (Elternteil Nachname)  
- geburtsdatum → txt.geburt2b (Geburtsdatum)
- geschlecht → cb.weiblich2b, cb.männlich2b, cb.divers2b, cb.ohneAngabe2b
- steuer_identifikationsnummer → txt.txt.steuer2b_1 (11-stellige Steuer-ID)

ANTRAG_2C_WOHNSITZ-TABELLE (aus Adressdokumenten):
- strasse → txt.strasse2c (Straßenname)
- hausnr → txt.nummer2c (Hausnummer)
- plz → txt.plz2c (5-stellige PLZ)
- ort → txt.ort2c (Wohnort)
- adresszusatz → txt.adresszusatz2c (Optional)

WICHTIG:
- Ignoriere "Geburtsort" - wir brauchen nur aktuellen Wohnsitz
- Extrahiere KEINE Daten die nicht in den Tabellen existieren
- Wenn unsicher, setze confidence niedriger
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
        model: "google/gemini-2.0-flash-thinking-exp-01-21:free",
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
        await supabase.from("kind").upsert({
          antrag_id: antragId,
          vorname: fields.kind_vorname,
          nachname: fields.kind_nachname,
          geburtsdatum: fields.kind_geburtsdatum,
        }, { onConflict: "antrag_id" });
      }

      if (documentType === "personalausweis") {
        await supabase.from("antrag_2b_elternteil").upsert({
          antrag_id: antragId,
          vorname: fields.vorname,
          nachname: fields.nachname,
          geburtsdatum: fields.geburtsdatum,
          steuer_identifikationsnummer: fields.steuer_identifikationsnummer,
        }, { onConflict: "antrag_id" });

        if (fields.strasse || fields.ort) {
          await supabase.from("antrag_2c_wohnsitz").upsert({
            antrag_id: antragId,
            strasse: fields.strasse,
            hausnr: fields.hausnr,
            plz: fields.plz,
            ort: fields.ort,
          }, { onConflict: "antrag_id" });
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
