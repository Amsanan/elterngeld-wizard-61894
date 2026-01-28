import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Determine target_person based on field name patterns
function determineTargetPerson(fieldName: string, allFieldNames: string[]): string {
  const name = fieldName;
  
  // 1. Special child patterns (highest priority)
  // Antragskind patterns: "1A 4", "1a 3", "1a 4"
  if (/1[Aa]\s*[34]$/.test(name) || /1[Aa]\s*[34]\s*\d*$/.test(name)) {
    return 'antragskind';
  }
  
  // Mehrling patterns: check for multiple child indicators
  if (/mehrling/i.test(name)) {
    if (/2mehrling|mehrling.*2/i.test(name)) return 'mehrling_2';
    if (/3mehrling|mehrling.*3/i.test(name)) return 'mehrling_3';
    return 'mehrling_1';
  }
  
  // Geschwister patterns - fields ending with "4" in specific sections
  // txt.3*4 → geschwister_3
  if (/^txt\.3[a-z]+4$/i.test(name)) return 'geschwister_3';
  // txt.2*4 → geschwister_2  
  if (/^txt\.2[a-z]+4$/i.test(name)) return 'geschwister_2';
  // txt.*4 (ohne Prefix-Zahl) → geschwister_1
  if (/^txt\.[a-z]+4$/i.test(name) && !/^txt\.[123]/.test(name)) return 'geschwister_1';
  
  // cb.adoptiv patterns for siblings
  if (/^cb\.3adoptiv/i.test(name)) return 'geschwister_3';
  if (/^cb\.2adoptiv/i.test(name)) return 'geschwister_2';
  if (/^cb\.adoptiv4/i.test(name)) return 'geschwister_1';
  
  // 2. Lebensmonat Grid patterns (special ranges)
  const bgMatch = name.match(/^cb[._]BG[._](\d+)$/);
  if (bgMatch) {
    const num = parseInt(bgMatch[1]);
    if (num >= 1 && num <= 18) return 'elternteil_1';
    if (num >= 20 && num <= 37) return 'elternteil_2';
    return 'universal';
  }
  
  const eplusMatch = name.match(/^cb[._]E\+[._](\d+)$/);
  if (eplusMatch) {
    const num = parseInt(eplusMatch[1]);
    if (num >= 1 && num <= 18) return 'elternteil_1';
    if (num >= 34 && num <= 55) return 'elternteil_2';
    return 'universal';
  }
  
  // 3. Parent suffix patterns (in priority order)
  
  // Pattern: Underscore suffix (_1 / _2)
  if (/_1$/.test(name)) return 'elternteil_1';
  if (/_2$/.test(name)) return 'elternteil_2';
  if (/_3$/.test(name)) return 'elternteil_2'; // Offset numbering special case
  
  // Pattern: Space-digit suffix (" 1" / " 2")
  // IMPORTANT: " 1" usually means elternteil_2 (right column in PDF)
  if (/ 1$/.test(name)) return 'elternteil_2';
  if (/ 2$/.test(name)) return 'elternteil_2';
  
  // Pattern: Trailing digit after letter (bankcode1 / bankcode2)
  if (/[a-z]1$/.test(name) && !/_1$/.test(name) && !/ 1$/.test(name)) {
    // Check if there's a "2" variant
    const variant2 = name.replace(/1$/, '2');
    if (allFieldNames.includes(variant2)) {
      return 'elternteil_1';
    }
  }
  if (/[a-z]2$/.test(name) && !/_2$/.test(name) && !/ 2$/.test(name)) {
    return 'elternteil_2';
  }
  
  // Pattern: Has corresponding " 1" suffix variant → this is elternteil_1
  const spaceOneVariant = name + ' 1';
  if (allFieldNames.includes(spaceOneVariant)) {
    return 'elternteil_1';
  }
  
  // Fallback: universal
  return 'universal';
}

// Extract semantic meaning from field name
function extractSemanticMeaning(fieldName: string): string {
  // Remove prefix (txt., cb., etc.)
  let clean = fieldName.replace(/^(txt|cb|Kontrollk[aä]stchen)\./i, '');
  
  // Remove suffix patterns
  clean = clean.replace(/(_[123]| [12]|[12])$/, '');
  
  // Remove section numbers (2b, 1A, 4, etc.)
  clean = clean.replace(/\d+[a-zA-Z]?/g, '');
  
  // Clean up
  clean = clean.toLowerCase().trim();
  
  // Common mappings
  const semanticMap: Record<string, string> = {
    'vorname': 'vorname',
    'nachname': 'nachname',
    'name': 'nachname',
    'geburt': 'geburtsdatum',
    'geb': 'geburtsdatum',
    'strasse': 'strasse',
    'str': 'strasse',
    'hausnr': 'hausnummer',
    'plz': 'plz',
    'ort': 'wohnort',
    'wohnort': 'wohnort',
    'iban': 'iban',
    'bic': 'bic',
    'bank': 'bank_name',
    'steuer': 'steuer_id',
    'tel': 'telefon',
    'email': 'email',
    'staat': 'staatsangehoerigkeit',
  };
  
  for (const [pattern, semantic] of Object.entries(semanticMap)) {
    if (clean.includes(pattern)) {
      return semantic;
    }
  }
  
  return clean || 'unknown';
}

