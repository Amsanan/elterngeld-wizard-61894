/**
 * PDF Generation Types
 */

export interface FormData {
  // Antrag
  adresse_elterngeldstelle?: string;
  ort?: string;
  datum?: string;
  
  // Kind data
  kind_vorname?: string;
  kind_nachname?: string;
  kind_geburtsdatum?: string;
  kind_anzahl_mehrlinge?: string;
  kind_fruehgeboren?: boolean;
  kind_errechneter_geburtsdatum?: string;
  kind_behinderung?: boolean;
  kind_keine_weitere_kinder?: boolean;
  kind_insgesamt?: boolean;
  kind_anzahl_weitere_kinder?: string;
  
  // Parent data (Elternteil 1)
  vorname?: string;
  nachname?: string;
  geburtsdatum?: string;
  geschlecht?: string;
  steuer_identifikationsnummer?: string;
  
  // Parent data (Elternteil 2)
  vorname_2?: string;
  nachname_2?: string;
  geburtsdatum_2?: string;
  geschlecht_2?: string;
  steuer_identifikationsnummer_2?: string;
  
  // Alleinerziehende
  ist_alleinerziehend?: boolean;
  anderer_unmoeglich_betreuung?: boolean;
  betreuung_gefaehrdet_wohl?: boolean;
  
  // Wohnsitz/Aufenthalt
  wohnsitz_in_deutschland?: boolean;
  seit_meiner_geburt?: boolean;
  seit_in_deutschland?: boolean;
  seit_datum_deutschland?: string;
  
  // Address data
  strasse?: string;
  hausnr?: string;
  plz?: string;
  adresszusatz?: string;
  
  // Ausland
  wohnsitz_ausland?: boolean;
  ausland_staat?: string;
  ausland_strasse?: string;
  ausland_aufenthaltsgrund?: string;
  aufenthalt_befristet?: boolean;
  aufenthalt_befristet_von?: string;
  aufenthalt_befristet_bis?: string;
  aufenthalt_unbefristet?: boolean;
  aufenthalt_unbefristet_seit?: string;
  arbeitsvertrag_deutsches_recht_ja?: boolean;
  arbeitsvertrag_deutsches_recht_nein?: boolean;
  ausland_arbeitgeber_sitz_plz?: string;
  ausland_arbeitgeber_sitz_ort?: string;
  
  // Additional fields from database
  [key: string]: string | boolean | undefined;
}
