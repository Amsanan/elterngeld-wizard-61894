# AI Chatbot Framework: Elterngeld Document-to-PDF Mapping System

> **Purpose**: This document enables an AI chatbot to understand and work with the German parental allowance (Elterngeld) document processing system. Supply this framework to train any AI on creating extractors, mappings, and understanding the architecture.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Database Schema Reference](#2-database-schema-reference)
3. [Extractor Function Template](#3-extractor-function-template)
4. [PDF Field Mapping Structure](#4-pdf-field-mapping-structure)
5. [LLM Prompt Engineering Rules](#5-llm-prompt-engineering-rules)
6. [Document Catalog Reference](#6-document-catalog-reference)
7. [Common Patterns and Anti-Patterns](#7-common-patterns-and-anti-patterns)
8. [Quick Reference Checklists](#8-quick-reference-checklists)

---

## 1. System Overview

### 1.1 Domain Context

This system processes German government documents for **Elterngeld** (parental allowance) applications in Bavaria. Users upload supporting documents, which are automatically:

1. **Scanned** via OCR (OCR.space API)
2. **Extracted** via LLM (OpenRouter API with Gemini)
3. **Stored** in a PostgreSQL database
4. **Mapped** to official PDF form fields
5. **Generated** as a filled PDF application

### 1.2 Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | Supabase Edge Functions (Deno/TypeScript) |
| Database | PostgreSQL via Supabase |
| OCR | OCR.space API (German language, Engine 2) |
| LLM | OpenRouter API → `google/gemini-2.0-flash-exp:free` |
| PDF | pdf-lib (AcroForm filling) |
| Frontend | React + TypeScript + Tailwind |
| Storage | Supabase Storage Buckets |

### 1.3 Workflow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│    OCR      │────▶│    LLM      │
│  (Frontend) │     │ (OCR.space) │     │ (OpenRouter)│
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PDF Fill   │◀────│   Mapping   │◀────│  Database   │
│  (pdf-lib)  │     │   Engine    │     │ (Supabase)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 1.4 Key Directories

```
supabase/functions/
├── _shared/
│   ├── llm-config.ts          # Central LLM configuration
│   ├── file-validation.ts     # Security validation
│   ├── elterngeld-field-mappings.ts
│   └── extractor-template.md  # Template documentation
├── extract-geburtsurkunde/    # Birth certificate extractor
│   ├── index.ts               # Main handler (OCR + DB)
│   └── mapWithLLM.ts          # LLM extraction logic
├── extract-gehaltsnachweis/   # Salary slip extractor
├── extract-arbeitgeberbescheinigung/
├── fill-elterngeld-form/      # PDF generation
│   ├── index.ts               # Main PDF filler
│   ├── flow-interpreter.ts    # Visual logic rules
│   └── page1-logic.ts         # Complex business logic
└── ... (16 total extractors)

public/reference/
├── database-fields-with-filters.json  # Complete field reference
├── elterngeld_nachweise_katalog.json  # Document catalog
└── Updated_Database_PDF_Mapping.json  # PDF field mappings
```

---

## 2. Database Schema Reference

### 2.1 Person Type Enum

All person-related tables use this enum to distinguish parents:

```sql
CREATE TYPE person_type_enum AS ENUM ('mutter', 'vater');
-- 'mutter' = Mother
-- 'vater' = Father
```

### 2.2 Core Document Tables

#### 2.2.1 geburtsurkunden (Birth Certificates)

```typescript
interface Geburtsurkunde {
  id: string;                    // UUID, auto-generated
  user_id: string;               // References auth.users
  file_path: string | null;      // Storage path
  
  // Child information
  kind_vorname: string | null;   // Child's first name
  kind_nachname: string | null;  // Child's last name
  kind_geburtsdatum: string | null;  // Format: YYYY-MM-DD
  kind_geburtsort: string | null;
  kind_geburtsnummer: string | null;
  kind_typ: string | null;       // 'primaer' | 'geschwister' | 'mehrling'
  kind_ordnungszahl: number | null;  // 0=primary, 1-3=siblings
  mehrling_nummer: number | null;    // 1-4 for multiples
  
  // Parent information
  mutter_vorname: string | null;
  mutter_nachname: string | null;
  mutter_geburtsname: string | null;
  vater_vorname: string | null;
  vater_nachname: string | null;
  
  // Authority information
  behoerde_name: string | null;
  urkundennummer: string | null;
  ausstelldatum: string | null;
  
  // Special fields
  ist_fruehgeburt: boolean | null;
  errechneter_geburtstermin: string | null;
  verwendungszweck: string | null;
  
  // Metadata
  confidence_scores: Json | null;
  created_at: string;
  updated_at: string;
}
```

#### 2.2.2 eltern_dokumente (Parent ID Documents)

```typescript
interface ElternDokument {
  id: string;
  user_id: string;
  person_type: 'mutter' | 'vater';  // REQUIRED
  document_type: string;  // 'personalausweis' | 'reisepass' | 'aufenthaltstitel'
  
  // Personal data
  vorname: string | null;
  nachname: string | null;
  geburtsname: string | null;
  geburtsdatum: string | null;
  geburtsort: string | null;
  staatsangehoerigkeit: string | null;
  
  // Address
  strasse: string | null;
  hausnummer: string | null;
  wohnungsnummer: string | null;
  plz: string | null;
  wohnort: string | null;
  
  // Document details
  ausweisnummer: string | null;
  ausstellende_behoerde: string | null;
  ausstelldatum: string | null;
  ausstellort: string | null;
  gueltig_bis: string | null;
  
  // Residence permit specific
  aufenthaltstitel_art: string | null;
  aufenthaltstitel_nummer: string | null;
  aufenthaltstitel_zweck: string | null;
  aufenthaltstitel_gueltig_von: string | null;
  aufenthaltstitel_gueltig_bis: string | null;
  
  // Flags
  ist_antragsteller: boolean | null;
  
  file_path: string | null;
  confidence_scores: Json | null;
}
```

#### 2.2.3 gehaltsnachweise (Salary Slips)

```typescript
interface Gehaltsnachweis {
  id: string;
  user_id: string;
  person_type: 'mutter' | 'vater';
  antrag_id: string | null;
  
  arbeitgeber_name: string | null;
  abrechnungsmonat: string | null;  // Format: YYYY-MM
  
  // Income
  bruttogehalt: number | null;
  nettogehalt: number | null;
  auszahlungsbetrag: number | null;
  
  // Deductions
  lohnsteuer: number | null;
  kirchensteuer: number | null;
  solidaritaetszuschlag: number | null;
  krankenversicherung: number | null;
  pflegeversicherung: number | null;
  rentenversicherung: number | null;
  arbeitslosenversicherung: number | null;
  
  // Additional
  steuer_id: string | null;
  sozialversicherungsnummer: string | null;
  sonstige_bezuege: number | null;
  sonstige_abzuege: number | null;
  vermoegenswirksame_leistungen: number | null;
  
  file_path: string | null;
  confidence_scores: Json | null;
}
```

#### 2.2.4 arbeitgeberbescheinigungen (Employer Certificates)

```typescript
interface Arbeitgeberbescheinigung {
  id: string;
  user_id: string;
  person_type: 'mutter' | 'vater';
  
  arbeitgeber_name: string | null;
  arbeitgeber_adresse: string | null;
  
  // Employment
  beschaeftigungsbeginn: string | null;
  beschaeftigungsende: string | null;
  wochenstunden: number | null;
  bruttogehalt: number | null;
  
  // Maternity protection
  mutterschutz_beginn: string | null;
  mutterschutz_ende: string | null;
  
  // Employer supplement for maternity benefit
  ag_zuschuss_mutterschaftsgeld: number | null;
  ag_zuschuss_tagessatz: number | null;
  ag_zuschuss_beginn: string | null;
  ag_zuschuss_ende: string | null;
  
  // Parental leave periods (up to 3)
  elternzeit_1_von: string | null;
  elternzeit_1_bis: string | null;
  elternzeit_2_von: string | null;
  elternzeit_2_bis: string | null;
  elternzeit_3_von: string | null;
  elternzeit_3_bis: string | null;
  
  // Part-time during parental leave
  teilzeit_elternzeit_ja: boolean | null;
  teilzeit_stunden: number | null;
  teilzeit_brutto: number | null;
  teilzeit_netto: number | null;
  teilzeit_von: string | null;
  teilzeit_bis: string | null;
  
  // Benefits in kind
  sachbezuege_ja: boolean | null;
  sachbezuege_tagessatz: number | null;
  sachbezuege_von: string | null;
  sachbezuege_bis: string | null;
  
  // Leave
  urlaub_1_von: string | null;
  urlaub_1_bis: string | null;
  urlaub_2_von: string | null;
  urlaub_2_bis: string | null;
  resturlaub_tage: number | null;
  
  ausstelldatum: string | null;
  file_path: string | null;
  confidence_scores: Json | null;
}
```

### 2.3 Additional Tables Overview

| Table | Description | Key Filters |
|-------|-------------|-------------|
| `meldebescheinigungen` | Registration certificates | `person_type` |
| `bankverbindungen` | Bank account details | - |
| `einkommensteuerbescheide` | Tax assessments | `person_type` |
| `mutterschaftsgeld` | Maternity benefit certificates | - |
| `kindergeld_bescheide` | Child benefit notices | `person_type`, `kind_ordnungszahl` |
| `leistungsbescheide` | Benefit notices (ALG I/II) | `person_type`, `leistungsart` |
| `krankenversicherung_nachweise` | Health insurance proofs | - |
| `schwerbehindertenausweise` | Disability certificates | - |
| `selbststaendigen_nachweise` | Self-employment proofs | - |
| `aerztliche_zeugnisse` | Medical certificates | `zeugnis_typ` |
| `ehe_sorgerecht_nachweise` | Marriage/custody documents | `dokument_typ` |
| `adoptions_pflege_dokumente` | Adoption/foster documents | `dokument_typ` |
| `vaterschaftsanerkennungen` | Paternity acknowledgments | - |

### 2.4 Mapping Tables

#### pdf_field_mappings

```typescript
interface PdfFieldMapping {
  id: string;
  source_table: string;        // e.g., 'geburtsurkunden'
  source_field: string;        // e.g., 'kind_vorname' or 'COUNT'
  pdf_field_name: string;      // e.g., 'txt.vorname1A 4'
  filter_condition: Json;      // e.g., {"person_type": "vater"}
  page_number: number | null;  // PDF page (1-indexed)
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}
```

#### computed_field_rules

```typescript
interface ComputedFieldRule {
  id: string;
  name: string;
  description: string | null;
  flow_definition: Json;       // Visual logic definition
  page_number: number | null;
  execution_order: number;
  is_active: boolean;
  created_by: string | null;
}
```

---

## 3. Extractor Function Template

### 3.1 File Structure

Every document extractor follows this structure:

```
supabase/functions/extract-[document-type]/
├── index.ts      # Main handler: auth, OCR, database
└── mapWithLLM.ts # LLM extraction with schema
```

### 3.2 index.ts Template

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { mapWithLLM } from './mapWithLLM.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY2')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { filePath, personType, useLLM = true } = await req.json();
    
    if (!filePath) {
      throw new Error('Missing required field: filePath');
    }

    console.log(`Processing document: ${filePath}, person: ${personType}, LLM: ${useLLM}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-documents')
      .download(filePath);
    
    if (downloadError) throw downloadError;

    // Perform OCR
    const fileName = filePath.split('/').pop() || 'document.pdf';
    const formData = new FormData();
    formData.append('file', fileData, fileName);
    formData.append('language', 'ger');           // German
    formData.append('isOverlayRequired', 'true'); // Get text positions
    formData.append('OCREngine', '2');            // Better for German

    const ocrResponse = await fetch('https://apipro1.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: ocrApiKey },
      body: formData,
    });

    const ocrResult = await ocrResponse.json();
    
    if (!ocrResult.ParsedResults?.[0]?.ParsedText) {
      throw new Error('OCR failed: No text extracted');
    }

    const ocrText = ocrResult.ParsedResults[0].ParsedText;
    const overlayLines = ocrResult.ParsedResults[0].TextOverlay?.Lines || [];

    // Initialize extracted data with required fields
    let extractedData: Record<string, any> = {
      user_id: user.id,
      file_path: filePath,
    };

    // Add person_type if provided (for person-specific documents)
    if (personType) {
      extractedData.person_type = personType.toLowerCase();
    }

    let confidenceScores: Record<string, number> = {};

    // LLM extraction
    if (useLLM) {
      console.log('Using LLM extraction...');
      const llmResult = await mapWithLLM({
        schema: null,  // Uses built-in TABLE_SCHEMA
        ocrText: ocrText,
        overlayLines: overlayLines,
      });
      
      extractedData = { ...extractedData, ...llmResult.data };
      confidenceScores = llmResult.confidence || {};
    }

    // Add confidence scores if any
    if (Object.keys(confidenceScores).length > 0) {
      extractedData.confidence_scores = confidenceScores;
    }

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from('YOUR_TABLE_NAME')  // ← CHANGE THIS
      .insert(extractedData)
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Extraction successful:', insertedData.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedData,
        message: 'Document extracted successfully',
        ocrText: ocrText,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Extraction error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.3 mapWithLLM.ts Template

```typescript
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

// ========================================
// CUSTOMIZE: Define your table schema
// ========================================
const TABLE_SCHEMA = {
  table: "your_table_name",
  columns: [
    { name: "field_name", type: "string", description: "Description for LLM" },
    { name: "date_field", type: "date", format: "YYYY-MM-DD", description: "Date field" },
    { name: "number_field", type: "decimal", description: "Numeric field" },
    { name: "boolean_field", type: "boolean", description: "Yes/No field" },
  ],
};

// ========================================
// CUSTOMIZE: Define your system prompt
// ========================================
const SYSTEM_PROMPT = `You are a specialized German [DOCUMENT_TYPE] data extractor.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the document
2. German date format "DD.MM.YYYY" → convert to "YYYY-MM-DD"
3. German number format "1.234,56" → convert to "1234.56"
4. Preserve German characters (ä, ö, ü, ß)
5. Return ONLY valid JSON matching the schema

Output format:
{
  "data": { <extracted fields matching schema> },
  "confidence": { <field_name>: <0-100 score> },
  "provenance": { <field_name>: "<source text snippet>" }
}`;

export async function mapWithLLM({ schema, ocrText, overlayLines }: MapWithLLMParams): Promise<MappingResult> {
  const apiKey = Deno.env.get("USE_LLM_MAPPING");
  
  if (!apiKey) {
    throw new Error("USE_LLM_MAPPING (OpenRouter API key) not configured");
  }

  const userPrompt = `Extract data from this German document.

SCHEMA:
${JSON.stringify(schema || TABLE_SCHEMA, null, 2)}

OCR TEXT:
${ocrText}

Return extracted data as JSON only.`;

  let response;
  
  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= LLM_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getRetryDelay(attempt);
        console.log(`Retry attempt ${attempt}, waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
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
      
      // Don't retry client errors (except rate limits)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        break;
      }
    } catch (e: any) {
      if (attempt === LLM_CONFIG.maxRetries) {
        throw new Error(`API call failed after ${LLM_CONFIG.maxRetries} retries: ${e.message}`);
      }
    }
  }

  if (!response || !response.ok) {
    throw new Error(`API error: ${response?.status}`);
  }

  // Parse response
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in LLM response");
  }

  // Extract JSON from response
  let jsonContent = content.trim();
  
  // Handle markdown code blocks
  const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    jsonContent = jsonBlockMatch[1].trim();
  }
  
  // Handle plain JSON object
  const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch && !jsonContent.startsWith('{')) {
    jsonContent = jsonObjectMatch[0];
  }

  const parsed: MappingResult = JSON.parse(jsonContent);
  
  if (!parsed.data) {
    throw new Error("Missing 'data' field in LLM response");
  }

  console.log("LLM Extraction Result:", JSON.stringify(parsed, null, 2));

  // Validate and normalize data against schema
  const validFields = new Set(TABLE_SCHEMA.columns.map(c => c.name));
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
```

### 3.4 LLM Configuration (_shared/llm-config.ts)

```typescript
// Central LLM configuration for all document extractors
export const LLM_CONFIG = {
  // Model to use for extraction
  model: "google/gemini-2.0-flash-exp:free",

  // Retry configuration
  maxRetries: 4,
  baseDelayMs: 1000,  // Exponentially increased on retries

  // API settings
  temperature: 0.1,   // Low for consistent extraction

  // OpenRouter API endpoint
  apiEndpoint: "https://openrouter.ai/api/v1/chat/completions",
};

export function getRetryDelay(attempt: number): number {
  return LLM_CONFIG.baseDelayMs * Math.pow(2, attempt - 1);
}
```

---

## 4. PDF Field Mapping Structure

### 4.1 Mapping Table Schema

Each mapping connects a database field to a PDF form field:

```json
{
  "id": "uuid",
  "source_table": "geburtsurkunden",
  "source_field": "kind_vorname",
  "pdf_field_name": "txt.vorname1A 4",
  "filter_condition": {
    "kind_ordnungszahl": 0,
    "kind_typ": "primaer"
  },
  "page_number": 1,
  "is_active": true,
  "description": "Child's first name for primary applicant child"
}
```

### 4.2 Filter Condition System

Filters determine WHICH record to use when multiple exist:

#### Person Type Filter
```json
{"person_type": "mutter"}  // Use mother's record
{"person_type": "vater"}   // Use father's record
```

#### Child Ordinal Filter
```json
{"kind_ordnungszahl": 0}   // Primary child (Antragskind)
{"kind_ordnungszahl": 1}   // First sibling (oldest)
{"kind_ordnungszahl": 2}   // Second sibling
{"kind_ordnungszahl": 3}   // Third sibling
```

#### Child Type Filter
```json
{"kind_typ": "primaer"}      // Primary application child
{"kind_typ": "geschwister"}  // Sibling for bonus
{"kind_typ": "mehrling"}     // Multiple birth (twin, triplet)
```

#### Multiple Birth Filter
```json
{"mehrling_nummer": 1}  // First multiple (e.g., Twin A)
{"mehrling_nummer": 2}  // Second multiple (e.g., Twin B)
{"mehrling_nummer": 3}  // Third multiple (triplet C)
```

#### Combined Filters
```json
{
  "person_type": "vater",
  "kind_ordnungszahl": 0
}
```

### 4.3 PDF Field Naming Convention

The Elterngeld form uses specific naming patterns. **Reference file:** `public/reference/pdf-parent-field-patterns.json`

#### 4.3.1 Parent Suffix Patterns (4 Main Types)

The PDF uses **4 different suffix patterns** to distinguish Elternteil 1 from Elternteil 2:

| Pattern | Elternteil 1 | Elternteil 2 | Field Count | Example |
|---------|--------------|--------------|-------------|---------|
| **Underscore** | `_1` | `_2` | 42 | `txt.steuer2b_1` → `txt.steuer2b_2` |
| **Space-Digit-1** | ∅ (no suffix) | ` 1` | 39 | `txt.vorname2b` → `txt.vorname2b 1` |
| **Space-Digit-2** | ∅ (no suffix) | ` 2` | 17 | `txt.staat2c` → `txt.staat2c 2` |
| **Trailing-Digit** | `1` | `2` | 12 | `txt.bankcode1` → `txt.bankcode2` |

**Pattern 1: Underscore Suffix (`_1` / `_2`)**
- Most common for income and tax sections
- Examples: `cb.EGalt_1` → `cb.EGalt_2`

**Pattern 2: Space-Digit Right Column (∅ / ` 1`)**
- Used for personal data columns (right column = Parent 2)
- Examples: `cb.ja2c` → `cb.ja2c 1`

**Pattern 3: Space-Digit Ausland (∅ / ` 2`)**
- Used for foreign residence sections
- Examples: `cb.nein2c` → `cb.nein2c 2`

**Pattern 4: Trailing Digit (`1` / `2`)**
- Used for bank and church fields
- Examples: `cb.kirche1` → `cb.kirche2`, `cb.ich1` → `cb.ich2`

#### 4.3.2 Special Cases (Sonderfälle)

**CRITICAL:** These edge cases MUST be handled individually in mappings:

| Type | Description | Example |
|------|-------------|---------|
| **Offset Numbering** | Starts at `_2`/`_3` instead of `_1`/`_2` | `cb.andereErsatz_2` → `cb.andereErsatz_3` |
| **Unexpected Digit** | Parent 2 uses `_3` instead of `_2` | `cb.bemessungnein1` → `cb.bemessungnein3` |
| **Base Name Mismatch** | Different field bases for same question | `cb.Gewinnja1_1` vs `cb.Gewinneinkünftenein_1` |
| **Internal IDs** | Generic Acrobat IDs (not derivable) | `Kontrollkästchen 59` vs `Kontrollkästchen 69` |
| **Lebensmonat Grids** | Number = month, not parent | `cb_BG_1..18` (P1) vs `cb_BG_20..37` (P2) |
| **Unique P2 Fields** | Only exists for Parent 2 | `cb.wohnezusammen2c` |

#### 4.3.3 Lebensmonat Grid Ranges

For Lebensmonat tables, the number encodes the month/column, NOT the parent:

| Grid Type | Elternteil 1 Range | Elternteil 2 Range |
|-----------|--------------------|--------------------|
| BG (Basiselterngeld) | `cb_BG_1` .. `cb_BG_18` | `cb_BG_20` .. `cb_BG_37` |
| E+ (ElterngeldPlus) | `cb_E+_1` .. `cb_E+_18` | `cb_E+_34` .. `cb_E+_55` |

#### 4.3.4 Field Type Prefixes

| Prefix | Meaning | Example |
|--------|---------|---------|
| `txt.` | Text field | `txt.vorname1A 4` |
| `cb.` | Checkbox | `cb.mehrlinge3 1` |
| `chk.` | Checkbox (alternate) | `chk.mehrlinge3 1` |
| `btn.` | Radio button | `btn.geschlecht2b` |

#### 4.3.5 Page Numbering in Fields

- `1A`, `1B` = Page 1, Section A/B
- `2a`, `2b`, `2c` = Page 2, Sections a/b/c
- Numbers after space = variant/instance

### 4.4 COUNT Mappings

For counting records (e.g., number of multiples):

```json
{
  "source_table": "geburtsurkunden",
  "source_field": "COUNT",
  "pdf_field_name": "txt.mehrlinge_anzahl",
  "filter_condition": {"kind_typ": "mehrling"},
  "description": "Count of multiple births"
}
```

### 4.5 Example Mappings

```json
[
  {
    "source_table": "geburtsurkunden",
    "source_field": "kind_vorname",
    "pdf_field_name": "txt.vorname1A 4",
    "filter_condition": {"kind_ordnungszahl": 0},
    "description": "Primary child's first name"
  },
  {
    "source_table": "eltern_dokumente",
    "source_field": "vorname",
    "pdf_field_name": "txt.vorname2b",
    "filter_condition": {"person_type": "vater"},
    "description": "Father's first name"
  },
  {
    "source_table": "eltern_dokumente",
    "source_field": "vorname",
    "pdf_field_name": "txt.vorname2b 1",
    "filter_condition": {"person_type": "mutter"},
    "description": "Mother's first name"
  },
  {
    "source_table": "gehaltsnachweise",
    "source_field": "bruttogehalt",
    "pdf_field_name": "txt.brutto5a",
    "filter_condition": {"person_type": "vater"},
    "description": "Father's gross salary"
  }
]
```

---

## 5. LLM Prompt Engineering Rules

### 5.1 System Prompt Requirements

Every extraction prompt MUST include:

1. **German language context**
   ```
   You are a specialized German [document type] data extractor.
   ```

2. **Extraction-only rule**
   ```
   Extract ONLY information explicitly present in the document.
   Never infer, guess, or calculate missing values.
   ```

3. **Date format conversion**
   ```
   German dates "DD.MM.YYYY" → convert to "YYYY-MM-DD"
   Example: "15.03.2024" → "2024-03-15"
   ```

4. **Number format conversion**
   ```
   German numbers "1.234,56" → convert to "1234.56"
   Thousands separator (.) removed, decimal comma (,) to period (.)
   ```

5. **Character preservation**
   ```
   Preserve German characters: ä, ö, ü, ß, Ä, Ö, Ü
   ```

6. **Output structure**
   ```
   Return ONLY valid JSON with this structure:
   {
     "data": { <extracted fields> },
     "confidence": { <field_name>: <0-100> },
     "provenance": { <field_name>: "<source snippet>" }
   }
   ```

### 5.2 Document-Specific Prompts

#### Birth Certificate (Geburtsurkunde)
```
You are a specialized German birth certificate (Geburtsurkunde) data extractor.

Key fields to identify:
- Kind/Child: Vorname, Nachname, Geburtsdatum, Geburtsort
- Eltern/Parents: Mutter (mother), Vater (father) with names
- Standesamt: Registry office name, document number, date
- Verwendungszweck: Purpose (often "Elterngeld")
```

#### ID Document (Personalausweis)
```
You are a specialized German ID document (Personalausweis/Reisepass) extractor.

Look for MRZ zone (machine-readable) at bottom.
Key fields: Nachname, Vorname, Geburtsdatum, Ausweisnummer, Gültig bis
Address may be on back: Straße, PLZ, Ort
```

#### Salary Slip (Gehaltsnachweis)
```
You are a specialized German salary slip (Gehaltsnachweis/Lohnabrechnung) extractor.

Key sections:
- Brutto (gross): Total before deductions
- Netto (net): After deductions
- Abzüge: Lohnsteuer, Sozialversicherung, Kirchensteuer
- Arbeitgeber: Employer name and address
- Abrechnungsmonat: Month being processed
```

### 5.3 Confidence Scoring Guidelines

| Score | Meaning | When to Use |
|-------|---------|-------------|
| 90-100 | High confidence | Clear, unambiguous text |
| 70-89 | Medium confidence | Minor OCR artifacts but readable |
| 50-69 | Low confidence | Partially obscured or ambiguous |
| 0-49 | Very low | Guessing or inferring |

### 5.4 Error Handling

The LLM should return `null` for fields that:
- Are not present in the document
- Cannot be read due to poor quality
- Are ambiguous between multiple values

```json
{
  "data": {
    "kind_vorname": "Max",
    "kind_nachname": "Mustermann",
    "kind_geburtsdatum": "2024-03-15",
    "vater_vorname": null  // Not found in document
  },
  "confidence": {
    "kind_vorname": 95,
    "kind_nachname": 95,
    "kind_geburtsdatum": 88
  }
}
```

---

## 6. Document Catalog Reference

### 6.1 Complete Document Types

| Category | Document Type | Table | Edge Function | Required |
|----------|--------------|-------|---------------|----------|
| **Kind** | Geburtsurkunde | `geburtsurkunden` | `extract-geburtsurkunde` | ✓ |
| **Eltern** | Personalausweis | `eltern_dokumente` | `extract-eltern-dokument` | ✓ |
| **Eltern** | Meldebescheinigung | `meldebescheinigungen` | `extract-meldebescheinigung` | ✓ |
| **Finanzen** | Bankverbindung | `bankverbindungen` | `extract-bankverbindung` | ✓ |
| **Einkommen** | Gehaltsnachweis | `gehaltsnachweise` | `extract-gehaltsnachweis` | Conditional |
| **Einkommen** | Arbeitgeberbescheinigung | `arbeitgeberbescheinigungen` | `extract-arbeitgeberbescheinigung` | Conditional |
| **Einkommen** | Steuerbescheid | `einkommensteuerbescheide` | `extract-steuerbescheid` | Optional |
| **Einkommen** | Selbständigennachweis | `selbststaendigen_nachweise` | `extract-selbststaendigen-nachweis` | Conditional |
| **Sozialleistungen** | Mutterschaftsgeld | `mutterschaftsgeld` | `extract-mutterschaftsgeld` | Conditional |
| **Sozialleistungen** | Leistungsbescheid | `leistungsbescheide` | `extract-leistungsbescheid` | Conditional |
| **Sozialleistungen** | Kindergeldbescheid | `kindergeld_bescheide` | `extract-kindergeld-bescheid` | Optional |
| **Versicherung** | Krankenversicherung | `krankenversicherung_nachweise` | `extract-krankenversicherung` | Optional |
| **Familie** | Eheurkunde/Sorgerecht | `ehe_sorgerecht_nachweise` | `extract-ehe-sorgerecht` | Conditional |
| **Familie** | Vaterschaftsanerkennung | `vaterschaftsanerkennungen` | `extract-vaterschaftsanerkennung` | Conditional |
| **Familie** | Adoption/Pflege | `adoptions_pflege_dokumente` | `extract-adoptions-pflege` | Conditional |
| **Gesundheit** | Ärztliches Zeugnis | `aerztliche_zeugnisse` | `extract-aerztliches-zeugnis` | Conditional |
| **Gesundheit** | Schwerbehindertenausweis | `schwerbehindertenausweise` | `extract-schwerbehindertenausweis` | Conditional |

### 6.2 Document Category Details

```json
{
  "categories": {
    "kind": {
      "name": "Kind",
      "documents": ["geburtsurkunde"]
    },
    "eltern": {
      "name": "Eltern",
      "documents": ["personalausweis", "meldebescheinigung"]
    },
    "finanzen": {
      "name": "Finanzen",
      "documents": ["bankverbindung"]
    },
    "einkommen": {
      "name": "Einkommen",
      "documents": ["gehaltsnachweis", "arbeitgeberbescheinigung", "steuerbescheid", "selbststaendigennachweis"]
    },
    "sozialleistungen": {
      "name": "Sozialleistungen",
      "documents": ["mutterschaftsgeld", "leistungsbescheid", "kindergeldbescheid"]
    },
    "versicherung": {
      "name": "Versicherung",
      "documents": ["krankenversicherung"]
    },
    "familie": {
      "name": "Familie",
      "documents": ["eheurkunde", "vaterschaftsanerkennung", "adoption_pflege"]
    },
    "gesundheit": {
      "name": "Gesundheit",
      "documents": ["aerztliches_zeugnis", "schwerbehindertenausweis"]
    }
  }
}
```

---

## 7. Common Patterns and Anti-Patterns

### 7.1 DO: Best Practices

#### Always normalize person_type
```typescript
// ✓ Correct
const personType = inputPersonType?.toLowerCase();
extractedData.person_type = personType;

// ✗ Wrong - mixed case causes filter mismatches
extractedData.person_type = "Mutter";
```

#### Use shared LLM config
```typescript
// ✓ Correct
import { LLM_CONFIG, getRetryDelay } from "../_shared/llm-config.ts";

// ✗ Wrong - hardcoded values
const model = "gpt-4";
const delay = 2000;
```

#### Validate against schema before insert
```typescript
// ✓ Correct
const validFields = new Set(TABLE_SCHEMA.columns.map(c => c.name));
const normalizedData: Record<string, any> = {};
for (const [key, value] of Object.entries(parsed.data)) {
  if (validFields.has(key) && value != null) {
    normalizedData[key] = value;
  }
}

// ✗ Wrong - inserting unvalidated data
await supabase.from('table').insert(parsed.data);
```

#### Handle PDF field access errors
```typescript
// ✓ Correct
try {
  const field = form.getTextField(fieldName);
  if (field) field.setText(value);
} catch (e) {
  console.warn(`Field not found: ${fieldName}`);
}

// ✗ Wrong - throws if field missing
form.getTextField(fieldName).setText(value);
```

#### Convert dates for PDF display
```typescript
// ✓ Correct: ISO → German format for PDF
function formatDateForPDF(isoDate: string): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

// ✗ Wrong - ISO date in German form
form.getTextField('geburtsdatum').setText('2024-03-15');
```

### 7.2 DON'T: Anti-Patterns

#### Don't hardcode API keys
```typescript
// ✗ Never do this
const apiKey = "sk-1234567890";

// ✓ Use environment variables
const apiKey = Deno.env.get("USE_LLM_MAPPING");
```

#### Don't skip authentication
```typescript
// ✗ Wrong - no auth check
Deno.serve(async (req) => {
  const { filePath } = await req.json();
  // ... process without checking user
});

// ✓ Correct - verify user
const { data: { user } } = await supabase.auth.getUser(authHeader);
if (!user) return unauthorized();
```

#### Don't mix date formats
```typescript
// ✗ Wrong - inconsistent formats
extractedData.geburtsdatum = "15.03.2024";  // German
extractedData.ausstelldatum = "2024-03-20"; // ISO

// ✓ Correct - always ISO in database
extractedData.geburtsdatum = "2024-03-15";
extractedData.ausstelldatum = "2024-03-20";
```

#### Don't create extractors without mapWithLLM
```typescript
// ✗ Wrong - inline LLM logic
Deno.serve(async (req) => {
  // ... OCR ...
  const llmResponse = await fetch('openrouter...', { /* ... */ });
  // ... parse inline ...
});

// ✓ Correct - separate mapWithLLM module
import { mapWithLLM } from './mapWithLLM.ts';
const result = await mapWithLLM({ schema: null, ocrText });
```

### 7.3 Debugging Tips

#### Log LLM responses
```typescript
console.log("LLM Response:", JSON.stringify(parsed, null, 2));
```

#### Check filter matches
```typescript
console.log("Filter condition:", JSON.stringify(filterCondition));
console.log("Available records:", records.length);
```

#### Verify PDF field names
```typescript
const fields = form.getFields();
fields.forEach(f => console.log(f.getName()));
```

---

## 8. Quick Reference Checklists

### 8.1 New Extractor Checklist

- [ ] Create `supabase/functions/extract-[name]/` folder
- [ ] Create `index.ts` with OCR and database logic
- [ ] Create `mapWithLLM.ts` with schema and prompts
- [ ] Define `TABLE_SCHEMA` matching database columns
- [ ] Write German-language `SYSTEM_PROMPT`
- [ ] Import from `_shared/llm-config.ts`
- [ ] Add table name to `index.ts` insert query
- [ ] Test with sample document
- [ ] Add to document catalog reference

### 8.2 New Mapping Checklist

- [ ] Identify source table and field
- [ ] Find exact PDF field name (case-sensitive!)
- [ ] Determine filter conditions needed
- [ ] Check if parent suffix applies (` 1` for mother)
- [ ] Set correct page number
- [ ] Mark as `is_active: true`
- [ ] Add description for documentation
- [ ] Test with `fill-elterngeld-form` function

### 8.3 LLM Prompt Checklist

- [ ] State document type in German and English
- [ ] Include "extract ONLY explicit information" rule
- [ ] Specify date format conversion
- [ ] Specify number format conversion
- [ ] List key fields to look for
- [ ] Define output JSON structure
- [ ] Include confidence scoring guidance
- [ ] Handle missing fields with null

### 8.4 Filter Condition Reference

| Field | Values | Use Case |
|-------|--------|----------|
| `person_type` | `mutter`, `vater` | Parent distinction |
| `kind_ordnungszahl` | `0`, `1`, `2`, `3` | Child order |
| `kind_typ` | `primaer`, `geschwister`, `mehrling` | Child category |
| `mehrling_nummer` | `1`, `2`, `3`, `4` | Multiple birth order |
| `document_type` | `personalausweis`, `reisepass`, `aufenthaltstitel` | ID type |
| `dokument_typ` | `eheurkunde`, `sorgerechtsbeschluss` | Marriage/custody type |
| `zeugnis_typ` | `beschaeftigungsverbot`, `fruehgeburt` | Medical certificate type |
| `leistungsart` | `alg1`, `alg2`, `elterngeld` | Benefit type |

---

## Appendix A: Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | ✓ |
| `OCR_SPACE_API_KEY2` | OCR.space API key | ✓ |
| `USE_LLM_MAPPING` | OpenRouter API key | ✓ |
| `LLM_MODEL` | Override default model | Optional |

---

## Appendix B: API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/functions/v1/extract-geburtsurkunde` | POST | Extract birth certificate |
| `/functions/v1/extract-eltern-dokument` | POST | Extract parent ID |
| `/functions/v1/extract-gehaltsnachweis` | POST | Extract salary slip |
| `/functions/v1/fill-elterngeld-form` | POST | Generate filled PDF |
| `/functions/v1/get-pdf-fields` | GET | List PDF form fields |
| `/functions/v1/get-field-mappings` | GET | Get active mappings |
| `/functions/v1/save-field-mappings` | POST | Update mappings |

---

## Appendix C: Troubleshooting Quick Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "API error: 404" | Model unavailable | Change model in `llm-config.ts` |
| "OCR failed" | Poor image quality | Use higher resolution scan |
| "Field not found" | Wrong PDF field name | Check exact name with diagnostics |
| "Missing 'data'" | LLM format error | Improve prompt, add examples |
| "Unauthorized" | Missing/invalid token | Check Authorization header |
| Filter returns empty | Wrong filter values | Verify data exists with query |

---

*Document Version: 1.0*
*Last Updated: 2025-01-25*
*Maintainer: Elterngeld Application Team*
