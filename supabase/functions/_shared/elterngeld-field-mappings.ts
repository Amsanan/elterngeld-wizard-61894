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
    // VERIFIED: These fields exist in the PDF
    kind_vorname: "txt.vorname1A 4",
    kind_nachname: "txt.name1A 4",
    kind_geburtsdatum: "txt.geburtsdatum1a 3",
    kind_anzahl_mehrlinge: "txt.anzahl 4",
    // Parent names from birth certificate
    mutter_vorname: "txt.vorname2b 1",  // IMPORTANT: Space before 1!
    mutter_nachname: "txt.name2b 1",    // IMPORTANT: Space before 1!
    vater_vorname: "txt.vorname2b",
    vater_nachname: "txt.name2b"
  },
  eltern_dokument_vater: {
    // VERIFIED: Basic parent 1 fields
    vorname: "txt.vorname2b",
    nachname: "txt.name2b",
    geburtsdatum: "txt.geburt2b"
    // Note: steuer_id field mapping removed - needs to be found in PDF
    // Note: Gender, nationality, ID number not mapped yet
  },
  eltern_dokument_mutter: {
    // VERIFIED: Basic parent 2 fields - IMPORTANT: Space before 1!
    vorname: "txt.vorname2b 1",
    nachname: "txt.name2b 1",
    geburtsdatum: "txt.geburt2b 1"
    // Note: steuer_id field mapping removed - needs to be found in PDF
  },
  meldebescheinigung_vater: {
    // VERIFIED: Address fields for parent 1
    strasse: "txt.strasse2c",
    hausnummer: "txt.nummer2c",
    plz: "txt.plz2c",
    wohnort: "txt.ort2c"
  },
  meldebescheinigung_mutter: {
    // VERIFIED: Address fields for parent 2 - IMPORTANT: Space before 1!
    strasse: "txt.strasse2c 1",
    hausnummer: "txt.nummer2c 1",
    plz: "txt.plz2c 1",
    wohnort: "txt.ort2c 1"
  },
  einkommensteuerbescheid: {
    // WARNING: These fields need to be verified in the PDF
    // Currently using placeholder names - may not exist
    // person_type: "vater" or "mutter" - needs to be handled separately
  },
  gehaltsnachweis_vater: {
    // WARNING: These placeholder field names don't exist in PDF
    // Need to find actual salary-related fields in section 7+
    // Fields like txt.jahr_1, txt.jahr_2 exist but need proper mapping
  },
  gehaltsnachweis_mutter: {
    // WARNING: These placeholder field names don't exist in PDF
    // Need to find actual salary-related fields in section 7+
  },
  arbeitgeberbescheinigung_vater: {
    // WARNING: These placeholder field names don't exist in PDF
    // Need to find actual employer certificate fields
  },
  arbeitgeberbescheinigung_mutter: {
    // WARNING: These placeholder field names don't exist in PDF
    // Need to find actual employer certificate fields
  },
  krankenversicherung: {
    // VERIFIED: Insurance fields for parent 1 (section 5)
    versichertennummer: "txt.versichertennummer5",
    krankenkasse_name: "txt.namekk5",
    krankenkasse_strasse: "txt.kkstrasse5",
    krankenkasse_hausnummer: "txt.kknr5",
    krankenkasse_plz: "txt.kkplz5",
    krankenkasse_ort: "txt.kkort5"
    // Note: Parent 2 insurance uses section 6 fields (txt.versichertennummer6, etc.)
  },
  bankverbindung: {
    // WARNING: These field names need to be verified
    // Actual bank account fields need to be found in section 16A
  },
  ehe_sorgerecht: {
    // WARNING: Checkbox field names need to be verified
    // These may use different naming convention (cb: vs cb.)
  }
};
