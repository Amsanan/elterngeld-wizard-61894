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
  table: "arbeitgeberbescheinigungen",
  columns: [
    { name: "arbeitgeber_name", type: "string", description: "Employer name" },
    { name: "arbeitgeber_adresse", type: "string", description: "Employer address" },
    { name: "beschaeftigungsbeginn", type: "date", format: "YYYY-MM-DD", description: "Employment start date" },
    { name: "beschaeftigungsende", type: "date", format: "YYYY-MM-DD", description: "Employment end date (if applicable)" },
    { name: "wochenstunden", type: "decimal", description: "Weekly working hours as decimal" },
    { name: "bruttogehalt", type: "decimal", description: "Gross monthly salary as decimal" },
    { name: "ausstelldatum", type: "date", format: "YYYY-MM-DD", description: "Date of issue" },
    // Elternzeit periods
    { name: "elternzeit_1_von", type: "date", format: "YYYY-MM-DD", description: "Elternzeit period 1 start" },
    { name: "elternzeit_1_bis", type: "date", format: "YYYY-MM-DD", description: "Elternzeit period 1 end" },
    { name: "elternzeit_2_von", type: "date", format: "YYYY-MM-DD", description: "Elternzeit period 2 start" },
    { name: "elternzeit_2_bis", type: "date", format: "YYYY-MM-DD", description: "Elternzeit period 2 end" },
    { name: "elternzeit_3_von", type: "date", format: "YYYY-MM-DD", description: "Elternzeit period 3 start" },
    { name: "elternzeit_3_bis", type: "date", format: "YYYY-MM-DD", description: "Elternzeit period 3 end" },
    // Mutterschutz
    { name: "mutterschutz_beginn", type: "date", format: "YYYY-MM-DD", description: "Maternity protection start (6 weeks before ET)" },
    { name: "mutterschutz_ende", type: "date", format: "YYYY-MM-DD", description: "Maternity protection end (8 weeks after birth)" },
    // Urlaub
    { name: "urlaub_1_von", type: "date", format: "YYYY-MM-DD", description: "Vacation period 1 start" },
    { name: "urlaub_1_bis", type: "date", format: "YYYY-MM-DD", description: "Vacation period 1 end" },
    { name: "urlaub_2_von", type: "date", format: "YYYY-MM-DD", description: "Vacation period 2 start" },
    { name: "urlaub_2_bis", type: "date", format: "YYYY-MM-DD", description: "Vacation period 2 end" },
    { name: "resturlaub_tage", type: "integer", description: "Remaining vacation days" },
    // AG-Zuschuss zum Mutterschaftsgeld
    { name: "ag_zuschuss_mutterschaftsgeld", type: "decimal", description: "Employer supplement to maternity pay (total or monthly)" },
    { name: "ag_zuschuss_beginn", type: "date", format: "YYYY-MM-DD", description: "AG-Zuschuss start date" },
    { name: "ag_zuschuss_ende", type: "date", format: "YYYY-MM-DD", description: "AG-Zuschuss end date" },
    { name: "ag_zuschuss_tagessatz", type: "decimal", description: "AG-Zuschuss daily rate" },
    // Sachbezüge
    { name: "sachbezuege_ja", type: "boolean", description: "Whether Sachbezüge (benefits in kind) were provided" },
    { name: "sachbezuege_von", type: "date", format: "YYYY-MM-DD", description: "Sachbezüge period start" },
    { name: "sachbezuege_bis", type: "date", format: "YYYY-MM-DD", description: "Sachbezüge period end" },
    { name: "sachbezuege_tagessatz", type: "decimal", description: "Sachbezüge daily value" },
    // Teilzeit während Elternzeit
    { name: "teilzeit_elternzeit_ja", type: "boolean", description: "Whether part-time work during Elternzeit" },
    { name: "teilzeit_von", type: "date", format: "YYYY-MM-DD", description: "Part-time period start" },
    { name: "teilzeit_bis", type: "date", format: "YYYY-MM-DD", description: "Part-time period end" },
    { name: "teilzeit_stunden", type: "decimal", description: "Part-time weekly hours" },
    { name: "teilzeit_brutto", type: "decimal", description: "Part-time gross salary" },
    { name: "teilzeit_netto", type: "decimal", description: "Part-time net salary" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German employer certificate (Arbeitgeberbescheinigung) data extractor for Elterngeld applications.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD" format
3. German numbers: "1.234,56" → "1234.56" (remove dots, replace comma with period)
4. If a field is not found or unclear, omit it from output (do NOT guess)
5. Return ONLY valid JSON matching the schema
6. For monetary amounts and hours, preserve precision
7. beschaeftigungsende is only filled if employment has ended

ELTERNGELD-SPECIFIC FIELDS:
- Look for "Elternzeit" periods (up to 3 periods with von/bis dates)
- Look for "Mutterschutz" / "Mutterschutzfrist" dates
- Look for "Arbeitgeberzuschuss zum Mutterschaftsgeld" or "AG-Zuschuss"
- Look for "Sachbezüge" / "geldwerte Vorteile" with amounts
- Look for "Teilzeit während Elternzeit" or "Teilzeitarbeit"
- Look for "Resturlaub" or "Urlaubsanspruch"

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100 score> },
  "provenance": { <field_name>: "<source text snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText, overlayLines }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  if (!apiKey) throw new Error("USE_LLM_MAPPING (OpenRouter API Key) not configured");

  const userPrompt = `Extract data from this German employer certificate.

SCHEMA:
${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}

OCR TEXT:
${ocrText}

${overlayLines && overlayLines.length > 0 ? `\nOVERLAY DATA:\n${JSON.stringify(overlayLines.slice(0, 50), null, 2)}` : ""}

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
      if (attempt === LLM_CONFIG.maxRetries) {
        throw new Error(`Failed to call OpenRouter API: ${fetchError.message}`);
      }
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
