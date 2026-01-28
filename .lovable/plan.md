
# Plan: Seitennummer-Erkennung für PDF-Felder korrigieren

## Problem

Der Wizard zeigt "0 Felder" an, weil alle 657 PDF-Felder `page_number: 0` haben. Die Seitennummer-Erkennung in der `populate-pdf-field-registry` Edge Function funktioniert nicht korrekt.

## Analyse

| Ist-Zustand | Soll-Zustand |
|-------------|--------------|
| Alle Felder: `page_number: 0` | Felder verteilt auf Seiten 1-23 |
| Wizard zeigt: "0 Felder auf dieser Seite" | Wizard zeigt: "~30 Felder auf dieser Seite" |

## Lösungsansatz

Es gibt zwei Optionen:

### Option A: Koordinatenbasierte Seitenerkennung (EMPFOHLEN)

pdf-lib gibt uns die Widget-Koordinaten (`coord_x`, `coord_y`), aber die Seitenzuordnung über `pageRef` funktioniert in Deno nicht zuverlässig. 

Stattdessen werden wir **alle Seiten iterieren und prüfen, welche Widgets zu welcher Seite gehören** durch Vergleich der Page-Referenzen.

### Option B: Feldnamen-basierte Zuordnung (FALLBACK)

Viele Feldnamen enthalten Seitenhinweise im Namen (z.B. `2b`, `2c` für Seite 2). Diese können als Heuristik verwendet werden.

## Implementierung (Option A + B kombiniert)

### Schritt 1: Edge Function reparieren

Datei: `supabase/functions/populate-pdf-field-registry/index.ts`

Neue Logik für Seitenerkennung:

```typescript
// Für jede Seite: Alle Annots sammeln und mit Widget-Refs vergleichen
const pageFieldMap = new Map<any, number>();

for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
  const page = pages[pageIndex];
  const annots = page.node.Annots();
  
  if (annots) {
    for (let i = 0; i < annots.size(); i++) {
      const annotRef = annots.get(i);
      pageFieldMap.set(annotRef.toString(), pageIndex + 1);
    }
  }
}

// Dann bei jedem Feld: Widget-Ref nachschlagen
for (const field of formFields) {
  const widgets = field.acroField.getWidgets();
  let pageNumber = 0;
  
  if (widgets.length > 0) {
    const widgetRef = widgets[0].dict.get(PDFName.of('P'));
    if (widgetRef && pageFieldMap.has(widgetRef.toString())) {
      pageNumber = pageFieldMap.get(widgetRef.toString());
    }
  }
  
  // Fallback: Feldnamen-Heuristik
  if (pageNumber === 0) {
    pageNumber = extractPageFromFieldName(fieldName);
  }
}
```

### Schritt 2: Feldnamen-Heuristik implementieren

```typescript
function extractPageFromFieldName(fieldName: string): number {
  // Muster: "txt.vorname2b" → Seite 2
  // Muster: "cb.verheiratet2c" → Seite 2
  // Muster: "txt.vorname1A 4" → Seite 1 (Kind-Bereich)
  
  const patterns: { regex: RegExp; page: number }[] = [
    // Deckblatt
    { regex: /^cb\.antrag/i, page: 1 },
    // Seite 2-3: Eltern
    { regex: /2b|2c/i, page: 2 },
    // Seite 4: Adresse  
    { regex: /2d|wohnung|adress/i, page: 4 },
    // Seite 5-9: Einkommen
    { regex: /eink|gehalt|arbeit/i, page: 5 },
    // Seite 10-11: Mutterschaftsgeld
    { regex: /mutter|mug/i, page: 10 },
    // ... weitere Muster
  ];
  
  for (const { regex, page } of patterns) {
    if (regex.test(fieldName)) return page;
  }
  
  return 0; // Fallback
}
```

### Schritt 3: Alternative - Wizard anpassen

Falls die PDF-Extraktion schwierig bleibt, kann der Wizard auch ohne Seiten-Gruppierung funktionieren:

- **Option**: Alle Felder auf einer scrollbaren Liste anzeigen
- **Option**: Nach semantic_meaning oder target_person gruppieren statt nach Seite

### Schritt 4: Wizard für page_number=0 anpassen (Quick Fix)

Als sofortige Lösung: Wenn `page_number = 0`, alle Felder anzeigen oder nach target_person gruppieren.

Datei: `src/hooks/useFillModeEngine.ts`

```typescript
// Quick fix: Wenn alle Felder auf Seite 0 sind, zeige sie alle
const pageFields = pdfFields.filter(f => 
  f.page_number === currentPage || 
  (currentPage === 1 && f.page_number === 0)
);
```

---

## Empfohlene Reihenfolge

1. **Sofort-Fix (Quick)**: Wizard zeigt Seite 0 Felder auf Seite 1 an
2. **Langfristig**: Edge Function mit korrekter Seitenerkennung aktualisieren
3. **Test**: Registry neu populieren und Wizard testen

## Dateien die geändert werden

| Datei | Änderung |
|-------|----------|
| `src/hooks/useFillModeEngine.ts` | Quick-fix für page_number=0 |
| `supabase/functions/populate-pdf-field-registry/index.ts` | Korrekte Seitenerkennung |

## Geschätzter Aufwand

- Quick-fix: 5 Minuten
- Vollständige Lösung: 30 Minuten