// Determine suffix pattern type
function determineSuffixPattern(fieldName: string, allFieldNames: string[]): string {
  if (/_[123]$/.test(fieldName)) return 'underscore';
  if (/ [12]$/.test(fieldName)) return 'space_digit';
  if (/[a-z][12]$/.test(fieldName)) return 'trailing_digit';
  
  // Check if has " 1" variant
  if (allFieldNames.includes(fieldName + ' 1')) return 'base_with_space_variant';
  
  return 'none';
}

// Extract base field name (without suffix)
function extractBaseFieldName(fieldName: string): string {
  return fieldName
    .replace(/(_[123])$/, '')
    .replace(/( [12])$/, '')
    .replace(/([a-z])([12])$/, '$1');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body safely - handle empty body
    let pdf_template_path = 'elterngeldantrag_bis_Maerz25.pdf';
    let clear_existing = false;
    
    try {
      const body = await req.text();
      if (body && body.trim()) {
        const parsed = JSON.parse(body);
        pdf_template_path = parsed.pdf_template_path || pdf_template_path;
        clear_existing = parsed.clear_existing || false;
      }
    } catch (e) {
      // Use defaults if body parsing fails
      console.log('No body provided, using defaults');
    }

    // Download PDF template
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('form-templates')
      .download(pdf_template_path || 'elterngeldantrag_bis_Maerz25.pdf');

    if (downloadError) throw downloadError;

    const pdfBytes = await pdfData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const formFields = form.getFields();
    const pages = pdfDoc.getPages();

    console.log(`Processing ${formFields.length} PDF fields across ${pages.length} pages`);

    // Collect all field names first (needed for pattern detection)
    const allFieldNames = formFields.map((field: any) => field.getName());

    // Process each field
    const registryEntries = [];
    
    for (const field of formFields) {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      
      // Get widget for position (first widget)
      const widgets = field.acroField.getWidgets();
      let pageNumber = 0;
      let coordX = 0;
      let coordY = 0;
      
      if (widgets.length > 0) {
        const widget = widgets[0];
        const rect = widget.getRectangle();
        coordX = rect.x;
        coordY = rect.y;
        
        // Find page number by checking P entry in widget
        try {
          const pageRef = widget.dict.get(PDFDocument.prototype.context?.obj('P') as any);
          if (pageRef) {
            for (let i = 0; i < pages.length; i++) {
              if (pages[i].ref === pageRef) {
                pageNumber = i;
                break;
              }
            }
          }
        } catch {
          // Fallback: just use page 0
          pageNumber = 0;
        }
      }

      const targetPerson = determineTargetPerson(fieldName, allFieldNames);
      const semanticMeaning = extractSemanticMeaning(fieldName);
      const suffixPattern = determineSuffixPattern(fieldName, allFieldNames);
      const baseFieldName = extractBaseFieldName(fieldName);

      registryEntries.push({
        pdf_field_name: fieldName,
        field_type: fieldType,
        target_person: targetPerson,
        page_number: pageNumber,
        coord_x: coordX,
        coord_y: coordY,
        semantic_meaning: semanticMeaning,
        suffix_pattern: suffixPattern,
        base_field_name: baseFieldName,
      });
    }

    // Clear existing entries if requested
    if (clear_existing) {
      const { error: deleteError } = await supabase
        .from('pdf_field_registry')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        console.error('Error clearing registry:', deleteError);
      }
    }

    // Upsert entries (using pdf_field_name as unique key)
    const { data: upsertData, error: upsertError } = await supabase
      .from('pdf_field_registry')
      .upsert(registryEntries, { 
        onConflict: 'pdf_field_name',
        ignoreDuplicates: false 
      })
      .select();

    if (upsertError) {
      console.error('Error upserting registry:', upsertError);
      throw upsertError;
    }

    // Count by target_person for summary
    const summary: Record<string, number> = {};
    for (const entry of registryEntries) {
      summary[entry.target_person] = (summary[entry.target_person] || 0) + 1;
    }

    return new Response(JSON.stringify({ 
      success: true,
      total_fields: registryEntries.length,
      summary,
      message: `Populated registry with ${registryEntries.length} fields`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in populate-pdf-field-registry:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
