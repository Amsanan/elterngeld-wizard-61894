export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      adoptions_pflege_dokumente: {
        Row: {
          antrag_id: string | null
          aufnahmedatum: string | null
          beschlussdatum: string | null
          created_at: string
          dokument_typ: string
          file_path: string | null
          id: string
          jugendamt: string | null
          kind_geburtsdatum: string | null
          kind_nachname: string | null
          kind_vorname: string | null
          pflegestelle_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          antrag_id?: string | null
          aufnahmedatum?: string | null
          beschlussdatum?: string | null
          created_at?: string
          dokument_typ: string
          file_path?: string | null
          id?: string
          jugendamt?: string | null
          kind_geburtsdatum?: string | null
          kind_nachname?: string | null
          kind_vorname?: string | null
          pflegestelle_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          antrag_id?: string | null
          aufnahmedatum?: string | null
          beschlussdatum?: string | null
          created_at?: string
          dokument_typ?: string
          file_path?: string | null
          id?: string
          jugendamt?: string | null
          kind_geburtsdatum?: string | null
          kind_nachname?: string | null
          kind_vorname?: string | null
          pflegestelle_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoptions_pflege_dokumente_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
        ]
      }
      antraege: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      antrag_geburtsurkunden: {
        Row: {
          antrag_id: string
          created_at: string
          geburtsurkunde_id: string
          id: string
        }
        Insert: {
          antrag_id: string
          created_at?: string
          geburtsurkunde_id: string
          id?: string
        }
        Update: {
          antrag_id?: string
          created_at?: string
          geburtsurkunde_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "antrag_geburtsurkunden_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "antrag_geburtsurkunden_geburtsurkunde_id_fkey"
            columns: ["geburtsurkunde_id"]
            isOneToOne: false
            referencedRelation: "geburtsurkunden"
            referencedColumns: ["id"]
          },
        ]
      }
      arbeitgeberbescheinigungen: {
        Row: {
          antrag_id: string | null
          arbeitgeber_adresse: string | null
          arbeitgeber_name: string | null
          ausstelldatum: string | null
          beschaeftigungsbeginn: string | null
          beschaeftigungsende: string | null
          bruttogehalt: number | null
          created_at: string
          file_path: string | null
          id: string
          person_type: string
          updated_at: string
          user_id: string
          wochenstunden: number | null
        }
        Insert: {
          antrag_id?: string | null
          arbeitgeber_adresse?: string | null
          arbeitgeber_name?: string | null
          ausstelldatum?: string | null
          beschaeftigungsbeginn?: string | null
          beschaeftigungsende?: string | null
          bruttogehalt?: number | null
          created_at?: string
          file_path?: string | null
          id?: string
          person_type: string
          updated_at?: string
          user_id: string
          wochenstunden?: number | null
        }
        Update: {
          antrag_id?: string | null
          arbeitgeber_adresse?: string | null
          arbeitgeber_name?: string | null
          ausstelldatum?: string | null
          beschaeftigungsbeginn?: string | null
          beschaeftigungsende?: string | null
          bruttogehalt?: number | null
          created_at?: string
          file_path?: string | null
          id?: string
          person_type?: string
          updated_at?: string
          user_id?: string
          wochenstunden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arbeitgeberbescheinigungen_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
        ]
      }
      bankverbindungen: {
        Row: {
          antrag_id: string | null
          bank_name: string | null
          bic: string | null
          created_at: string
          file_path: string | null
          iban: string | null
          id: string
          kontoinhaber: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          antrag_id?: string | null
          bank_name?: string | null
          bic?: string | null
          created_at?: string
          file_path?: string | null
          iban?: string | null
          id?: string
          kontoinhaber?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          antrag_id?: string | null
          bank_name?: string | null
          bic?: string | null
          created_at?: string
          file_path?: string | null
          iban?: string | null
          id?: string
          kontoinhaber?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bankverbindungen_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
        ]
      }
      document_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          document_id: string
          document_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          document_id: string
          document_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          document_id?: string
          document_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ehe_sorgerecht_nachweise: {
        Row: {
          antrag_id: string | null
          ausstelldatum: string | null
          created_at: string
          dokument_typ: string
          file_path: string | null
          heiratsdatum: string | null
          id: string
          kind_nachname: string | null
          kind_vorname: string | null
          partner1_nachname: string | null
          partner1_vorname: string | null
          partner2_nachname: string | null
          partner2_vorname: string | null
          sorgerecht_art: string | null
          standesamt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          antrag_id?: string | null
          ausstelldatum?: string | null
          created_at?: string
          dokument_typ: string
          file_path?: string | null
          heiratsdatum?: string | null
          id?: string
          kind_nachname?: string | null
          kind_vorname?: string | null
          partner1_nachname?: string | null
          partner1_vorname?: string | null
          partner2_nachname?: string | null
          partner2_vorname?: string | null
          sorgerecht_art?: string | null
          standesamt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          antrag_id?: string | null
          ausstelldatum?: string | null
          created_at?: string
          dokument_typ?: string
          file_path?: string | null
          heiratsdatum?: string | null
          id?: string
          kind_nachname?: string | null
          kind_vorname?: string | null
          partner1_nachname?: string | null
          partner1_vorname?: string | null
          partner2_nachname?: string | null
          partner2_vorname?: string | null
          sorgerecht_art?: string | null
          standesamt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehe_sorgerecht_nachweise_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
        ]
      }
      einkommensteuerbescheide: {
        Row: {
          adresse: string | null
          altersvorsorgeaufwendungen: string | null
          bescheiddatum: string | null
          bruttoarbeitslohn: string | null
          confidence_scores: Json | null
          created_at: string
          einkuenfte_nichtselbstaendig: string | null
          einkuenfte_selbstaendig: string | null
          festgesetzte_steuer: string | null
          file_path: string | null
          finanzamt_adresse: string | null
          finanzamt_name: string | null
          gemeinsame_veranlagung: boolean | null
          gesamtbetrag_der_einkuenfte: string | null
          id: string
          jahreseinkommen: string | null
          krankenversicherung: string | null
          nachname: string | null
          person_type: string
          pflegeversicherung: string | null
          plz: string | null
          solidaritaetszuschlag: string | null
          sonderausgaben: string | null
          steuer_id_nummer: string | null
          steuerabzug_vom_lohn: string | null
          steuerjahr: string | null
          steuernummer: string | null
          summe_der_einkuenfte: string | null
          updated_at: string
          user_id: string
          verbleibende_steuer: string | null
          vorauszahlungen: string | null
          vorname: string | null
          werbungskosten: string | null
          wohnort: string | null
          zu_versteuerndes_einkommen: string | null
        }
        Insert: {
          adresse?: string | null
          altersvorsorgeaufwendungen?: string | null
          bescheiddatum?: string | null
          bruttoarbeitslohn?: string | null
          confidence_scores?: Json | null
          created_at?: string
          einkuenfte_nichtselbstaendig?: string | null
          einkuenfte_selbstaendig?: string | null
          festgesetzte_steuer?: string | null
          file_path?: string | null
          finanzamt_adresse?: string | null
          finanzamt_name?: string | null
          gemeinsame_veranlagung?: boolean | null
          gesamtbetrag_der_einkuenfte?: string | null
          id?: string
          jahreseinkommen?: string | null
          krankenversicherung?: string | null
          nachname?: string | null
          person_type: string
          pflegeversicherung?: string | null
          plz?: string | null
          solidaritaetszuschlag?: string | null
          sonderausgaben?: string | null
          steuer_id_nummer?: string | null
          steuerabzug_vom_lohn?: string | null
          steuerjahr?: string | null
          steuernummer?: string | null
          summe_der_einkuenfte?: string | null
          updated_at?: string
          user_id: string
          verbleibende_steuer?: string | null
          vorauszahlungen?: string | null
          vorname?: string | null
          werbungskosten?: string | null
          wohnort?: string | null
          zu_versteuerndes_einkommen?: string | null
        }
        Update: {
          adresse?: string | null
          altersvorsorgeaufwendungen?: string | null
          bescheiddatum?: string | null
          bruttoarbeitslohn?: string | null
          confidence_scores?: Json | null
          created_at?: string
          einkuenfte_nichtselbstaendig?: string | null
          einkuenfte_selbstaendig?: string | null
          festgesetzte_steuer?: string | null
          file_path?: string | null
          finanzamt_adresse?: string | null
          finanzamt_name?: string | null
          gemeinsame_veranlagung?: boolean | null
          gesamtbetrag_der_einkuenfte?: string | null
          id?: string
          jahreseinkommen?: string | null
          krankenversicherung?: string | null
          nachname?: string | null
          person_type?: string
          pflegeversicherung?: string | null
          plz?: string | null
          solidaritaetszuschlag?: string | null
          sonderausgaben?: string | null
          steuer_id_nummer?: string | null
          steuerabzug_vom_lohn?: string | null
          steuerjahr?: string | null
          steuernummer?: string | null
          summe_der_einkuenfte?: string | null
          updated_at?: string
          user_id?: string
          verbleibende_steuer?: string | null
          vorauszahlungen?: string | null
          vorname?: string | null
          werbungskosten?: string | null
          wohnort?: string | null
          zu_versteuerndes_einkommen?: string | null
        }
        Relationships: []
      }
      eltern_dokumente: {
        Row: {
          aufenthaltstitel_art: string | null
          aufenthaltstitel_gueltig_bis: string | null
          aufenthaltstitel_gueltig_von: string | null
          aufenthaltstitel_nummer: string | null
          aufenthaltstitel_zweck: string | null
          ausstelldatum: string | null
          ausstellende_behoerde: string | null
          ausweisnummer: string | null
          created_at: string
          document_type: string
          file_path: string | null
          geburtsdatum: string | null
          geburtsname: string | null
          geburtsort: string | null
          gueltig_bis: string | null
          hausnummer: string | null
          id: string
          nachname: string | null
          person_type: string
          plz: string | null
          staatsangehoerigkeit: string | null
          strasse: string | null
          updated_at: string
          user_id: string
          vorname: string | null
          wohnort: string | null
          wohnungsnummer: string | null
        }
        Insert: {
          aufenthaltstitel_art?: string | null
          aufenthaltstitel_gueltig_bis?: string | null
          aufenthaltstitel_gueltig_von?: string | null
          aufenthaltstitel_nummer?: string | null
          aufenthaltstitel_zweck?: string | null
          ausstelldatum?: string | null
          ausstellende_behoerde?: string | null
          ausweisnummer?: string | null
          created_at?: string
          document_type: string
          file_path?: string | null
          geburtsdatum?: string | null
          geburtsname?: string | null
          geburtsort?: string | null
          gueltig_bis?: string | null
          hausnummer?: string | null
          id?: string
          nachname?: string | null
          person_type: string
          plz?: string | null
          staatsangehoerigkeit?: string | null
          strasse?: string | null
          updated_at?: string
          user_id: string
          vorname?: string | null
          wohnort?: string | null
          wohnungsnummer?: string | null
        }
        Update: {
          aufenthaltstitel_art?: string | null
          aufenthaltstitel_gueltig_bis?: string | null
          aufenthaltstitel_gueltig_von?: string | null
          aufenthaltstitel_nummer?: string | null
          aufenthaltstitel_zweck?: string | null
          ausstelldatum?: string | null
          ausstellende_behoerde?: string | null
          ausweisnummer?: string | null
          created_at?: string
          document_type?: string
          file_path?: string | null
          geburtsdatum?: string | null
          geburtsname?: string | null
          geburtsort?: string | null
          gueltig_bis?: string | null
          hausnummer?: string | null
          id?: string
          nachname?: string | null
          person_type?: string
          plz?: string | null
          staatsangehoerigkeit?: string | null
          strasse?: string | null
          updated_at?: string
          user_id?: string
          vorname?: string | null
          wohnort?: string | null
          wohnungsnummer?: string | null
        }
        Relationships: []
      }
      geburtsurkunden: {
        Row: {
          ausstelldatum: string | null
          behoerde_name: string | null
          created_at: string
          file_path: string | null
          id: string
          kind_geburtsdatum: string | null
          kind_geburtsnummer: string | null
          kind_geburtsort: string | null
          kind_nachname: string | null
          kind_vorname: string | null
          mutter_geburtsname: string | null
          mutter_nachname: string | null
          mutter_vorname: string | null
          updated_at: string
          urkundennummer: string | null
          user_id: string
          vater_nachname: string | null
          vater_vorname: string | null
          verwendungszweck: string | null
        }
        Insert: {
          ausstelldatum?: string | null
          behoerde_name?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind_geburtsdatum?: string | null
          kind_geburtsnummer?: string | null
          kind_geburtsort?: string | null
          kind_nachname?: string | null
          kind_vorname?: string | null
          mutter_geburtsname?: string | null
          mutter_nachname?: string | null
          mutter_vorname?: string | null
          updated_at?: string
          urkundennummer?: string | null
          user_id: string
          vater_nachname?: string | null
          vater_vorname?: string | null
          verwendungszweck?: string | null
        }
        Update: {
          ausstelldatum?: string | null
          behoerde_name?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind_geburtsdatum?: string | null
          kind_geburtsnummer?: string | null
          kind_geburtsort?: string | null
          kind_nachname?: string | null
          kind_vorname?: string | null
          mutter_geburtsname?: string | null
          mutter_nachname?: string | null
          mutter_vorname?: string | null
          updated_at?: string
          urkundennummer?: string | null
          user_id?: string
          vater_nachname?: string | null
          vater_vorname?: string | null
          verwendungszweck?: string | null
        }
        Relationships: []
      }
      gehaltsnachweise: {
        Row: {
          abrechnungsmonat: string | null
          antrag_id: string | null
          arbeitgeber_name: string | null
          bruttogehalt: number | null
          created_at: string
          file_path: string | null
          id: string
          nettogehalt: number | null
          person_type: string
          sozialversicherungsnummer: string | null
          steuer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abrechnungsmonat?: string | null
          antrag_id?: string | null
          arbeitgeber_name?: string | null
          bruttogehalt?: number | null
          created_at?: string
          file_path?: string | null
          id?: string
          nettogehalt?: number | null
          person_type: string
          sozialversicherungsnummer?: string | null
          steuer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abrechnungsmonat?: string | null
          antrag_id?: string | null
          arbeitgeber_name?: string | null
          bruttogehalt?: number | null
          created_at?: string
          file_path?: string | null
          id?: string
          nettogehalt?: number | null
          person_type?: string
          sozialversicherungsnummer?: string | null
          steuer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gehaltsnachweise_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
        ]
      }
      krankenversicherung_nachweise: {
        Row: {
          antrag_id: string | null
          beitragssatz: number | null
          created_at: string
          file_path: string | null
          id: string
          krankenkasse_name: string | null
          person_type: string
          updated_at: string
          user_id: string
          versichertennummer: string | null
          versicherungsart: string | null
          versicherungsbeginn: string | null
        }
        Insert: {
          antrag_id?: string | null
          beitragssatz?: number | null
          created_at?: string
          file_path?: string | null
          id?: string
          krankenkasse_name?: string | null
          person_type: string
          updated_at?: string
          user_id: string
          versichertennummer?: string | null
          versicherungsart?: string | null
          versicherungsbeginn?: string | null
        }
        Update: {
          antrag_id?: string | null
          beitragssatz?: number | null
          created_at?: string
          file_path?: string | null
          id?: string
          krankenkasse_name?: string | null
          person_type?: string
          updated_at?: string
          user_id?: string
          versichertennummer?: string | null
          versicherungsart?: string | null
          versicherungsbeginn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "krankenversicherung_nachweise_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
        ]
      }
      leistungsbescheide: {
        Row: {
          antrag_id: string | null
          bescheiddatum: string | null
          bewilligungsstelle: string | null
          created_at: string
          file_path: string | null
          id: string
          leistungsart: string | null
          leistungsbeginn: string | null
          leistungsende: string | null
          monatsbetrag: number | null
          person_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          antrag_id?: string | null
          bescheiddatum?: string | null
          bewilligungsstelle?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          leistungsart?: string | null
          leistungsbeginn?: string | null
          leistungsende?: string | null
          monatsbetrag?: number | null
          person_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          antrag_id?: string | null
          bescheiddatum?: string | null
          bewilligungsstelle?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          leistungsart?: string | null
          leistungsbeginn?: string | null
          leistungsende?: string | null
          monatsbetrag?: number | null
          person_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leistungsbescheide_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
        ]
      }
      meldebescheinigungen: {
        Row: {
          antrag_id: string | null
          ausstelldatum: string | null
          behoerde: string | null
          created_at: string
          file_path: string | null
          geburtsdatum: string | null
          hausnummer: string | null
          id: string
          meldedatum: string | null
          nachname: string | null
          person_type: string
          plz: string | null
          strasse: string | null
          updated_at: string
          user_id: string
          vorname: string | null
          wohnort: string | null
        }
        Insert: {
          antrag_id?: string | null
          ausstelldatum?: string | null
          behoerde?: string | null
          created_at?: string
          file_path?: string | null
          geburtsdatum?: string | null
          hausnummer?: string | null
          id?: string
          meldedatum?: string | null
          nachname?: string | null
          person_type: string
          plz?: string | null
          strasse?: string | null
          updated_at?: string
          user_id: string
          vorname?: string | null
          wohnort?: string | null
        }
        Update: {
          antrag_id?: string | null
          ausstelldatum?: string | null
          behoerde?: string | null
          created_at?: string
          file_path?: string | null
          geburtsdatum?: string | null
          hausnummer?: string | null
          id?: string
          meldedatum?: string | null
          nachname?: string | null
          person_type?: string
          plz?: string | null
          strasse?: string | null
          updated_at?: string
          user_id?: string
          vorname?: string | null
          wohnort?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meldebescheinigungen_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
        ]
      }
      mutterschaftsgeld: {
        Row: {
          antrag_id: string | null
          bescheiddatum: string | null
          created_at: string
          file_path: string | null
          gesamtbetrag: number | null
          id: string
          krankenkasse_name: string | null
          leistungsbeginn: string | null
          leistungsende: string | null
          tagessatz: number | null
          updated_at: string
          user_id: string
          versichertennummer: string | null
        }
        Insert: {
          antrag_id?: string | null
          bescheiddatum?: string | null
          created_at?: string
          file_path?: string | null
          gesamtbetrag?: number | null
          id?: string
          krankenkasse_name?: string | null
          leistungsbeginn?: string | null
          leistungsende?: string | null
          tagessatz?: number | null
          updated_at?: string
          user_id: string
          versichertennummer?: string | null
        }
        Update: {
          antrag_id?: string | null
          bescheiddatum?: string | null
          created_at?: string
          file_path?: string | null
          gesamtbetrag?: number | null
          id?: string
          krankenkasse_name?: string | null
          leistungsbeginn?: string | null
          leistungsende?: string | null
          tagessatz?: number | null
          updated_at?: string
          user_id?: string
          versichertennummer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mutterschaftsgeld_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          geburtsdatum: string | null
          hausnummer: string | null
          id: string
          nachname: string | null
          plz: string | null
          steuer_id: string | null
          strasse: string | null
          telefon: string | null
          user_id: string
          vorname: string | null
          wohnort: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          geburtsdatum?: string | null
          hausnummer?: string | null
          id?: string
          nachname?: string | null
          plz?: string | null
          steuer_id?: string | null
          strasse?: string | null
          telefon?: string | null
          user_id: string
          vorname?: string | null
          wohnort?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          geburtsdatum?: string | null
          hausnummer?: string | null
          id?: string
          nachname?: string | null
          plz?: string | null
          steuer_id?: string | null
          strasse?: string | null
          telefon?: string | null
          user_id?: string
          vorname?: string | null
          wohnort?: string | null
        }
        Relationships: []
      }
      selbststaendigen_nachweise: {
        Row: {
          antrag_id: string | null
          created_at: string
          file_path: string | null
          gewerbeanmeldung_datum: string | null
          gewerbeart: string | null
          id: string
          jahreseinkommen: number | null
          nachweiszeitraum_bis: string | null
          nachweiszeitraum_von: string | null
          person_type: string
          steuernummer: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          antrag_id?: string | null
          created_at?: string
          file_path?: string | null
          gewerbeanmeldung_datum?: string | null
          gewerbeart?: string | null
          id?: string
          jahreseinkommen?: number | null
          nachweiszeitraum_bis?: string | null
          nachweiszeitraum_von?: string | null
          person_type: string
          steuernummer?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          antrag_id?: string | null
          created_at?: string
          file_path?: string | null
          gewerbeanmeldung_datum?: string | null
          gewerbeart?: string | null
          id?: string
          jahreseinkommen?: number | null
          nachweiszeitraum_bis?: string | null
          nachweiszeitraum_von?: string | null
          person_type?: string
          steuernummer?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selbststaendigen_nachweise_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antraege"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      geschlecht_type: "weiblich" | "maennlich" | "divers" | "ohne_angabe"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      geschlecht_type: ["weiblich", "maennlich", "divers", "ohne_angabe"],
    },
  },
} as const
