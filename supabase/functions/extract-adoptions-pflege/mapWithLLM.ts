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
  table: "adoptions_pflege_dokumente",
  columns: [
    { name: "dokument_typ", type: "string", required: true, description: "Document type: adoptionsbeschluss or pflegeerlaubnis" },
    { name: "kind_vorname", type: "string", description: "Child's first name" },
    { name: "kind_nachname", type: "string", description: "Child's last name" },
    { name: "kind_geburtsdatum", type: "date", format: "YYYY-MM-DD", description: "Child's date of birth" },
    { name: "beschlussdatum", type: "date", format: "YYYY-MM-DD", description: "Decision date (for Adoptionsbeschluss)" },
    { name: "aufnahmedatum", type: "date", format: "YYYY-MM-DD", description: "Admission date" },
    { name: "jugendamt", type: "string", description: "Youth welfare office name" },
    { name: "pflegestelle_name", type: "string", description: "Foster home name" },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German adoption and foster care (Adoptions- und Pflegedokumente) data extractor.

CRITICAL RULES:
1. Extract ONLY explicitly present information
2. German dates: "DD.MM.YYYY" → "YYYY-MM-DD"
3. dokument_typ: "adoptionsbeschluss" or "pflegeerlaubnis"
4. Return ONLY valid JSON

Output format:
{
  "data": { <extracted fields> },
  "confidence": { <field_name>: <0-100> },
  "provenance": { <field_name>: "<snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  if (!apiKey) throw new Error("USE_LLM_MAPPING not configured");

  let response;
  for (let i = 0; i <= 3; i++) {
    try {
      if (i > 0) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i - 1)));
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
      if (i === 3) throw new Error(`API failed`);
    }
  }

  if (!response || !response.ok) throw new Error(`API error`);
  
  const content = (await response.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error("No content");

  let json = content.trim();
  const m1 = json.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (m1) json = m1[1].trim();
  const m2 = json.match(/\{[\s\S]*\}/);
  if (m2 && !json.startsWith('{')) json = m2[0];

  const parsed: MappingResult = JSON.parse(json);
  if (!parsed.data) throw new Error("Missing 'data'");

  console.log("LLM:", JSON.stringify(parsed, null, 2));

  const valid = new Set(TABLE_SCHEMA.columns.map(c => c.name));
  const norm: Record<string, any> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (valid.has(k) && v != null) norm[k] = v;
  }

  return { data: norm, confidence: parsed.confidence || {}, provenance: parsed.provenance || {} };
}
