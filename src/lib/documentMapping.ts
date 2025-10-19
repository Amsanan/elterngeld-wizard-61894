/**
 * Document-to-Table Mapping Configuration
 * Defines which database tables each document type should populate
 */

export interface DocumentMapping {
  tables: string[];
  requiresParent: boolean;
  description: string;
}

export const DOCUMENT_TABLE_MAPPING: Record<string, DocumentMapping> = {
  'geburtsurkunde': {
    tables: ['kind'],
    requiresParent: false,
    description: 'Birth certificate - populates child information only'
  },
  'personalausweis': {
    tables: ['elternteil', 'antrag_2c_wohnsitz'],
    requiresParent: true,
    description: 'ID card - populates parent info and address'
  },
  'gehaltsnachweis': {
    tables: ['elternteil', 'antrag_7a_bisherige_erwerbstaetigkeit'],
    requiresParent: true,
    description: 'Salary proof - populates parent and employment data'
  },
  'krankenversicherung': {
    tables: ['elternteil', 'antrag_5_krankenversicherung'],
    requiresParent: true,
    description: 'Health insurance - populates parent and insurance data'
  },
  'adresse': {
    tables: ['antrag_2c_wohnsitz', 'antrag_2c_wohnsitz_aufenthalt'],
    requiresParent: true,
    description: 'Address document - populates address information'
  },
  'versicherungsnachweis': {
    tables: ['elternteil', 'antrag_5_krankenversicherung'],
    requiresParent: true,
    description: 'Insurance proof - populates insurance data'
  },
  'other': {
    tables: [],
    requiresParent: false,
    description: 'Other documents - manual processing required'
  }
};

/**
 * Field Mapping Reference from Mapping032025_1.xlsx
 * This defines the database column names for each table
 */

export interface FieldMapping {
  sqlTable: string;
  sqlField: string;
  sqlType: string;
  acroformField?: string;
  hints?: string;
}

