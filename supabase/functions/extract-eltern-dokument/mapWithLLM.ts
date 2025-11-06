import { LLM_CONFIG, getRetryDelay } from '../_shared/llm-config.ts';

interface MappingResult {
  data: any;
  provenance?: any;
  confidence?: Record<string, number>;
}

interface MapWithLLMParams {
  schema: any;
  ocrText: string;
  overlayLines?: any[];
}

// Schema for eltern_dokumente table
const TABLE_SCHEMA = {
  table_name: "eltern_dokumente",
  columns: [
    { name: "document_type", type: "text", description: "Type: personalausweis, reisepass, or aufenthaltstitel" },
    { name: "person_type", type: "text", description: "Person type" },
    { name: "vorname", type: "text", description: "First name" },
    { name: "nachname", type: "text", description: "Last name" },
    { name: "geburtsname", type: "text", description: "Birth name (if different)" },
    { name: "geburtsdatum", type: "date", description: "Birth date (YYYY-MM-DD)" },
    { name: "geburtsort", type: "text", description: "Place of birth" },
    { name: "staatsangehoerigkeit", type: "text", description: "Nationality" },
    { name: "ausweisnummer", type: "text", description: "ID card or passport number" },
    { name: "ausstellende_behoerde", type: "text", description: "Issuing authority" },
    { name: "ausstelldatum", type: "date", description: "Issue date (YYYY-MM-DD)" },
    { name: "gueltig_bis", type: "date", description: "Valid until date (YYYY-MM-DD)" },
    { name: "strasse", type: "text", description: "Street name" },
    { name: "hausnummer", type: "text", description: "House number" },
    { name: "wohnungsnummer", type: "text", description: "Apartment number" },
    { name: "plz", type: "text", description: "Postal code" },
    { name: "wohnort", type: "text", description: "City" },
    { name: "aufenthaltstitel_art", type: "text", description: "Residence permit type" },
    { name: "aufenthaltstitel_nummer", type: "text", description: "Residence permit number" },
    { name: "aufenthaltstitel_gueltig_von", type: "date", description: "Residence permit valid from (YYYY-MM-DD)" },
    { name: "aufenthaltstitel_gueltig_bis", type: "date", description: "Residence permit valid until (YYYY-MM-DD)" },
    { name: "aufenthaltstitel_zweck", type: "text", description: "Purpose of residence permit" },
  ]
};

const SYSTEM_PROMPT = `You are a German ID document data extraction expert. Extract information from OCR text accurately.

CRITICAL RULES:
1. Extract ONLY information that is present in the OCR text
2. For dates: Use German format DD.MM.YYYY and convert to YYYY-MM-DD
3. For dates: If the field contains "unbefristet", "unlimited", or similar non-date text, return null
4. For numbers: German format uses comma as decimal separator (1.234,56)
5. Return ONLY valid JSON with the extracted data
6. Set confidence scores (0-100) for each field based on OCR quality

Output format:
{
  "data": { field_name: value, ... },
  "confidence": { field_name: confidence_score, ... },
  "provenance": { field_name: "source text snippet", ... }
}`;

export async function mapWithLLM({ schema, ocrText }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get('USE_LLM_MAPPING');
  if (!apiKey) throw new Error('USE_LLM_MAPPING not configured');

  const useSchema = schema || TABLE_SCHEMA;
  const userPrompt = `Schema:\n${JSON.stringify(useSchema, null, 2)}\n\nOCR Text:\n${ocrText}`;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= LLM_CONFIG.maxRetries + 1; attempt++) {
    try {
      const response = await fetch(LLM_CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: LLM_CONFIG.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: LLM_CONFIG.temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      let content = result.choices?.[0]?.message?.content;
      
      if (!content) throw new Error('No content in LLM response');

      // Handle markdown code blocks
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      
      const parsed = JSON.parse(content);
      
      // Validate and normalize data
      const normalizedData: any = {};
      if (parsed.data) {
        for (const [key, value] of Object.entries(parsed.data)) {
          if (value !== null && value !== undefined && value !== '') {
            normalizedData[key] = value;
          }
        }
      }

      return {
        data: normalizedData,
        confidence: parsed.confidence || {},
        provenance: parsed.provenance || {}
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`LLM extraction attempt ${attempt} failed:`, error);
      
      if (attempt <= LLM_CONFIG.maxRetries) {
        const delay = getRetryDelay(attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('LLM extraction failed after all retries');
}
