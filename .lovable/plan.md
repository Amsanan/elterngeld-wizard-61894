
# Plan: PDF-Feld Master-Tabelle mit Personen/Kind-Zuordnung

## Problemanalyse

### Aktuelle Probleme mit Auto-Mapper
1. **Levenshtein-Distanz ist semantisch blind**: Der Auto-Mapper vergleicht nur Zeichenketten und versteht nicht, dass `txt.vorname2b` für Elternteil 1 und `txt.vorname2b 1` für Elternteil 2 ist
2. **Keine Personen-Zuordnung beim PDF-Feld**: Die 657 PDF-Felder haben keine vorklassifizierte Information, für wen sie gelten
3. **Fehlende Kontext-Anzeige**: Im Field Mapper sieht man nur den technischen Feldnamen, nicht die semantische Bedeutung

### User-Vorschlag
Eine Master-Tabelle für alle PDF-Felder mit vorklassifizierter Personen-/Kind-Zuordnung:
- `elternteil_1` (Vater/Antragsteller 1)
- `elternteil_2` (Mutter/Antragsteller 2)  
- `antragskind` (Kind für das Elterngeld beantragt wird)
- `geschwister_1` bis `geschwister_3` (jüngste Kinder unter 6)
- `universal` (Felder die für alle gelten, z.B. Unterschriften-Datum)

---

## Phase 1: Neue Datenbank-Tabelle `pdf_field_registry`

### 1.1 Tabellen-Schema

```sql
CREATE TABLE pdf_field_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifikation
  pdf_field_name TEXT NOT NULL UNIQUE,
  field_type TEXT NOT NULL, -- 'PDFTextField', 'PDFCheckBox', etc.
  
  -- Person/Kind-Zuordnung (DER KERN!)
  target_person TEXT NOT NULL CHECK (target_person IN (
    'elternteil_1',      -- Vater / Antragsteller 1
    'elternteil_2',      -- Mutter / Antragsteller 2
    'antragskind',       -- Das Kind für das EG beantragt wird
    'geschwister_1',     -- 1. jüngstes Kind (unter 6)
    'geschwister_2',     -- 2. jüngstes Kind
    'geschwister_3',     -- 3. jüngstes Kind
    'mehrling_1',        -- 1. Mehrling
    'mehrling_2',        -- 2. Mehrling
    'mehrling_3',        -- 3. Mehrling
    'beide_eltern',      -- Feld gilt für beide
    'universal'          -- Allgemeine Felder
  )),
  
  -- Position im PDF
  page_number INTEGER NOT NULL,
  coord_x NUMERIC,
  coord_y NUMERIC,
  reading_order INTEGER,
  
  -- Semantische Information
  section_de TEXT,           -- z.B. "2b Angaben zu den Eltern"
  label_de TEXT,             -- z.B. "Nachname"
  semantic_meaning TEXT,     -- z.B. "nachname", "geburtsdatum", "strasse"
  
  -- Suffix-Muster (für Validierung)
  suffix_pattern TEXT,       -- 'underscore', 'space_digit_1', etc.
  base_field_name TEXT,      -- Ohne Suffix, z.B. "txt.vorname2b"
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index für schnelle Suche
CREATE INDEX idx_pdf_field_target_person ON pdf_field_registry(target_person);
CREATE INDEX idx_pdf_field_semantic ON pdf_field_registry(semantic_meaning);
```

### 1.2 Personen-Zuordnungslogik (automatisch befüllen)

Basierend auf `pdf-parent-field-patterns.json`:

