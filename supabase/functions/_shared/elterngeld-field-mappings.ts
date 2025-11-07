// Field mappings from database tables to PDF AcroForm fields
// FOCUSED MAPPING: Only Geburtsurkunde and Ausweis (Parent ID Documents)

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
  }
];

// Field mappings from database tables to PDF AcroForm fields
// FOCUSED MAPPING: Only Geburtsurkunde, Ausweis, and Meldebescheinigung
// Pattern discovered: Parent 1 (Vater) uses fields WITHOUT space, Parent 2 (Mutter) uses fields WITH space+1

export const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  // ============================================
  // GEBURTSURKUNDE (Birth Certificate) - Section 1A
  // ============================================
  geburtsurkunde: {
    // Child information (VERIFIED - these exist in PDF)
    kind_vorname: "txt.vorname1A 4",
    kind_nachname: "txt.name1A 4",
    kind_geburtsdatum: "txt.geburtsdatum1a 3",
    kind_anzahl_mehrlinge: "txt.anzahl 4",
    
    // Additional child fields (need verification)
    kind_geburtsort: "txt.ort1a 3",  // Likely pattern based on other fields
    kind_geburtsnummer: "txt.nummer1a 3",  // Likely pattern
    
    // Parent names from birth certificate (VERIFIED)
    mutter_vorname: "txt.vorname2b 1",  // IMPORTANT: Space before 1!
    mutter_nachname: "txt.name2b 1",    // IMPORTANT: Space before 1!
    mutter_geburtsname: "txt.geburtsname2b 1",  // Likely pattern
    vater_vorname: "txt.vorname2b",
    vater_nachname: "txt.name2b",
    
    // Certificate metadata
    behoerde_name: "txt.behoerde1a",  // Likely pattern
    urkundennummer: "txt.urkunde1a",  // Likely pattern
    ausstelldatum: "txt.ausstellung1a"  // Likely pattern
  },

  // ============================================
  // PERSONALAUSWEIS VATER (Father's ID) - Section 2B
  // ============================================
  eltern_dokument_vater: {
    // Basic personal information (VERIFIED)
    vorname: "txt.vorname2b",
    nachname: "txt.name2b",
    geburtsdatum: "txt.geburt2b",
    geburtsname: "txt.geburtsname2b",  // Likely pattern
    
    // Birth place and location
    geburtsort: "txt.geburtsort2b",  // Likely pattern
    
    // ID document information
    ausweisnummer: "txt.ausweisnummer2b",  // Need to find
    staatsangehoerigkeit: "txt.staatsangehoerigkeit2b",  // Need to find
    ausstellende_behoerde: "txt.behoerde2b",  // Likely pattern
    ausstelldatum: "txt.ausstellung2b",  // Likely pattern
    gueltig_bis: "txt.gueltig2b",  // Likely pattern
    
    // Address information (covered in meldebescheinigung but may also be in section 2C)
    strasse: "txt.strasse2c",
    hausnummer: "txt.nummer2c",
    plz: "txt.plz2c",
    wohnort: "txt.ort2c"
  },

  // ============================================
  // PERSONALAUSWEIS MUTTER (Mother's ID) - Section 2B with space+1
  // ============================================
  eltern_dokument_mutter: {
    // Basic personal information (VERIFIED - note the space before 1!)
    vorname: "txt.vorname2b 1",
    nachname: "txt.name2b 1",
    geburtsdatum: "txt.geburt2b 1",
    geburtsname: "txt.geburtsname2b 1",  // Likely pattern
    
    // Birth place
    geburtsort: "txt.geburtsort2b 1",  // Likely pattern
    
    // ID document information
    ausweisnummer: "txt.ausweisnummer2b 1",  // Need to find
    staatsangehoerigkeit: "txt.staatsangehoerigkeit2b 1",  // Need to find
    ausstellende_behoerde: "txt.behoerde2b 1",  // Likely pattern
    ausstelldatum: "txt.ausstellung2b 1",  // Likely pattern
    gueltig_bis: "txt.gueltig2b 1",  // Likely pattern
    
    // Address information
    strasse: "txt.strasse2c 1",
    hausnummer: "txt.nummer2c 1",
    plz: "txt.plz2c 1",
    wohnort: "txt.ort2c 1"
  },

  // ============================================
  // MELDEBESCHEINIGUNG VATER (Father's Address) - Section 2C
  // ============================================
  meldebescheinigung_vater: {
    // Address fields (VERIFIED - these work!)
    strasse: "txt.strasse2c",
    hausnummer: "txt.nummer2c",
    plz: "txt.plz2c",
    wohnort: "txt.ort2c",
    
    // Additional address fields
    vorname: "txt.vorname2c",  // Likely exists
    nachname: "txt.name2c",  // Likely exists
    geburtsdatum: "txt.geburt2c",  // Exists (seen in logs)
    
    // Certificate metadata
    behoerde: "txt.behoerde2c",  // Likely pattern
    meldedatum: "txt.meldedatum2c",  // Likely pattern
    ausstelldatum: "txt.ausstellung2c"  // Likely pattern
  },

  // ============================================
  // MELDEBESCHEINIGUNG MUTTER (Mother's Address) - Section 2C with space+1
  // ============================================
  meldebescheinigung_mutter: {
    // Address fields (VERIFIED - with space before 1!)
    strasse: "txt.strasse2c 1",
    hausnummer: "txt.nummer2c 1",
    plz: "txt.plz2c 1",
    wohnort: "txt.ort2c 1",
    
    // Additional address fields
    vorname: "txt.vorname2c 1",  // Likely exists
    nachname: "txt.name2c 1",  // Likely exists
    geburtsdatum: "txt.geburt2c 1",  // Exists (seen in logs)
    
    // Certificate metadata
    behoerde: "txt.behoerde2c 1",  // Likely pattern
    meldedatum: "txt.meldedatum2c 1",  // Likely pattern
    ausstelldatum: "txt.ausstellung2c 1"  // Likely pattern
  }
};
