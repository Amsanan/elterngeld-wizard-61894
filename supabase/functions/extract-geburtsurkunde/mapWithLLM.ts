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
  table: "geburtsurkunden",
  columns: [
    { name: "kind_vorname", type: "string", required: true, description: "Child's first name" },
    { name: "kind_nachname", type: "string", required: true, description: "Child's last name" },
    { name: "kind_geburtsdatum", type: "date", format: "YYYY-MM-DD", description: "Child's date of birth" },
    { name: "kind_geburtsort", type: "string", description: "Child's place of birth" },
    { name: "kind_geburtsnummer", type: "string", description: "Birth certificate number (Geburtsnummer)" },
    { name: "mutter_vorname", type: "string", description: "Mother's first name" },
    { name: "mutter_nachname", type: "string", description: "Mother's last name" },
    { name: "mutter_geburtsname", type: "string", description: "Mother's birth name (Geburtsname)" },
    { name: "vater_vorname", type: "string", description: "Father's first name" },
    { name: "vater_geburtsname", type: "string", description: "Father's birth name (Geburtsname)" },
    { name: "vater_nachname", type: "string", description: "Father's last name" },
    { name: "urkundennummer", type: "string", description: "Certificate number (Urkundennummer)" },
    { name: "behoerde_name", type: "string", description: "Issuing authority name (Standesamt)" },
    { name: "ausstelldatum", type: "date", format: "YYYY-MM-DD", description: "Date of issue" },
    { name: "verwendungszweck", type: "string", description: "Purpose of certificate (e.g., Elterngeld)" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German birth certificate (Geburtsurkunde) data extractor. Extract data from birth certificate OCR text.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD" format
3. If a field is not found or unclear, omit it from output (do NOT guess)
4. Return ONLY valid JSON matching the schema
5. For names, preserve German characters (ä, ö, ü, ß)
6. Distinguish between "Nachname" (surname) and "Geburtsname" (birth name)

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

  const userPrompt = `Extract data from this German birth certificate.

SCHEMA:
${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}

OCR TEXT:
${ocrText}

${overlayLines && overlayLines.length > 0 ? `\nOVERLAY DATA (positional word/line info):\n${JSON.stringify(overlayLines.slice(0, 50), null, 2)}` : ""}

Return extracted data as JSON only.`;

  console.log("Calling OpenRouter API...");
  console.log("User prompt length:", userPrompt.length);

  const startTime = Date.now();
  let response;

  for (let attempt = 0; attempt <= LLM_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt);
        console.log(`Retry attempt ${attempt}/${LLM_CONFIG.maxRetries} after ${delay}ms delay`);
        await new Promise((resolve) => setTimeout(resolve, delay));
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

      if (response.ok) {
        break;
      }

      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.error(`Non-retryable error: ${response.status}`);
        break;
      }

      if (attempt === LLM_CONFIG.maxRetries) {
        console.error(`Max retries reached. Last status: ${response.status}`);
        break;
      }

      console.log(`Retryable error ${response.status}, will retry...`);
    } catch (fetchError: any) {
      console.error(`OpenRouter API fetch failed (attempt ${attempt + 1}/${LLM_CONFIG.maxRetries + 1}):`, fetchError);

      if (attempt === LLM_CONFIG.maxRetries) {
        throw new Error(`Failed to call OpenRouter API after ${LLM_CONFIG.maxRetries + 1} attempts: ${fetchError.message}`);
      }

      console.log("Network error, will retry...");
    }
  }

  const fetchDuration = Date.now() - startTime;
  console.log(`OpenRouter API call took ${fetchDuration}ms`);

  if (!response) {
    throw new Error("OpenRouter API call failed: no response received");
  }

  console.log("OpenRouter API response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API error response:", errorText);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log("OpenRouter API response received");

  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    console.error("No content in OpenRouter response:", JSON.stringify(result));
    throw new Error("No content in OpenRouter response");
  }

  console.log("LLM response content length:", content.length);
  console.log("Raw LLM response (first 500 chars):", content.substring(0, 500));

  let jsonContent = content.trim();

  const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    jsonContent = jsonBlockMatch[1].trim();
    console.log("Extracted JSON from markdown block");
  }

  const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch && !jsonContent.startsWith("{")) {
    jsonContent = jsonObjectMatch[0];
    console.log("Extracted JSON object from text");
  }

  let parsed: MappingResult;
  try {
    parsed = JSON.parse(jsonContent);
    console.log("Successfully parsed LLM JSON response");
    console.log("Parsed data keys:", Object.keys(parsed.data || {}));
  } catch (e) {
    console.error("Failed to parse LLM response");
    console.error("Cleaned content:", jsonContent);
    console.error("Parse error:", e);
    throw new Error(`LLM returned invalid JSON: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  if (!parsed.data) {
    console.error("LLM response missing 'data' field:", parsed);
    throw new Error("LLM response missing 'data' field");
  }

  console.log("Extracted data fields:", Object.keys(parsed.data));
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