| Suffix-Muster | Beispiel | target_person |
|---------------|----------|---------------|
| Kein Suffix + hat ` 1` Variante | `txt.vorname2b` | `elternteil_1` |
| ` 1` am Ende | `txt.vorname2b 1` | `elternteil_2` |
| `_1` am Ende | `txt.steuer2b_1` | `elternteil_1` |
| `_2` am Ende | `txt.steuer2b_2` | `elternteil_2` |
| `1` nach Buchstabe | `txt.bankcode1` | `elternteil_1` |
| `2` nach Buchstabe | `txt.bankcode2` | `elternteil_2` |
| `txt.*1A 4` (Kind-Felder) | `txt.vorname1A 4` | `antragskind` |
| `txt.*4` (1. Geschwister) | `txt.vorname4` | `geschwister_1` |
| `txt.2*4` (2. Geschwister) | `txt.2vorname4` | `geschwister_2` |
| `txt.3*4` (3. Geschwister) | `txt.3vorname4` | `geschwister_3` |

---

## Phase 2: Edge Function zum Befüllen der Registry

### 2.1 Neue Edge Function `populate-pdf-field-registry`

Diese Funktion:
1. Lädt alle 657 PDF-Felder aus dem PDF
2. Wendet die Suffix-Muster an um `target_person` zu bestimmen
3. Extrahiert `semantic_meaning` aus dem Feldnamen
4. Speichert alles in `pdf_field_registry`

```text
Algorithmus für target_person:

1. Prüfe spezielle Kind-Muster:
   - "*1A 4", "*1a 3" → antragskind
   - "txt.*4" (ohne Prefix-Zahl) → geschwister_1
   - "txt.2*4" → geschwister_2
   - "txt.3*4" → geschwister_3
   - "txt.adoptiv4", "txt.2adoptiv4", "txt.3adoptiv4" → entsprechende Kategorie

2. Prüfe Eltern-Suffix-Muster (in Prioritäts-Reihenfolge):
   - Endet mit "_1" → elternteil_1
   - Endet mit "_2" → elternteil_2
   - Endet mit " 1" → elternteil_2 (!)
   - Endet mit " 2" → elternteil_2
   - Endet mit "1" nach Buchstabe → elternteil_1
   - Endet mit "2" nach Buchstabe → elternteil_2
   - Hat Pendant mit " 1" Suffix → elternteil_1

3. Lebensmonat-Grids:
   - cb_BG_1..cb_BG_18 → elternteil_1
   - cb_BG_20..cb_BG_37 → elternteil_2
   - cb_E+_1..cb_E+_18 → elternteil_1
   - cb_E+_34..cb_E+_55 → elternteil_2

4. Fallback: universal
```

---

## Phase 3: Frontend - Field Mapper Update

### 3.1 PdfFieldsList Komponente erweitern

**Vorher:**
```
txt.vorname2b
txt.vorname2b 1
txt.geburt2b
```

**Nachher:**
```
[E1] txt.vorname2b      → "Vorname" (Elternteil 1)
[E2] txt.vorname2b 1    → "Vorname" (Elternteil 2)
[E1] txt.geburt2b       → "Geburtsdatum" (Elternteil 1)
[AK] txt.vorname1A 4    → "Vorname" (Antragskind)
[G1] txt.vorname4       → "Vorname" (1. Geschwister)
```

### 3.2 Badges für target_person

| target_person | Badge | Farbe |
|--------------|-------|-------|
| elternteil_1 | E1 | Blau |
| elternteil_2 | E2 | Lila |
| antragskind | AK | Grün |
| geschwister_1 | G1 | Orange |
| geschwister_2 | G2 | Orange |
| geschwister_3 | G3 | Orange |
| mehrling_1 | M1 | Cyan |
| universal | — | Grau |

### 3.3 Filter-Dropdown

Neues Filter-Dropdown oberhalb der PDF-Feld-Liste:
- Alle Felder
- Nur Elternteil 1
- Nur Elternteil 2
- Nur Antragskind
- Nur Geschwister
- Nur Universal

---

## Phase 4: Verbesserter Auto-Mapper

### 4.1 Intelligentes Mapping mit Registry

Der neue Auto-Mapper:

