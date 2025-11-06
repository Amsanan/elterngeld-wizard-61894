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
  table: "leistungsbescheide",
  columns: [
    { name: "leistungsart", type: "string", description: "Type of benefit (e.g., ALG I, ALG II, Wohngeld)" },
    { name: "bewilligungsstelle", type: "string", description: "Granting authority" },
    { name: "bescheiddatum", type: "date", format: "YYYY-MM-DD", description: "Decision date" },
    { name: "leistungsbeginn", type: "date", format: "YYYY-MM-DD", description: "Benefit start date" },
    { name: "leistungsende", type: "date", format: "YYYY-MM-DD", description: "Benefit end date" },
    { name: "monatsbetrag", type: "decimal", description: "Monthly amount as decimal" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German benefit decision (Leistungsbescheid) data extractor.

CRITICAL RULES:
1. Extract ONLY explicitly present information
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
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://lovable.dev" },
        body: JSON.stringify({
          model: "mistralai/mistral-small-3.1-24b-instruct",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `SCHEMA:\n${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}\n\nOCR:\n${ocrText}` },
          ],
          temperature: 0.1,
        }),
      });
      if (response.ok) break;
      if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
    } catch (e: any) {
      if (attempt === 3) throw new Error(`API failed: ${e.message}`);
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
