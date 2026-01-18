import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PDF Field Mappings from the Excel file
const PDF_FIELD_MAPPINGS = [
  // Page 1 - Kind & Geburt
  { lfd_nr: 2, seite: 1, abschnitt_visuell: "1.A Name", technischer_name: "txt.vorname1A 4", feldtyp: "Text", ziel_feld_de: "kind_vorname", source_table: "geburtsurkunden", source_field: "kind_vorname" },
  { lfd_nr: 3, seite: 1, abschnitt_visuell: "1.A Name", technischer_name: "txt.name1A 4", feldtyp: "Text", ziel_feld_de: "kind_nachname", source_table: "geburtsurkunden", source_field: "kind_nachname" },
  { lfd_nr: 4, seite: 1, abschnitt_visuell: "1.A Name", technischer_name: "txt.anzahl 4", feldtyp: "Zahl", ziel_feld_de: "kind_mehrlinge_anzahl", source_table: "geburtsurkunden", source_field: "COUNT" },
  { lfd_nr: 5, seite: 1, abschnitt_visuell: "1.B Geburtsdatum", technischer_name: "txt.geburtsdatum1a 3", feldtyp: "Datum", ziel_feld_de: "kind_geburtsdatum", source_table: "geburtsurkunden", source_field: "kind_geburtsdatum" },
  { lfd_nr: 6, seite: 1, abschnitt_visuell: "1.B Geburtsdatum", technischer_name: "cb.ja1b 3", feldtyp: "Checkbox", ziel_feld_de: "kind_fruehgeburt", source_table: "elterngeldantrag_data", source_field: "kind_fruehgeburt" },
  { lfd_nr: 7, seite: 1, abschnitt_visuell: "1.B Geburtsdatum", technischer_name: "txt.geburtsdatum_frueh1b 3", feldtyp: "Datum", ziel_feld_de: "kind_errechneter_termin", source_table: "elterngeldantrag_data", source_field: "kind_errechneter_termin" },
  { lfd_nr: 8, seite: 1, abschnitt_visuell: "1.B Geburtsdatum", technischer_name: "cb.nein1b 3", feldtyp: "Checkbox", ziel_feld_de: "kind_behinderung", source_table: "elterngeldantrag_data", source_field: "kind_behinderung" },
  { lfd_nr: 9, seite: 1, abschnitt_visuell: "1.C Weitere Kinder", technischer_name: "cb.keine1c 3", feldtyp: "Checkbox", ziel_feld_de: "haushalt_weitere_kinder_keine", source_table: "elterngeldantrag_data", source_field: "haushalt_weitere_kinder_keine" },
  { lfd_nr: 10, seite: 1, abschnitt_visuell: "1.C Weitere Kinder", technischer_name: "cb.insgesamt1c 3", feldtyp: "Checkbox", ziel_feld_de: "haushalt_weitere_kinder_vorhanden", source_table: "elterngeldantrag_data", source_field: "haushalt_weitere_kinder_vorhanden" },
  { lfd_nr: 11, seite: 1, abschnitt_visuell: "1.C Weitere Kinder", technischer_name: "txt.anzahl1c 3", feldtyp: "Zahl", ziel_feld_de: "haushalt_weitere_kinder_anzahl", source_table: "elterngeldantrag_data", source_field: "haushalt_weitere_kinder_anzahl" },
  
  // Page 2 - Alleinerziehende & Angaben zu den Elternteilen
  { lfd_nr: 12, seite: 2, abschnitt_visuell: "2.A Alleinerziehende", technischer_name: "cb.allein2a", feldtyp: "Checkbox", ziel_feld_de: "eltern_alleinerziehend", source_table: "elterngeldantrag_data", source_field: "eltern_alleinerziehend" },
  { lfd_nr: 13, seite: 2, abschnitt_visuell: "2.A Alleinerziehende", technischer_name: "cb.nichtbetreuung2a", feldtyp: "Checkbox", ziel_feld_de: "eltern_alleinerziehend_nichtbetreuung", source_table: "elterngeldantrag_data", source_field: "eltern_alleinerziehend_nichtbetreuung" },
  { lfd_nr: 14, seite: 2, abschnitt_visuell: "2.A Alleinerziehende", technischer_name: "cb.kindeswohl2a", feldtyp: "Checkbox", ziel_feld_de: "eltern_alleinerziehend_kindeswohl", source_table: "elterngeldantrag_data", source_field: "eltern_alleinerziehend_kindeswohl" },
  
  // Elternteil 1 - Grunddaten
  { lfd_nr: 15, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "txt.vorname2b", feldtyp: "Text", ziel_feld_de: "eltern1_vorname", source_table: "elterngeldantrag_data", source_field: "eltern1_vorname" },
  { lfd_nr: 16, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "txt.vorname2b 1", feldtyp: "Text", ziel_feld_de: "eltern2_vorname", source_table: "elterngeldantrag_data", source_field: "eltern2_vorname" },
  { lfd_nr: 17, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "txt.name2b", feldtyp: "Text", ziel_feld_de: "eltern1_nachname", source_table: "elterngeldantrag_data", source_field: "eltern1_nachname" },
  { lfd_nr: 18, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "txt.name2b 1", feldtyp: "Text", ziel_feld_de: "eltern2_nachname", source_table: "elterngeldantrag_data", source_field: "eltern2_nachname" },
  { lfd_nr: 19, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "txt.geburt2b", feldtyp: "Datum", ziel_feld_de: "eltern1_geburtsdatum", source_table: "elterngeldantrag_data", source_field: "eltern1_geburtsdatum" },
  { lfd_nr: 20, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "txt.geburt2b 1", feldtyp: "Datum", ziel_feld_de: "eltern2_geburtsdatum", source_table: "elterngeldantrag_data", source_field: "eltern2_geburtsdatum" },
  
  // Geschlecht Elternteil 1
  { lfd_nr: 21, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "cb.weiblich2b", feldtyp: "Checkbox", ziel_feld_de: "eltern1_geschlecht_weiblich", source_table: "elterngeldantrag_data", source_field: "eltern1_geschlecht_weiblich" },
  { lfd_nr: 22, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "cb.weiblich2b 1", feldtyp: "Checkbox", ziel_feld_de: "eltern2_geschlecht_weiblich", source_table: "elterngeldantrag_data", source_field: "eltern2_geschlecht_weiblich" },
  { lfd_nr: 23, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "cb.männlich2b", feldtyp: "Checkbox", ziel_feld_de: "eltern1_geschlecht_maennlich", source_table: "elterngeldantrag_data", source_field: "eltern1_geschlecht_maennlich" },
  { lfd_nr: 24, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "cb.männlich2b 1", feldtyp: "Checkbox", ziel_feld_de: "eltern2_geschlecht_maennlich", source_table: "elterngeldantrag_data", source_field: "eltern2_geschlecht_maennlich" },
  { lfd_nr: 25, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "cb.divers2b", feldtyp: "Checkbox", ziel_feld_de: "eltern1_geschlecht_divers", source_table: "elterngeldantrag_data", source_field: "eltern1_geschlecht_divers" },
  { lfd_nr: 26, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "cb.divers2b 1", feldtyp: "Checkbox", ziel_feld_de: "eltern2_geschlecht_divers", source_table: "elterngeldantrag_data", source_field: "eltern2_geschlecht_divers" },
  { lfd_nr: 27, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "cb.ohneAngabe2b", feldtyp: "Checkbox", ziel_feld_de: "eltern1_geschlecht_ohne_angabe", source_table: "elterngeldantrag_data", source_field: "eltern1_geschlecht_ohne_angabe" },
  { lfd_nr: 28, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "cb.ohneAngabe2b 1", feldtyp: "Checkbox", ziel_feld_de: "eltern2_geschlecht_ohne_angabe", source_table: "elterngeldantrag_data", source_field: "eltern2_geschlecht_ohne_angabe" },
  
  // Steuer-ID
  { lfd_nr: 29, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "txt.steuer2b_1", feldtyp: "Text", ziel_feld_de: "eltern1_steuer_id", source_table: "elterngeldantrag_data", source_field: "eltern1_steuer_id" },
  { lfd_nr: 30, seite: 2, abschnitt_visuell: "2.B Angaben Elternteile", technischer_name: "txt.steuer2b_2", feldtyp: "Text", ziel_feld_de: "eltern2_steuer_id", source_table: "elterngeldantrag_data", source_field: "eltern2_steuer_id" },
  
  // Wohnsitz
  { lfd_nr: 31, seite: 2, abschnitt_visuell: "2.C Wohnsitz", technischer_name: "cb.ja2c", feldtyp: "Checkbox", ziel_feld_de: "eltern1_wohnsitz_de_ja", source_table: "elterngeldantrag_data", source_field: "eltern1_wohnsitz_de_ja" },
  { lfd_nr: 32, seite: 2, abschnitt_visuell: "2.C Wohnsitz", technischer_name: "cb.ja2c 1", feldtyp: "Checkbox", ziel_feld_de: "eltern2_wohnsitz_de_ja", source_table: "elterngeldantrag_data", source_field: "eltern2_wohnsitz_de_ja" },
  
  // Adressen Page 3
  { lfd_nr: 40, seite: 3, abschnitt_visuell: "2.C Wohnsitz", technischer_name: "txt.strasse2c", feldtyp: "Text", ziel_feld_de: "eltern1_adresse_strasse", source_table: "elterngeldantrag_data", source_field: "eltern1_adresse_strasse" },
  { lfd_nr: 41, seite: 3, abschnitt_visuell: "2.C Wohnsitz", technischer_name: "txt.nummer2c", feldtyp: "Text", ziel_feld_de: "eltern1_adresse_hausnr", source_table: "elterngeldantrag_data", source_field: "eltern1_adresse_hausnr" },
  { lfd_nr: 44, seite: 3, abschnitt_visuell: "2.C Wohnsitz", technischer_name: "txt.plz2c", feldtyp: "Text", ziel_feld_de: "eltern1_adresse_plz", source_table: "elterngeldantrag_data", source_field: "eltern1_adresse_plz" },
  { lfd_nr: 45, seite: 3, abschnitt_visuell: "2.C Wohnsitz", technischer_name: "txt.ort2c", feldtyp: "Text", ziel_feld_de: "eltern1_adresse_ort", source_table: "elterngeldantrag_data", source_field: "eltern1_adresse_ort" },
  
  // Kontakt
  { lfd_nr: 100, seite: 4, abschnitt_visuell: "2.E Kontakt", technischer_name: "txt.telefon2e", feldtyp: "Text", ziel_feld_de: "eltern1_telefon", source_table: "elterngeldantrag_data", source_field: "eltern1_telefon" },
  { lfd_nr: 101, seite: 4, abschnitt_visuell: "2.E Kontakt", technischer_name: "txt.telefon2e 1", feldtyp: "Text", ziel_feld_de: "eltern2_telefon", source_table: "elterngeldantrag_data", source_field: "eltern2_telefon" },
  { lfd_nr: 102, seite: 4, abschnitt_visuell: "2.E Kontakt", technischer_name: "txt.email2e", feldtyp: "Text", ziel_feld_de: "eltern1_email", source_table: "elterngeldantrag_data", source_field: "eltern1_email" },
  { lfd_nr: 103, seite: 4, abschnitt_visuell: "2.E Kontakt", technischer_name: "txt.email2e 1", feldtyp: "Text", ziel_feld_de: "eltern2_email", source_table: "elterngeldantrag_data", source_field: "eltern2_email" },
  
  // Staatsangehörigkeit
  { lfd_nr: 104, seite: 5, abschnitt_visuell: "2.F Staatsangehörigkeit", technischer_name: "txt.staat2f", feldtyp: "Text", ziel_feld_de: "eltern1_staatsangehoerigkeit", source_table: "elterngeldantrag_data", source_field: "eltern1_staatsangehoerigkeit" },
  { lfd_nr: 105, seite: 5, abschnitt_visuell: "2.F Staatsangehörigkeit", technischer_name: "txt.staat2f 1", feldtyp: "Text", ziel_feld_de: "eltern2_staatsangehoerigkeit", source_table: "elterngeldantrag_data", source_field: "eltern2_staatsangehoerigkeit" },
  
  // Geschwisterbonus Kind1
  { lfd_nr: 140, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "txt.name4", feldtyp: "Text", ziel_feld_de: "geschwisterbonus_kind1_vorname", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_vorname" },
  { lfd_nr: 141, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "txt.nachname4", feldtyp: "Text", ziel_feld_de: "geschwisterbonus_kind1_nachname", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_nachname" },
  { lfd_nr: 142, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "txt.geb4", feldtyp: "Datum", ziel_feld_de: "geschwisterbonus_kind1_geburtsdatum", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_geburtsdatum" },
  { lfd_nr: 143, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "cb.grad4", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind1_gdb_flag", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_gdb_flag" },
  { lfd_nr: 144, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "cb.leiblich4", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind1_beziehung_eltern1_leiblich", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_beziehung_eltern1_leiblich" },
  { lfd_nr: 145, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "cb.leiblich5", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind1_beziehung_eltern2_leiblich", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_beziehung_eltern2_leiblich" },
  { lfd_nr: 146, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "cb.adoptiv4", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind1_beziehung_eltern1_adoptiv", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_beziehung_eltern1_adoptiv" },
  { lfd_nr: 147, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "cb.adoptiv5", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind1_beziehung_eltern2_adoptiv", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_beziehung_eltern2_adoptiv" },
  { lfd_nr: 148, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "cb.nichtkind4", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind1_beziehung_eltern1_partnerkind", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_beziehung_eltern1_partnerkind" },
  { lfd_nr: 149, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "cb.nichtkind5", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind1_beziehung_eltern2_partnerkind", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_beziehung_eltern2_partnerkind" },
  
  // Geschwisterbonus Kind2
  { lfd_nr: 155, seite: 7, abschnitt_visuell: "4.2 Geschwisterbonus Kind2", technischer_name: "txt.2name4", feldtyp: "Text", ziel_feld_de: "geschwisterbonus_kind2_vorname", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind2_vorname" },
  { lfd_nr: 156, seite: 7, abschnitt_visuell: "4.2 Geschwisterbonus Kind2", technischer_name: "txt.2nachname4", feldtyp: "Text", ziel_feld_de: "geschwisterbonus_kind2_nachname", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind2_nachname" },
  { lfd_nr: 157, seite: 7, abschnitt_visuell: "4.2 Geschwisterbonus Kind2", technischer_name: "txt.2geb4", feldtyp: "Datum", ziel_feld_de: "geschwisterbonus_kind2_geburtsdatum", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind2_geburtsdatum" },
  { lfd_nr: 158, seite: 7, abschnitt_visuell: "4.2 Geschwisterbonus Kind2", technischer_name: "cb.2grad4", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind2_gdb_flag", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind2_gdb_flag" },
  { lfd_nr: 159, seite: 7, abschnitt_visuell: "4.2 Geschwisterbonus Kind2", technischer_name: "cb.2leiblich4", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind2_beziehung_eltern1_leiblich", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind2_beziehung_eltern1_leiblich" },
  { lfd_nr: 160, seite: 7, abschnitt_visuell: "4.2 Geschwisterbonus Kind2", technischer_name: "cb.2leiblich5", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind2_beziehung_eltern2_leiblich", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind2_beziehung_eltern2_leiblich" },
  { lfd_nr: 161, seite: 7, abschnitt_visuell: "4.2 Geschwisterbonus Kind2", technischer_name: "cb.2adoptiv4", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind2_beziehung_eltern1_adoptiv", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind2_beziehung_eltern1_adoptiv" },
  { lfd_nr: 162, seite: 7, abschnitt_visuell: "4.2 Geschwisterbonus Kind2", technischer_name: "cb.2adoptiv5", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind2_beziehung_eltern2_adoptiv", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind2_beziehung_eltern2_adoptiv" },
  
  // Geschwisterbonus Kind3
  { lfd_nr: 168, seite: 7, abschnitt_visuell: "4.3 Geschwisterbonus Kind3", technischer_name: "text.3vorname4", feldtyp: "Text", ziel_feld_de: "geschwisterbonus_kind3_vorname", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind3_vorname" },
  { lfd_nr: 169, seite: 7, abschnitt_visuell: "4.3 Geschwisterbonus Kind3", technischer_name: "text.3nachname4", feldtyp: "Text", ziel_feld_de: "geschwisterbonus_kind3_nachname", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind3_nachname" },
  { lfd_nr: 170, seite: 7, abschnitt_visuell: "4.3 Geschwisterbonus Kind3", technischer_name: "text.3geb4", feldtyp: "Datum", ziel_feld_de: "geschwisterbonus_kind3_geburtsdatum", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind3_geburtsdatum" },
  { lfd_nr: 171, seite: 7, abschnitt_visuell: "4.3 Geschwisterbonus Kind3", technischer_name: "cb.3grad4", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind3_gdb_flag", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind3_gdb_flag" },
  
  // Bankverbindung
  { lfd_nr: 600, seite: 22, abschnitt_visuell: "15. Bankverbindung", technischer_name: "txt.kontoinhaber", feldtyp: "Text", ziel_feld_de: "kontoinhaber", source_table: "bankverbindungen", source_field: "kontoinhaber" },
  { lfd_nr: 601, seite: 22, abschnitt_visuell: "15. Bankverbindung", technischer_name: "txt.iban", feldtyp: "Text", ziel_feld_de: "iban", source_table: "bankverbindungen", source_field: "iban" },
  { lfd_nr: 602, seite: 22, abschnitt_visuell: "15. Bankverbindung", technischer_name: "txt.bic", feldtyp: "Text", ziel_feld_de: "bic", source_table: "bankverbindungen", source_field: "bic" },
  { lfd_nr: 603, seite: 22, abschnitt_visuell: "15. Bankverbindung", technischer_name: "txt.bankname", feldtyp: "Text", ziel_feld_de: "bank_name", source_table: "bankverbindungen", source_field: "bank_name" },
]

// Nachweise Catalog from the Excel file
const NACHWEISE_CATALOG = [
  // Kind & Geburt
  { nachweis_id: "N-1-001", seite: 1, kategorie: "Kind & Geburt", bezeichnung_de: "Geburtsurkunde des Kindes (spezielle Geburtsurkunde zur Beantragung von Elterngeld)", ausloeser_bedingung: "Immer erforderlich", referenz_felder: ["kind_vorname", "kind_nachname", "kind_geburtsdatum"], erkennungslogik: "Dokumenttyp: Geburtsurkunde, Standesamt", validierung_typ: "pflicht", ziel_tabelle: "geburtsurkunden", hinweis: "Original erforderlich, keine Kopie" },
  { nachweis_id: "N-1-002", seite: 1, kategorie: "Kind & Geburt", bezeichnung_de: "Ärztliches Zeugnis oder Zeugnis einer Hebamme (Frühgeburt)", ausloeser_bedingung: "kind_fruehgeburt=true", referenz_felder: ["kind_fruehgeburt", "kind_errechneter_termin"], erkennungslogik: "Keywords: Frühgeburt, errechneter Termin, Hebamme, ärztliches Zeugnis", validierung_typ: "pflicht bei Trigger", ziel_tabelle: "sonstige_nachweise", hinweis: "Nur bei Frühgeburt mind. 6 Wochen vor Termin" },
  { nachweis_id: "N-1-003", seite: 1, kategorie: "Kind & Geburt", bezeichnung_de: "Ärztliche Bescheinigung (Behinderung des Kindes)", ausloeser_bedingung: "kind_behinderung=true", referenz_felder: ["kind_behinderung"], erkennungslogik: "Keywords: Behinderung, ärztliche Bescheinigung, GdB", validierung_typ: "pflicht bei Trigger", ziel_tabelle: "sonstige_nachweise", hinweis: "" },
  
  // Wohnsitz/Aufenthalt & Ausland
  { nachweis_id: "N-3-001-E1", seite: 3, kategorie: "Wohnsitz/Ausland", bezeichnung_de: "Bescheinigung Dienstherr/Arbeitgeber über Entsendung (Elternteil 1)", ausloeser_bedingung: "eltern1_lebt_im_ausland=true", referenz_felder: ["eltern1_lebt_im_ausland", "eltern1_ausland_warum"], erkennungslogik: "Keywords: Entsendung, Dienstherr, Arbeitgeber", validierung_typ: "optional", ziel_tabelle: "sonstige_nachweise", hinweis: "Falls vorhanden beifügen" },
  { nachweis_id: "N-3-001-E2", seite: 3, kategorie: "Wohnsitz/Ausland", bezeichnung_de: "Bescheinigung Dienstherr/Arbeitgeber über Entsendung (Elternteil 2)", ausloeser_bedingung: "eltern2_lebt_im_ausland=true", referenz_felder: ["eltern2_lebt_im_ausland", "eltern2_ausland_warum"], erkennungslogik: "Keywords: Entsendung, Dienstherr, Arbeitgeber", validierung_typ: "optional", ziel_tabelle: "sonstige_nachweise", hinweis: "Falls vorhanden beifügen" },
  
  // Aufenthaltsrecht / Staatsangehörigkeit
  { nachweis_id: "N-5-001-E1", seite: 5, kategorie: "Aufenthaltsrecht", bezeichnung_de: "Nachweis über Aufenthaltsrecht (Elternteil 1)", ausloeser_bedingung: "eltern1_staatsangehoerigkeit_andere=true oder eltern1_staatenlos_unklar=true", referenz_felder: ["eltern1_staatsangehoerigkeit"], erkennungslogik: "Keywords: Aufenthaltstitel, eAT, Aufenthaltsrecht", validierung_typ: "pflicht bei Trigger", ziel_tabelle: "eltern_dokumente", hinweis: "z.B. Kopie vom elektronischen Aufenthaltstitel", person_type: "mutter" },
  { nachweis_id: "N-5-001-E2", seite: 5, kategorie: "Aufenthaltsrecht", bezeichnung_de: "Nachweis über Aufenthaltsrecht (Elternteil 2)", ausloeser_bedingung: "eltern2_staatsangehoerigkeit_andere=true oder eltern2_staatenlos_unklar=true", referenz_felder: ["eltern2_staatsangehoerigkeit"], erkennungslogik: "Keywords: Aufenthaltstitel, eAT, Aufenthaltsrecht", validierung_typ: "pflicht bei Trigger", ziel_tabelle: "eltern_dokumente", hinweis: "", person_type: "vater" },
  
  // Vaterschaft/Adoption
  { nachweis_id: "N-5-006", seite: 5, kategorie: "Eltern-Kind-Beziehung", bezeichnung_de: "Adoptionsurkunde (bei abgeschlossener Adoption in Deutschland)", ausloeser_bedingung: "Adoptivkind und Adoption abgeschlossen", referenz_felder: ["eltern1_kind_beziehung_adoptiv", "eltern2_kind_beziehung_adoptiv"], erkennungslogik: "Keywords: Adoptionsurkunde, Adoptionsbeschluss", validierung_typ: "bedingt", ziel_tabelle: "adoptions_pflege_dokumente", hinweis: "" },
  { nachweis_id: "N-5-007", seite: 5, kategorie: "Eltern-Kind-Beziehung", bezeichnung_de: "Bestätigung Beginn der Adoptionspflege (Jugendamt/Adoptionsvermittlungsstelle)", ausloeser_bedingung: "Adoptivkind und Adoptionspflege läuft", referenz_felder: ["eltern1_kind_beziehung_adoptiv", "eltern2_kind_beziehung_adoptiv"], erkennungslogik: "Keywords: Adoptionspflege, Beginn, Jugendamt", validierung_typ: "bedingt", ziel_tabelle: "adoptions_pflege_dokumente", hinweis: "" },
  
  // Geschwisterbonus
  { nachweis_id: "N-6-004", seite: 6, kategorie: "Geschwisterbonus", bezeichnung_de: "Aktueller Kindergeld-Bescheid", ausloeser_bedingung: "Geschwisterbonus-Kind angegeben", referenz_felder: ["geschwisterbonus_kind1_vorname", "geschwisterbonus_kind1_nachname", "geschwisterbonus_kind1_geburtsdatum", "geschwisterbonus_kind1_gdb_flag"], erkennungslogik: "Keywords: Kindergeld, Familienkasse, Bescheid", validierung_typ: "pflicht bei Trigger", ziel_tabelle: "sonstige_nachweise", hinweis: "" },
  { nachweis_id: "N-6-005", seite: 6, kategorie: "Geschwisterbonus", bezeichnung_de: "Feststellungsbescheid oder Schwerbehindertenausweis (Kind mit GdB >= 20)", ausloeser_bedingung: "geschwisterbonus_kind1_gdb_flag=true", referenz_felder: ["geschwisterbonus_kind1_gdb_flag"], erkennungslogik: "Keywords: Feststellungsbescheid, Schwerbehindertenausweis, GdB", validierung_typ: "pflicht bei Trigger", ziel_tabelle: "sonstige_nachweise", hinweis: "" },
  
  // Einkommen / Steuerbescheid
  { nachweis_id: "N-9-001", seite: 9, kategorie: "Einkommen", bezeichnung_de: "Steuerbescheid für das Kalenderjahr vor der Geburt", ausloeser_bedingung: "Immer (falls vorhanden)", referenz_felder: [], erkennungslogik: "Keywords: Steuerbescheid, ESt-Bescheid, Einkommensteuer", validierung_typ: "optional", ziel_tabelle: "einkommensteuerbescheide", hinweis: "Upload kann je nach Fall 1 oder mehrere Bescheide enthalten" },
  { nachweis_id: "N-10-002-E1", seite: 10, kategorie: "Selbstständigkeit", bezeichnung_de: "Einnahmen-Überschuss-Rechnung für das Kalenderjahr vor der Geburt (Elternteil 1)", ausloeser_bedingung: "eltern1_antrag_gewinne_unter_35_euro=true und Steuerbescheid nicht vorliegt", referenz_felder: ["eltern1_antrag_gewinne_unter_35_euro"], erkennungslogik: "Keywords: EÜR, Einnahmen-Überschuss-Rechnung", validierung_typ: "Alternative B", ziel_tabelle: "selbststaendigen_nachweise", hinweis: "", person_type: "mutter" },
  
  // Mutterschaftsgeld
  { nachweis_id: "N-16-001", seite: 16, kategorie: "Mutterschaftsleistungen", bezeichnung_de: "Bescheinigung der gesetzlichen Krankenkasse über Mutterschaftsgeld", ausloeser_bedingung: "antragsteller_mutterschaft_mg_gkv_anspruch=true", referenz_felder: [], erkennungslogik: "Keywords: Mutterschaftsgeld, Krankenkasse, Bescheinigung", validierung_typ: "Alternative A", ziel_tabelle: "mutterschaftsgeld", hinweis: "Alternative zu elektronischem Abruf" },
  
  // Alleinerziehende
  { nachweis_id: "N-17-001", seite: 17, kategorie: "Alleinerziehende", bezeichnung_de: "Nachweis Alleinerziehend / Entlastungsbetrag", ausloeser_bedingung: "eltern_alleinerziehend=true", referenz_felder: ["eltern_alleinerziehend"], erkennungslogik: "Keywords: Steuerklasse II, ELStAM, Entlastungsbetrag", validierung_typ: "Alternative", ziel_tabelle: "sonstige_nachweise", hinweis: "" },
  { nachweis_id: "N-17-002", seite: 17, kategorie: "Alleinerziehende", bezeichnung_de: "Nachweis: anderer Elternteil kann nicht betreuen", ausloeser_bedingung: "eltern_alleinerziehend_nichtbetreuung=true", referenz_felder: ["eltern_alleinerziehend_nichtbetreuung"], erkennungslogik: "Keywords: ärztliches Attest, Schwerbehindertenausweis, Sterbeurkunde, Haftbescheinigung", validierung_typ: "Alternative", ziel_tabelle: "sonstige_nachweise", hinweis: "" },
  { nachweis_id: "N-17-003", seite: 17, kategorie: "Alleinerziehende", bezeichnung_de: "Bescheinigung Jugendamt: Kindeswohlgefährdung", ausloeser_bedingung: "eltern_alleinerziehend_kindeswohl=true", referenz_felder: ["eltern_alleinerziehend_kindeswohl"], erkennungslogik: "Keywords: Jugendamt, Bescheinigung, Kindeswohl", validierung_typ: "Alternative", ziel_tabelle: "sonstige_nachweise", hinweis: "" },
  
  // Nach der Geburt - Arbeit
  { nachweis_id: "N-19-001-E1", seite: 19, kategorie: "Arbeit nach Geburt", bezeichnung_de: "Ausbildungsvertrag (Antragsteller)", ausloeser_bedingung: "Ausbildung/Umschulung angegeben", referenz_felder: [], erkennungslogik: "Keywords: Ausbildungsvertrag, Umschulung, Berufsbildung", validierung_typ: "pflicht bei Trigger", ziel_tabelle: "sonstige_nachweise", hinweis: "" },
  { nachweis_id: "N-19-002-E1", seite: 19, kategorie: "Arbeit nach Geburt", bezeichnung_de: "Nachweis wöchentliche Arbeitszeit (Antragsteller)", ausloeser_bedingung: "Nicht-selbstständige Arbeit nach Geburt", referenz_felder: [], erkennungslogik: "Keywords: Arbeitsvertrag, Vereinbarung, Arbeitgeberbescheinigung", validierung_typ: "pflicht bei Trigger", ziel_tabelle: "arbeitgeberbescheinigungen", hinweis: "" },
  
  // Gesetzliche Vertretung
  { nachweis_id: "N-24-001", seite: 24, kategorie: "Gesetzliche Vertretung", bezeichnung_de: "Nachweis der gesetzlichen Vertretung", ausloeser_bedingung: "Gesetzliche Vertretung vorhanden", referenz_felder: [], erkennungslogik: "Keywords: Betreuerausweis, Bestallungsurkunde", validierung_typ: "pflicht bei Trigger", ziel_tabelle: "sonstige_nachweise", hinweis: "" },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify admin role
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check admin role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
    
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { action = 'all' } = body

    const results = {
      pdf_field_mappings: { inserted: 0, updated: 0, errors: [] as string[] },
      nachweise_katalog: { inserted: 0, updated: 0, errors: [] as string[] }
    }

    // Import PDF Field Mappings
    if (action === 'all' || action === 'pdf_fields') {
      console.log(`Importing ${PDF_FIELD_MAPPINGS.length} PDF field mappings...`)
      
      for (const mapping of PDF_FIELD_MAPPINGS) {
        const fieldType = mapping.feldtyp === 'Checkbox' ? 'checkbox' :
                         mapping.feldtyp === 'Datum' ? 'date' :
                         mapping.feldtyp === 'Zahl' ? 'number' : 'text'
        
        const { data, error } = await supabaseClient
          .from('pdf_field_mappings')
          .upsert({
            document_type: 'elterngeldantrag',
            pdf_field_name: mapping.technischer_name,
            source_table: mapping.source_table,
            source_field: mapping.source_field,
            field_label_de: mapping.ziel_feld_de,
            field_type: fieldType,
            page_number: mapping.seite,
            section_visual: mapping.abschnitt_visuell,
            is_active: true,
            mapping_status: 'imported',
            confidence_score: 1.0,
            created_by: user.id
          }, {
            onConflict: 'pdf_field_name',
            ignoreDuplicates: false
          })
          .select()

        if (error) {
          results.pdf_field_mappings.errors.push(`Field ${mapping.technischer_name}: ${error.message}`)
        } else if (data && data.length > 0) {
          results.pdf_field_mappings.inserted++
        }
      }
    }

    // Import Nachweise Catalog
    if (action === 'all' || action === 'nachweise') {
      console.log(`Importing ${NACHWEISE_CATALOG.length} Nachweise definitions...`)
      
      for (const nachweis of NACHWEISE_CATALOG) {
        const { data, error } = await supabaseClient
          .from('nachweise_katalog')
          .upsert({
            nachweis_id: nachweis.nachweis_id,
            seite: nachweis.seite,
            kategorie: nachweis.kategorie,
            bezeichnung_de: nachweis.bezeichnung_de,
            ausloeser_bedingung: nachweis.ausloeser_bedingung,
            referenz_felder: nachweis.referenz_felder,
            erkennungslogik: nachweis.erkennungslogik,
            validierung_typ: nachweis.validierung_typ,
            ziel_tabelle: nachweis.ziel_tabelle,
            hinweis: nachweis.hinweis || null,
            person_type: nachweis.person_type || null,
            is_active: true
          }, {
            onConflict: 'nachweis_id',
            ignoreDuplicates: false
          })
          .select()

        if (error) {
          results.nachweise_katalog.errors.push(`Nachweis ${nachweis.nachweis_id}: ${error.message}`)
        } else if (data && data.length > 0) {
          results.nachweise_katalog.inserted++
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        pdf_fields_imported: results.pdf_field_mappings.inserted,
        nachweise_imported: results.nachweise_katalog.inserted,
        total_errors: results.pdf_field_mappings.errors.length + results.nachweise_katalog.errors.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Import error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: errorStack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
