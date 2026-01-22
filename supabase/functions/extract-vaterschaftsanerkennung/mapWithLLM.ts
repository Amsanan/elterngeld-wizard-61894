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
  table: "vaterschaftsanerkennungen",
  columns: [
    { name: "kind_vorname", type: "string", description: "Child's first name" },
    { name: "kind_nachname", type: "string", description: "Child's last name" },
    { name: "kind_geburtsdatum", type: "date", format: "YYYY-MM-DD", description: "Child's date of birth" },
    { name: "kind_geburtsort", type: "string", description: "Child's place of birth" },
    { name: "vater_vorname", type: "string", description: "Father's first name" },
    { name: "vater_nachname", type: "string", description: "Father's last name" },
    { name: "vater_geburtsdatum", type: "date", format: "YYYY-MM-DD", description: "Father's date of birth" },
    { name: "mutter_vorname", type: "string", description: "Mother's first name" },
    { name: "mutter_nachname", type: "string", description: "Mother's last name" },
    { name: "mutter_geburtsdatum", type: "date", format: "YYYY-MM-DD", description: "Mother's date of birth" },
    { name: "anerkennungsdatum", type: "date", format: "YYYY-MM-DD", description: "Date of paternity acknowledgment" },
    { name: "zustimmungsdatum", type: "date", format: "YYYY-MM-DD", description: "Date of mother's consent" },
    { name: "beurkundungsstelle", type: "string", description: "Certifying authority (Standesamt, Jugendamt, Notar)" },
    { name: "urkundennummer", type: "string", description: "Certificate/document number" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German paternity acknowledgment (Vaterschaftsanerkennung) data extractor.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD" format
3. If a field is not found or unclear, omit it from output (do NOT guess)
4. Return ONLY valid JSON matching the schema
5. For names, preserve German characters (ä, ö, ü, ß)
6. Look for "Anerkennung der Vaterschaft", "Zustimmungserklärung der Mutter"
7. The certifying authority can be Standesamt, Jugendamt, or Notar

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
