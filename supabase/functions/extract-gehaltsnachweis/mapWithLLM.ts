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
    { name: "lohnsteuer", type: "decimal", description: "Income tax deduction ONLY (Lohnsteuer, LSt). Do NOT include Solidaritätszuschlag here. Extract individual line item, not summary box. Use '0' if document shows '--' or '0,00'. Omit if completely absent." },
    { name: "solidaritaetszuschlag", type: "decimal", description: "Solidarity surcharge ONLY (SolZ, Soli). Extract as separate line item, not part of Lohnsteuer. Use '0' if document shows '--' or '0,00'. Omit if completely absent." },
    { name: "kirchensteuer", type: "decimal", description: "Church tax ONLY (Kirchensteuer, KiSt). Extract individual line item, not summary box. Use '0' if document shows '--' or '0,00'. Omit if completely absent." },
    { name: "krankenversicherung", type: "decimal", description: "Health insurance contribution ONLY (Krankenversicherung, KV). Extract individual line item, not from 'SV-rechtliche Abzüge' summary. Use '0' if document shows '--' or '0,00'. Omit if completely absent." },
    { name: "pflegeversicherung", type: "decimal", description: "Care insurance contribution ONLY (Pflegeversicherung, PV). Extract individual line item, not from summary box. Use '0' if document shows '--' or '0,00'. Omit if completely absent." },
    { name: "rentenversicherung", type: "decimal", description: "Pension insurance contribution ONLY (Rentenversicherung, RV). Extract individual line item, not from summary box. Use '0' if document shows '--' or '0,00'. Omit if completely absent." },
    { name: "arbeitslosenversicherung", type: "decimal", description: "Unemployment insurance contribution ONLY (Arbeitslosenversicherung, AV, ALV). Extract individual line item, not from summary box. Use '0' if document shows '--' or '0,00'. Omit if completely absent." },
    { name: "vermoegenswirksame_leistungen", type: "decimal", description: "Capital-forming benefits. Use '0' if document shows '--' or '0,00'. Omit if completely absent." },
    { name: "sonstige_bezuege", type: "decimal", description: "Other income/allowances. Use '0' if document shows '--' or '0,00'. Omit if completely absent." },
    { name: "sonstige_abzuege", type: "decimal", description: "Other deductions. Use '0' if document shows '--' or '0,00'. Omit if completely absent." },
  ],
};

