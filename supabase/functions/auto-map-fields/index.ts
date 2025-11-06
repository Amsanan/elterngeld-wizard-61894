import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// Calculate similarity score (0-100%)
function calculateSimilarity(dbField: string, pdfField: string): number {
  // Normalize fields
  const cleanDb = dbField
    .toLowerCase()
    .replace(/^(kind_|mutter_|vater_|partner1_|partner2_)/, '')
    .replace(/_/g, '');
  
  const cleanPdf = pdfField
    .toLowerCase()
    .replace(/^txt\./, '')
    .replace(/\d+[a-z]?\s?\d*$/, '')
    .replace(/\s+/g, '');
  
  // Exact match
  if (cleanDb === cleanPdf) return 100;
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(cleanDb, cleanPdf);
  const maxLen = Math.max(cleanDb.length, cleanPdf.length);
  
  if (maxLen === 0) return 0;
  
  const similarity = Math.max(0, 100 - (distance / maxLen * 100));
  
  // Bonus for substring matches
  if (cleanPdf.includes(cleanDb) || cleanDb.includes(cleanPdf)) {
    return Math.min(100, similarity + 10);
  }
  
  return similarity;
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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { document_type, source_fields, pdf_template_path } = await req.json();

    // Download PDF template to get available fields
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('form-templates')
      .download(pdf_template_path || 'elterngeldantrag_bis_Maerz25.pdf');

    if (downloadError) throw downloadError;

    const pdfBytes = await pdfData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const formFields = form.getFields();

    // Get all PDF field names
    const pdfFieldNames = formFields.map((field: any) => field.getName());
    console.log(`Found ${pdfFieldNames.length} PDF fields`);

    // Auto-map each source field
    const suggestedMappings = source_fields.map((sourceField: any) => {
      const matches = pdfFieldNames.map(pdfField => ({
        pdf_field_name: pdfField,
        confidence_score: calculateSimilarity(sourceField.name, pdfField)
      }))
      .filter(m => m.confidence_score > 40) // Only show matches above 40%
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, 3); // Top 3 matches

      return {
        source_table: sourceField.table,
        source_field: sourceField.name,
        document_type,
        suggested_matches: matches,
        best_match: matches[0] || null
      };
    });

    return new Response(JSON.stringify({ 
      mappings: suggestedMappings,
      total_pdf_fields: pdfFieldNames.length,
      all_pdf_fields: pdfFieldNames
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in auto-map-fields:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});