1. **Lädt `pdf_field_registry`** mit vorklassifizierten Feldern
2. **Matched nach `target_person`**:
   - DB-Feld mit `person_type = 'vater'` → PDF-Felder mit `target_person = 'elternteil_1'`
   - DB-Feld mit `person_type = 'mutter'` → PDF-Felder mit `target_person = 'elternteil_2'`
   - DB-Feld aus `geburtsurkunden` mit `upload_position = 0` → `antragskind`
3. **Matched nach `semantic_meaning`**:
   - `vorname` → `vorname`
   - `nachname` → `nachname`, `name`
   - `geburtsdatum` → `geburt`, `geb`
4. **Überspringt existierende Mappings** (User-Wunsch!)

### 4.2 Mapping-Logik

```text
Für jedes Quell-Feld aus der Datenbank:
  1. Bestimme Ziel-Person:
     - person_type = 'vater' → suche in elternteil_1
     - person_type = 'mutter' → suche in elternteil_2
     - tabelle = 'geburtsurkunden' + upload_position = 0 → antragskind
     
  2. Filtere pdf_field_registry nach target_person
  
  3. Berechne semantic_meaning Match:
     - Exakter Match: 100%
     - Teilmatch: 80%
     - Levenshtein: 0-70%
     
  4. Nimm bestes Match, aber NUR wenn:
     - Noch kein Mapping für dieses PDF-Feld existiert
     - Confidence > 60%
```

---

## Phase 5: Initiale Befüllung der Registry

### 5.1 JSON-Referenz generieren

Erstelle `public/reference/pdf-field-registry-seed.json` mit allen 657 Feldern, vorklassifiziert durch die Suffix-Muster:

```json
{
  "fields": [
    {
      "pdf_field_name": "txt.vorname2b",
      "field_type": "PDFTextField",
      "target_person": "elternteil_1",
      "semantic_meaning": "vorname",
      "section_de": "2b Angaben zu den Eltern",
      "label_de": "Vorname",
      "page_number": 2
    },
    {
      "pdf_field_name": "txt.vorname2b 1",
      "field_type": "PDFTextField", 
      "target_person": "elternteil_2",
      "semantic_meaning": "vorname",
      "section_de": "2b Angaben zu den Eltern",
      "label_de": "Vorname",
      "page_number": 2
    }
  ]
}
```

### 5.2 Migrations-Script

Die Datenbank wird initial aus dem JSON befüllt und kann dann manuell korrigiert werden.

---

## Zusammenfassung der Änderungen

| Bereich | Aktion | Priorität |
|---------|--------|-----------|
| Datenbank | Neue Tabelle `pdf_field_registry` | Hoch |
| Edge Function | `populate-pdf-field-registry` | Hoch |
| Referenz-JSON | `pdf-field-registry-seed.json` | Hoch |
| Frontend | `PdfFieldsList` mit Badges und Filtern | Mittel |
| Auto-Mapper | Intelligentes Mapping mit Registry | Mittel |

---

## Vorteile

1. **Klare Personen-Zuordnung**: Jedes PDF-Feld hat eine definierte Zielgruppe
2. **Bessere UX**: Badges zeigen sofort, für wen ein Feld ist
3. **Präziseres Auto-Mapping**: Vater-Felder → Elternteil 1, Mutter-Felder → Elternteil 2
4. **Keine Überschreibung**: Existierende Mappings werden respektiert
5. **Erweiterbar**: Kann um weitere Metadaten erweitert werden

---

## Technische Details

### Betroffene Dateien (Änderungen)

1. `supabase/migrations/...` - Neue Tabelle
2. `supabase/functions/populate-pdf-field-registry/index.ts` - NEU
3. `supabase/functions/auto-map-fields/index.ts` - Überarbeiten
4. `src/components/field-mapper/PdfFieldsList.tsx` - Badges + Filter
5. `src/pages/AdminFieldMapper.tsx` - Registry laden
6. `public/reference/pdf-field-registry-seed.json` - NEU

### Keine Änderungen an

- Bestehende `pdf_field_mappings` Tabelle (bleibt unverändert)
- Existierende Mappings (werden nicht überschrieben)
- Extraktions-Edge-Functions
