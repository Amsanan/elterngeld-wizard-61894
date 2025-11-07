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

// Field mappings from Excel file: Mapping032025_1.xlsx (spaces removed from field names)
// Maps database fields to actual PDF AcroForm field names
export const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  geburtsurkunde: {
    // Kind table fields - PDF field names with single txt. prefix
    kind_vorname: "txt.vorname1A 4",
    kind_nachname: "txt.name1A 4",
    kind_geburtsdatum: "txt.geburtsdatum1a 3",
    kind_anzahl_mehrlinge: "txt.anzahl 4",
    // Parent names from birth certificate - parent 2 is mother, parent 1 is father
    mutter_vorname: "txt.vorname2b 1",  // SPACE before 1!
    mutter_nachname: "txt.name2b 1",
    vater_vorname: "txt.vorname2b",
    vater_nachname: "txt.name2b"
  },
  eltern_dokument_vater: {
    // Antrag_2B_Elternteil fields for parent 1 (rows 32-36)
    vorname: "txt.vorname2b",
    nachname: "txt.name2b",
    geburtsdatum: "txt.geburt2b",
    steuer_id: "txt.steuer2b_1"
    // Note: Gender, nationality, ID number not directly mapped
  },
  eltern_dokument_mutter: {
    // Antrag_2B_Elternteil fields for parent 2 - SPACE before 1!
    vorname: "txt.vorname2b 1",
    nachname: "txt.name2b 1",
    geburtsdatum: "txt.geburt2b 1",
    steuer_id: "txt.steuer2b_2"
  },
  meldebescheinigung_vater: {
    // Antrag_2C_Wohnsitz fields for parent 1 (rows 48-51)
    strasse: "txt.strasse2c",
    hausnummer: "txt.nummer2c",
    plz: "txt.plz2c",
    wohnort: "txt.ort2c"
  },
  meldebescheinigung_mutter: {
    // Antrag_2C_Wohnsitz fields for parent 2 - SPACE before 1!
    strasse: "txt.strasse2c 1",
    hausnummer: "txt.nummer2c 1",
    plz: "txt.plz2c 1",
    wohnort: "txt.ort2c 1"
  },
  einkommensteuerbescheid: {
    // Note: Tax document fields not found in basic mapping
    // May need section 7+ fields for income documentation
    steuerjahr: "txt.steuerjahr", // Placeholder - needs verification
    jahreseinkommen: "txt.jahreseinkommen",
    zu_versteuerndes_einkommen: "txt.zu_versteuerndes_einkommen"
  },
  gehaltsnachweis_vater: {
    // Salary fields - section 7+ (not fully mapped in basic sections)
    bruttogehalt: "txt.bruttogehalt_vater",
    nettogehalt: "txt.nettogehalt_vater",
    arbeitgeber_name: "txt.arbeitgeber_vater"
  },
  gehaltsnachweis_mutter: {
    bruttogehalt: "txt.bruttogehalt_mutter",
    nettogehalt: "txt.nettogehalt_mutter",
    arbeitgeber_name: "txt.arbeitgeber_mutter"
  },
  arbeitgeberbescheinigung_vater: {
    // Employer certificate fields - not in basic mapping
    arbeitgeber_name: "txt.arbeitgeber_name_vater",
    beschaeftigungsbeginn: "txt.beschaeftigung_von_vater",
    wochenstunden: "txt.wochenstunden_vater"
  },
  arbeitgeberbescheinigung_mutter: {
    arbeitgeber_name: "txt.arbeitgeber_name_mutter",
    beschaeftigungsbeginn: "txt.beschaeftigung_von_mutter",
    wochenstunden: "txt.wochenstunden_mutter"
  },
  krankenversicherung: {
    // Antrag_5_Krankenversicherung fields for parent 1 (rows 225-231)
    versichertennummer: "txt.versichertennummer5",
    krankenkasse_name: "txt.namekk5",
    krankenkasse_strasse: "txt.kkstrasse5",
    krankenkasse_hausnummer: "txt.kknr5",
    krankenkasse_plz: "txt.kkplz5",
    krankenkasse_ort: "txt.kkort5"
  },
  bankverbindung: {
    // Antrag_16A_Bankverbindung fields (rows 697-698)
    iban: "txt.Kontonummer_1",
    bic: "txt.bankcode1",
    // Note: Account holder name uses txt.konto_name_1 / txt.konto_nachname_1 
    // when it's not own account (row 702-703)
  },
  ehe_sorgerecht: {
    // Marriage/custody fields from Antrag_2G_Familienstand (rows 139-147)
    // Note: These are checkboxes, not text fields
    verheiratet: "cb:verheiratet2g",
    ledig: "cb.ledig2g",
    geschieden: "cb.geschieden2g",
    verwitwet: "cb.verwirtwet2g"
  }
};
