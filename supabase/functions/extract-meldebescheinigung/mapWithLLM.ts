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
  table: "meldebescheinigungen",
  columns: [
    { name: "vorname", type: "string", description: "First name" },
    { name: "nachname", type: "string", description: "Last name" },
    { name: "geburtsdatum", type: "date", format: "YYYY-MM-DD", description: "Date of birth" },
    { name: "strasse", type: "string", description: "Street name" },
    { name: "hausnummer", type: "string", description: "House number" },
    { name: "plz", type: "string", description: "5-digit postal code" },
    { name: "wohnort", type: "string", description: "City/town name" },
    { name: "meldedatum", type: "date", format: "YYYY-MM-DD", description: "Registration date" },
    { name: "behoerde", type: "string", description: "Issuing authority (Bürgeramt/Einwohnermeldeamt)" },
    { name: "ausstelldatum", type: "date", format: "YYYY-MM-DD", description: "Date of issue" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German registration certificate (Meldebescheinigung) data extractor. Extract data from registration certificate OCR text.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD" format
3. If a field is not found or unclear, omit it from output (do NOT guess)
4. Return ONLY valid JSON matching the schema
5. Preserve German characters (ä, ö, ü, ß)
6. PLZ must be exactly 5 digits
7. Distinguish between meldedatum (registration date) and ausstelldatum (issue date)

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100 score> },
  "provenance": { <field_name>: "<source text snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText, overlayLines }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  if (!apiKey) throw new Error("USE_LLM_MAPPING (OpenRouter API Key) not configured");

  const userPrompt = `Extract data from this German registration certificate.

SCHEMA:
${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}

OCR TEXT:
${ocrText}

Return extracted data as JSON only.`;

  let response;
  
  for (let attempt = 0; attempt <= LLM_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, getRetryDelay(attempt)));

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

      if (response.ok) break;
      if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
      if (attempt === LLM_CONFIG.maxRetries) break;
    } catch (fetchError: any) {
      if (attempt === LLM_CONFIG.maxRetries) throw new Error(`Failed to call OpenRouter API: ${fetchError.message}`);
    }
  }

  if (!response || !response.ok) {
    const errorText = response ? await response.text() : "No response";
    throw new Error(`OpenRouter API error: ${response?.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in OpenRouter response");

  let jsonContent = content.trim();
  const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) jsonContent = jsonBlockMatch[1].trim();
  const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch && !jsonContent.startsWith('{')) jsonContent = jsonObjectMatch[0];

  const parsed: MappingResult = JSON.parse(jsonContent);
  if (!parsed.data) throw new Error("LLM response missing 'data' field");

  console.log("Full LLM Response JSON:", JSON.stringify(parsed, null, 2));

  const validFields = new Set(TABLE_SCHEMA.columns.map((c) => c.name));
  const normalizedData: Record<string, any> = {};

  for (const [key, value] of Object.entries(parsed.data)) {
    if (validFields.has(key) && value !== null && value !== undefined) {
      normalizedData[key] = value;
    }
  }

  return {
    data: normalizedData,
    confidence: parsed.confidence || {},
    provenance: parsed.provenance || {},
  };
}
