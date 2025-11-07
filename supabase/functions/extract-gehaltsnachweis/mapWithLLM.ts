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
  table: "gehaltsnachweise",
  columns: [
    { name: "abrechnungsmonat", type: "string", required: true, description: "Billing month in format MM/YYYY or month name YYYY" },
    { name: "arbeitgeber_name", type: "string", description: "Employer name" },
    { name: "bruttogehalt", type: "decimal", description: "Gross salary as decimal string" },
    { name: "nettogehalt", type: "decimal", description: "Net salary as decimal string" },
    { name: "sozialversicherungsnummer", type: "string", description: "Social security number" },
    { name: "steuer_id", type: "string", description: "Tax ID (11 digits)" },
    { name: "lohnsteuer", type: "decimal", description: "Income tax deduction" },
    { name: "solidaritaetszuschlag", type: "decimal", description: "Solidarity surcharge" },
    { name: "kirchensteuer", type: "decimal", description: "Church tax" },
    { name: "krankenversicherung", type: "decimal", description: "Health insurance contribution" },
    { name: "pflegeversicherung", type: "decimal", description: "Care insurance contribution" },
    { name: "rentenversicherung", type: "decimal", description: "Pension insurance contribution" },
    { name: "arbeitslosenversicherung", type: "decimal", description: "Unemployment insurance contribution" },
    { name: "vermoegenswirksame_leistungen", type: "decimal", description: "Capital-forming benefits" },
    { name: "sonstige_bezuege", type: "decimal", description: "Other income/allowances" },
    { name: "sonstige_abzuege", type: "decimal", description: "Other deductions" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German salary statement (Gehaltsnachweis/Lohnabrechnung) data extractor. Extract data from salary statement OCR text with high accuracy.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German numbers: "1.234,56" → "1234.56" (remove dots for thousands, replace comma with period)
3. If a field is not found or unclear, omit it from output (do NOT guess)
4. Return ONLY valid JSON matching the schema
5. For monetary amounts, preserve precision: "2.345,67" → "2345.67"
6. Social security number: format XX XXXXXX X XXX (remove spaces in output)
7. Tax ID: 11 digits without spaces
8. Month format: prefer "YYYY-MM" format (e.g., "2020-01" for January 2020)

GERMAN PAYSLIP FIELD IDENTIFICATION:
- **bruttogehalt** (Gross Salary): Look for "Gesetzliches Brutto", "Brutto-Gesamt", "Gesamtbrutto", "Brutto"
- **nettogehalt** (Net Salary): Look for "Auszahlungsbetrag", "Überweisungsbetrag", "Netto", "Netto-Verdienst"
- **arbeitgeber_name** (Employer): Usually at the top of the document, company name
- **abrechnungsmonat** (Billing Month): Look for date format like "01/2020", "Januar 2020", "Abrechnungsmonat"
- **lohnsteuer** (Income Tax): Look for "Lohnsteuer", "LSt"
- **solidaritaetszuschlag** (Solidarity Surcharge): Look for "Solidaritätszuschlag", "SolZ", "Soli"
- **kirchensteuer** (Church Tax): Look for "Kirchensteuer", "KiSt", "KirchSt"
- **krankenversicherung** (Health Insurance): Look for "Krankenversicherung", "KV", "Krankenv."
- **pflegeversicherung** (Care Insurance): Look for "Pflegeversicherung", "PV", "PflegeV."
- **rentenversicherung** (Pension Insurance): Look for "Rentenversicherung", "RV", "RentenV."
- **arbeitslosenversicherung** (Unemployment Insurance): Look for "Arbeitslosenversicherung", "AV", "ALV"
- **vermoegenswirksame_leistungen** (Capital-forming Benefits): Look for "VL", "Vermögenswirksame Leistungen", "VwL"
- **sonstige_bezuege** (Other Income): Look for "Sonstige Bezüge", "Zulagen", additional payments
- **sonstige_abzuege** (Other Deductions): Look for "Sonstige Abzüge", other deductions

EXTRACTION STRATEGY:
1. First identify the document structure (header, earnings section, deductions section, totals)
2. For salary amounts, prioritize line items with clear labels over isolated numbers
3. Cross-validate: gross salary should be larger than net salary
4. Deductions should be reasonable (typically 20-40% of gross)
5. Assign confidence scores based on label clarity and number isolation

VALIDATION:
- If bruttogehalt < nettogehalt, flag low confidence (this is illogical)
- If any insurance > 1000 EUR, verify it's not the gross/net salary
- If month is missing, try to infer from date fields in document
- All amounts should be positive numbers

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100 score> },
  "provenance": { <field_name>: "<source text snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText, overlayLines }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  console.log("OpenRouter API key configured:", !!apiKey);

  if (!apiKey) {
    throw new Error("USE_LLM_MAPPING (OpenRouter API Key) not configured");
  }

  const userPrompt = `Extract data from this German salary statement.

SCHEMA:
${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}

OCR TEXT:
${ocrText}

${overlayLines && overlayLines.length > 0 ? `\nOVERLAY DATA (positional word/line info):\n${JSON.stringify(overlayLines.slice(0, 50), null, 2)}` : ""}

Return extracted data as JSON only.`;

  console.log("Calling OpenRouter API...");
  const startTime = Date.now();
  let response;
  
  for (let attempt = 0; attempt <= LLM_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt);
        console.log(`Retry attempt ${attempt}/${LLM_CONFIG.maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

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
        throw new Error(`Failed to call OpenRouter API after ${LLM_CONFIG.maxRetries + 1} attempts: ${fetchError.message}`);
      }
    }
  }

  const fetchDuration = Date.now() - startTime;
  console.log(`OpenRouter API call took ${fetchDuration}ms`);
  
  if (!response) throw new Error("OpenRouter API call failed: no response received");
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in OpenRouter response");

  let jsonContent = content.trim();
  const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) jsonContent = jsonBlockMatch[1].trim();
  
  const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch && !jsonContent.startsWith('{')) jsonContent = jsonObjectMatch[0];

  let parsed: MappingResult;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (e) {
    throw new Error(`LLM returned invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  if (!parsed.data) throw new Error("LLM response missing 'data' field");

  console.log("Full LLM Response JSON:", JSON.stringify(parsed, null, 2));

  const validFields = new Set(TABLE_SCHEMA.columns.map((c) => c.name));
  const normalizedData: Record<string, any> = {};

  for (const [key, value] of Object.entries(parsed.data)) {
    if (!validFields.has(key)) continue;
    if (value === null || value === undefined) continue;
    normalizedData[key] = value;
  }

  return {
    data: normalizedData,
    confidence: parsed.confidence || {},
    provenance: parsed.provenance || {},
  };
}
