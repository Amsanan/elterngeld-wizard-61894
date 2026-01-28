
# Plan: Elterngeld PDF Autofill Wizard mit Fill Modes

## Projektübersicht

Implementierung eines sicheren, schrittweisen Wizard-Systems für den Elterngeldantrag mit drei Fill-Modi:

| Fill Mode | Verhalten | Anwendung |
|-----------|-----------|-----------|
| **AUTO_FILL** | Automatisch befüllen | Text, Datum, Zahlen mit hoher Konfidenz |
| **SUGGEST** | Vorschlag anzeigen | Niedrigere Konfidenz, Benutzerbestätigung erforderlich |
| **CONFIRM_ONLY** | Niemals automatisch | Alle Checkboxen, Erklärungen, Lebensmonat-Grid |

**Kritische Regel:** Checkboxen werden NIEMALS automatisch gesetzt.

---

## Phase 1: Reference Files & Datenbank

### 1.1 Neue Tabelle `field_fill_modes`

```sql
CREATE TABLE field_fill_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_field_name TEXT NOT NULL UNIQUE,
  fill_mode TEXT NOT NULL CHECK (fill_mode IN ('AUTO_FILL', 'SUGGEST', 'CONFIRM_ONLY')),
  fill_reason TEXT,
  doc_types TEXT[],
  entities TEXT[],
  max_confidence NUMERIC DEFAULT 0.8,
  has_analysis_link BOOLEAN DEFAULT false,
  analysis_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Generierung der Fill Modes

Da die Reference-Dateien leer sind, wird ein Generator-Script erstellt:

**Regeln für automatische Klassifikation:**

1. **CONFIRM_ONLY** (niemals auto-fill):
   - Alle `PDFCheckBox` Felder
   - Alle `cb.*` Felder
   - Lebensmonat-Grid (`cb_BG_*`, `cb_E+_*`)
   - Deklarationsfelder

2. **AUTO_FILL** (automatisch):
   - Textfelder mit Mapping zu Dokumenten mit confidence > 80%
   - Datumsfelder aus Geburtsurkunden, IDs
   - Name, Adresse, IBAN aus Hochkonfidenz-Dokumenten

3. **SUGGEST** (Vorschlag):
   - Einkommensfelder
   - Felder ohne oder mit niedrigem Mapping-Confidence

### 1.3 Progress-Tabelle erweitern

```sql
ALTER TABLE elterngeldantrag_progress 
ADD COLUMN field_states JSONB DEFAULT '{}';
-- Format: { "pdf_field_name": { "status": "...", "value": "...", "source_doc": "..." } }
```

### 1.4 Document Provenance Tabelle

```sql
CREATE TABLE document_field_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  pdf_field_name TEXT NOT NULL,
  source_document_type TEXT,
  source_document_id UUID,
  extracted_key TEXT,
  extracted_value TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pdf_field_name)
);
```

---

## Phase 2: Reference Files generieren

### 2.1 `public/reference/field_fill_modes.json`

Struktur:

```json
{
  "version": "2026-01-28",
  "fields": {
    "txt.vorname2b": {
      "fill_mode": "AUTO_FILL",
      "fill_reason": "Hochkonfidenz-Textfeld aus Personalausweis",
      "doc_types": ["eltern_dokument"],
      "entities": ["person.vorname"],
      "max_confidence": 0.95,
      "has_analysis_link": false
    },
    "cb.verheiratet2c": {
      "fill_mode": "CONFIRM_ONLY",
      "fill_reason": "Familienstand erfordert Benutzerentscheidung",
      "doc_types": [],
      "entities": [],
      "max_confidence": 0,
      "has_analysis_link": true
    }
  }
}
```

### 2.2 `public/reference/allfields_left_join_mapping.json`

Vollständiges Inventar aller 657 PDF-Felder:

```json
{
  "fields": [
    {
      "technisches_feld": "txt.vorname2b",
      "label_de": "Vorname Elternteil 1",
      "page": 2,
      "field_type": "PDFTextField",
      "target_person": "elternteil_1"
    }
  ]
}
```

### 2.3 `public/reference/nachweise_field_links.json`

Mapping von Dokumenttypen zu PDF-Feldern:

```json
{
  "geburtsurkunde": {
    "kind_vorname": {
      "pdf_targets": ["txt.vorname1A 4"],
      "confidence": 0.95
    },
    "kind_geburtsdatum": {
      "pdf_targets": ["txt.geburtsdatum1a 3"],
      "confidence": 0.98
    }
  },
  "eltern_dokument": {
    "vorname": {
      "pdf_targets": {
        "vater": ["txt.vorname2b"],
        "mutter": ["txt.vorname2b 1"]
      },
      "confidence": 0.95
    }
  }
}
```

---

## Phase 3: Fill Mode Engine (Core)

### 3.1 Neue Edge Function `get-fill-mode-config`

**Datei:** `supabase/functions/get-fill-mode-config/index.ts`

API-Endpunkte:
- `GET /get-fill-mode-config` - Lädt alle Fill Modes
- `GET /get-fill-mode-config?field=txt.vorname2b` - Einzelnes Feld

Response:
```json
{
  "fill_mode": "AUTO_FILL",
  "fill_reason": "...",
  "doc_types": ["eltern_dokument"],
  "entities": ["person.vorname"],
  "max_confidence": 0.95,
  "has_analysis_link": false
}
```

### 3.2 Edge Function `generate-fill-modes`

Generiert `field_fill_modes` Tabelle basierend auf:
1. `pdf_field_registry` (target_person, field_type)
2. `pdf_field_mappings` (bestehende Mappings)
3. Hartcodierte Regeln für Checkboxen

### 3.3 Modifikation `fill-elterngeld-form`

**Neue Logik:**

```typescript
function applyFillPolicy(
  fieldName: string,
  fieldType: string,
  extractedValue: any,
  fillModeConfig: FillModeConfig
): FillAction {
  
  // REGEL 1: Checkboxen NIEMALS automatisch
  if (fieldType === 'PDFCheckBox' || fieldName.startsWith('cb.')) {
    return { 
      action: 'CONFIRM_ONLY', 
      value: extractedValue, 
      write: false,
      reason: 'Checkbox erfordert Benutzerbestätigung' 
    };
  }
  
  // REGEL 2: Fill Mode aus Config
  const { fill_mode, max_confidence } = fillModeConfig;
  
  if (fill_mode === 'AUTO_FILL') {
    return { action: 'AUTO_FILL', value: extractedValue, write: true };
  }
  
  if (fill_mode === 'SUGGEST') {
    return { action: 'SUGGEST', value: extractedValue, write: false };
  }
  
  return { action: 'CONFIRM_ONLY', value: null, write: false };
}
```

---

## Phase 4: Wizard UI Komponenten

### 4.1 Neue Komponenten-Struktur

```text
src/components/wizard/
├── FillModeFieldCard.tsx      # Feld-Karte mit Mode-Badge
├── FillModeBadge.tsx          # Badge-Komponente (Auto/Suggest/Decision)
├── PageSummary.tsx            # Zusammenfassung pro Seite
├── EvidenceDisplay.tsx        # Document Evidence
├── FinalReviewChecklist.tsx   # Abschluss-Prüfung
├── ValidationAlert.tsx        # Validierungsfehler
└── WhyAskedModal.tsx          # "Warum wird das gefragt?" Modal
```

### 4.2 FillModeFieldCard

**Props:**
```typescript
interface FillModeFieldCardProps {
  pdfFieldName: string;
  labelDe: string;
  currentValue: string | null;
  suggestedValue: string | null;
  fillMode: 'AUTO_FILL' | 'SUGGEST' | 'CONFIRM_ONLY';
  fillReason: string;
  docEvidence: { docType: string; confidence: number }[];
  hasAnalysisLink: boolean;
  status: 'empty' | 'auto_filled' | 'suggested_pending' | 'confirmed' | 'skipped';
  fieldType: 'text' | 'checkbox' | 'date' | 'number';
  onConfirm: (value: any) => void;
  onEdit: (value: any) => void;
  onSkip: () => void;
  onUndo: () => void;
}
```

**Buttons nach Fill Mode:**

| Fill Mode | Buttons |
|-----------|---------|
| AUTO_FILL | [Rückgängig] [Bearbeiten] |
| SUGGEST | [Bestätigen] [Bearbeiten] [Überspringen] |
| CONFIRM_ONLY | [Eingabefeld/Checkbox] [Überspringen] |

### 4.3 PageSummary

```text
┌─────────────────────────────────────────────────────────┐
│  Seite 2: Angaben zu den Eltern                         │
├─────────────────────────────────────────────────────────┤
│  📊 Zusammenfassung:                                    │
│    ✓ 12 Automatisch befüllt                            │
│    ⏳ 5 Vorschläge ausstehend                          │
│    ❗ 3 Entscheidungen erforderlich                    │
├─────────────────────────────────────────────────────────┤
│  [Filter: ○ Alle  ○ Ausstehend  ○ Auto-filled]          │
└─────────────────────────────────────────────────────────┘
```

### 4.4 FillModeBadge

| Fill Mode | Badge Text | Farbe |
|-----------|------------|-------|
| AUTO_FILL | "Auto" | Grün |
| SUGGEST | "Vorschlag" | Gelb/Orange |
| CONFIRM_ONLY | "Entscheidung" | Rot |

---

## Phase 5: Neue Wizard-Seite

### 5.1 `src/pages/ElterngeldWizard.tsx`

**Hauptfunktionen:**
- Seitenbasierte Navigation (23 PDF-Seiten)
- Lädt `field_fill_modes` und `pdf_field_registry`
- Trackt `field_states` in `elterngeldantrag_progress`
- Speichert Document Provenance

**State-Management:**
```typescript
const [currentPage, setCurrentPage] = useState(1);
const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({});
const [pdfUrl, setPdfUrl] = useState<string>('');
```

**FieldState Typ:**
```typescript
type FieldStatus = 
  | 'empty'
  | 'auto_filled'
  | 'suggested_pending'
  | 'confirmed'
  | 'user_edited'
  | 'skipped';

