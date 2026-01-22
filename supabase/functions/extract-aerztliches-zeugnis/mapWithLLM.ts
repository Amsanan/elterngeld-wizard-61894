import { LLM_CONFIG, getRetryDelay } from "../_shared/llm-config.ts";

interface MappingResult {
  data: Record<string, any>;
  provenance?: Record<string, any>;
  confidence?: Record<string, number>;
}

interface MapWithLLMParams {
  schema: any;
  ocrText: string;
  zeugnisTyp?: string;
  overlayLines?: any[];
}

const TABLE_SCHEMA = {
  table: "aerztliche_zeugnisse",
  columns: [
    { name: "arzt_name", type: "string", description: "Doctor's name" },
    { name: "arzt_praxis", type: "string", description: "Practice/clinic name and address" },
    { name: "ausstelldatum", type: "date", format: "YYYY-MM-DD", description: "Date of issue" },
    { name: "errechneter_geburtstermin", type: "date", format: "YYYY-MM-DD", description: "Expected due date (ET)" },
    { name: "verbot_beginn", type: "date", format: "YYYY-MM-DD", description: "Employment prohibition start date" },
    { name: "verbot_ende", type: "date", format: "YYYY-MM-DD", description: "Employment prohibition end date" },
    { name: "verbot_grund", type: "string", description: "Reason for employment prohibition" },
    { name: "verbot_art", type: "string", description: "Type: 'teilweise' (partial) or 'vollstaendig' (complete)" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German medical certificate data extractor for pregnancy-related documents.

DOCUMENT TYPES:
1. ET-Bescheinigung (Expected Due Date Certificate): Contains "errechneter Geburtstermin" or "voraussichtlicher Entbindungstermin"
2. Beschäftigungsverbot (Employment Prohibition): Contains prohibition dates and reasons

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD" format
3. If a field is not found or unclear, omit it from output (do NOT guess)
4. Return ONLY valid JSON matching the schema
5. For ET certificates, the key field is "errechneter_geburtstermin"
6. For Beschäftigungsverbot, extract verbot_beginn, verbot_ende, verbot_grund, verbot_art

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100 score> },
  "provenance": { <field_name>: "<source text snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText, zeugnisTyp }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  if (!apiKey) throw new Error("USE_LLM_MAPPING not configured");

  const contextHint = zeugnisTyp === 'beschaeftigungsverbot' 
    ? 'This is a Beschäftigungsverbot (employment prohibition) certificate. Focus on prohibition dates and reasons.'
    : 'This is an ET-Bescheinigung (expected due date certificate). Focus on the expected delivery date.';

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
            { role: "user", content: `${contextHint}\n\nSCHEMA:\n${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}\n\nOCR:\n${ocrText}` },
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
