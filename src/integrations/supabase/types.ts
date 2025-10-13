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
      antrag: {
        Row: {
          adresse_elterngeldstelle: string | null
          antrag_timestamp: string | null
          created_at: string | null
          datum: string | null
          expires_at: string | null
          id: string
          ort: string | null
          ort_datum: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adresse_elterngeldstelle?: string | null
          antrag_timestamp?: string | null
          created_at?: string | null
          datum?: string | null
          expires_at?: string | null
          id?: string
          ort?: string | null
          ort_datum?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adresse_elterngeldstelle?: string | null
          antrag_timestamp?: string | null
          created_at?: string | null
          datum?: string | null
          expires_at?: string | null
          id?: string
          ort?: string | null
          ort_datum?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      antrag_2a_alleinerziehende: {
        Row: {
          anderer_unmoeglich_betreuung: boolean | null
          antrag_id: string
          betreuung_gefaehrdet_wohl: boolean | null
          created_at: string | null
          id: string
          ist_alleinerziehend: boolean | null
        }
        Insert: {
          anderer_unmoeglich_betreuung?: boolean | null
          antrag_id: string
          betreuung_gefaehrdet_wohl?: boolean | null
          created_at?: string | null
          id?: string
          ist_alleinerziehend?: boolean | null
        }
        Update: {
          anderer_unmoeglich_betreuung?: boolean | null
          antrag_id?: string
          betreuung_gefaehrdet_wohl?: boolean | null
          created_at?: string | null
          id?: string
          ist_alleinerziehend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2a_alleinerziehende_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2b_elternteil: {
        Row: {
          antrag_id: string
          created_at: string | null
          geburtsdatum: string | null
          geburtsdatum_2: string | null
          geschlecht: Database["public"]["Enums"]["geschlecht_type"] | null
          geschlecht_2: Database["public"]["Enums"]["geschlecht_type"] | null
          id: string
          nachname: string | null
          nachname_2: string | null
          steuer_identifikationsnummer: string | null
          steuer_identifikationsnummer_2: string | null
          vorname: string | null
          vorname_2: string | null
        }
        Insert: {
          antrag_id: string
          created_at?: string | null
          geburtsdatum?: string | null
          geburtsdatum_2?: string | null
          geschlecht?: Database["public"]["Enums"]["geschlecht_type"] | null
          geschlecht_2?: Database["public"]["Enums"]["geschlecht_type"] | null
          id?: string
          nachname?: string | null
          nachname_2?: string | null
          steuer_identifikationsnummer?: string | null
          steuer_identifikationsnummer_2?: string | null
          vorname?: string | null
          vorname_2?: string | null
        }
        Update: {
          antrag_id?: string
          created_at?: string | null
          geburtsdatum?: string | null
          geburtsdatum_2?: string | null
          geschlecht?: Database["public"]["Enums"]["geschlecht_type"] | null
          geschlecht_2?: Database["public"]["Enums"]["geschlecht_type"] | null
          id?: string
          nachname?: string | null
          nachname_2?: string | null
          steuer_identifikationsnummer?: string | null
          steuer_identifikationsnummer_2?: string | null
          vorname?: string | null
          vorname_2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2b_elternteil_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2c_kind_adresse: {
        Row: {
          antrag_id: string
          created_at: string | null
          id: string
          kind_abw_hausnr: string | null
          kind_abw_ort: string | null
          kind_abw_plz: string | null
          kind_abw_strasse: string | null
          kind_adresse_abw: boolean | null
          kind_adresse_wie_anderer: boolean | null
          kind_adresse_wie_sie: boolean | null
        }
        Insert: {
          antrag_id: string
          created_at?: string | null
          id?: string
          kind_abw_hausnr?: string | null
          kind_abw_ort?: string | null
          kind_abw_plz?: string | null
          kind_abw_strasse?: string | null
          kind_adresse_abw?: boolean | null
          kind_adresse_wie_anderer?: boolean | null
          kind_adresse_wie_sie?: boolean | null
        }
        Update: {
          antrag_id?: string
          created_at?: string | null
          id?: string
          kind_abw_hausnr?: string | null
          kind_abw_ort?: string | null
          kind_abw_plz?: string | null
          kind_abw_strasse?: string | null
          kind_adresse_abw?: boolean | null
          kind_adresse_wie_anderer?: boolean | null
          kind_adresse_wie_sie?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2c_kind_adresse_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: true
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2c_wohnsitz: {
        Row: {
          adresszusatz: string | null
          antrag_id: string
          arbeitsvertrag_deutsches_recht_ja: boolean | null
          arbeitsvertrag_deutsches_recht_nein: boolean | null
          aufenthalt_befristet: boolean | null
          aufenthalt_befristet_bis: string | null
          aufenthalt_befristet_von: string | null
          aufenthalt_unbefristet: boolean | null
          aufenthalt_unbefristet_seit: string | null
          ausland_arbeitgeber_sitz_ort: string | null
          ausland_arbeitgeber_sitz_plz: string | null
          ausland_aufenthaltsgrund: string | null
          ausland_staat: string | null
          ausland_strasse: string | null
          created_at: string | null
          hausnr: string | null
          id: string
          ort: string | null
          plz: string | null
          strasse: string | null
          wohnsitz_ausland: boolean | null
        }
        Insert: {
          adresszusatz?: string | null
          antrag_id: string
          arbeitsvertrag_deutsches_recht_ja?: boolean | null
          arbeitsvertrag_deutsches_recht_nein?: boolean | null
          aufenthalt_befristet?: boolean | null
          aufenthalt_befristet_bis?: string | null
          aufenthalt_befristet_von?: string | null
          aufenthalt_unbefristet?: boolean | null
          aufenthalt_unbefristet_seit?: string | null
          ausland_arbeitgeber_sitz_ort?: string | null
          ausland_arbeitgeber_sitz_plz?: string | null
          ausland_aufenthaltsgrund?: string | null
          ausland_staat?: string | null
          ausland_strasse?: string | null
          created_at?: string | null
          hausnr?: string | null
          id?: string
          ort?: string | null
          plz?: string | null
          strasse?: string | null
          wohnsitz_ausland?: boolean | null
        }
        Update: {
          adresszusatz?: string | null
          antrag_id?: string
          arbeitsvertrag_deutsches_recht_ja?: boolean | null
          arbeitsvertrag_deutsches_recht_nein?: boolean | null
          aufenthalt_befristet?: boolean | null
          aufenthalt_befristet_bis?: string | null
          aufenthalt_befristet_von?: string | null
          aufenthalt_unbefristet?: boolean | null
          aufenthalt_unbefristet_seit?: string | null
          ausland_arbeitgeber_sitz_ort?: string | null
          ausland_arbeitgeber_sitz_plz?: string | null
          ausland_aufenthaltsgrund?: string | null
          ausland_staat?: string | null
          ausland_strasse?: string | null
          created_at?: string | null
          hausnr?: string | null
          id?: string
          ort?: string | null
          plz?: string | null
          strasse?: string | null
          wohnsitz_ausland?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2c_wohnsitz_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2c_wohnsitz_aufenthalt: {
        Row: {
          antrag_id: string
          created_at: string | null
          id: string
          seit_datum_deutschland: string | null
          seit_in_deutschland: boolean | null
          seit_meiner_geburt: boolean | null
          wohnsitz_in_deutschland: boolean | null
        }
        Insert: {
          antrag_id: string
          created_at?: string | null
          id?: string
          seit_datum_deutschland?: string | null
          seit_in_deutschland?: boolean | null
          seit_meiner_geburt?: boolean | null
          wohnsitz_in_deutschland?: boolean | null
        }
        Update: {
          antrag_id?: string
          created_at?: string | null
          id?: string
          seit_datum_deutschland?: string | null
          seit_in_deutschland?: boolean | null
          seit_meiner_geburt?: boolean | null
          wohnsitz_in_deutschland?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2c_wohnsitz_aufenthalt_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2d_arbeit_im_ausland: {
        Row: {
          antrag_id: string
          arbeitsvertrag_auslaendisches_recht_2_ja: boolean | null
          arbeitsvertrag_auslaendisches_recht_2_nein: boolean | null
          arbeitsvertrag_auslaendisches_recht_ja: boolean | null
          arbeitsvertrag_auslaendisches_recht_nein: boolean | null
          created_at: string | null
          diplomatische_mission_oder_beschaeftigt_2_ja: boolean | null
          diplomatische_mission_oder_beschaeftigt_2_nein: boolean | null
          diplomatische_mission_oder_beschaeftigt_ja: boolean | null
          diplomatische_mission_oder_beschaeftigt_nein: boolean | null
          id: string
          nato_truppe_oder_ziv_gefolge_2_ja: boolean | null
          nato_truppe_oder_ziv_gefolge_2_nein: boolean | null
          nato_truppe_oder_ziv_gefolge_ja: boolean | null
          nato_truppe_oder_ziv_gefolge_nein: boolean | null
        }
        Insert: {
          antrag_id: string
          arbeitsvertrag_auslaendisches_recht_2_ja?: boolean | null
          arbeitsvertrag_auslaendisches_recht_2_nein?: boolean | null
          arbeitsvertrag_auslaendisches_recht_ja?: boolean | null
          arbeitsvertrag_auslaendisches_recht_nein?: boolean | null
          created_at?: string | null
          diplomatische_mission_oder_beschaeftigt_2_ja?: boolean | null
          diplomatische_mission_oder_beschaeftigt_2_nein?: boolean | null
          diplomatische_mission_oder_beschaeftigt_ja?: boolean | null
          diplomatische_mission_oder_beschaeftigt_nein?: boolean | null
          id?: string
          nato_truppe_oder_ziv_gefolge_2_ja?: boolean | null
          nato_truppe_oder_ziv_gefolge_2_nein?: boolean | null
          nato_truppe_oder_ziv_gefolge_ja?: boolean | null
          nato_truppe_oder_ziv_gefolge_nein?: boolean | null
        }
        Update: {
          antrag_id?: string
          arbeitsvertrag_auslaendisches_recht_2_ja?: boolean | null
          arbeitsvertrag_auslaendisches_recht_2_nein?: boolean | null
          arbeitsvertrag_auslaendisches_recht_ja?: boolean | null
          arbeitsvertrag_auslaendisches_recht_nein?: boolean | null
          created_at?: string | null
          diplomatische_mission_oder_beschaeftigt_2_ja?: boolean | null
          diplomatische_mission_oder_beschaeftigt_2_nein?: boolean | null
          diplomatische_mission_oder_beschaeftigt_ja?: boolean | null
          diplomatische_mission_oder_beschaeftigt_nein?: boolean | null
          id?: string
          nato_truppe_oder_ziv_gefolge_2_ja?: boolean | null
          nato_truppe_oder_ziv_gefolge_2_nein?: boolean | null
          nato_truppe_oder_ziv_gefolge_ja?: boolean | null
          nato_truppe_oder_ziv_gefolge_nein?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2d_arbeit_im_ausland_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: true
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2e_antragstellende: {
        Row: {
          antrag_id: string
          created_at: string | null
          fuer_beide_elternteile: boolean | null
          fuer_mich_andere_bereits_beantragt: boolean | null
          fuer_mich_spaeter_andere: boolean | null
          id: string
          nur_fuer_mich: boolean | null
        }
        Insert: {
          antrag_id: string
          created_at?: string | null
          fuer_beide_elternteile?: boolean | null
          fuer_mich_andere_bereits_beantragt?: boolean | null
          fuer_mich_spaeter_andere?: boolean | null
          id?: string
          nur_fuer_mich?: boolean | null
        }
        Update: {
          antrag_id?: string
          created_at?: string | null
          fuer_beide_elternteile?: boolean | null
          fuer_mich_andere_bereits_beantragt?: boolean | null
          fuer_mich_spaeter_andere?: boolean | null
          id?: string
          nur_fuer_mich?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2e_antragstellende_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: true
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2f_staatsangehoerigkeit: {
        Row: {
          antrag_id: string
          created_at: string | null
          freizuegigkeit_ja: boolean | null
          freizuegigkeit_ja_2: boolean | null
          freizuegigkeit_nein: boolean | null
          freizuegigkeit_nein_2: boolean | null
          id: string
          staatsang_anderer: boolean | null
          staatsang_anderer_2: boolean | null
          staatsang_anderer_staatname: string | null
          staatsang_anderer_staatname_2: string | null
          staatsang_deutsch: boolean | null
          staatsang_deutsch_2: boolean | null
          staatsang_eu_ewr_ch: boolean | null
          staatsang_eu_ewr_ch_2: boolean | null
          staatsang_eu_staatname: string | null
          staatsang_eu_staatname_2: string | null
          staatsang_keine: boolean | null
          staatsang_keine_2: boolean | null
        }
        Insert: {
          antrag_id: string
          created_at?: string | null
          freizuegigkeit_ja?: boolean | null
          freizuegigkeit_ja_2?: boolean | null
          freizuegigkeit_nein?: boolean | null
          freizuegigkeit_nein_2?: boolean | null
          id?: string
          staatsang_anderer?: boolean | null
          staatsang_anderer_2?: boolean | null
          staatsang_anderer_staatname?: string | null
          staatsang_anderer_staatname_2?: string | null
          staatsang_deutsch?: boolean | null
          staatsang_deutsch_2?: boolean | null
          staatsang_eu_ewr_ch?: boolean | null
          staatsang_eu_ewr_ch_2?: boolean | null
          staatsang_eu_staatname?: string | null
          staatsang_eu_staatname_2?: string | null
          staatsang_keine?: boolean | null
          staatsang_keine_2?: boolean | null
        }
        Update: {
          antrag_id?: string
          created_at?: string | null
          freizuegigkeit_ja?: boolean | null
          freizuegigkeit_ja_2?: boolean | null
          freizuegigkeit_nein?: boolean | null
          freizuegigkeit_nein_2?: boolean | null
          id?: string
          staatsang_anderer?: boolean | null
          staatsang_anderer_2?: boolean | null
          staatsang_anderer_staatname?: string | null
          staatsang_anderer_staatname_2?: string | null
          staatsang_deutsch?: boolean | null
          staatsang_deutsch_2?: boolean | null
          staatsang_eu_ewr_ch?: boolean | null
          staatsang_eu_ewr_ch_2?: boolean | null
          staatsang_eu_staatname?: string | null
          staatsang_eu_staatname_2?: string | null
          staatsang_keine?: boolean | null
          staatsang_keine_2?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2f_staatsangehoerigkeit_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: true
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_2g_familienstand: {
        Row: {
          antrag_id: string
          created_at: string | null
          geschieden: boolean | null
          geschieden_2: boolean | null
          id: string
          ledig: boolean | null
          ledig_2: boolean | null
          verheiratet: boolean | null
          verheiratet_2: boolean | null
          verheiratet_mit_partner_ja: boolean | null
          verheiratet_mit_partner_ja_2: boolean | null
          verheiratet_mit_partner_nein: boolean | null
          verheiratet_mit_partner_nein_2: boolean | null
          verpartnert: boolean | null
          verpartnert_2: boolean | null
          verpartnert_mit_partner_ja: boolean | null
          verpartnert_mit_partner_ja_2: boolean | null
          verpartnert_mit_partner_nein: boolean | null
          verpartnert_mit_partner_nein_2: boolean | null
          verwitwet: boolean | null
          verwitwet_2: boolean | null
        }
        Insert: {
          antrag_id: string
          created_at?: string | null
          geschieden?: boolean | null
          geschieden_2?: boolean | null
          id?: string
          ledig?: boolean | null
          ledig_2?: boolean | null
          verheiratet?: boolean | null
          verheiratet_2?: boolean | null
          verheiratet_mit_partner_ja?: boolean | null
          verheiratet_mit_partner_ja_2?: boolean | null
          verheiratet_mit_partner_nein?: boolean | null
          verheiratet_mit_partner_nein_2?: boolean | null
          verpartnert?: boolean | null
          verpartnert_2?: boolean | null
          verpartnert_mit_partner_ja?: boolean | null
          verpartnert_mit_partner_ja_2?: boolean | null
          verpartnert_mit_partner_nein?: boolean | null
          verpartnert_mit_partner_nein_2?: boolean | null
          verwitwet?: boolean | null
          verwitwet_2?: boolean | null
        }
        Update: {
          antrag_id?: string
          created_at?: string | null
          geschieden?: boolean | null
          geschieden_2?: boolean | null
          id?: string
          ledig?: boolean | null
          ledig_2?: boolean | null
          verheiratet?: boolean | null
          verheiratet_2?: boolean | null
          verheiratet_mit_partner_ja?: boolean | null
          verheiratet_mit_partner_ja_2?: boolean | null
          verheiratet_mit_partner_nein?: boolean | null
          verheiratet_mit_partner_nein_2?: boolean | null
          verpartnert?: boolean | null
          verpartnert_2?: boolean | null
          verpartnert_mit_partner_ja?: boolean | null
          verpartnert_mit_partner_ja_2?: boolean | null
          verpartnert_mit_partner_nein?: boolean | null
          verpartnert_mit_partner_nein_2?: boolean | null
          verwitwet?: boolean | null
          verwitwet_2?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_2g_familienstand_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: true
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_3a_betreuung_kind: {
        Row: {
          antrag_id: string
          created_at: string | null
          id: string
          selber_haushalt_ja: boolean | null
          selber_haushalt_ja_2: boolean | null
          selber_haushalt_nein: boolean | null
          selber_haushalt_nein_2: boolean | null
        }
        Insert: {
          antrag_id: string
          created_at?: string | null
          id?: string
          selber_haushalt_ja?: boolean | null
          selber_haushalt_ja_2?: boolean | null
          selber_haushalt_nein?: boolean | null
          selber_haushalt_nein_2?: boolean | null
        }
        Update: {
          antrag_id?: string
          created_at?: string | null
          id?: string
          selber_haushalt_ja?: boolean | null
          selber_haushalt_ja_2?: boolean | null
          selber_haushalt_nein?: boolean | null
          selber_haushalt_nein_2?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_3a_betreuung_kind_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: true
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_3b_elternkind_beziehung: {
        Row: {
          adoptiv: boolean | null
          adoptiv_2: boolean | null
          antrag_id: string
          created_at: string | null
          ein_anderes_kind: boolean | null
          ein_anderes_kind_2: boolean | null
          id: string
          leiblich: boolean | null
          leiblich_2: boolean | null
          nicht_mein_kind: boolean | null
          nicht_mein_kind_2: boolean | null
        }
        Insert: {
          adoptiv?: boolean | null
          adoptiv_2?: boolean | null
          antrag_id: string
          created_at?: string | null
          ein_anderes_kind?: boolean | null
          ein_anderes_kind_2?: boolean | null
          id?: string
          leiblich?: boolean | null
          leiblich_2?: boolean | null
          nicht_mein_kind?: boolean | null
          nicht_mein_kind_2?: boolean | null
        }
        Update: {
          adoptiv?: boolean | null
          adoptiv_2?: boolean | null
          antrag_id?: string
          created_at?: string | null
          ein_anderes_kind?: boolean | null
          ein_anderes_kind_2?: boolean | null
          id?: string
          leiblich?: boolean | null
          leiblich_2?: boolean | null
          nicht_mein_kind?: boolean | null
          nicht_mein_kind_2?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_3b_elternkind_beziehung_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: true
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_3c_adoption: {
        Row: {
          adaptions_datum: string | null
          antrag_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          adaptions_datum?: string | null
          antrag_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          adaptions_datum?: string | null
          antrag_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "antrag_3c_adoption_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: true
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_4_weitere_kinder_info: {
        Row: {
          adoptions_datum: string | null
          adoptions_datum_2: string | null
          adoptions_datum_3: string | null
          adoptiv: boolean | null
          adoptiv_2: boolean | null
          adoptiv_2_p2: boolean | null
          adoptiv_3: boolean | null
          adoptiv_3_p2: boolean | null
          adoptiv_p2: boolean | null
          antrag_id: string
          behind_grad: boolean | null
          behind_grad_2: boolean | null
          behind_grad_3: boolean | null
          created_at: string | null
          ein_anderes_kind: boolean | null
          ein_anderes_kind_2: boolean | null
          ein_anderes_kind_2_p2: boolean | null
          ein_anderes_kind_3: boolean | null
          ein_anderes_kind_3_p2: boolean | null
          ein_anderes_kind_p2: boolean | null
          geburtsdatum: string | null
          geburtsdatum_2: string | null
          geburtsdatum_3: string | null
          id: string
          leiblich: boolean | null
          leiblich_2: boolean | null
          leiblich_2_p2: boolean | null
          leiblich_3: boolean | null
          leiblich_3_p2: boolean | null
          leiblich_p2: boolean | null
          nachname: string | null
          nachname_2: string | null
          nachname_3: string | null
          nicht_mein_kind: boolean | null
          nicht_mein_kind_2: boolean | null
          nicht_mein_kind_2_p2: boolean | null
          nicht_mein_kind_3: boolean | null
          nicht_mein_kind_3_p2: boolean | null
          nicht_mein_kind_p2: boolean | null
          vorname: string | null
          vorname_2: string | null
          vorname_3: string | null
        }
        Insert: {
          adoptions_datum?: string | null
          adoptions_datum_2?: string | null
          adoptions_datum_3?: string | null
          adoptiv?: boolean | null
          adoptiv_2?: boolean | null
          adoptiv_2_p2?: boolean | null
          adoptiv_3?: boolean | null
          adoptiv_3_p2?: boolean | null
          adoptiv_p2?: boolean | null
          antrag_id: string
          behind_grad?: boolean | null
          behind_grad_2?: boolean | null
          behind_grad_3?: boolean | null
          created_at?: string | null
          ein_anderes_kind?: boolean | null
          ein_anderes_kind_2?: boolean | null
          ein_anderes_kind_2_p2?: boolean | null
          ein_anderes_kind_3?: boolean | null
          ein_anderes_kind_3_p2?: boolean | null
          ein_anderes_kind_p2?: boolean | null
          geburtsdatum?: string | null
          geburtsdatum_2?: string | null
          geburtsdatum_3?: string | null
          id?: string
          leiblich?: boolean | null
          leiblich_2?: boolean | null
          leiblich_2_p2?: boolean | null
          leiblich_3?: boolean | null
          leiblich_3_p2?: boolean | null
          leiblich_p2?: boolean | null
          nachname?: string | null
          nachname_2?: string | null
          nachname_3?: string | null
          nicht_mein_kind?: boolean | null
          nicht_mein_kind_2?: boolean | null
          nicht_mein_kind_2_p2?: boolean | null
          nicht_mein_kind_3?: boolean | null
          nicht_mein_kind_3_p2?: boolean | null
          nicht_mein_kind_p2?: boolean | null
          vorname?: string | null
          vorname_2?: string | null
          vorname_3?: string | null
        }
        Update: {
          adoptions_datum?: string | null
          adoptions_datum_2?: string | null
          adoptions_datum_3?: string | null
          adoptiv?: boolean | null
          adoptiv_2?: boolean | null
          adoptiv_2_p2?: boolean | null
          adoptiv_3?: boolean | null
          adoptiv_3_p2?: boolean | null
          adoptiv_p2?: boolean | null
          antrag_id?: string
          behind_grad?: boolean | null
          behind_grad_2?: boolean | null
          behind_grad_3?: boolean | null
          created_at?: string | null
          ein_anderes_kind?: boolean | null
          ein_anderes_kind_2?: boolean | null
          ein_anderes_kind_2_p2?: boolean | null
          ein_anderes_kind_3?: boolean | null
          ein_anderes_kind_3_p2?: boolean | null
          ein_anderes_kind_p2?: boolean | null
          geburtsdatum?: string | null
          geburtsdatum_2?: string | null
          geburtsdatum_3?: string | null
          id?: string
          leiblich?: boolean | null
          leiblich_2?: boolean | null
          leiblich_2_p2?: boolean | null
          leiblich_3?: boolean | null
          leiblich_3_p2?: boolean | null
          leiblich_p2?: boolean | null
          nachname?: string | null
          nachname_2?: string | null
          nachname_3?: string | null
          nicht_mein_kind?: boolean | null
          nicht_mein_kind_2?: boolean | null
          nicht_mein_kind_2_p2?: boolean | null
          nicht_mein_kind_3?: boolean | null
          nicht_mein_kind_3_p2?: boolean | null
          nicht_mein_kind_p2?: boolean | null
          vorname?: string | null
          vorname_2?: string | null
          vorname_3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_4_weitere_kinder_info_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: true
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      antrag_5_krankenversicherung: {
        Row: {
          antrag_id: string
          created_at: string | null
          familien_ver: boolean | null
          familien_ver_2: boolean | null
          frei_heifuer: boolean | null
          frei_heifuer_2: boolean | null
          freiwillig_ver: boolean | null
          freiwillig_ver_2: boolean | null
          gesetzlich_ver: boolean | null
          gesetzlich_ver_2: boolean | null
          id: string
          krankenkasse_gleich_wie_partner: boolean | null
          krankenkasse_hausnummer: string | null
          krankenkasse_hausnummer_2: string | null
          krankenkasse_ort: string | null
          krankenkasse_ort_2: string | null
          krankenkasse_plz: string | null
          krankenkasse_plz_2: string | null
          krankenkasse_postfach: string | null
          krankenkasse_postfach_2: string | null
          krankenkasse_strasse: string | null
          krankenkasse_strasse_2: string | null
          krankenkasse_zusatz: string | null
          krankenkasse_zusatz_2: string | null
          krankenkassename: string | null
          krankenkassename_2: string | null
          nicht_in_de_ver: boolean | null
          nicht_in_de_ver_2: boolean | null
          privat_ver: boolean | null
          privat_ver_2: boolean | null
          versichertennummer: string | null
          versichertennummer_2: string | null
        }
        Insert: {
          antrag_id: string
          created_at?: string | null
          familien_ver?: boolean | null
          familien_ver_2?: boolean | null
          frei_heifuer?: boolean | null
          frei_heifuer_2?: boolean | null
          freiwillig_ver?: boolean | null
          freiwillig_ver_2?: boolean | null
          gesetzlich_ver?: boolean | null
          gesetzlich_ver_2?: boolean | null
          id?: string
          krankenkasse_gleich_wie_partner?: boolean | null
          krankenkasse_hausnummer?: string | null
          krankenkasse_hausnummer_2?: string | null
          krankenkasse_ort?: string | null
          krankenkasse_ort_2?: string | null
          krankenkasse_plz?: string | null
          krankenkasse_plz_2?: string | null
          krankenkasse_postfach?: string | null
          krankenkasse_postfach_2?: string | null
          krankenkasse_strasse?: string | null
          krankenkasse_strasse_2?: string | null
          krankenkasse_zusatz?: string | null
          krankenkasse_zusatz_2?: string | null
          krankenkassename?: string | null
          krankenkassename_2?: string | null
          nicht_in_de_ver?: boolean | null
          nicht_in_de_ver_2?: boolean | null
          privat_ver?: boolean | null
          privat_ver_2?: boolean | null
          versichertennummer?: string | null
          versichertennummer_2?: string | null
        }
        Update: {
          antrag_id?: string
          created_at?: string | null
          familien_ver?: boolean | null
          familien_ver_2?: boolean | null
          frei_heifuer?: boolean | null
          frei_heifuer_2?: boolean | null
          freiwillig_ver?: boolean | null
          freiwillig_ver_2?: boolean | null
          gesetzlich_ver?: boolean | null
          gesetzlich_ver_2?: boolean | null
          id?: string
          krankenkasse_gleich_wie_partner?: boolean | null
          krankenkasse_hausnummer?: string | null
          krankenkasse_hausnummer_2?: string | null
          krankenkasse_ort?: string | null
          krankenkasse_ort_2?: string | null
          krankenkasse_plz?: string | null
          krankenkasse_plz_2?: string | null
          krankenkasse_postfach?: string | null
          krankenkasse_postfach_2?: string | null
          krankenkasse_strasse?: string | null
          krankenkasse_strasse_2?: string | null
          krankenkasse_zusatz?: string | null
          krankenkasse_zusatz_2?: string | null
          krankenkassename?: string | null
          krankenkassename_2?: string | null
          nicht_in_de_ver?: boolean | null
          nicht_in_de_ver_2?: boolean | null
          privat_ver?: boolean | null
          privat_ver_2?: boolean | null
          versichertennummer?: string | null
          versichertennummer_2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "antrag_5_krankenversicherung_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: true
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_logs: {
        Row: {
          antrag_id: string | null
          confidence_score: number | null
          created_at: string | null
          extracted_text: string | null
          field_name: string | null
          field_value: string | null
          id: string
          user_file_id: string
        }
        Insert: {
          antrag_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          extracted_text?: string | null
          field_name?: string | null
          field_value?: string | null
          id?: string
          user_file_id: string
        }
        Update: {
          antrag_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          extracted_text?: string | null
          field_name?: string | null
          field_value?: string | null
          id?: string
          user_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_logs_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_logs_user_file_id_fkey"
            columns: ["user_file_id"]
            isOneToOne: false
            referencedRelation: "user_files"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          mapping_file_path: string | null
          storage_path: string
          template_name: string
          updated_at: string | null
          valid_from: string
          valid_until: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          mapping_file_path?: string | null
          storage_path: string
          template_name: string
          updated_at?: string | null
          valid_from: string
          valid_until?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          mapping_file_path?: string | null
          storage_path?: string
          template_name?: string
          updated_at?: string | null
          valid_from?: string
          valid_until?: string | null
          version?: string
        }
        Relationships: []
      }
      kind: {
        Row: {
          antrag_id: string
          anzahl_mehrlinge: number | null
          anzahl_weitere_kinder: number | null
          behinderung: boolean | null
          created_at: string | null
          errechneter_geburtsdatum: string | null
          fruehgeboren: boolean | null
          geburtsdatum: string | null
          id: string
          insgesamt: boolean | null
          keine_weitere_kinder: boolean | null
          nachname: string | null
          vorname: string | null
        }
        Insert: {
          antrag_id: string
          anzahl_mehrlinge?: number | null
          anzahl_weitere_kinder?: number | null
          behinderung?: boolean | null
          created_at?: string | null
          errechneter_geburtsdatum?: string | null
          fruehgeboren?: boolean | null
          geburtsdatum?: string | null
          id?: string
          insgesamt?: boolean | null
          keine_weitere_kinder?: boolean | null
          nachname?: string | null
          vorname?: string | null
        }
        Update: {
          antrag_id?: string
          anzahl_mehrlinge?: number | null
          anzahl_weitere_kinder?: number | null
          behinderung?: boolean | null
          created_at?: string | null
          errechneter_geburtsdatum?: string | null
          fruehgeboren?: boolean | null
          geburtsdatum?: string | null
          id?: string
          insgesamt?: boolean | null
          keine_weitere_kinder?: boolean | null
          nachname?: string | null
          vorname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kind_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_files: {
        Row: {
          antrag_id: string | null
          expires_at: string | null
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["file_status"] | null
          storage_path: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          antrag_id?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["file_status"] | null
          storage_path?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          antrag_id?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["file_status"] | null
          storage_path?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_files_antrag_id_fkey"
            columns: ["antrag_id"]
            isOneToOne: false
            referencedRelation: "antrag"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_active_template: {
        Args: { p_template_name: string }
        Returns: {
          display_name: string
          id: string
          mapping_file_path: string
          storage_path: string
          template_name: string
          version: string
        }[]
      }
    }
    Enums: {
      file_status:
        | "uploaded"
        | "processing"
        | "extracted"
        | "completed"
        | "error"
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
      file_status: [
        "uploaded",
        "processing",
        "extracted",
        "completed",
        "error",
      ],
      geschlecht_type: ["weiblich", "maennlich", "divers", "ohne_angabe"],
    },
  },
} as const
