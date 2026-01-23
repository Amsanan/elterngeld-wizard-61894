import { LLM_CONFIG } from "../_shared/llm-config.ts";

interface MapWithLLMInput {
  ocrText: string;
  overlayLines?: string[];
}

export async function mapWithLLM({ ocrText, overlayLines }: MapWithLLMInput): Promise<Record<string, any>> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  
  if (!apiKey) {
    console.log("No OPENROUTER_API_KEY found, returning empty extraction");
    return {};
  }

  const systemPrompt = `Du bist ein Experte für die Extraktion von Daten aus deutschen Schwerbehindertenausweisen und Feststellungsbescheiden.
Extrahiere die folgenden Felder aus dem OCR-Text. Gib NUR ein valides JSON-Objekt zurück, keine anderen Texte.

Zu extrahierende Felder:
- name_inhaber: Nachname des Ausweisinhabers
- vorname_inhaber: Vorname des Ausweisinhabers
- geburtsdatum: Geburtsdatum (Format: YYYY-MM-DD)
- geschlecht: Geschlecht (m/w/d)
- grad_der_behinderung: GdB-Wert als Zahl (20-100)
- gdb_ab_datum: GdB gültig ab (Format: YYYY-MM-DD)
- gueltig_bis: Gültig bis Datum (Format: YYYY-MM-DD, null wenn unbefristet)
- unbefristet: Boolean ob unbefristet gültig
- merkzeichen_g: Boolean - Gehbehindert (G)
- merkzeichen_ag: Boolean - Außergewöhnlich gehbehindert (aG)
- merkzeichen_b: Boolean - Berechtigung zur Mitnahme einer Begleitperson (B)
- merkzeichen_bl: Boolean - Blind (Bl)
- merkzeichen_gl: Boolean - Gehörlos (Gl)
- merkzeichen_h: Boolean - Hilflos (H)
- merkzeichen_rf: Boolean - Rundfunkgebührenbefreiung (RF)
- merkzeichen_tbl: Boolean - Taubblind (TBl)
- merkzeichen_1kl: Boolean - 1. Klasse Bahn (1. Kl.)
- ausstellende_behoerde: Name der ausstellenden Behörde
- aktenzeichen: Aktenzeichen/Geschäftszeichen
- ausstellungsdatum: Ausstellungsdatum (Format: YYYY-MM-DD)

Wichtige Hinweise:
- Bei Merkzeichen: Prüfe ob sie auf dem Ausweis vermerkt sind
- "unbefristet" oder "ohne zeitliche Begrenzung" bedeutet unbefristet=true und gueltig_bis=null
- GdB wird oft als "GdB 50" oder "Grad der Behinderung: 50" angegeben
- Gib für nicht gefundene Felder null zurück`;

  const userPrompt = `OCR-Text des Schwerbehindertenausweises:
${ocrText}

${overlayLines?.length ? `\nZusätzliche Textzeilen:\n${overlayLines.join('\n')}` : ''}

Extrahiere die Daten und gib nur ein JSON-Objekt zurück.`;

  const model = Deno.env.get("LLM_MODEL") || LLM_CONFIG.model;

  for (let attempt = 0; attempt < LLM_CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://lovable.dev",
          "X-Title": "Elterngeld Document Extraction"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`LLM API error (attempt ${attempt + 1}):`, errorText);
        if (attempt < LLM_CONFIG.maxRetries - 1) {
          await new Promise(r => setTimeout(r, LLM_CONFIG.baseDelayMs * Math.pow(2, attempt)));
          continue;
        }
        throw new Error(`LLM API error: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        console.log("Extracted disability certificate data:", extracted);
        return extracted;
      }
      
      console.warn("No valid JSON found in LLM response");
      return {};
      
    } catch (error) {
      console.error(`LLM extraction error (attempt ${attempt + 1}):`, error);
      if (attempt < LLM_CONFIG.maxRetries - 1) {
        await new Promise(r => setTimeout(r, LLM_CONFIG.baseDelayMs * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }

  return {};
}
