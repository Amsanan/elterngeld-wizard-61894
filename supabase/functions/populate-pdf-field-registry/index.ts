import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, PDFName, PDFRef, PDFArray } from "https://esm.sh/pdf-lib@1.17.1";

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

// Extract page number from field name patterns (fallback heuristic)
function extractPageFromFieldName(fieldName: string): number {
  const name = fieldName.toLowerCase();
  
  // Page-specific patterns based on German Elterngeld form structure
  const patterns: { regex: RegExp; page: number }[] = [
    // Seite 1: Deckblatt/Antragsinformationen
    { regex: /^cb\.antrag/i, page: 1 },
    { regex: /antragsteller/i, page: 1 },
    
    // Seite 2: Elternteil 1 - Persönliche Daten (2a, 2b)
    { regex: /2a(?!\d)/i, page: 2 },
    { regex: /2b(?!\d)/i, page: 2 },
    
    // Seite 3: Elternteil 2 - Persönliche Daten (2c)
    { regex: /2c(?!\d)/i, page: 3 },
    
    // Seite 4: Adresse/Wohnung (2d)
    { regex: /2d(?!\d)/i, page: 4 },
    { regex: /wohnung|adress/i, page: 4 },
    
    // Seite 5: Kind (1A)
    { regex: /1a\s*[34]/i, page: 5 },
    { regex: /kind.*geb/i, page: 5 },
    
    // Seite 6-7: Geschwister (4)
    { regex: /geschwister|4a|4b/i, page: 6 },
    
    // Seite 8-11: Einkommen (3a, 3b, 3c, 3d)
    { regex: /3a(?!\d)/i, page: 8 },
    { regex: /3b(?!\d)/i, page: 9 },
    { regex: /3c(?!\d)/i, page: 10 },
    { regex: /3d(?!\d)/i, page: 11 },
    { regex: /eink|gehalt|arbeit/i, page: 8 },
    
    // Seite 12-13: Mutterschaftsgeld (5)
    { regex: /5a|5b|mutter|mug/i, page: 12 },
    
    // Seite 14-17: Bezugszeitraum/Lebensmonate (6)
    { regex: /^cb[._]bg[._]/i, page: 14 },
    { regex: /^cb[._]e\+[._]/i, page: 15 },
    { regex: /lebensmonat/i, page: 14 },
    
    // Seite 18-20: Bankverbindung (7)
    { regex: /7a|7b|iban|bic|bank/i, page: 18 },
    
    // Seite 21-23: Erklärungen/Unterschrift (8, 9)
    { regex: /8a|8b|erkl[aä]r/i, page: 21 },
    { regex: /9a|9b|unterschrift/i, page: 22 },
  ];
  
  for (const { regex, page } of patterns) {
    if (regex.test(name)) return page;
  }
  
  return 0; // Unknown page
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

    // Build a map of widget references to page numbers
    // Each page has annotations (Annots) which include form field widgets
    const widgetRefToPage = new Map<string, number>();
    
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      try {
        // Get the Annots array from the page dictionary
        const annotsRef = page.node.get(PDFName.of('Annots'));
        if (annotsRef) {
          let annots: PDFArray | null = null;
          
          // Handle both direct array and indirect reference
          if (annotsRef instanceof PDFArray) {
            annots = annotsRef;
          } else if (annotsRef instanceof PDFRef) {
            const resolved = pdfDoc.context.lookup(annotsRef);
            if (resolved instanceof PDFArray) {
              annots = resolved;
            }
          }
          
          if (annots) {
            for (let i = 0; i < annots.size(); i++) {
              const annotRef = annots.get(i);
              if (annotRef instanceof PDFRef) {
                widgetRefToPage.set(annotRef.toString(), pageIndex + 1);
              }
            }
          }
        }
      } catch (err) {
        console.log(`Error processing page ${pageIndex + 1} annotations:`, err);
      }
    }
    
    console.log(`Built widget-to-page map with ${widgetRefToPage.size} entries`);

    // Collect all field names first (needed for pattern detection)
    const allFieldNames = formFields.map((field: any) => field.getName());

    // Process each field
    const registryEntries = [];
    let pagesDetectedFromWidgets = 0;
    let pagesDetectedFromNames = 0;
    let pagesUnknown = 0;
    
    for (const field of formFields) {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      
      // Get widget for position and page detection
      const widgets = field.acroField.getWidgets();
      let pageNumber = 0;
      let coordX = 0;
      let coordY = 0;
      
      if (widgets.length > 0) {
        const widget = widgets[0];
        const rect = widget.getRectangle();
        coordX = rect.x;
        coordY = rect.y;
        
        // Try to find page number from widget reference
        try {
          // Get the widget's dictionary reference
          const widgetDict = widget.dict;
          
          // Method 1: Check the P (Parent page) reference directly
          const pageRef = widgetDict.get(PDFName.of('P'));
          if (pageRef instanceof PDFRef) {
            // Find which page this reference belongs to
            for (let i = 0; i < pages.length; i++) {
              if (pages[i].ref.toString() === pageRef.toString()) {
                pageNumber = i + 1;
                break;
              }
            }
          }
        } catch (err) {
          console.log(`Error getting page for field ${fieldName}:`, err);
        }
      }

      // Track detection method
      if (pageNumber > 0) {
        pagesDetectedFromWidgets++;
      } else {
        // Fallback: Extract from field name patterns
        pageNumber = extractPageFromFieldName(fieldName);
        if (pageNumber > 0) {
          pagesDetectedFromNames++;
        } else {
          pagesUnknown++;
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

    console.log(`Page detection: ${pagesDetectedFromWidgets} from widgets, ${pagesDetectedFromNames} from names, ${pagesUnknown} unknown`);

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

    // Count by page for summary
    const pagesSummary: Record<number, number> = {};
    for (const entry of registryEntries) {
      pagesSummary[entry.page_number] = (pagesSummary[entry.page_number] || 0) + 1;
    }

    return new Response(JSON.stringify({ 
      success: true,
      total_fields: registryEntries.length,
      summary,
      pages_summary: pagesSummary,
      detection_stats: {
        from_widgets: pagesDetectedFromWidgets,
        from_names: pagesDetectedFromNames,
        unknown: pagesUnknown
      },
      message: `Populated registry with ${registryEntries.length} fields across ${Object.keys(pagesSummary).length} pages`
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
