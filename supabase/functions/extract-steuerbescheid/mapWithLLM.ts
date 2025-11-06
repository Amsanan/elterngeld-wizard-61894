import { LLM_CONFIG, getRetryDelay } from "../_shared/llm-config.ts";

interface MappingResult {
  data: Record<string, any>;
  provenance?: Record<string, any>;
  confidence?: Record<string, number>;
}

interface MapWithLLMParams {
  schema: any;
  ocrText: string;
  overlayLines?: any[];
}

const TABLE_SCHEMA = {
  table: "einkommensteuerbescheide",
  columns: [
    { name: "steuerjahr", type: "string", required: true, description: "4-digit tax year (e.g., '2023')" },
    { name: "steuernummer", type: "string", description: "Tax number in format XX/XXX/XXXXX or similar" },
    { name: "steuer_id_nummer", type: "string", description: "11-digit tax ID without spaces" },
    { name: "finanzamt_name", type: "string", description: "Name of tax office" },
    { name: "finanzamt_adresse", type: "string", description: "Address of tax office" },
    { name: "bescheiddatum", type: "date", format: "YYYY-MM-DD", description: "Date of assessment" },
    { name: "nachname", type: "string", description: "Last name (use for single assessment)" },
    { name: "vorname", type: "string", description: "First name (use for single assessment)" },
    { name: "partner1_vorname", type: "string", description: "First partner's first name (Ehemann) for joint assessment" },
    { name: "partner1_nachname", type: "string", description: "First partner's last name (Ehemann) for joint assessment" },
    { name: "partner1_steuer_id", type: "string", description: "First partner's tax ID (Ehemann) for joint assessment" },
    { name: "partner2_vorname", type: "string", description: "Second partner's first name (Ehefrau) for joint assessment" },
    { name: "partner2_nachname", type: "string", description: "Second partner's last name (Ehefrau) for joint assessment" },
    { name: "partner2_steuer_id", type: "string", description: "Second partner's tax ID (Ehefrau) for joint assessment" },
    { name: "plz", type: "string", description: "5-digit postal code" },
    { name: "wohnort", type: "string", description: "City/town name" },
    { name: "gesamtbetrag_der_einkuenfte", type: "string", description: "Total income as decimal string" },
    { name: "summe_der_einkuenfte", type: "string", description: "Sum of incomes as decimal string" },
    { name: "zu_versteuerndes_einkommen", type: "string", description: "Taxable income as decimal string" },
    { name: "festgesetzte_steuer", type: "string", description: "Assessed tax as decimal string" },
    { name: "solidaritaetszuschlag", type: "string", description: "Solidarity surcharge as decimal string" },
    { name: "steuerabzug_vom_lohn", type: "string", description: "Tax already withheld from salary - look for 'ab Steuerabzug vom Lohn' or similar label (NOT 'verbleibende Steuer')" },
    { name: "verbleibende_steuer", type: "string", description: "Remaining tax amount to pay or refund - look for 'verbleibende Steuer' label (NOT 'Steuerabzug vom Lohn')" },
    { name: "einkuenfte_selbstaendig", type: "string", description: "Self-employment income as decimal string" },
    { name: "bruttoarbeitslohn", type: "string", description: "Gross salary as decimal string" },
    {
      name: "einkuenfte_nichtselbstaendig",
      type: "string",
      description: "Non-self-employment income as decimal string",
    },
    { name: "werbungskosten", type: "string", description: "Business expenses as decimal string" },
    {
      name: "gemeinsame_veranlagung",
      type: "boolean",
      description: "Joint assessment (true if Ehemann/Ehefrau/Splittingtarif mentioned)",
    },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German tax document data extractor. Extract data from Einkommensteuerbescheid (income tax assessment) OCR text.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German numbers: "1.234,56" → "1234.56" (remove dots, replace comma with period)
3. Dates: Convert to YYYY-MM-DD format
4. If a field is not found or unclear, omit it from output (do NOT guess)
5. Return ONLY valid JSON matching the schema
6. For monetary amounts, preserve precision: "12.345,67" → "12345.67"
7. Tax ID (steuer_id_nummer): 11 digits without spaces
8. Tax number (steuernummer): keep original format with slashes
9. gemeinsame_veranlagung: true if document mentions "Ehemann", "Ehefrau", or "Splittingtarif"
10. For joint assessments: Extract both partners' names and IDs separately
    - Look for "IdNr. Ehemann" or "IdNr. Ehefrau" (or similar labels)
    - partner1 = Ehemann, partner2 = Ehefrau
    - Extract all available information for both partners

CRITICAL - DO NOT CONFUSE THESE FIELDS:
- "steuerabzug_vom_lohn": Tax ALREADY withheld from salary (labeled as "ab Steuerabzug vom Lohn" or "Steuerabzug vom Lohn")
  Example: "ab Steuerabzug vom Lohn: 10.077,00 €" → extract "10077.00" for steuerabzug_vom_lohn
- "verbleibende_steuer": REMAINING tax to pay or refund (labeled as "verbleibende Steuer")
  Example: "verbleibende Steuer: 16.911,00 €" → extract "16911.00" for verbleibende_steuer
- These are DIFFERENT values - match them to their exact labels in the document!

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100 score> },
  "provenance": { <field_name>: "<source text snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText, overlayLines }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  console.log("OpenRouter API key configured:", !!apiKey);

  if (!apiKey) {
    throw new Error("USE_LLM_MAPPING (OpenRouter API Key) not configured");
  }

  const userPrompt = `Extract data from this German tax assessment document.

SCHEMA:
${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}

OCR TEXT:
${ocrText}

${overlayLines && overlayLines.length > 0 ? `\nOVERLAY DATA (positional word/line info):\n${JSON.stringify(overlayLines.slice(0, 50), null, 2)}` : ""}

Return extracted data as JSON only.`;

  console.log("Calling OpenRouter API...");
  console.log("User prompt length:", userPrompt.length);

  const startTime = Date.now();
  let response;
  
  for (let attempt = 0; attempt <= LLM_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt);
        console.log(`Retry attempt ${attempt}/${LLM_CONFIG.maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      response = await fetch(LLM_CONFIG.apiEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://lovable.dev",
        },
        body: JSON.stringify({
          model: LLM_CONFIG.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: LLM_CONFIG.temperature,
        }),
      });

      if (response.ok) {
        break;
      }

      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.error(`Non-retryable error: ${response.status}`);
        break;
      }

      if (attempt === LLM_CONFIG.maxRetries) {
        console.error(`Max retries reached. Last status: ${response.status}`);
        break;
      }

      console.log(`Retryable error ${response.status}, will retry...`);
      
    } catch (fetchError: any) {
      console.error(`OpenRouter API fetch failed (attempt ${attempt + 1}/${LLM_CONFIG.maxRetries + 1}):`, fetchError);
      
      if (attempt === LLM_CONFIG.maxRetries) {
        throw new Error(`Failed to call OpenRouter API after ${LLM_CONFIG.maxRetries + 1} attempts: ${fetchError.message}`);
      }
      
      console.log("Network error, will retry...");
    }
  }

  const fetchDuration = Date.now() - startTime;
  console.log(`OpenRouter API call took ${fetchDuration}ms`);
  
  if (!response) {
    throw new Error("OpenRouter API call failed: no response received");
  }
  
  console.log("OpenRouter API response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API error response:", errorText);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log("OpenRouter API response received");

  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    console.error("No content in OpenRouter response:", JSON.stringify(result));
    throw new Error("No content in OpenRouter response");
  }

  console.log("LLM response content length:", content.length);
  console.log("Raw LLM response (first 500 chars):", content.substring(0, 500));

  // Extract JSON from markdown code blocks if present
  let jsonContent = content.trim();
  
  // Remove markdown code blocks like ```json ... ```
  const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    jsonContent = jsonBlockMatch[1].trim();
    console.log("Extracted JSON from markdown block");
  }
  
  // Try to find JSON object if there's extra text
  const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch && !jsonContent.startsWith('{')) {
    jsonContent = jsonObjectMatch[0];
    console.log("Extracted JSON object from text");
  }

  let parsed: MappingResult;
  try {
    parsed = JSON.parse(jsonContent);
    console.log("Successfully parsed LLM JSON response");
    console.log("Parsed data keys:", Object.keys(parsed.data || {}));
  } catch (e) {
    console.error("Failed to parse LLM response");
    console.error("Cleaned content:", jsonContent);
    console.error("Parse error:", e);
    throw new Error(`LLM returned invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  // Validate and normalize the data
  if (!parsed.data) {
    console.error("LLM response missing 'data' field:", parsed);
    throw new Error("LLM response missing 'data' field");
  }

  console.log("Extracted data fields:", Object.keys(parsed.data));
  console.log("Full LLM Response JSON:", JSON.stringify(parsed, null, 2));

  // Normalize number formats (remove unknown fields, keep only schema fields)
  const validFields = new Set(TABLE_SCHEMA.columns.map((c) => c.name));
  const normalizedData: Record<string, any> = {};

  for (const [key, value] of Object.entries(parsed.data)) {
    if (!validFields.has(key)) continue;

    if (value === null || value === undefined) continue;

    // Normalize string numbers (already in correct format from LLM)
    normalizedData[key] = value;
  }

  return {
    data: normalizedData,
    confidence: parsed.confidence || {},
    provenance: parsed.provenance || {},
  };
}