// Core field mappings extracted from Mapping032025_1.xlsx
export const FIELD_MAPPINGS: Record<string, FieldMapping[]> = {
  'kind': [
    { sqlTable: 'kind', sqlField: 'vorname', sqlType: 'VARCHAR(100)', acroformField: 'txt.txt.vorname1A 4', hints: 'Kind Vorname' },
    { sqlTable: 'kind', sqlField: 'nachname', sqlType: 'VARCHAR(100)', acroformField: 'txt.txt.name1A 4', hints: 'Kind Nachname' },
    { sqlTable: 'kind', sqlField: 'geburtsdatum', sqlType: 'DATE', acroformField: 'txt.txt.geburtsdatum1a 3', hints: 'Geburtsdatum' },
    { sqlTable: 'kind', sqlField: 'anzahl_mehrlinge', sqlType: 'INT', acroformField: 'txt.txt.anzahl 4', hints: 'Anzahl Mehrlinge' },
    { sqlTable: 'kind', sqlField: 'fruehgeboren', sqlType: 'BOOLEAN', acroformField: 'cb.ja1b 3', hints: 'Frühgeboren' },
    { sqlTable: 'kind', sqlField: 'errechneter_geburtsdatum', sqlType: 'DATE', acroformField: 'txt.geburtsdatum_frueh1b 3', hints: 'Errechnetes Geburtsdatum' },
    { sqlTable: 'kind', sqlField: 'behinderung', sqlType: 'BOOLEAN', acroformField: 'cb.nein1b 3', hints: 'Behinderung' },
    { sqlTable: 'kind', sqlField: 'anzahl_weitere_kinder', sqlType: 'INT', acroformField: 'txt.anzahl1c 3', hints: 'Anzahl weitere Kinder' },
    { sqlTable: 'kind', sqlField: 'keine_weitere_kinder', sqlType: 'BOOLEAN', acroformField: 'cb.keine1c 3', hints: 'Keine weiteren Kinder' },
    { sqlTable: 'kind', sqlField: 'insgesamt', sqlType: 'BOOLEAN', acroformField: 'cb.insgesamt1c 3', hints: 'Gesamt Kinderanzahl' }
  ],
  'elternteil': [
    { sqlTable: 'elternteil', sqlField: 'vorname', sqlType: 'VARCHAR(100)', acroformField: 'txt.vorname2b', hints: 'Elternteil Vorname' },
    { sqlTable: 'elternteil', sqlField: 'nachname', sqlType: 'VARCHAR(100)', acroformField: 'txt.name2b', hints: 'Elternteil Nachname' },
    { sqlTable: 'elternteil', sqlField: 'geburtsdatum', sqlType: 'DATE', acroformField: 'txt.geburt2b', hints: 'Geburtsdatum' },
    { sqlTable: 'elternteil', sqlField: 'geschlecht', sqlType: 'ENUM', acroformField: 'cb.weiblich2b, cb.männlich2b', hints: 'Geschlecht' },
    { sqlTable: 'elternteil', sqlField: 'steuer_identifikationsnummer', sqlType: 'CHAR(11)', acroformField: 'txt.txt.steuer2b_1', hints: 'Steuer-ID' }
  ],
  'antrag_2c_wohnsitz': [
    { sqlTable: 'antrag_2c_wohnsitz', sqlField: 'strasse', sqlType: 'VARCHAR(150)', acroformField: 'txt.strasse2c', hints: 'Straße' },
    { sqlTable: 'antrag_2c_wohnsitz', sqlField: 'hausnr', sqlType: 'VARCHAR(20)', acroformField: 'txt.nummer2c', hints: 'Hausnummer' },
    { sqlTable: 'antrag_2c_wohnsitz', sqlField: 'plz', sqlType: 'VARCHAR(10)', acroformField: 'txt.plz2c', hints: 'PLZ' },
    { sqlTable: 'antrag_2c_wohnsitz', sqlField: 'ort', sqlType: 'VARCHAR(100)', acroformField: 'txt.ort2c', hints: 'Ort' },
    { sqlTable: 'antrag_2c_wohnsitz', sqlField: 'adresszusatz', sqlType: 'VARCHAR(100)', acroformField: 'txt.adresszusatz2c', hints: 'Adresszusatz' },
    { sqlTable: 'antrag_2c_wohnsitz', sqlField: 'wohnsitz_ausland', sqlType: 'BOOLEAN', acroformField: 'cb.nein2c', hints: 'Wohnsitz Ausland' }
  ],
  'antrag_2c_wohnsitz_aufenthalt': [
    { sqlTable: 'antrag_2c_wohnsitz_aufenthalt', sqlField: 'wohnsitz_in_deutschland', sqlType: 'BOOLEAN', acroformField: 'cb.ja2c', hints: 'Wohnsitz in Deutschland' },
    { sqlTable: 'antrag_2c_wohnsitz_aufenthalt', sqlField: 'seit_meiner_geburt', sqlType: 'BOOLEAN', acroformField: 'cb.seitGeburt2c', hints: 'Seit Geburt' },
    { sqlTable: 'antrag_2c_wohnsitz_aufenthalt', sqlField: 'seit_in_deutschland', sqlType: 'BOOLEAN', acroformField: 'cb.seit2c', hints: 'Seit in Deutschland' },
    { sqlTable: 'antrag_2c_wohnsitz_aufenthalt', sqlField: 'seit_datum_deutschland', sqlType: 'DATE', acroformField: 'txt.geburt2c', hints: 'Seit Datum' }
  ],
  'antrag_5_krankenversicherung': [
    { sqlTable: 'antrag_5_krankenversicherung', sqlField: 'gesetzlich_ver', sqlType: 'BOOLEAN', hints: 'Gesetzlich versichert' },
    { sqlTable: 'antrag_5_krankenversicherung', sqlField: 'privat_ver', sqlType: 'BOOLEAN', hints: 'Privat versichert' },
    { sqlTable: 'antrag_5_krankenversicherung', sqlField: 'krankenkassename', sqlType: 'VARCHAR(255)', hints: 'Krankenkasse Name' },
    { sqlTable: 'antrag_5_krankenversicherung', sqlField: 'versichertennummer', sqlType: 'VARCHAR(255)', hints: 'Versichertennummer' }
  ],
  'antrag_7a_bisherige_erwerbstaetigkeit': [
    { sqlTable: 'antrag_7a_bisherige_erwerbstaetigkeit', sqlField: 'einkuenfte_nicht_selbststaendig', sqlType: 'BOOLEAN', hints: 'Nicht selbstständige Einkünfte' },
    { sqlTable: 'antrag_7a_bisherige_erwerbstaetigkeit', sqlField: 'selbststaendig_einkuenfte', sqlType: 'BOOLEAN', hints: 'Selbstständige Einkünfte' },
    { sqlTable: 'antrag_7a_bisherige_erwerbstaetigkeit', sqlField: 'keine_einkuenfte', sqlType: 'BOOLEAN', hints: 'Keine Einkünfte' }
  ]
};

/**
 * Get the list of tables that should be populated for a given document type
 */
export function getTablesForDocumentType(documentType: string): string[] {
  const mapping = DOCUMENT_TABLE_MAPPING[documentType];
  return mapping ? mapping.tables : [];
}

/**
 * Check if a document type requires parent selection
 */
export function requiresParentSelection(documentType: string): boolean {
  const mapping = DOCUMENT_TABLE_MAPPING[documentType];
  return mapping ? mapping.requiresParent : false;
}

/**
 * Get field mappings for a specific table
 */
export function getFieldsForTable(tableName: string): FieldMapping[] {
  return FIELD_MAPPINGS[tableName] || [];
}
