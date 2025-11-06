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
  ],
};

const SYSTEM_PROMPT = `You are a specialized German employer certificate (Arbeitgeberbescheinigung) data extractor. Extract data from employer certification OCR text.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD" format
3. German numbers: "1.234,56" → "1234.56" (remove dots, replace comma with period)
4. If a field is not found or unclear, omit it from output (do NOT guess)
5. Return ONLY valid JSON matching the schema
6. For monetary amounts and hours, preserve precision
7. beschaeftigungsende is only filled if employment has ended

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
  const maxRetries = 3;
  const baseDelay = 1000;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));

      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://lovable.dev",
        },
        body: JSON.stringify({
          model: "mistralai/mistral-small-3.1-24b-instruct",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
        }),
      });

      if (response.ok) break;
      if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
      if (attempt === maxRetries) break;
      
    } catch (fetchError: any) {
      if (attempt === maxRetries) {
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
