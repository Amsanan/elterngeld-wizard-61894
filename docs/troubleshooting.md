# Troubleshooting-Guide

> Detaillierte Anleitung zur Fehlerbehebung im OCR-zu-PDF Workflow

---

## Inhaltsverzeichnis

1. [API-Fehler](#api-fehler)
2. [OCR-Probleme](#ocr-probleme)
3. [LLM-Extraktionsfehler](#llm-extraktionsfehler)
4. [Datenbank-Probleme](#datenbank-probleme)
5. [PDF-Generierungsfehler](#pdf-generierungsfehler)
6. [Frontend-Probleme](#frontend-probleme)
7. [Diagnose-Tools](#diagnose-tools)

---

## API-Fehler

### Problem: "API error: 404"

**Symptome:**
- Edge Function gibt 500 mit `{"error":"API error: 404"}` zurueck
- Tritt bei allen Dokumenten-Uploads auf

**Ursache:**
Das konfigurierte LLM-Modell ist auf OpenRouter nicht mehr verfuegbar.

**Loesung:**

1. Datei oeffnen: `supabase/functions/_shared/llm-config.ts`
2. Modell aendern zu einem verfuegbaren:

```typescript
export const LLM_CONFIG = {
  // Von:
  // model: "mistralai/mistral-small-24b-instruct-2501:free",
  
  // Zu:
  model: "google/gemini-2.0-flash-exp:free",
  // ...
};
```

3. Edge Functions neu deployen

**Verfuegbare Modelle (Stand Januar 2026):**
- `google/gemini-2.0-flash-exp:free` (empfohlen)
- `google/gemini-2.5-flash`
- `openai/gpt-5-mini`

---

### Problem: "API error: 429" (Rate Limit)

**Symptome:**
- Sporadische Fehler bei hoher Last
- Funktioniert nach erneutem Versuch

**Ursache:**
Zu viele Anfragen an OpenRouter in kurzer Zeit.

**Loesung:**

Die Retry-Logik sollte dies automatisch behandeln. Falls nicht:

1. Erhoehe `maxRetries` in `llm-config.ts`:
```typescript
maxRetries: 6, // von 4 auf 6
```

2. Erhoehe `baseDelayMs`:
```typescript
baseDelayMs: 2000, // von 1000 auf 2000
```

---

### Problem: "API error: 401" (Unauthorized)

**Symptome:**
- Alle API-Aufrufe schlagen fehl
- Fehler: "Invalid API key"

**Ursache:**
OpenRouter API-Key fehlt oder ist ungueltig.

**Loesung:**

1. Pruefe Secret in Lovable Cloud:
   - Gehe zu Einstellungen → Secrets
   - Pruefe ob `OPENROUTER_API_KEY` existiert

2. Falls fehlt/ungueltig:
   - Neuen Key erstellen: https://openrouter.ai/keys
   - Secret aktualisieren

---

## OCR-Probleme

### Problem: "OCR lieferte keine Ergebnisse"

**Symptome:**
- `ParsedResults` ist leer
- Kein Text extrahiert

**Moegliche Ursachen:**

| Ursache | Diagnose | Loesung |
|---------|----------|---------|
| Leeres Dokument | Datei manuell pruefen | Andere Datei verwenden |
| Korrupte Datei | Datei kann nicht geoeffnet werden | Neu scannen |
| Falsches Format | Dateiendung pruefen | PDF/JPEG/PNG verwenden |
| OCR.space Ausfall | API-Status pruefen | Warten, spaeter erneut versuchen |

**Loesung fuer Bildqualitaet:**

1. Mindestaufloesung: 300 DPI
2. Kontrast erhoehen
3. Gerade ausrichten (nicht schief)
4. Keine Schatten oder Reflexionen

---

### Problem: "Kein Text im Dokument erkannt"

**Symptome:**
- OCR laeuft durch, aber `ParsedText` ist leer

**Ursachen:**
- Eingescannte Bilder ohne Text
- Sehr schlechte Bildqualitaet
- Dokument in nicht-unterstuetzter Sprache

**Loesung:**

1. Pruefe ob Dokument lesbaren Text enthaelt
2. Versuche OCR Engine 2 statt 1:

```typescript
ocrFormData.append('OCREngine', '2'); // Bereits Standard
```

3. Fuer handgeschriebene Dokumente: Engine 2 ist besser

---

### Problem: Falsche Sprache erkannt

**Symptome:**
- Deutsche Umlaute falsch (ä → a, ü → u)
- Zahlen vertauscht

**Loesung:**

Stelle sicher, dass deutsche Sprache konfiguriert ist:

```typescript
ocrFormData.append('language', 'ger');
```

---

## LLM-Extraktionsfehler

### Problem: JSON-Parse-Fehler

**Symptome:**
- `SyntaxError: Unexpected token`
- LLM gibt invalides JSON zurueck

**Ursachen:**
- LLM fuegt Erklaerungstext hinzu
- Markdown-Formatierung (```json)
- Unvollstaendige Antwort

**Loesung:**

Verbessere den System-Prompt:

```typescript
const systemPrompt = `...
WICHTIG: Antworte NUR mit dem JSON-Objekt.
Keine Erklaerungen, kein Markdown, keine Codeblocks.
Beginne direkt mit { und ende mit }
`;
```

Oder parse robuster:

```typescript
function parseJsonResponse(content: string): any {
  // Entferne Markdown-Codeblocks
  let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Finde JSON-Objekt
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Kein JSON gefunden');
  
  return JSON.parse(match[0]);
}
```

---

### Problem: Felder werden falsch extrahiert

**Symptome:**
- Vorname und Nachname vertauscht
- Datum in falschem Format
- Felder leer obwohl im Dokument vorhanden

**Diagnose:**

1. Pruefe OCR-Output:
```typescript
console.log('OCR Text:', ocrText);
```

2. Pruefe LLM-Rohantwort:
```typescript
console.log('LLM Response:', result.choices[0].message.content);
```

**Loesungen:**

1. Verbessere System-Prompt mit Beispielen:
```typescript
const systemPrompt = `...
BEISPIEL:
Input: "Max Mustermann, geboren am 15.03.2024"
Output: {
  "kind_vorname": "Max",
  "kind_nachname": "Mustermann",
  "kind_geburtsdatum": "2024-03-15"
}
`;
```

2. Fuer Datumsformate explizit sein:
```typescript
// Im Prompt:
// Datum IMMER im Format YYYY-MM-DD
// Beispiel: 15. Maerz 2024 → 2024-03-15
```

---

### Problem: Niedrige Confidence-Scores

**Symptome:**
- Scores < 0.7 bei vielen Feldern
- Gelbe/Rote Badges im Frontend

**Ursachen:**
- Schlechte Dokumentqualitaet
- Ungewoehnliches Dokumentformat
- LLM unsicher bei Interpretation

**Loesung:**

1. Dokumentqualitaet verbessern
2. Manuelle Korrektur im Frontend ermoeglichen
3. Threshold fuer Warnungen anpassen:

```typescript
const CONFIDENCE_THRESHOLDS = {
  high: 0.9,    // Gruen
  medium: 0.7,  // Gelb
  low: 0.5      // Rot
};
```

---

## Datenbank-Probleme

### Problem: "Row Level Security policy violation"

**Symptome:**
- `INSERT` oder `SELECT` schlaegt fehl
- Fehler: "new row violates row-level security policy"

**Ursache:**
Nutzer versucht auf Daten zuzugreifen, die ihm nicht gehoeren.

**Loesung:**

1. Pruefe ob `user_id` korrekt gesetzt wird:
```typescript
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('geburtsurkunden').insert({
  user_id: user.id,  // Muss gesetzt sein!
  // ...
});
```

2. Pruefe RLS-Policy:
```sql
-- Sollte existieren:
CREATE POLICY "Users can insert own documents"
ON geburtsurkunden FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

### Problem: Daten werden nicht gespeichert

**Symptome:**
- Kein Fehler, aber Daten fehlen in DB
- `upsert` gibt leeres `data` zurueck

**Diagnose:**

```typescript
const { data, error } = await supabase
  .from('geburtsurkunden')
  .upsert({ ... })
  .select();

console.log('Data:', data);
console.log('Error:', error);
```

**Moegliche Ursachen:**

1. `user_id` fehlt (RLS-Verletzung ohne Fehler)
2. Falscher Tabellenname
3. Pflichtfeld fehlt

---

## PDF-Generierungsfehler

### Problem: Feld wird nicht ins PDF uebernommen

**Symptome:**
- Mapping existiert, aber Feld bleibt leer
- Andere Felder funktionieren

**Diagnose-Schritte:**

1. **Feldname pruefen** (Gross-/Kleinschreibung!):
```typescript
// Richtig:
'txt.vorname1A 4'

// Falsch:
'txt.Vorname1A 4'  // Gross-V
'txt.vorname1A4'   // Leerzeichen fehlt
```

2. **Mapping aktiv pruefen**:
```sql
SELECT * FROM pdf_field_mappings 
WHERE pdf_field_name = 'txt.vorname1A 4'
AND is_active = true;
```

3. **Filter-Bedingung pruefen**:
```sql
-- Mapping erwartet kind_ordnungszahl = 0
-- Aber Daten haben kind_ordnungszahl = NULL
SELECT kind_ordnungszahl FROM geburtsurkunden WHERE user_id = '...';
```

4. **Diagnostics-Seite verwenden**:
   - Navigiere zu `/admin/field-diagnostics`
   - Suche nach dem Feldnamen
   - Pruefe ob Wert vorhanden ist

---

### Problem: Checkbox nicht angekreuzt

**Symptome:**
- Boolean-Wert ist `true`, aber Checkbox leer
- Funktioniert bei manchen Feldern, bei anderen nicht

**Ursache:**
PDF-Feldtyp erwartet String "X" statt Boolean.

**Loesung:**

In `fill-elterngeld-form/index.ts`:

```typescript
function formatValueForPDF(value: any): string {
  if (value === true || value === 'true') {
    return 'X';  // Fuer AcroForm Checkboxen
  }
  // ...
}
```

**Alternative: Checkbox vs. TextField**

Manche PDFs haben Checkboxen als TextField implementiert:
```typescript
// TextField (erwartet 'X')
form.getTextField('chk.mehrling').setText('X');

// Echte Checkbox
form.getCheckBox('chk.mehrling').check();
```

---

### Problem: Datum falsch formatiert

**Symptome:**
- Datum erscheint als "2024-03-15" statt "15.03.2024"

**Loesung:**

Datumsformatierung anwenden:

```typescript
function formatDateForPDF(isoDate: string): string {
  if (!isoDate || !isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return isoDate || '';
  }
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

// Anwendung:
const formatted = formatDateForPDF(data.kind_geburtsdatum);
// "2024-03-15" → "15.03.2024"
```

---

### Problem: PDF-Template nicht gefunden

**Symptome:**
- "Object not found" beim Template-Download
- Fehler 404 von Storage

**Loesung:**

1. Pruefe Bucket und Dateiname:
```typescript
const { data } = await supabase.storage
  .from('form-templates')  // Bucket-Name
  .download('elterngeldantrag_bis_Maerz25.pdf');  // Dateiname
```

2. Pruefe ob Bucket existiert und public ist
3. Lade Template erneut hoch falls noetig

---

## Frontend-Probleme

### Problem: Upload bleibt haengen

**Symptome:**
- Ladeindikator dreht endlos
- Keine Erfolgs- oder Fehlermeldung

**Diagnose:**

1. Browser-Konsole pruefen (F12)
2. Network-Tab pruefen fuer fehlgeschlagene Requests

**Moegliche Ursachen:**

1. **CORS-Fehler:**
   - Edge Function hat keine CORS-Header

2. **Timeout:**
   - Datei zu gross
   - OCR/LLM dauert zu lange

3. **Auth-Problem:**
   - Session abgelaufen

**Loesung fuer CORS:**

In jeder Edge Function:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

---

### Problem: PDF-Vorschau zeigt nichts

**Symptome:**
- Weisse Flaeche statt PDF
- Keine Fehlermeldung

**Diagnose:**

1. Pruefe Browser-Konsole fuer PDF.js Fehler
2. Pruefe ob PDF-URL erreichbar ist
3. Pruefe CORS fuer Storage

**Loesung:**

```typescript
// Korrekte URL generieren
const { data: { publicUrl } } = supabase.storage
  .from('elterngeldantrag-drafts')
  .getPublicUrl(`${userId}/current-draft.pdf`);

// Mit Zeitstempel fuer Cache-Busting
const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
```

---

## Diagnose-Tools

### Edge Function Logs

```bash
# In Lovable Cloud:
# 1. Gehe zu Einstellungen → Backend
# 2. Waehle die Edge Function
# 3. Pruefe Logs
```

### Datenbank-Abfragen

```sql
-- Alle Mappings fuer ein Feld
SELECT * FROM pdf_field_mappings 
WHERE pdf_field_name LIKE '%vorname%';

-- Dokumente eines Nutzers
SELECT * FROM geburtsurkunden 
WHERE user_id = 'UUID_HERE' 
ORDER BY created_at DESC;

-- Aktive Regeln
SELECT * FROM computed_field_rules 
WHERE is_active = true;
```

### Field Diagnostics Seite

URL: `/admin/field-diagnostics`

Features:
- Alle PDF-Felder auflisten
- Mapping-Status pruefen
- Aktuelle Werte anzeigen
- Fehlende Mappings identifizieren

### Konsolen-Debugging in Edge Functions

```typescript
// Ausfuehrliches Logging
console.log('=== EXTRACT START ===');
console.log('File path:', filePath);
console.log('OCR result length:', ocrText.length);
console.log('LLM response:', JSON.stringify(extracted, null, 2));
console.log('=== EXTRACT END ===');
```

---

## Checkliste bei Fehlern

```markdown
□ Browser-Konsole auf Fehler pruefen (F12)
□ Network-Tab auf fehlgeschlagene Requests pruefen
□ Edge Function Logs pruefen
□ Datenbank-Daten pruefen
□ API-Keys/Secrets pruefen
□ CORS-Header pruefen
□ RLS-Policies pruefen
□ Dateiformat und -groesse pruefen
□ Mapping-Konfiguration pruefen
```

---

## Kontakt / Weitere Hilfe

Bei anhaltenden Problemen:
1. Erstelle ein Issue mit:
   - Fehlermeldung (komplett)
   - Reproduktionsschritte
   - Betroffene Datei (anonymisiert)
   - Browser und Version
2. Fuege relevante Logs bei
