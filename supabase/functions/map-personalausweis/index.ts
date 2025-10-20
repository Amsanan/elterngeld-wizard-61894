import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple MRZ parser for German Personalausweis (TD1 format)
function parseTD1MRZ(mrzLines: string[]) {
  if (mrzLines.length !== 3) {
    return { valid: false, error: 'Invalid number of MRZ lines (expected 3)' };
  }

  try {
    // Line 2: Birth date, Sex, Expiry date, Nationality
    const line2 = mrzLines[1];
    const birthDate = line2.substring(0, 6); // YYMMDD
    const sex = line2.substring(7, 8); // M/F
    const expiryDate = line2.substring(8, 14); // YYMMDD
    const nationality = line2.substring(15, 18); // D for German

    // Line 3: Last name << First names
    const line3 = mrzLines[2];
    const nameParts = line3.split('<<');
    const lastName = nameParts[0]?.replace(/</g, ' ').trim() || '';
    const firstName = nameParts[1]?.replace(/</g, ' ').trim() || '';

    return {
      valid: true,
      fields: {
        lastName,
        firstName,
        birthDate,
        sex,
        expirationDate: expiryDate,
        nationality: nationality.replace(/</g, '').trim(),
      }
    };
  } catch (error) {
    return { valid: false, error: `MRZ parsing error: ${error}` };
  }
}

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

// Prompt to extract MRZ text from the back of the ID card
function getMRZExtractionPrompt(): string {
  return `Du bist ein MRZ-Extraktionsassistent für deutsche Personalausweise.

Analysiere das Bild und bestimme, ob es die RÜCKSEITE eines deutschen Personalausweises zeigt.
Die Rückseite enthält die MRZ (Machine Readable Zone) - das sind 2-3 Textzeilen am unteren Rand mit speziellen Zeichen wie <<< und Buchstaben/Zahlen.

Beispiel einer deutschen Personalausweis-MRZ:
IDD<<T220001293<<<<<<<<<<<<<<<
7408122F1010315D<<<<<<<<<<<<<<
MUSTERMANN<<ERIKA<<<<<<<<<<<<<

Wenn du eine MRZ findest:
1. Extrahiere die MRZ-Zeilen EXAKT wie sie erscheinen (inkl. aller < Zeichen)
2. Stelle sicher, dass du alle Zeichen korrekt erfasst

Antworte NUR mit JSON in diesem Format:
{
  "has_mrz": true oder false,
  "mrz_lines": ["zeile1", "zeile2", "zeile3"] oder []
}

Wenn keine MRZ gefunden wird, antworte mit:
{
  "has_mrz": false,
  "mrz_lines": []
}`;
}

// Helper function to format MRZ date (YYMMDD) to YYYY-MM-DD
function formatMRZDate(mrzDate: string): string {
  if (!mrzDate || mrzDate.length !== 6) return "";
  
  const yy = parseInt(mrzDate.substring(0, 2));
  const mm = mrzDate.substring(2, 4);
  const dd = mrzDate.substring(4, 6);
  
  // German IDs: assume < 30 = 2000s, >= 30 = 1900s
  const yyyy = yy < 30 ? 2000 + yy : 1900 + yy;
  
  return `${yyyy}-${mm}-${dd}`;
}

// Helper function to clean name from MRZ format (removes < and converts to proper case)
function cleanMRZName(name: string): string {
  if (!name) return "";
  return name
    .split("<<")
    .map(part => 
      part.split("<")
        .filter(n => n.length > 0)
        .map(n => n.charAt(0) + n.slice(1).toLowerCase())
        .join(", ")
    )
    .join(" ")
    .trim();
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

    // Process each page to extract MRZ
    const allResults: any[] = [];
    
    for (const page of imagesToProcess) {
      const prompt = getMRZExtractionPrompt();
      console.log(`Processing page ${page.pageNumber} for MRZ extraction`);

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
      const mrzData = JSON.parse(jsonStr);
      
      if (mrzData.has_mrz && mrzData.mrz_lines && mrzData.mrz_lines.length > 0) {
        console.log(`MRZ found on page ${page.pageNumber}, parsing...`);
        
        try {
          const mrzText = mrzData.mrz_lines.join('\n');
          console.log('MRZ text:', mrzText);
          
          const parsedMRZ = parseTD1MRZ(mrzData.mrz_lines);
          console.log('Parsed MRZ:', JSON.stringify(parsedMRZ, null, 2));
          
          if (parsedMRZ.valid && parsedMRZ.fields) {
            const fields = parsedMRZ.fields;
            
            // Extract data from MRZ
            const extractedData: any = {
              page_side: 'back',
              mapped_fields: {
                nachname: cleanMRZName(fields.lastName || ''),
                vorname: cleanMRZName(fields.firstName || ''),
                geburtsdatum: formatMRZDate(fields.birthDate || ''),
                staatsangehoerigkeit: fields.nationality === 'D' ? 'DEUTSCH' : fields.nationality || '',
                geschlecht: fields.sex === 'M' ? 'maennlich' : fields.sex === 'F' ? 'weiblich' : '',
                gueltig_bis: formatMRZDate(fields.expirationDate || ''),
              },
              confidence: 0.95,
              reason: 'MRZ erfolgreich geparst',
              suggestions: []
            };
            
            console.log('Extracted from MRZ:', JSON.stringify(extractedData, null, 2));
            allResults.push(extractedData);
          } else {
            console.log('MRZ parsing failed - invalid format:', parsedMRZ.error);
            allResults.push({
              page_side: 'unknown',
              mapped_fields: {},
              confidence: 0,
              reason: parsedMRZ.error || 'MRZ konnte nicht geparst werden',
              suggestions: ['Bitte Bild erneut hochladen mit besserem Focus auf MRZ']
            });
          }
        } catch (mrzError) {
          console.error('Error parsing MRZ:', mrzError);
          const errorMsg = mrzError instanceof Error ? mrzError.message : 'Unknown error';
          allResults.push({
            page_side: 'unknown',
            mapped_fields: {},
            confidence: 0,
            reason: `MRZ Parse-Fehler: ${errorMsg}`,
            suggestions: ['Bitte Bild erneut hochladen']
          });
        }
      } else {
        console.log(`No MRZ found on page ${page.pageNumber}`);
        allResults.push({
          page_side: 'unknown',
          mapped_fields: {},
          confidence: 0,
          reason: 'Keine MRZ gefunden',
          suggestions: ['Bitte Rückseite des Personalausweises hochladen']
        });
      }
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
