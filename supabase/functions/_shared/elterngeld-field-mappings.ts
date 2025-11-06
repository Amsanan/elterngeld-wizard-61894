// Field mappings from database tables to PDF AcroForm fields
// This will be refined after analyzing the actual PDF form fields

export const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "Geburtsurkunde",
    documentType: "geburtsurkunde",
    tableName: "geburtsurkunden",
    description: "Angaben zum Kind",
    icon: "FileText"
  },
  {
    step: 2,
    title: "Personalausweis Vater",
    documentType: "eltern_dokument_vater",
    tableName: "eltern_dokumente",
    filter: { person_type: "vater", document_type: "personalausweis" },
    description: "Angaben zum Vater",
    icon: "User"
  },
  {
    step: 3,
    title: "Personalausweis Mutter",
    documentType: "eltern_dokument_mutter",
    tableName: "eltern_dokumente",
    filter: { person_type: "mutter", document_type: "personalausweis" },
    description: "Angaben zur Mutter",
    icon: "User"
  },
  {
    step: 4,
    title: "Meldebescheinigung Vater",
    documentType: "meldebescheinigung_vater",
    tableName: "meldebescheinigungen",
    filter: { person_type: "vater" },
    description: "Wohnsitz Vater",
    icon: "Home"
  },
  {
    step: 5,
    title: "Meldebescheinigung Mutter",
    documentType: "meldebescheinigung_mutter",
    tableName: "meldebescheinigungen",
    filter: { person_type: "mutter" },
    description: "Wohnsitz Mutter",
    icon: "Home"
  },
  {
    step: 6,
    title: "Einkommenssteuerbescheid",
    documentType: "einkommensteuerbescheid",
    tableName: "einkommensteuerbescheide",
    description: "Einkommensnachweis",
    icon: "FileCheck"
  },
  {
    step: 7,
    title: "Gehaltsnachweise Vater",
    documentType: "gehaltsnachweis_vater",
    tableName: "gehaltsnachweise",
    filter: { person_type: "vater" },
    description: "Gehälter Vater (letzte 12 Monate)",
    icon: "DollarSign"
  },
  {
    step: 8,
    title: "Gehaltsnachweise Mutter",
    documentType: "gehaltsnachweis_mutter",
    tableName: "gehaltsnachweise",
    filter: { person_type: "mutter" },
    description: "Gehälter Mutter (letzte 12 Monate)",
    icon: "DollarSign"
  },
  {
    step: 9,
    title: "Arbeitgeberbescheinigung Vater",
    documentType: "arbeitgeberbescheinigung_vater",
    tableName: "arbeitgeberbescheinigungen",
    filter: { person_type: "vater" },
    description: "Beschäftigungsnachweis Vater",
    icon: "Briefcase"
  },
  {
    step: 10,
    title: "Arbeitgeberbescheinigung Mutter",
    documentType: "arbeitgeberbescheinigung_mutter",
    tableName: "arbeitgeberbescheinigungen",
    filter: { person_type: "mutter" },
    description: "Beschäftigungsnachweis Mutter",
    icon: "Briefcase"
  },
  {
    step: 11,
    title: "Krankenversicherung",
    documentType: "krankenversicherung",
    tableName: "krankenversicherung_nachweise",
    description: "Versicherungsnachweis",
    icon: "Heart"
  },
  {
    step: 12,
    title: "Bankverbindung",
    documentType: "bankverbindung",
    tableName: "bankverbindungen",
    description: "Kontoangaben für Auszahlung",
    icon: "CreditCard"
  },
  {
    step: 13,
    title: "Ehe-/Sorgerecht",
    documentType: "ehe_sorgerecht",
    tableName: "ehe_sorgerecht_nachweise",
    description: "Familienstand und Sorgerecht",
    icon: "Users"
  }
];

// Field mappings - will be populated after PDF analysis
// These are initial estimates based on common Elterngeld form fields
export const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  geburtsurkunde: {
    kind_vorname: "Kind_Vorname",
    kind_nachname: "Kind_Nachname",
    kind_geburtsdatum: "Kind_Geburtsdatum",
    kind_geburtsort: "Kind_Geburtsort",
    mutter_vorname: "Mutter_Vorname",
    mutter_nachname: "Mutter_Nachname",
    vater_vorname: "Vater_Vorname",
    vater_nachname: "Vater_Nachname"
  },
  eltern_dokument_vater: {
    vorname: "Vater_Vorname",
    nachname: "Vater_Nachname",
    geburtsdatum: "Vater_Geburtsdatum",
    geburtsort: "Vater_Geburtsort",
    staatsangehoerigkeit: "Vater_Staatsangehoerigkeit",
    ausweisnummer: "Vater_Ausweisnummer"
  },
  eltern_dokument_mutter: {
    vorname: "Mutter_Vorname",
    nachname: "Mutter_Nachname",
    geburtsdatum: "Mutter_Geburtsdatum",
    geburtsort: "Mutter_Geburtsort",
    staatsangehoerigkeit: "Mutter_Staatsangehoerigkeit",
    ausweisnummer: "Mutter_Ausweisnummer"
  },
  meldebescheinigung_vater: {
    strasse: "Vater_Strasse",
    hausnummer: "Vater_Hausnummer",
    plz: "Vater_PLZ",
    wohnort: "Vater_Wohnort"
  },
  meldebescheinigung_mutter: {
    strasse: "Mutter_Strasse",
    hausnummer: "Mutter_Hausnummer",
    plz: "Mutter_PLZ",
    wohnort: "Mutter_Wohnort"
  },
  einkommensteuerbescheid: {
    steuerjahr: "Steuerjahr",
    jahreseinkommen: "Jahreseinkommen",
    zu_versteuerndes_einkommen: "Zu_versteuerndes_Einkommen"
  },
  gehaltsnachweis_vater: {
    bruttogehalt: "Vater_Bruttogehalt",
    nettogehalt: "Vater_Nettogehalt",
    arbeitgeber_name: "Vater_Arbeitgeber"
  },
  gehaltsnachweis_mutter: {
    bruttogehalt: "Mutter_Bruttogehalt",
    nettogehalt: "Mutter_Nettogehalt",
    arbeitgeber_name: "Mutter_Arbeitgeber"
  },
  arbeitgeberbescheinigung_vater: {
    arbeitgeber_name: "Vater_Arbeitgeber_Name",
    beschaeftigungsbeginn: "Vater_Beschaeftigungsbeginn",
    wochenstunden: "Vater_Wochenstunden"
  },
  arbeitgeberbescheinigung_mutter: {
    arbeitgeber_name: "Mutter_Arbeitgeber_Name",
    beschaeftigungsbeginn: "Mutter_Beschaeftigungsbeginn",
    wochenstunden: "Mutter_Wochenstunden"
  },
  krankenversicherung: {
    krankenkasse_name: "Krankenkasse",
    versichertennummer: "Versichertennummer",
    versicherungsart: "Versicherungsart"
  },
  bankverbindung: {
    iban: "IBAN",
    bic: "BIC",
    kontoinhaber: "Kontoinhaber",
    bank_name: "Bank"
  },
  ehe_sorgerecht: {
    dokument_typ: "Familienstand",
    heiratsdatum: "Heiratsdatum",
    sorgerecht_art: "Sorgerecht"
  }
};
