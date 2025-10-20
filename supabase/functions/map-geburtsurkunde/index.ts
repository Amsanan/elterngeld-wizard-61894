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
  kind: ["vorname", "nachname", "geburtsdatum", "anzahl_mehrlinge", "fruehgeboren", "errechneter_geburtsdatum", "behinderung", "anzahl_weitere_kinder", "keine_weitere_kinder", "insgesamt"]
};

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
    const { pages, antragId } = await req.json();
    console.log("Processing Geburtsurkunde, Pages:", pages?.length || 0);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const imagesToProcess = pages || [];

    if (imagesToProcess.length === 0) {
      throw new Error("No pages provided for processing");
    }

    console.log(`Processing ${imagesToProcess.length} page(s) for Geburtsurkunde`);

    // Process birth certificate (typically single page)
    const page = imagesToProcess[0];
    const prompt = getBirthCertificatePrompt();

    console.log(`Processing birth certificate page ${page.pageNumber}`);

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
      console.error(`AI API error:`, errorText);
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log(`AI Response:`, JSON.stringify(aiResponse, null, 2));

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`No content in AI response`);
    }

    // Extract JSON from markdown code block if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    console.log(`Extracted JSON:`, jsonStr);
    const pageData = JSON.parse(jsonStr);
    
    console.log(`Child Data:`, JSON.stringify({
      vorname: pageData.mapped_fields?.vorname,
      nachname: pageData.mapped_fields?.nachname,
      geburtsdatum: pageData.mapped_fields?.geburtsdatum,
      anzahl_mehrlinge: pageData.mapped_fields?.anzahl_mehrlinge,
      fruehgeboren: pageData.mapped_fields?.fruehgeboren
    }, null, 2));

    const finalResult = {
      mapped_fields: pageData.mapped_fields || {},
      confidence: pageData.confidence || 0,
      suggestions: pageData.suggestions || [],
    };

    console.log('Final result:', JSON.stringify(finalResult, null, 2));

    // Only save to database if antragId is provided
    // During initial extraction (preview), antragId is null and we just return the data
    if (antragId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { mapped_fields } = finalResult;

      // Handle kind (child) data
      const kindFields: any = {
        antrag_id: antragId,
      };

      const allowedFields = TABLE_FIELDS["kind"] || [];
      let hasData = false;
      
      for (const [key, value] of Object.entries(mapped_fields)) {
        if (allowedFields.includes(key) && value !== null && value !== undefined) {
          kindFields[key] = value;
          hasData = true;
        }
      }

      if (hasData) {
        await upsertRecord(supabase, "kind", kindFields, { antrag_id: antragId });
      }
    } else {
      console.log('Skipping database save - no antragId provided (extraction only)');
    }

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in map-geburtsurkunde function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
