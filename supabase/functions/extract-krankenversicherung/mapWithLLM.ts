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
  table: "krankenversicherung_nachweise",
  columns: [
    { name: "krankenkasse_name", type: "string", description: "Health insurance company name" },
    { name: "versichertennummer", type: "string", description: "Insurance number" },
    { name: "versicherungsart", type: "string", description: "Type of insurance (gesetzlich/privat)" },
    { name: "versicherungsbeginn", type: "date", format: "YYYY-MM-DD", description: "Insurance start date" },
    { name: "beitragssatz", type: "decimal", description: "Contribution rate as decimal" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German health insurance certificate (Krankenversicherungsnachweis) data extractor.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD"
3. German numbers: "1.234,56" → "1234.56"
4. versicherungsart: should be "gesetzlich" or "privat"
5. Return ONLY valid JSON matching the schema

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100 score> },
  "provenance": { <field_name>: "<source text snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText, overlayLines }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  if (!apiKey) throw new Error("USE_LLM_MAPPING not configured");

  const userPrompt = `Extract data from this German health insurance certificate.

SCHEMA:
${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}

OCR TEXT:
${ocrText}

Return extracted data as JSON only.`;

  let response;
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
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
    } catch (e: any) {
      if (attempt === 3) throw new Error(`API call failed: ${e.message}`);
    }
  }

  if (!response || !response.ok) throw new Error(`API error: ${response?.status}`);
  
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in response");

  let jsonContent = content.trim();
  const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) jsonContent = jsonBlockMatch[1].trim();
  const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch && !jsonContent.startsWith('{')) jsonContent = jsonObjectMatch[0];

  const parsed: MappingResult = JSON.parse(jsonContent);
  if (!parsed.data) throw new Error("Missing 'data' field");

  console.log("Full LLM Response:", JSON.stringify(parsed, null, 2));

  const validFields = new Set(TABLE_SCHEMA.columns.map(c => c.name));
  const normalizedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (validFields.has(key) && value !== null && value !== undefined) normalizedData[key] = value;
  }

  return { data: normalizedData, confidence: parsed.confidence || {}, provenance: parsed.provenance || {} };
}
