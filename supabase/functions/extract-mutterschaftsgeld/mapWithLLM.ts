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
  table: "mutterschaftsgeld",
  columns: [
    { name: "krankenkasse_name", type: "string", description: "Health insurance company name" },
    { name: "versichertennummer", type: "string", description: "Insurance number" },
    { name: "bescheiddatum", type: "date", format: "YYYY-MM-DD", description: "Decision date" },
    { name: "leistungsbeginn", type: "date", format: "YYYY-MM-DD", description: "Benefit start date" },
    { name: "leistungsende", type: "date", format: "YYYY-MM-DD", description: "Benefit end date" },
    { name: "tagessatz", type: "decimal", description: "Daily amount as decimal" },
    { name: "gesamtbetrag", type: "decimal", description: "Total amount as decimal" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German maternity benefit (Mutterschaftsgeld) data extractor.

CRITICAL RULES:
1. Extract ONLY information explicitly present
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD"
3. German numbers: "1.234,56" → "1234.56"
4. Return ONLY valid JSON

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100 score> },
  "provenance": { <field_name>: "<source text snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  if (!apiKey) throw new Error("USE_LLM_MAPPING not configured");

  let response;
  for (let attempt = 0; attempt <= LLM_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, getRetryDelay(attempt)));
      response = await fetch(LLM_CONFIG.apiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://lovable.dev" },
        body: JSON.stringify({
          model: LLM_CONFIG.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Extract from:\n\nSCHEMA:\n${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}\n\nOCR:\n${ocrText}` },
          ],
          temperature: LLM_CONFIG.temperature,
        }),
      });
      if (response.ok) break;
      if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
    } catch (e: any) {
      if (attempt === LLM_CONFIG.maxRetries) throw new Error(`API failed: ${e.message}`);
    }
  }

  if (!response || !response.ok) throw new Error(`API error: ${response?.status}`);
  
  const content = (await response.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error("No content");

  let jsonContent = content.trim();
  const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) jsonContent = jsonBlockMatch[1].trim();
  const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch && !jsonContent.startsWith('{')) jsonContent = jsonObjectMatch[0];

  const parsed: MappingResult = JSON.parse(jsonContent);
  if (!parsed.data) throw new Error("Missing 'data'");

  console.log("LLM Response:", JSON.stringify(parsed, null, 2));

  const validFields = new Set(TABLE_SCHEMA.columns.map(c => c.name));
  const normalizedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (validFields.has(key) && value !== null && value !== undefined) normalizedData[key] = value;
  }

  return { data: normalizedData, confidence: parsed.confidence || {}, provenance: parsed.provenance || {} };
}
