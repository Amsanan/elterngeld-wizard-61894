# Workflow-Diagramme

## Gesamt-Architektur

```mermaid
flowchart TD
    subgraph User["Benutzer"]
        U1[Dokumente hochladen]
        U2[Wizard durchlaufen]
        U3[PDF herunterladen]
    end
    
    subgraph Frontend["Frontend (React)"]
        F1[Upload-Seiten]
        F2[Document Uploader]
        F3[PDF Viewer]
        F4[Wizard Steps]
    end
    
    subgraph Storage["Supabase Storage"]
        S1[documents Bucket]
        S2[form-templates Bucket]
        S3[elterngeldantrag-drafts Bucket]
    end
    
    subgraph EdgeFunctions["Edge Functions"]
        E1[extract-* Functions]
        E2[fill-elterngeld-form]
    end
    
    subgraph ExternalAPIs["Externe APIs"]
        A1[OCR.space]
        A2[OpenRouter LLM]
    end
    
    subgraph Database["Datenbank"]
        D1[(Dokument-Tabellen)]
        D2[(pdf_field_mappings)]
        D3[(computed_field_rules)]
    end
    
    U1 --> F1
    F1 --> F2
    F2 --> S1
    S1 --> E1
    E1 --> A1
    E1 --> A2
    E1 --> D1
    
    U2 --> F4
    F4 --> E2
    E2 --> D1
    E2 --> D2
    E2 --> D3
    E2 --> S2
    E2 --> S3
    
    S3 --> F3
    F3 --> U3
```

---

## Dokument-Upload Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Storage
    participant EdgeFn as Edge Function
    participant OCR as OCR.space
    participant LLM as OpenRouter
    participant DB as Database
    
    User->>Frontend: Datei auswaehlen
    Frontend->>Frontend: validateFile()
    Frontend->>Frontend: sanitizeFilename()
    Frontend->>Storage: upload(file)
    Storage-->>Frontend: filePath
    
    Frontend->>EdgeFn: invoke('extract-*', {filePath})
    EdgeFn->>Storage: download(filePath)
    Storage-->>EdgeFn: fileBytes
    
    EdgeFn->>EdgeFn: Base64 encode
    EdgeFn->>OCR: POST /parse/image
    OCR-->>EdgeFn: ParsedText
    
    EdgeFn->>LLM: POST /chat/completions
    Note over EdgeFn,LLM: System Prompt + OCR Text
    LLM-->>EdgeFn: JSON mit extrahierten Daten
    
    EdgeFn->>DB: upsert(extractedData)
    DB-->>EdgeFn: success
    EdgeFn-->>Frontend: {success, documentId}
    Frontend-->>User: Erfolgs-Meldung
```

---

## PDF-Generierung Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant EdgeFn as fill-elterngeld-form
    participant DB as Database
    participant Storage
    participant PDFLib as pdf-lib
    
    User->>Frontend: "Weiter" im Wizard
    Frontend->>EdgeFn: invoke({step, antragId})
    
    EdgeFn->>DB: SELECT FROM pdf_field_mappings
    DB-->>EdgeFn: mappings[]
    
    EdgeFn->>DB: SELECT FROM geburtsurkunden, eltern_dokumente, ...
    DB-->>EdgeFn: documentData
    
    EdgeFn->>Storage: download(previous-draft.pdf)
    alt Draft existiert
        Storage-->>EdgeFn: existingPdf
    else Kein Draft
        EdgeFn->>Storage: download(template.pdf)
        Storage-->>EdgeFn: templatePdf
    end
    
    EdgeFn->>PDFLib: PDFDocument.load()
    EdgeFn->>EdgeFn: applyMappings(data, mappings)
    EdgeFn->>EdgeFn: executeBusinessLogic()
    EdgeFn->>PDFLib: form.getTextField().setText()
    EdgeFn->>PDFLib: pdfDoc.save()
    
    EdgeFn->>Storage: upload(new-draft.pdf)
    Storage-->>EdgeFn: success
    
    EdgeFn-->>Frontend: {success, pdfPath}
    Frontend->>Storage: getPublicUrl(pdfPath)
    Frontend-->>User: PDF-Vorschau
```

---

## LLM-Extraktion mit Retry

