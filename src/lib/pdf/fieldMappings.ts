/**
 * PDF Field Mappings
 * 
 * Maps database fields to PDF AcroForm fields based on Mapping032025_1.xlsx
 */

import { FormData } from './types';

export function getFieldMappings(formData: FormData): Record<string, string | boolean> {
  return {
    // Antrag
    'txt.adresse_elterngeldstelle 2': formData.adresse_elterngeldstelle || '',
    'txt.ortdatum_1': formData.ort && formData.datum ? `${formData.ort}, ${formData.datum}` : '',
    'txt.ortdatum_2': formData.ort && formData.datum ? `${formData.ort}, ${formData.datum}` : '',
    
    // Kind (Child) data
    'txt.vorname1A 4': formData.kind_vorname || '',
    'txt.name1A 4': formData.kind_nachname || '',
    'txt.geburtsdatum1a 3': formData.kind_geburtsdatum || '',
    'txt.anzahl 4': formData.kind_anzahl_mehrlinge || '',
    'cb.ja1b 3': formData.kind_fruehgeboren || false,
    'txt.geburtsdatum_frueh1b 3': formData.kind_errechneter_geburtsdatum || '',
    'cb.nein1b 3': formData.kind_behinderung || false,
    'cb.keine1c 3': formData.kind_keine_weitere_kinder || false,
    'cb.insgesamt1c 3': formData.kind_insgesamt || false,
    'txt.anzahl1c 3': formData.kind_anzahl_weitere_kinder || '',
    
    // Alleinerziehende
    'cb.allein2a': formData.ist_alleinerziehend || false,
    'cb.nichtbetreuung2a': formData.anderer_unmoeglich_betreuung || false,
    'cb.kindeswohl2a': formData.betreuung_gefaehrdet_wohl || false,
    
    // Parent data (Elternteil 1)
    'txt.vorname2b': formData.vorname || '',
    'txt.name2b': formData.nachname || '',
    'txt.geburt2b': formData.geburtsdatum || '',
    'txt.steuer2b_1': formData.steuer_identifikationsnummer || '',
    
    // Parent data (Elternteil 2)
    'txt.vorname2b 1': formData.vorname_2 || '',
    'txt.name2b 1': formData.nachname_2 || '',
    'txt.geburt2b 1': formData.geburtsdatum_2 || '',
    'txt.steuer2b_2': formData.steuer_identifikationsnummer_2 || '',
    
    // Wohnsitz/Aufenthalt (Parent 1)
    'cb.ja2c': formData.wohnsitz_in_deutschland || false,
    'cb.seitGeburt2c': formData.seit_meiner_geburt || false,
    'cb.seit2c': formData.seit_in_deutschland || false,
    'txt.geburt2c': formData.seit_datum_deutschland || '',
    
    // Address (Parent 1)
    'txt.strasse2c': formData.strasse || '',
    'txt.nummer2c': formData.hausnr || '',
    'txt.plz2c': formData.plz || '',
    'txt.ort2c': formData.ort || '',
    'txt.adresszusatz2c': formData.adresszusatz || '',
    
    // Wohnsitz/Aufenthalt (Parent 2)
    'cb.ja2c 1': formData.wohnsitz_in_deutschland_2 || false,
    'cb.seitGeburt2c 1': formData.seit_meiner_geburt_2 || false,
    'cb.seit2c 1': formData.seit_in_deutschland_2 || false,
    'txt.geburt2c 1': formData.seit_datum_deutschland_2 || '',
    
    // Address (Parent 2)
    'txt.strasse2c 1': formData.strasse_2 || '',
    'txt.nummer2c 1': formData.hausnr_2 || '',
    'txt.plz2c 1': formData.plz_2 || '',
    'txt.ort2c 1': formData.ort_2 || '',
    'txt.adresszusatz2c 1': formData.adresszusatz_2 || '',
    
    // Ausland (Parent 1)
    'cb.nein2c': formData.wohnsitz_ausland || false,
    'txt.staat2c': formData.ausland_staat || '',
    'txt.adresse2c': formData.ausland_strasse || '',
    'txt.warum2c': formData.ausland_aufenthaltsgrund || '',
    'cb.befristet2c': formData.aufenthalt_befristet || false,
    'txt.von2c': formData.aufenthalt_befristet_von || '',
    'txt.bis2c': formData.aufenthalt_befristet_bis || '',
    'cb.unbefristet2c': formData.aufenthalt_unbefristet || false,
    'txt.unbefristetdatum2c': formData.aufenthalt_unbefristet_seit || '',
    'cb.jaRecht2c': formData.arbeitsvertrag_deutsches_recht_ja || false,
    'cb.neinRecht2c': formData.arbeitsvertrag_deutsches_recht_nein || false,
    'txt.plzarbeitgeber2c': formData.ausland_arbeitgeber_sitz_plz || '',
    'txt.ortarbeitgeber2c': formData.ausland_arbeitgeber_sitz_ort || '',
    
    // Ausland (Parent 2)
    'cb.nein2c 1': formData.wohnsitz_ausland_2 || false,
    'txt.staat2c 1': formData.ausland_staat_2 || '',
    'txt.adresse2c 1': formData.ausland_strasse_2 || '',
    'txt.warum2c 1': formData.ausland_aufenthaltsgrund_2 || '',
    'cb.befristet2c 1': formData.aufenthalt_befristet_2 || false,
    'txt.von2c 1': formData.aufenthalt_befristet_von_2 || '',
    'txt.bis2c 1': formData.aufenthalt_befristet_bis_2 || '',
    'cb.unbefristet2c 1': formData.aufenthalt_unbefristet_2 || false,
    'txt.unbefristetdatum2c 1': formData.aufenthalt_unbefristet_seit_2 || '',
    'cb.jaRecht2c 1': formData.arbeitsvertrag_deutsches_recht_2_ja || false,
    'cb.neinRecht2c 1': formData.arbeitsvertrag_deutsches_recht_2_nein || false,
    'txt.plzarbeitgeber2c 1': formData.ausland_arbeitgeber_sitz_plz_2 || '',
    'txt.ortarbeitgeber2c 1': formData.ausland_arbeitgeber_sitz_ort_2 || '',
  };
}