interface FieldState {
  status: FieldStatus;
  value: any;
  suggestedValue?: any;
  sourceDocType?: string;
  sourceDocId?: string;
  confidence?: number;
  confirmedAt?: string;
}
```

### 5.2 Wizard-Flow

```text
1. Start → Dokumente hochladen (optional)
   ↓
2. Für jede PDF-Seite:
   a. Lade Felder dieser Seite
   b. Wende Fill Mode Engine an
   c. Zeige Felder nach Priorität:
      1. CONFIRM_ONLY (rot)
      2. SUGGEST (gelb)
      3. AUTO_FILL (grün)
   d. Benutzer bestätigt/bearbeitet
   e. Speichere field_states
   ↓
3. Final Review
   - Checkliste ausstehender Felder
   - Validierungsfehler
   ↓
4. PDF Export
   - Preview PDF
   - Final Export
```

---

## Phase 6: PDF Generation mit Fill Modes

### 6.1 Zwei-Stufen Export

**Preview PDF:**
- Alle Werte (inkl. Suggested als Platzhalter)
- Watermark "ENTWURF"

**Final Export:**
- Nur bestätigte Werte
- Audit Log speichern

### 6.2 Modifikation `fill-elterngeld-form`

Neue Request-Parameter:
```json
{
  "mode": "preview" | "final",
  "field_states": { "txt.vorname2b": { "status": "confirmed", "value": "Max" } }
}
```

Neue Logik:
```typescript
// Nur bestätigte Felder im Final-Export schreiben
if (mode === 'final') {
  for (const [fieldName, state] of Object.entries(fieldStates)) {
    if (state.status === 'confirmed' || state.status === 'auto_filled') {
      // Schreibe Wert ins PDF
    }
    // Überspringe 'suggested_pending' und 'skipped'
  }
}
```

---

## Phase 7: Validation Engine

### 7.1 Validierungsregeln

```typescript
const validationRules = [
  {
    id: 'child_birthdate_past',
    check: (data) => new Date(data.kind_geburtsdatum) <= new Date(),
    message: 'Geburtsdatum des Kindes muss in der Vergangenheit liegen'
  },
  {
    id: 'parent_min_age',
    check: (data) => /* Elternteil mindestens 16 Jahre alt */,
    message: 'Elternteil muss mindestens 16 Jahre alt sein'
  },
  {
    id: 'lebensmonat_selected',
    check: (data) => /* Mindestens ein Lebensmonat ausgewählt */,
    message: 'Bitte wählen Sie mindestens einen Lebensmonat'
  },
  {
    id: 'employment_exclusive',
    check: (data) => !(data.selbstaendig && data.angestellt),
    message: 'Bitte nur eine Beschäftigungsart auswählen'
  }
];
```

### 7.2 Kontinuierliche Validierung

- Validierung läuft bei jeder Feldänderung
- Fehler werden inline angezeigt
- Final Review zeigt alle Fehler

---

## Phase 8: Final Review & Export

### 8.1 FinalReviewChecklist

```text
┌─────────────────────────────────────────────────────────┐
│  📋 Abschluss-Prüfung                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ❌ Noch ausstehend:                                    │
│    • 3 Entscheidungsfelder nicht gesetzt               │
│    • 2 Vorschläge nicht bestätigt                      │
│                                                         │
│  ⚠️ Validierungsfehler:                                │
│    • Geburtsdatum Kind liegt in der Zukunft            │
│    • Lebensmonat 1-2 nicht ausgewählt                  │
│                                                         │
│  ✓ Bereit zum Export:                                   │
│    • 245 Felder auto-filled                            │
│    • 67 Felder bestätigt                               │
│    • 12 Felder übersprungen                            │
│                                                         │
│  [← Zurück zur Bearbeitung]  [📥 PDF Exportieren]      │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Audit Log