```mermaid
flowchart TD
    A[Start: OCR-Text] --> B[API-Aufruf an OpenRouter]
    B --> C{Response Status?}
    
    C -->|200 OK| D[JSON parsen]
    D --> E{Valides JSON?}
    E -->|Ja| F[Return: Extrahierte Daten]
    E -->|Nein| G{Retry-Limit erreicht?}
    
    C -->|429 Rate Limit| H[Warte: exponentielles Backoff]
    H --> G
    
    C -->|404/500 Error| G
    
    G -->|Nein| I[Retry-Counter erhoehen]
    I --> B
    
    G -->|Ja| J[Throw: API Error]
    
    style F fill:#90EE90
    style J fill:#FFB6C1
```

---

## Daten-Mapping Logik

```mermaid
flowchart LR
    subgraph Quell-Tabellen
        GT[geburtsurkunden]
        ED[eltern_dokumente]
        GN[gehaltsnachweise]
        AB[arbeitgeberbescheinigungen]
    end
    
    subgraph Mapping-Tabelle
        PM[(pdf_field_mappings)]
    end
    
    subgraph Filter-Logik
        F1{person_type?}
        F2{kind_ordnungszahl?}
        F3{kind_typ?}
    end
    
    subgraph PDF-Felder
        P1["txt.vorname1A (Vater)"]
        P2["txt.vorname1A_1 (Mutter)"]
        P3["txt.vorname1A 4 (Kind 1)"]
        P4["txt.vorname1A 5 (Kind 2)"]
    end
    
    GT --> PM
    ED --> PM
    GN --> PM
    AB --> PM
    
    PM --> F1
    PM --> F2
    PM --> F3
    
    F1 -->|eltern1| P1
    F1 -->|eltern2| P2
    F2 -->|0| P3
    F2 -->|1| P4
```

---

## Business-Logik: Mehrlinge

```mermaid
flowchart TD
    A[Alle Geburtsurkunden laden] --> B[Primaer-Kind finden]
    B --> C{Primaer-Kind gefunden?}
    
    C -->|Nein| D[Return: 0 Mehrlinge]
    C -->|Ja| E[Filter: Gleicher Geburtstag]
    
    E --> F[Filter: Anderer Name]
    F --> G[Zaehle verbleibende]
    
    G --> H{Count > 0?}
    H -->|Nein| D
    H -->|Ja| I[Set: chk.mehrling = true]
    I --> J[Set: txt.mehrling_anzahl = Count+1]
    J --> K[Return: Mehrlinge gefunden]
    
    style D fill:#FFB6C1
    style K fill:#90EE90
```

---

## Business-Logik: Geschwisterbonus

```mermaid
flowchart TD
    A[Geschwister laden] --> B[Fuer jedes Geschwister]
    B --> C[Alter berechnen]
    
    C --> D{Alter < 3?}
    D -->|Ja| E[unter3++]
    D -->|Nein| F{Alter < 6?}
    F -->|Ja| G[unter6++]
    F -->|Nein| H[Kein Bonus]
    
    E --> I{Behinderung >= 50%?}
    G --> I
    I -->|Ja| J[mitBehinderung++]
    I -->|Nein| K[Weiter]
    
    J --> K
    K --> L{Mehr Geschwister?}
    L -->|Ja| B
    L -->|Nein| M[Bonus-Logik anwenden]
    
    M --> N{unter3 >= 1 OR unter6 >= 2?}
    N -->|Ja| O[chk.geschwisterbonus = true]
    N -->|Nein| P[Kein Geschwisterbonus]
```

---

## Fehlerbehandlung

```mermaid
flowchart TD
    A[Request eingehend] --> B{Authentifiziert?}
    B -->|Nein| C[401 Unauthorized]
    B -->|Ja| D{Datei existiert?}
    
    D -->|Nein| E[404 Not Found]
    D -->|Ja| F{Valides Format?}
    
    F -->|Nein| G[400 Bad Request]
    F -->|Ja| H[OCR durchfuehren]
    
    H --> I{OCR erfolgreich?}
    I -->|Nein| J[500 OCR Error]
    I -->|Ja| K[LLM aufrufen]
    
    K --> L{LLM erfolgreich?}
    L -->|Nein| M{Retry moeglich?}
    M -->|Ja| K
    M -->|Nein| N[500 LLM Error]
    
    L -->|Ja| O[Daten speichern]
    O --> P{DB erfolgreich?}
    P -->|Nein| Q[500 DB Error]
    P -->|Ja| R[200 Success]
    
    style C fill:#FFB6C1
    style E fill:#FFB6C1
    style G fill:#FFB6C1
    style J fill:#FFB6C1
    style N fill:#FFB6C1
    style Q fill:#FFB6C1
    style R fill:#90EE90
```
