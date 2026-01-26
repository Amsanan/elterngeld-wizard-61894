

# Plan: Integration der Elternteil-Suffix-Extraktion in das Framework

## Übersicht

Der hochgeladene JSON-File `elternteil_suffix_extraktion.json` enthält eine vollständige Analyse der PDF-Feldbenennungskonventionen zur Unterscheidung zwischen Elternteil 1 und Elternteil 2. Diese Informationen sollen in das Projekt integriert werden.

---

## Was enthält die Datei?

### 4 Haupt-Suffix-Muster (110 Feldbasen)

| Muster | Elternteil 1 | Elternteil 2 | Anzahl | Beispiel |
|--------|--------------|--------------|--------|----------|
| `pattern_underscore` | `_1` | `_2` | 42 | `txt.steuer2b_1` → `txt.steuer2b_2` |
| `pattern_space_digit_right_column` | (kein Suffix) | ` 1` | 39 | `txt.vorname2b` → `txt.vorname2b 1` |
| `pattern_space_digit_ausland` | (kein Suffix) | ` 2` | 17 | `txt.staat2c` → `txt.staat2c 2` |
| `pattern_trailing_digit` | `1` | `2` | 12 | `txt.bankcode1` → `txt.bankcode2` |

### 6 Sonderfälle (Wichtig für präzise Mappings)

1. **Offset-Nummerierung**: `_2`/`_3` statt `_1`/`_2` (z.B. `cb.andereErsatz_2` → `cb.andereErsatz_3`)
2. **Unerwartete Endziffer**: Elternteil 2 springt zu `_3` statt `_2`
3. **Unterschiedliche Feldbasen**: Gleiche Frage, aber andere technische Namen
4. **Generische Kontrollkästchen-IDs**: `Kontrollkästchen 59` vs `Kontrollkästchen 69`
5. **Lebensmonat-Tabellen**: Nummern kodieren Monat, nicht Elternteil (Bereiche wie `cb_BG_1..18` vs `cb_BG_20..37`)
6. **Felder nur für Elternteil 2**: z.B. `cb.wohnezusammen2c` (kein Pendant für Elternteil 1)

---

## Geplante Änderungen

### Phase 1: JSON-Datei in Projekt kopieren

**Aktion:** Die Datei nach `public/reference/elternteil_suffix_extraktion.json` kopieren

```text
public/reference/
├── database-fields-with-filters.json
├── elterngeld_nachweise_katalog.json
├── elternteil_suffix_extraktion.json    ← NEU
└── Updated_Database_PDF_Mapping.json
```

### Phase 2: Framework-Dokumentation erweitern

**Datei:** `docs/AI-Chatbot-Framework.md`

**Erweiterung von Sektion 4.3 "PDF Field Naming Convention":**

Das bisherige einfache Schema:

```
| Parent 1 (Father) | None | txt.vorname2b   |
| Parent 2 (Mother) | ` 1` | txt.vorname2b 1 |
```

Wird ersetzt durch die vollständige 4-Muster-Dokumentation:

```text
### 4.3 PDF Field Naming Convention - Parent Suffixes

The Elterngeld PDF uses **4 different suffix patterns** to distinguish parents:

#### Pattern 1: Underscore Suffix (_1 / _2)
- Most common for income and tax sections (42 field bases)
- Elternteil 1: `_1` | Elternteil 2: `_2`
- Examples: `txt.steuer2b_1` → `txt.steuer2b_2`

#### Pattern 2: Space-Digit Right Column (∅ / " 1")
- Used for personal data columns (39 field bases)
- Elternteil 1: no suffix | Elternteil 2: ` 1` (space+1)
- Examples: `txt.vorname2b` → `txt.vorname2b 1`

#### Pattern 3: Space-Digit Ausland (∅ / " 2")
- Used for foreign residence sections (17 field bases)
- Elternteil 1: no suffix | Elternteil 2: ` 2` (space+2)
- Examples: `txt.staat2c` → `txt.staat2c 2`

#### Pattern 4: Trailing Digit (1 / 2)
- Used for bank and church fields (12 field bases)
- Elternteil 1: ends with `1` | Elternteil 2: ends with `2`
- Examples: `txt.bankcode1` → `txt.bankcode2`

### 4.3.1 Special Cases (Sonderfälle)

CRITICAL: These edge cases MUST be handled individually in mappings:

1. **Offset Numbering**: Some fields use `_2`/`_3` instead of `_1`/`_2`
2. **Lebensmonat Grids**: Numbers encode month, not parent (use ranges)
3. **Unique Parent 2 Fields**: e.g., `cb.wohnezusammen2c` has no Parent 1 equivalent
```

### Phase 3: Mapping-Referenz erstellen

**Neue Datei:** `public/reference/pdf-parent-field-patterns.json`

Ein strukturiertes Schema für die Auto-Mapping-Logik:

```json
{
  "patterns": {
    "underscore": {
      "detect": "/_[12]$/",
      "parent1": "_1",
      "parent2": "_2",
      "priority": 1
    },
    "space_digit_1": {
      "detect": "/ 1$/",
      "parent1": "",
      "parent2": " 1",
      "priority": 2
    },
    // ... weitere Muster
  },
  "special_cases": {
    "offset_fields": ["cb.andereErsatz", "cb.wenigCorona", "cb.pflichkk"],
    "lebensmonat_ranges": {
      "parent1": { "BG": [1, 18], "E+": [1, 18] },
      "parent2": { "BG": [20, 37], "E+": [34, 55] }
    }
  }
}
```

### Phase 4: Auto-Map-Funktion verbessern (Optional)

**Datei:** `supabase/functions/auto-map-fields/index.ts`

Wenn die automatische Mapping-Funktion erweitert werden soll, könnte sie die Muster nutzen um:
- Automatisch das korrekte Elternteil-2-Feld zu erkennen
- Warnungen bei Sonderfällen auszugeben

---

## Zusammenfassung der Änderungen

| Bereich | Änderung | Priorität |
|---------|----------|-----------|
| Referenz-Datei | JSON nach `public/reference/` kopieren | Hoch |
| Dokumentation | Sektion 4.3 im Framework erweitern | Hoch |
| Neue Referenz | `pdf-parent-field-patterns.json` erstellen | Mittel |
| Auto-Mapping | Edge Function erweitern (optional) | Niedrig |

---

## Vorteile

1. **Präzisere Mappings**: Andere AI-Chatbots verstehen alle 4 Muster
2. **Weniger Fehler**: Sonderfälle sind dokumentiert
3. **Wiederverwendbar**: JSON-Schema kann programmatisch genutzt werden
4. **Vollständig**: Deckt 110+ Feldbasen ab statt nur ein Muster

