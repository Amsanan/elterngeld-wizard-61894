import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    let user = null
    
    if (authHeader) {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      user = authUser
    }

    // Use service role for import (admin only in production)
    const results = {
      pdf_field_mappings: { inserted: 0, updated: 0, errors: [] as string[] },
      nachweise_katalog: { inserted: 0, updated: 0, errors: [] as string[] }
    }

    // Fetch the complete mappings JSON from storage or use embedded data
    const mappingsUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/form-templates/pdf_field_mappings_complete.json`
    
    let mappingsData
    try {
      const response = await fetch(mappingsUrl)
      if (response.ok) {
        mappingsData = await response.json()
      }
    } catch (e) {
      console.log('Could not fetch from storage, using embedded mappings')
    }

    // Use embedded mappings if storage fetch failed
    if (!mappingsData) {
      mappingsData = {
        mappings: [
          // Core mappings - Page 1-2
          { lfd_nr: 2, seite: 1, abschnitt_visuell: "1.A Name", technischer_name: "txt.vorname1A 4", feldtyp: "Text", ziel_feld_de: "kind_vorname", source_table: "geburtsurkunden", source_field: "kind_vorname" },
          { lfd_nr: 3, seite: 1, abschnitt_visuell: "1.A Name", technischer_name: "txt.name1A 4", feldtyp: "Text", ziel_feld_de: "kind_nachname", source_table: "geburtsurkunden", source_field: "kind_nachname" },
          { lfd_nr: 4, seite: 1, abschnitt_visuell: "1.A Name", technischer_name: "txt.anzahl 4", feldtyp: "Zahl", ziel_feld_de: "kind_mehrlinge_anzahl", source_table: "geburtsurkunden", source_field: "COUNT" },
          { lfd_nr: 5, seite: 1, abschnitt_visuell: "1.B Geburtsdatum", technischer_name: "txt.geburtsdatum1a 3", feldtyp: "Datum", ziel_feld_de: "kind_geburtsdatum", source_table: "geburtsurkunden", source_field: "kind_geburtsdatum" },
          { lfd_nr: 6, seite: 1, abschnitt_visuell: "1.B Geburtsdatum", technischer_name: "cb.ja1b 3", feldtyp: "Checkbox", ziel_feld_de: "kind_fruehgeburt", source_table: "elterngeldantrag_data", source_field: "kind_fruehgeburt" },
          { lfd_nr: 7, seite: 1, abschnitt_visuell: "1.B Geburtsdatum", technischer_name: "txt.geburtsdatum_frueh1b 3", feldtyp: "Datum", ziel_feld_de: "kind_errechneter_termin", source_table: "elterngeldantrag_data", source_field: "kind_errechneter_termin" },
          { lfd_nr: 8, seite: 1, abschnitt_visuell: "1.B Geburtsdatum", technischer_name: "cb.nein1b 3", feldtyp: "Checkbox", ziel_feld_de: "kind_behinderung", source_table: "elterngeldantrag_data", source_field: "kind_behinderung" },
          { lfd_nr: 9, seite: 1, abschnitt_visuell: "1.C Weitere Kinder im Haushalt", technischer_name: "cb.keine1c 3", feldtyp: "Checkbox", ziel_feld_de: "haushalt_weitere_kinder_keine", source_table: "elterngeldantrag_data", source_field: "haushalt_weitere_kinder_keine" },
          { lfd_nr: 10, seite: 1, abschnitt_visuell: "1.C Weitere Kinder im Haushalt", technischer_name: "cb.insgesamt1c 3", feldtyp: "Checkbox", ziel_feld_de: "haushalt_weitere_kinder_vorhanden", source_table: "elterngeldantrag_data", source_field: "haushalt_weitere_kinder_vorhanden" },
          { lfd_nr: 11, seite: 1, abschnitt_visuell: "1.C Weitere Kinder im Haushalt", technischer_name: "txt.anzahl1c 3", feldtyp: "Zahl", ziel_feld_de: "haushalt_weitere_kinder_anzahl", source_table: "elterngeldantrag_data", source_field: "haushalt_weitere_kinder_anzahl" },
          // Page 2 - Alleinerziehende & Elternteile
          { lfd_nr: 12, seite: 2, abschnitt_visuell: "2.A Alleinerziehende", technischer_name: "cb.allein2a", feldtyp: "Checkbox", ziel_feld_de: "eltern_alleinerziehend", source_table: "elterngeldantrag_data", source_field: "eltern_alleinerziehend" },
          { lfd_nr: 13, seite: 2, abschnitt_visuell: "2.A Alleinerziehende", technischer_name: "cb.nichtbetreuung2a", feldtyp: "Checkbox", ziel_feld_de: "eltern_alleinerziehend_nichtbetreuung", source_table: "elterngeldantrag_data", source_field: "eltern_alleinerziehend_nichtbetreuung" },
          { lfd_nr: 14, seite: 2, abschnitt_visuell: "2.A Alleinerziehende", technischer_name: "cb.kindeswohl2a", feldtyp: "Checkbox", ziel_feld_de: "eltern_alleinerziehend_kindeswohl", source_table: "elterngeldantrag_data", source_field: "eltern_alleinerziehend_kindeswohl" },
          { lfd_nr: 15, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "txt.vorname2b", feldtyp: "Text", ziel_feld_de: "eltern1_vorname", source_table: "elterngeldantrag_data", source_field: "eltern1_vorname" },
          { lfd_nr: 16, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "txt.vorname2b 1", feldtyp: "Text", ziel_feld_de: "eltern2_vorname", source_table: "elterngeldantrag_data", source_field: "eltern2_vorname" },
          { lfd_nr: 17, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "txt.name2b", feldtyp: "Text", ziel_feld_de: "eltern1_nachname", source_table: "elterngeldantrag_data", source_field: "eltern1_nachname" },
          { lfd_nr: 18, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "txt.name2b 1", feldtyp: "Text", ziel_feld_de: "eltern2_nachname", source_table: "elterngeldantrag_data", source_field: "eltern2_nachname" },
          { lfd_nr: 19, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "txt.geburt2b", feldtyp: "Text", ziel_feld_de: "eltern1_geburtsdatum", source_table: "elterngeldantrag_data", source_field: "eltern1_geburtsdatum" },
          { lfd_nr: 20, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "txt.geburt2b 1", feldtyp: "Text", ziel_feld_de: "eltern2_geburtsdatum", source_table: "elterngeldantrag_data", source_field: "eltern2_geburtsdatum" },
          // Geschlecht checkboxes
          { lfd_nr: 21, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "cb.weiblich2b", feldtyp: "Checkbox", ziel_feld_de: "eltern1_geschlecht_weiblich", source_table: "elterngeldantrag_data", source_field: "eltern1_geschlecht_weiblich" },
          { lfd_nr: 22, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "cb.weiblich2b 1", feldtyp: "Checkbox", ziel_feld_de: "eltern2_geschlecht_weiblich", source_table: "elterngeldantrag_data", source_field: "eltern2_geschlecht_weiblich" },
          { lfd_nr: 23, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "cb.männlich2b", feldtyp: "Checkbox", ziel_feld_de: "eltern1_geschlecht_maennlich", source_table: "elterngeldantrag_data", source_field: "eltern1_geschlecht_maennlich" },
          { lfd_nr: 24, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "cb.männlich2b 1", feldtyp: "Checkbox", ziel_feld_de: "eltern2_geschlecht_maennlich", source_table: "elterngeldantrag_data", source_field: "eltern2_geschlecht_maennlich" },
          { lfd_nr: 25, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "cb.divers2b", feldtyp: "Checkbox", ziel_feld_de: "eltern1_geschlecht_divers", source_table: "elterngeldantrag_data", source_field: "eltern1_geschlecht_divers" },
          { lfd_nr: 26, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "cb.divers2b 1", feldtyp: "Checkbox", ziel_feld_de: "eltern2_geschlecht_divers", source_table: "elterngeldantrag_data", source_field: "eltern2_geschlecht_divers" },
          { lfd_nr: 27, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "cb.ohneAngabe2b", feldtyp: "Checkbox", ziel_feld_de: "eltern1_geschlecht_ohne_angabe", source_table: "elterngeldantrag_data", source_field: "eltern1_geschlecht_ohne_angabe" },
          { lfd_nr: 28, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "cb.ohneAngabe2b 1", feldtyp: "Checkbox", ziel_feld_de: "eltern2_geschlecht_ohne_angabe", source_table: "elterngeldantrag_data", source_field: "eltern2_geschlecht_ohne_angabe" },
          // Steuer-ID
          { lfd_nr: 29, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "txt.steuer2b_1", feldtyp: "Text", ziel_feld_de: "eltern1_steuer_id", source_table: "elterngeldantrag_data", source_field: "eltern1_steuer_id" },
          { lfd_nr: 30, seite: 2, abschnitt_visuell: "2.B Angaben zu den Elternteilen", technischer_name: "txt.steuer2b_2", feldtyp: "Text", ziel_feld_de: "eltern2_steuer_id", source_table: "elterngeldantrag_data", source_field: "eltern2_steuer_id" },
          // Wohnsitz
          { lfd_nr: 31, seite: 2, abschnitt_visuell: "2.C Wohnsitz", technischer_name: "cb.ja2c", feldtyp: "Checkbox", ziel_feld_de: "eltern1_wohnsitz_de_ja", source_table: "elterngeldantrag_data", source_field: "eltern1_wohnsitz_de_ja" },
          { lfd_nr: 32, seite: 2, abschnitt_visuell: "2.C Wohnsitz", technischer_name: "cb.ja2c 1", feldtyp: "Checkbox", ziel_feld_de: "eltern2_wohnsitz_de_ja", source_table: "elterngeldantrag_data", source_field: "eltern2_wohnsitz_de_ja" },
          // Page 3 - Adressen
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
          // Geschwisterbonus Kind1-3
          { lfd_nr: 140, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "txt.vorname4", feldtyp: "Text", ziel_feld_de: "geschwisterbonus_kind1_vorname", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_vorname" },
          { lfd_nr: 141, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "txt.nachname4", feldtyp: "Text", ziel_feld_de: "geschwisterbonus_kind1_nachname", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_nachname" },
          { lfd_nr: 142, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "txt.geb4", feldtyp: "Datum", ziel_feld_de: "geschwisterbonus_kind1_geburtsdatum", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_geburtsdatum" },
          { lfd_nr: 143, seite: 7, abschnitt_visuell: "4.1 Geschwisterbonus Kind1", technischer_name: "cb.grad4", feldtyp: "Checkbox", ziel_feld_de: "geschwisterbonus_kind1_gdb_flag", source_table: "elterngeldantrag_data", source_field: "geschwisterbonus_kind1_gdb_flag" },
          // Bankverbindung
          { lfd_nr: 600, seite: 22, abschnitt_visuell: "15. Bankverbindung", technischer_name: "txt.Kontonummer_1", feldtyp: "Text", ziel_feld_de: "iban", source_table: "bankverbindungen", source_field: "iban" },
          { lfd_nr: 601, seite: 22, abschnitt_visuell: "15. Bankverbindung", technischer_name: "txt.bankcode1", feldtyp: "Text", ziel_feld_de: "bic", source_table: "bankverbindungen", source_field: "bic" },
        ],
        nachweise: [
          { nachweis_id: "N-1-001", seite: 1, kategorie: "Kind & Geburt", bezeichnung_de: "Geburtsurkunde des Kindes", ausloeser_bedingung: "Immer erforderlich", referenz_felder: ["kind_vorname", "kind_nachname"], ziel_tabelle: "geburtsurkunden", validierung_typ: "pflicht", hinweis: "Original erforderlich" },
          { nachweis_id: "N-1-002", seite: 1, kategorie: "Kind & Geburt", bezeichnung_de: "Ärztliches Zeugnis Frühgeburt", ausloeser_bedingung: "kind_fruehgeburt=true", referenz_felder: ["kind_fruehgeburt"], ziel_tabelle: "sonstige_nachweise", validierung_typ: "pflicht bei Trigger" },
          { nachweis_id: "N-1-003", seite: 1, kategorie: "Kind & Geburt", bezeichnung_de: "Ärztliche Bescheinigung Behinderung", ausloeser_bedingung: "kind_behinderung=true", referenz_felder: ["kind_behinderung"], ziel_tabelle: "sonstige_nachweise", validierung_typ: "pflicht bei Trigger" },
        ]
      }
    }

    const mappings = mappingsData.mappings || []
    const nachweise = mappingsData.nachweise || []

    console.log(`Importing ${mappings.length} PDF field mappings...`)
    
    // Import PDF Field Mappings
    for (const mapping of mappings) {
      const fieldType = mapping.feldtyp === 'Checkbox' ? 'checkbox' :
                       mapping.feldtyp === 'Datum' ? 'date' :
                       mapping.feldtyp === 'Zahl' ? 'number' : 'text'
      
      const { error } = await supabaseClient
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
          filter_condition: mapping.filter || null
        }, {
          onConflict: 'document_type,pdf_field_name',
          ignoreDuplicates: false
        })

      if (error) {
        results.pdf_field_mappings.errors.push(`${mapping.technischer_name}: ${error.message}`)
      } else {
        results.pdf_field_mappings.inserted++
      }
    }

    console.log(`Importing ${nachweise.length} Nachweise definitions...`)
    
    // Import Nachweise Catalog
    for (const nachweis of nachweise) {
      const { error } = await supabaseClient
        .from('nachweise_katalog')
        .upsert({
          nachweis_id: nachweis.nachweis_id,
          seite: nachweis.seite,
          kategorie: nachweis.kategorie,
          bezeichnung_de: nachweis.bezeichnung_de,
          ausloeser_bedingung: nachweis.ausloeser_bedingung,
          referenz_felder: nachweis.referenz_felder,
          ziel_tabelle: nachweis.ziel_tabelle,
          validierung_typ: nachweis.validierung_typ,
          hinweis: nachweis.hinweis || null,
          is_active: true
        }, {
          onConflict: 'nachweis_id',
          ignoreDuplicates: false
        })

      if (error) {
        results.nachweise_katalog.errors.push(`${nachweis.nachweis_id}: ${error.message}`)
      } else {
        results.nachweise_katalog.inserted++
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
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
