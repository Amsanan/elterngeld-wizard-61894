import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FieldCoordinate {
  name: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VisualFieldAnalysis {
  field_name: string;
  visual_label: string;
  semantic_meaning: string;
  confidence: number;
  position: { x: number; y: number; page: number };
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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { field_coordinates, pdf_path, page_metadata } = await req.json();

    console.log(`Starting vision analysis for ${field_coordinates.length} fields across ${page_metadata.length} pages`);

    // Group fields by page for efficient processing
    const fieldsByPage: Map<number, FieldCoordinate[]> = new Map();
    for (const field of field_coordinates) {
      if (!fieldsByPage.has(field.page)) {
        fieldsByPage.set(field.page, []);
      }
      fieldsByPage.get(field.page)!.push(field);
    }

    // Download PDF from storage to get base64 for vision analysis
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('form-templates')
      .download(pdf_path);

    if (downloadError) {
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    // Convert PDF to base64
    const pdfBuffer = await pdfData.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Analyze each page with vision AI
    const allAnalyses: VisualFieldAnalysis[] = [];

    for (const [pageNum, fields] of fieldsByPage.entries()) {
      console.log(`Analyzing page ${pageNum} with ${fields.length} fields`);

      // Create a detailed prompt for the AI to analyze the PDF page
      const fieldPositions = fields.map(f => 
        `- "${f.name}" at position (${f.x}, ${f.y}), size ${f.width}x${f.height}`
      ).join('\n');

      const prompt = `You are analyzing a German government form (Elterngeldantrag). 
This is page ${pageNum + 1} of the PDF document.

I have ${fields.length} form fields on this page at these coordinates (from top-left):
${fieldPositions}

For each field, identify:
1. The VISUAL LABEL text that appears near or above the field (what the user sees on the form)
2. The SEMANTIC MEANING (what information this field is asking for in plain English)
3. Your CONFIDENCE in the match (0-100%)

Consider:
- Labels are typically above or to the left of fields
- Some fields may share labels or be part of groups
- German text needs translation to understand semantic meaning
- Look for section headers and field groupings

Return a JSON array with one object per field:
[
  {
    "field_name": "exact field name from my list",
    "visual_label": "text label visible on form (in German)",
    "semantic_meaning": "what this field represents (in English)",
    "confidence": 85
  }
]

Be precise and only include fields you can confidently identify. If a field has no visible label or you're unsure, set confidence below 40.`;

      try {
        // Call Lovable AI with vision analysis
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:application/pdf;base64,${pdfBase64}`
                    }
                  }
                ]
              }
            ],
            temperature: 0.1,
          })
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error (${aiResponse.status}):`, errorText);
          throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
        }

        const aiData = await aiResponse.json();
        const aiText = aiData.choices?.[0]?.message?.content || '';
        
        console.log('AI Response:', aiText);

        // Parse AI response (extract JSON from markdown if needed)
        let analysisResults: any[] = [];
        try {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = aiText.match(/```json\n([\s\S]*?)\n```/) || aiText.match(/\[[\s\S]*\]/);
          const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiText;
          analysisResults = JSON.parse(jsonText);
        } catch (parseError) {
          console.error('Failed to parse AI response as JSON:', parseError);
          console.log('Raw AI text:', aiText);
          // Continue with empty results for this page
          analysisResults = [];
        }

        // Add position data and convert to VisualFieldAnalysis format
        for (const result of analysisResults) {
          const field = fields.find(f => f.name === result.field_name);
          if (field) {
            allAnalyses.push({
              field_name: result.field_name,
              visual_label: result.visual_label || '',
              semantic_meaning: result.semantic_meaning || '',
              confidence: result.confidence || 0,
              position: { x: field.x, y: field.y, page: pageNum }
            });
          }
        }

      } catch (error) {
        console.error(`Error analyzing page ${pageNum}:`, error);
        // Continue with other pages even if one fails
      }
    }

    console.log(`Vision analysis complete: ${allAnalyses.length} fields analyzed`);

    return new Response(JSON.stringify({ 
      success: true,
      analyses: allAnalyses,
      total_analyzed: allAnalyses.length,
      total_fields: field_coordinates.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vision-map-fields:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