Bei Final Export speichern:
- Alle Feldwerte
- Quell-Dokumente pro Feld
- Timestamp
- User ID

---

## Phase 9: Populate PDF Field Registry

Bevor der Wizard funktioniert, muss die `pdf_field_registry` Tabelle befüllt werden. Dies geschieht durch:

1. Aufruf von `populate-pdf-field-registry` Edge Function
2. Automatische Klassifikation aller 657 Felder
3. Generierung der `field_fill_modes` basierend auf Registry

---

## Zusammenfassung der Änderungen

| Bereich | Aktion | Dateien |
|---------|--------|---------|
| **Datenbank** | Neue Tabellen | 2 neue Tabellen, 1 Alter |
| **Edge Functions** | Neue + Modifikation | 3 neue, 1 modifiziert |
| **Reference Files** | Generieren | 3 JSON-Dateien |
| **Frontend** | Neue Komponenten | 7 neue Komponenten |
| **Wizard Seite** | Neue Seite | 1 neue Seite |
| **Routing** | Neue Route | `/elterngeld-wizard` |

### Datei-Übersicht

**Neue Dateien:**
- `supabase/migrations/xxx_fill_modes.sql`
- `supabase/functions/get-fill-mode-config/index.ts`
- `supabase/functions/generate-fill-modes/index.ts`
- `src/components/wizard/FillModeFieldCard.tsx`
- `src/components/wizard/FillModeBadge.tsx`
- `src/components/wizard/PageSummary.tsx`
- `src/components/wizard/EvidenceDisplay.tsx`
- `src/components/wizard/FinalReviewChecklist.tsx`
- `src/components/wizard/ValidationAlert.tsx`
- `src/components/wizard/WhyAskedModal.tsx`
- `src/pages/ElterngeldWizard.tsx`
- `src/hooks/useFillModeEngine.ts`
- `src/lib/fill-mode-engine.ts`
- `src/lib/validation-rules.ts`
- `public/reference/field_fill_modes.json`
- `public/reference/allfields_left_join_mapping.json`
- `public/reference/nachweise_field_links.json`

