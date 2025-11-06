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
  table: "bankverbindungen",
  columns: [
    { name: "kontoinhaber", type: "string", required: true, description: "Account holder name" },
    { name: "iban", type: "string", required: true, description: "IBAN without spaces (e.g., DE89370400440532013000)" },
    { name: "bic", type: "string", description: "BIC/SWIFT code (8 or 11 characters)" },
    { name: "bank_name", type: "string", description: "Bank name" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German bank account (Bankverbindung) data extractor. Extract data from bank statements or account confirmations.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. IBAN: Remove all spaces, keep only alphanumeric characters (e.g., "DE89 3704 0044 0532 0130 00" → "DE89370400440532013000")
3. BIC: 8 or 11 characters, uppercase (e.g., "COBADEFFXXX")
4. If a field is not found or unclear, omit it from output (do NOT guess)
5. Return ONLY valid JSON matching the schema
6. Preserve German characters in names (ä, ö, ü, ß)

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100 score> },
  "provenance": { <field_name>: "<source text snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText, overlayLines }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  if (!apiKey) throw new Error("USE_LLM_MAPPING (OpenRouter API Key) not configured");

  const userPrompt = `Extract data from this German bank account document.

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