const SYSTEM_PROMPT = `You are a specialized German salary statement (Gehaltsnachweis/Lohnabrechnung) data extractor. Extract data from salary statement OCR text with high accuracy.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German numbers: "1.234,56" → "1234.56" (remove dots for thousands, replace comma with period)
3. Numbers without separators: If you see "30600" in a salary context, interpret as "306.00" (divide by 100)
4. If a field is not found or unclear, omit it from output (do NOT guess)
5. Return ONLY valid JSON matching the schema
6. For monetary amounts, preserve precision: "2.345,67" → "2345.67"
7. Social security number: format XX XXXXXX X XXX (remove spaces in output)
8. Tax ID: 11 digits without spaces
9. Month format: prefer "YYYY-MM" format (e.g., "2020-01" for January 2020)

ZERO VS NULL DISTINCTION (CRITICAL):
- Use "0" (string) when the document EXPLICITLY shows zero with: "--", "0,00", "0.00", "0", "n.zutr.", "nicht zutreffend"
- Omit the field (do not include in output) ONLY when it is COMPLETELY ABSENT from the document
- Example: If you see "Kirchensteuer --" or "Kirchensteuer 0,00", return "kirchensteuer": "0"
- Example: If Kirchensteuer is not mentioned anywhere, do not include kirchensteuer in output
- This distinction is CRITICAL for accurate financial calculations

NET SALARY VS PAYOUT AMOUNT (CRITICAL):
- **Netto-Verdienst / Netto-Bezüge / Nettolohn**: This is the TRUE net salary = Bruttogehalt - all deductions
  → Extract this as "nettogehalt"
- **Auszahlungsbetrag / Überweisungsbetrag**: This is the payout amount = Net salary + reimbursements/allowances
  → DO NOT use this for "nettogehalt"
- If both are present, ALWAYS prefer "Netto-Verdienst" over "Auszahlungsbetrag" for nettogehalt
- Validation: nettogehalt should be approximately: bruttogehalt - (lohnsteuer + solidaritätszuschlag + kirchensteuer + krankenversicherung + pflegeversicherung + rentenversicherung + arbeitslosenversicherung + sonstige_abzuege)

ADDITIONAL PAYMENTS AND REIMBURSEMENTS:
- "Erstattung Spesen/Auslagen", "Spesen", "Auslagenerstattung" → sonstige_bezuege
- "Verpflegungszuschuss", "Verpflegungspauschale", "Essenszuschuss" → sonstige_bezuege
- "Fahrtkostenzuschuss", "Fahrgeld" → sonstige_bezuege
- These are NOT part of regular salary, they are additional payments/reimbursements
- Sum all of these into sonstige_bezuege field

SUMMARY BOXES VS INDIVIDUAL LINE ITEMS (CRITICAL):
German payslips often show BOTH detailed line items AND summary totals. You MUST extract ONLY individual line items, NOT the summary boxes:

**IGNORE these summary boxes (DO NOT extract):**
- "Steuerrechtliche Abzüge" or "Steuerrechtl. Abzüge" (this is a TOTAL, not a line item)
- "SV-rechtliche Abzüge" or "Sozialversicherung gesamt" (this is a TOTAL, not a line item)
- Any line labeled "Gesamt", "Summe", "Total" for deductions

**EXTRACT these individual line items:**
- "Lohnsteuer 690,58" → lohnsteuer = "690.58"
- "Solidaritätszuschlag 37,98" → solidaritaetszuschlag = "37.98"
- "Kirchensteuer 0,00" → kirchensteuer = "0"
- "Krankenversicherung 306,00" → krankenversicherung = "306.00"
- "Rentenversicherung 372,00" → rentenversicherung = "372.00"
- "Arbeitslosenversicherung 48,00" → arbeitslosenversicherung = "48.00"
- "Pflegeversicherung 73,00" → pflegeversicherung = "73.00"

**Validation Rules:**
- Lohnsteuer + Solidaritätszuschlag + Kirchensteuer should equal "Steuerrechtliche Abzüge" total (if shown)
- Sum of all social insurance items should equal "SV-rechtliche Abzüge" total (if shown)
- If your extracted components don't sum to the shown totals, you may have extracted incorrectly

GERMAN PAYSLIP FIELD IDENTIFICATION:
- **bruttogehalt** (Gross Salary): Look for "Gesetzliches Brutto", "Brutto-Gesamt", "Gesamtbrutto", "Gesamt-Brutto", "Brutto"
- **nettogehalt** (Net Salary): Look for "Netto-Verdienst", "Netto-Bezüge", "Nettolohn", "Netto" (NOT "Auszahlungsbetrag")
- **arbeitgeber_name** (Employer): Usually at the top of the document, company name
- **abrechnungsmonat** (Billing Month): Look for date format like "01/2020", "Januar 2020", "03/2019", "Abrechnungsmonat"
- **lohnsteuer** (Income Tax): Look for "Lohnsteuer", "LSt" (individual line item, NOT "Steuerrechtliche Abzüge" summary)
- **solidaritaetszuschlag** (Solidarity Surcharge): Look for "Solidaritätszuschlag", "SolZ", "Soli" (separate from Lohnsteuer)
- **kirchensteuer** (Church Tax): Look for "Kirchensteuer", "KiSt", "KirchSt" (individual line item)
- **krankenversicherung** (Health Insurance): Look for "Krankenversicherung", "KV", "Krankenv." (individual line item, NOT "SV-rechtliche Abzüge")
- **pflegeversicherung** (Care Insurance): Look for "Pflegeversicherung", "PV", "PflegeV." (individual line item)
- **rentenversicherung** (Pension Insurance): Look for "Rentenversicherung", "RV", "RentenV." (individual line item)
- **arbeitslosenversicherung** (Unemployment Insurance): Look for "Arbeitslosenversicherung", "AV", "ALV" (individual line item)
- **vermoegenswirksame_leistungen** (Capital-forming Benefits): Look for "VL", "Vermögenswirksame Leistungen", "VwL"
- **sonstige_bezuege** (Other Income): Look for "Sonstige Bezüge", "Zulagen", "Erstattung", "Spesen", "Verpflegungszuschuss", additional payments
- **sonstige_abzuege** (Other Deductions): Look for "Sonstige Abzüge", other deductions

EXTRACTION STRATEGY:
1. First identify the document structure (header, earnings section, deductions section, totals)
2. For salary amounts, prioritize line items with clear labels over isolated numbers
3. Cross-validate: gross salary should be larger than net salary
4. Deductions should be reasonable (typically 20-40% of gross)
5. Assign confidence scores based on label clarity and number isolation

VALIDATION:
- If bruttogehalt < nettogehalt, flag low confidence (this is illogical)
- If nettogehalt is suspiciously close to bruttogehalt (>90%), you might have extracted the Auszahlungsbetrag instead
- If any insurance > 1000 EUR, verify it's not the gross/net salary
- If month is missing, try to infer from date fields in document
- All amounts should be positive numbers
- Validate: bruttogehalt - (sum of all deductions) should approximately equal nettogehalt (within 5 EUR tolerance)

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
  const zeroIndicators = /--|\b0,00\b|\b0\.00\b|\b0\b|n\.zutr\.|nicht zutreffend/i;

  for (const [key, value] of Object.entries(parsed.data)) {
    if (!validFields.has(key)) continue;
    if (value === null || value === undefined) continue;
    normalizedData[key] = value;
  }

  // Post-processing: Detect explicit zeros in OCR text for missing fields
  const fieldKeywords: Record<string, string[]> = {
    kirchensteuer: ["kirche", "kist", "kirchst"],
    solidaritaetszuschlag: ["soli", "solz", "solidarität"],
    lohnsteuer: ["lohnst", "lst"],
    krankenversicherung: ["kranken", "kv"],
    pflegeversicherung: ["pflege", "pv"],
    rentenversicherung: ["rente", "rv"],
    arbeitslosenversicherung: ["arbeitsl", "av", "alv"],
  };

  for (const [fieldName, keywords] of Object.entries(fieldKeywords)) {
    if (normalizedData[fieldName]) continue; // Field already extracted
    
    // Check if field is mentioned in OCR text
    const hasFieldInText = keywords.some(kw => 
      ocrText.toLowerCase().includes(kw.toLowerCase())
    );
    
    if (hasFieldInText) {
      // Find the keyword position and check for zero indicators nearby
      for (const keyword of keywords) {
        const regex = new RegExp(keyword, "gi");
        const match = ocrText.match(regex);
        if (match) {
          const fieldIndex = ocrText.toLowerCase().indexOf(keyword.toLowerCase());
          const contextRange = ocrText.slice(fieldIndex, fieldIndex + 100);
          if (zeroIndicators.test(contextRange)) {
            normalizedData[fieldName] = "0";
            console.log(`Post-processing: Set ${fieldName} to "0" based on zero indicator in context`);
            break;
          }
        }
      }
    }
  }

  // Enhanced Validation: Check component totals and cross-validate
  const bruttogehalt = parseFloat(normalizedData.bruttogehalt || "0");
  const nettogehalt = parseFloat(normalizedData.nettogehalt || "0");
  
  if (bruttogehalt > 0 && nettogehalt > 0) {
    // Calculate tax total (Steuerrechtliche Abzüge)
    const taxTotal = 
      parseFloat(normalizedData.lohnsteuer || "0") +
      parseFloat(normalizedData.solidaritaetszuschlag || "0") +
      parseFloat(normalizedData.kirchensteuer || "0");
    
    // Calculate social insurance total (SV-rechtliche Abzüge)
    const socialTotal = 
      parseFloat(normalizedData.krankenversicherung || "0") +
      parseFloat(normalizedData.pflegeversicherung || "0") +
      parseFloat(normalizedData.rentenversicherung || "0") +
      parseFloat(normalizedData.arbeitslosenversicherung || "0");
    
    // Calculate other deductions
    const otherDeductions = 
      parseFloat(normalizedData.vermoegenswirksame_leistungen || "0") +
      parseFloat(normalizedData.sonstige_abzuege || "0");
    
    const totalDeductions = taxTotal + socialTotal + otherDeductions;
    const calculatedNet = bruttogehalt - totalDeductions;
    const difference = Math.abs(calculatedNet - nettogehalt);
    
    console.log(`Enhanced Validation:`);
    console.log(`  Bruttogehalt: ${bruttogehalt}`);
    console.log(`  Tax Total (Steuerrechtliche): ${taxTotal} (Lohnsteuer: ${normalizedData.lohnsteuer || 0}, Soli: ${normalizedData.solidaritaetszuschlag || 0}, Kirche: ${normalizedData.kirchensteuer || 0})`);
    console.log(`  Social Total (SV-rechtliche): ${socialTotal} (KV: ${normalizedData.krankenversicherung || 0}, PV: ${normalizedData.pflegeversicherung || 0}, RV: ${normalizedData.rentenversicherung || 0}, AV: ${normalizedData.arbeitslosenversicherung || 0})`);
    console.log(`  Other Deductions: ${otherDeductions}`);
    console.log(`  Total Deductions: ${totalDeductions}`);
    console.log(`  Calculated Net: ${calculatedNet}`);
    console.log(`  Extracted Nettogehalt: ${nettogehalt}`);
    console.log(`  Difference: ${difference} EUR`);
    
    // If difference > 5 EUR, flag low confidence for nettogehalt
    if (difference > 5) {
      console.warn(`⚠️ Validation failed: Calculated net (${calculatedNet}) differs from extracted net (${nettogehalt}) by ${difference} EUR`);
      console.warn(`   This suggests deduction components may be incorrectly extracted (possibly from summary boxes instead of individual line items)`);
      if (parsed.confidence) {
        parsed.confidence.nettogehalt = Math.min(parsed.confidence.nettogehalt || 50, 60);
      }
    }
    
    // Check if tax components are reasonable
    if (taxTotal > bruttogehalt * 0.5) {
      console.warn(`⚠️ Warning: Tax total (${taxTotal}) seems too high (>${bruttogehalt * 0.5}). May have extracted summary box instead of individual items.`);
      if (parsed.confidence) {
        parsed.confidence.lohnsteuer = Math.min(parsed.confidence.lohnsteuer || 50, 50);
      }
    }
    
    // Check if social insurance components are reasonable
    if (socialTotal > bruttogehalt * 0.3) {
      console.warn(`⚠️ Warning: Social insurance total (${socialTotal}) seems too high (>${bruttogehalt * 0.3}). May have extracted summary box instead of individual items.`);
      if (parsed.confidence) {
        parsed.confidence.krankenversicherung = Math.min(parsed.confidence.krankenversicherung || 50, 50);
      }
    }
    
    // If nettogehalt > 90% of bruttogehalt, it might be the Auszahlungsbetrag instead
    if (nettogehalt > bruttogehalt * 0.9) {
      console.warn(`⚠️ Warning: Nettogehalt (${nettogehalt}) is >90% of Bruttogehalt (${bruttogehalt}). Might have extracted Auszahlungsbetrag instead of Netto-Verdienst`);
      if (parsed.confidence) {
        parsed.confidence.nettogehalt = Math.min(parsed.confidence.nettogehalt || 50, 50);
      }
    }
  }

  return {
    data: normalizedData,
    confidence: parsed.confidence || {},
    provenance: parsed.provenance || {},
  };
}