**Modifizierte Dateien:**
- `supabase/functions/fill-elterngeld-form/index.ts`
- `src/App.tsx` (neue Route)

---

## Acceptance Tests

| Test-Szenario | Erwartetes Verhalten |
|---------------|---------------------|
| Kein Upload | Wizard funktioniert mit manueller Eingabe |
| Upload ID + Meldebescheinigung + Geburtsurkunde | AUTO_FILL für Name/Adresse/Geburtsdatum |
| Upload Gehaltsnachweis | SUGGEST für Einkommensfelder |
| Seite 18 Lebensmonat-Grid | Immer CONFIRM_ONLY |
| Alle Checkbox-Felder | Niemals automatisch gesetzt |
| Final Export | Checkliste mit ausstehenden Feldern |
| Session-Resume | Progress wird beim Neuladen wiederhergestellt |

---

## Technische Details

### RLS Policies

Neue Tabellen benötigen RLS:
```sql
ALTER TABLE field_fill_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON field_fill_modes FOR SELECT USING (true);

ALTER TABLE document_field_provenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own provenance" ON document_field_provenance
  FOR ALL USING (auth.uid() = user_id);
```

### Edge Function Dependencies

Alle Edge Functions nutzen:
- `@supabase/supabase-js@2`
- `pdf-lib@1.17.1`

### Frontend Dependencies

Keine neuen Dependencies erforderlich - alle UI-Komponenten nutzen existierende shadcn/ui Komponenten.
