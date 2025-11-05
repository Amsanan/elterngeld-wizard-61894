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
  table: "einkommensteuerbescheide",
  columns: [
    { name: "steuerjahr", type: "string", required: true, description: "4-digit tax year (e.g., '2023')" },
    { name: "steuernummer", type: "string", description: "Tax number in format XX/XXX/XXXXX or similar" },
    { name: "steuer_id_nummer", type: "string", description: "11-digit tax ID without spaces" },
    { name: "finanzamt_name", type: "string", description: "Name of tax office" },
    { name: "finanzamt_adresse", type: "string", description: "Address of tax office" },
    { name: "bescheiddatum", type: "date", format: "YYYY-MM-DD", description: "Date of assessment" },
    { name: "nachname", type: "string", description: "Last name" },
    { name: "vorname", type: "string", description: "First name" },
    { name: "plz", type: "string", description: "5-digit postal code" },
    { name: "wohnort", type: "string", description: "City/town name" },
    { name: "gesamtbetrag_der_einkuenfte", type: "string", description: "Total income as decimal string" },
    { name: "summe_der_einkuenfte", type: "string", description: "Sum of incomes as decimal string" },
    { name: "zu_versteuerndes_einkommen", type: "string", description: "Taxable income as decimal string" },
    { name: "festgesetzte_steuer", type: "string", description: "Assessed tax as decimal string" },
    { name: "solidaritaetszuschlag", type: "string", description: "Solidarity surcharge as decimal string" },
    { name: "steuerabzug_vom_lohn", type: "string", description: "Tax deduction from salary as decimal string" },
    { name: "verbleibende_steuer", type: "string", description: "Remaining tax as decimal string" },
    { name: "einkuenfte_selbstaendig", type: "string", description: "Self-employment income as decimal string" },
    { name: "bruttoarbeitslohn", type: "string", description: "Gross salary as decimal string" },
    {
      name: "einkuenfte_nichtselbstaendig",
      type: "string",
      description: "Non-self-employment income as decimal string",
    },
    { name: "werbungskosten", type: "string", description: "Business expenses as decimal string" },
    {
      name: "gemeinsame_veranlagung",
      type: "boolean",
      description: "Joint assessment (true if Ehemann/Ehefrau/Splittingtarif mentioned)",
    },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German tax document data extractor. Extract data from Einkommensteuerbescheid (income tax assessment) OCR text.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German numbers: "1.234,56" → "1234.56" (remove dots, replace comma with period)
3. Dates: Convert to YYYY-MM-DD format
4. If a field is not found or unclear, omit it from output (do NOT guess)
5. Return ONLY valid JSON matching the schema
6. For monetary amounts, preserve precision: "12.345,67" → "12345.67"
7. Tax ID (steuer_id_nummer): 11 digits without spaces
8. Tax number (steuernummer): keep original format with slashes
9. gemeinsame_veranlagung: true if document mentions "Ehemann", "Ehefrau", or "Splittingtarif"

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100 score> },
  "provenance": { <field_name>: "<source text snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText, overlayLines }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");

  if (!apiKey) {
    throw new Error("USE_LLM_MAPPING (OpenRouter API Key) not configured");
  }

  const userPrompt = `Extract data from this German tax assessment document.

SCHEMA:
${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}

OCR TEXT:
${ocrText}

${overlayLines && overlayLines.length > 0 ? `\nOVERLAY DATA (positional word/line info):\n${JSON.stringify(overlayLines.slice(0, 50), null, 2)}` : ""}

Return extracted data as JSON only.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://lovable.dev",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  let parsed: MappingResult;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse LLM response:", content);
    throw new Error("LLM returned invalid JSON");
  }

  // Validate and normalize the data
  if (!parsed.data) {
    throw new Error("LLM response missing 'data' field");
  }

  // Normalize number formats (remove unknown fields, keep only schema fields)
  const validFields = new Set(TABLE_SCHEMA.columns.map((c) => c.name));
  const normalizedData: Record<string, any> = {};

  for (const [key, value] of Object.entries(parsed.data)) {
    if (!validFields.has(key)) continue;

    if (value === null || value === undefined) continue;

    // Normalize string numbers (already in correct format from LLM)
    normalizedData[key] = value;
  }

  return {
    data: normalizedData,
    confidence: parsed.confidence || {},
    provenance: parsed.provenance || {},
  };
}
