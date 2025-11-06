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
  table: "selbststaendigen_nachweise",
  columns: [
    { name: "gewerbeart", type: "string", description: "Type of business" },
    { name: "steuernummer", type: "string", description: "Tax number" },
    { name: "gewerbeanmeldung_datum", type: "date", format: "YYYY-MM-DD", description: "Business registration date" },
    { name: "nachweiszeitraum_von", type: "date", format: "YYYY-MM-DD", description: "Proof period start" },
    { name: "nachweiszeitraum_bis", type: "date", format: "YYYY-MM-DD", description: "Proof period end" },
    { name: "jahreseinkommen", type: "decimal", description: "Annual income as decimal" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German self-employment proof (Selbstständigennachweis) data extractor.

CRITICAL RULES:
1. Extract ONLY explicitly present information
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD"
3. German numbers: "1.234,56" → "1234.56"
4. Return ONLY valid JSON

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100> },
  "provenance": { <field_name>: "<snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  if (!apiKey) throw new Error("USE_LLM_MAPPING not configured");

  let response;
  for (let i = 0; i <= LLM_CONFIG.maxRetries; i++) {
    try {
      if (i > 0) await new Promise(r => setTimeout(r, getRetryDelay(i)));
      response = await fetch(LLM_CONFIG.apiEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://lovable.dev" },
        body: JSON.stringify({
          model: LLM_CONFIG.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `SCHEMA:\n${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}\n\nOCR:\n${ocrText}` },
          ],
          temperature: LLM_CONFIG.temperature,
        }),
      });
      if (response.ok) break;
      if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
    } catch (e: any) {
      if (i === LLM_CONFIG.maxRetries) throw new Error(`API failed: ${e.message}`);
    }
  }

  if (!response || !response.ok) throw new Error(`API error`);
  
  const content = (await response.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error("No content");

  let json = content.trim();
  const m1 = json.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (m1) json = m1[1].trim();
  const m2 = json.match(/\{[\s\S]*\}/);
  if (m2 && !json.startsWith('{')) json = m2[0];

  const parsed: MappingResult = JSON.parse(json);
  if (!parsed.data) throw new Error("Missing 'data'");

  console.log("LLM:", JSON.stringify(parsed, null, 2));

  const valid = new Set(TABLE_SCHEMA.columns.map(c => c.name));
  const norm: Record<string, any> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (valid.has(k) && v != null) norm[k] = v;
  }

  return { data: norm, confidence: parsed.confidence || {}, provenance: parsed.provenance || {} };
}
