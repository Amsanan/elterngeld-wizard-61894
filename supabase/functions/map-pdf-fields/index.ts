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

    // System prompt for intelligent field mapping
    const systemPrompt = `Du bist ein Experte für das Ausfüllen deutscher Elterngeldanträge.
    
Deine Aufgabe ist es, OCR-extrahierte Daten aus verschiedenen Dokumenten (Geburtsurkunde, Gehaltsnachweis, Personalausweis, etc.) 
intelligent den richtigen PDF-Formularfeldern zuzuordnen.

Wichtige Mapping-Regeln:
1. Kind-Daten (aus Geburtsurkunde):
   - kind_vorname → Vorname des Kindes
   - kind_nachname → Familienname des Kindes
   - kind_geburtsdatum → Geburtsdatum im Format DD.MM.YYYY oder YYYY-MM-DD
   - kind_geschlecht → "männlich" oder "weiblich"
   - WICHTIG: Ignoriere "Geburtsort" - dies wird nicht benötigt

2. Eltern-Daten (aus Personalausweis):
   - vorname → Vorname des Antragstellers
   - nachname → Nachname des Antragstellers
   - geburtsdatum → Geburtsdatum des Antragstellers
   - steuer_identifikationsnummer → 11-stellige Steuer-ID

3. Adresse-Daten (NUR aktueller Wohnsitz, NICHT Geburtsort):
   - strasse → Straßenname
   - hausnr → Hausnummer
   - plz → 5-stellige Postleitzahl
   - ort → Aktueller Wohnort

4. Gehaltsnachweis-Daten:
   - Extrahiere Brutto-Gehalt, Netto-Gehalt, Arbeitgeber-Name

Antworte NUR mit einem JSON-Objekt ohne zusätzlichen Text. Das Format muss exakt so sein:
{
  "mapped_fields": {
    "field_name": "value",
    ...
  },
  "confidence": 0.95,
  "suggestions": ["Optional: Hinweise zu unsicheren Feldern"]
}`;

    const userPrompt = `Dokumenttyp: ${documentType}
    
OCR-Daten:
${JSON.stringify(ocrData, null, 2)}

Bitte mappe diese Daten intelligent zu den Elterngeldantrag-Feldern.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
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
