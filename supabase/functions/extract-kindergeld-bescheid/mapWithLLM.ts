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
  table: "kindergeld_bescheide",
  columns: [
    { name: "familienkasse", type: "string", description: "Family benefits office name (Familienkasse)" },
    { name: "kindergeld_nummer", type: "string", description: "Child benefit number (Kindergeld-Nr.)" },
    { name: "kind_vorname", type: "string", description: "Child's first name" },
    { name: "kind_nachname", type: "string", description: "Child's last name" },
    { name: "kind_geburtsdatum", type: "date", format: "YYYY-MM-DD", description: "Child's date of birth" },
    { name: "kind_ordnungszahl", type: "integer", description: "Child's order number (1st, 2nd, 3rd child)" },
    { name: "bescheiddatum", type: "date", format: "YYYY-MM-DD", description: "Notice date" },
    { name: "betrag_monatlich", type: "decimal", description: "Monthly amount in EUR" },
    { name: "zahlungsbeginn", type: "date", format: "YYYY-MM-DD", description: "Payment start date" },
    { name: "zahlungsende", type: "date", format: "YYYY-MM-DD", description: "Payment end date (if specified)" },
    { name: "iban", type: "string", description: "Bank account IBAN" },
    { name: "kontoinhaber", type: "string", description: "Account holder name" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German child benefit notice (Kindergeld-Bescheid) data extractor.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD" format
3. German numbers: "1.234,56" → "1234.56" (monetary amounts)
4. If a field is not found or unclear, omit it from output (do NOT guess)
5. Return ONLY valid JSON matching the schema
6. Look for "Familienkasse", "Kindergeld-Nr.", "Kindergeld wird gezahlt"
7. Current Kindergeld amounts: €250/month per child (2024+)

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
            { role: "user", content: `SCHEMA:\n${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}\n\nOCR:\n${ocrText}` },
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

  if (!response || !response.ok) throw new Error(`API error`);
  
  const content = (await response.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error("No content");

  let jsonContent = content.trim();
  const match1 = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (match1) jsonContent = match1[1].trim();
  const match2 = jsonContent.match(/\{[\s\S]*\}/);
  if (match2 && !jsonContent.startsWith('{')) jsonContent = match2[0];

  const parsed: MappingResult = JSON.parse(jsonContent);
  if (!parsed.data) throw new Error("Missing 'data'");

  console.log("LLM Response:", JSON.stringify(parsed, null, 2));

  const validFields = new Set(TABLE_SCHEMA.columns.map(c => c.name));
  const normalizedData: Record<string, any> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (validFields.has(k) && v !== null && v !== undefined) normalizedData[k] = v;
  }

  return { data: normalizedData, confidence: parsed.confidence || {}, provenance: parsed.provenance || {} };
}
