-- Phase 1.1: Erweitere pdf_field_mappings mit neuen Spalten
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS page_number INTEGER;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS section_visual TEXT;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS field_label_de TEXT;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS field_type TEXT;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS format_hint TEXT;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS coord_x NUMERIC;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS coord_y NUMERIC;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS width NUMERIC;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS height NUMERIC;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS validation_rule_de TEXT;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS hint_de TEXT;
ALTER TABLE pdf_field_mappings ADD COLUMN IF NOT EXISTS reading_order INTEGER;

-- Phase 1.2: Erstelle elterngeldantrag_data Tabelle für manuelle Eingaben
CREATE TABLE IF NOT EXISTS elterngeldantrag_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID REFERENCES antraege(id),
  
  -- Kind-Daten (Seite 1, Abschnitt 1.B/1.C)
  kind_fruehgeburt BOOLEAN DEFAULT false,
  kind_errechneter_termin DATE,
  kind_behinderung BOOLEAN DEFAULT false,
  haushalt_weitere_kinder_keine BOOLEAN DEFAULT false,
  haushalt_weitere_kinder_vorhanden BOOLEAN DEFAULT false,
  haushalt_weitere_kinder_anzahl INTEGER,
  
  -- Alleinerziehend (Seite 2, Abschnitt 2.A)
  eltern_alleinerziehend BOOLEAN DEFAULT false,
  eltern_alleinerziehend_nichtbetreuung BOOLEAN DEFAULT false,
  eltern_alleinerziehend_kindeswohl BOOLEAN DEFAULT false,
  
  -- Elternteil 1 Stammdaten
  eltern1_vorname TEXT,
  eltern1_nachname TEXT,
  eltern1_geburtsdatum DATE,
  eltern1_geschlecht_weiblich BOOLEAN DEFAULT false,
  eltern1_geschlecht_maennlich BOOLEAN DEFAULT false,
  eltern1_geschlecht_divers BOOLEAN DEFAULT false,
  eltern1_geschlecht_ohne_angabe BOOLEAN DEFAULT false,
  eltern1_steuer_id TEXT,
  eltern1_wohnsitz_de_ja BOOLEAN DEFAULT false,
  eltern1_wohnsitz_de_nein BOOLEAN DEFAULT false,
  eltern1_adresse_strasse TEXT,
  eltern1_adresse_hausnr TEXT,
  eltern1_adresse_plz TEXT,
  eltern1_adresse_ort TEXT,
  eltern1_telefon TEXT,
  eltern1_email TEXT,
  eltern1_staatsangehoerigkeit TEXT,
  eltern1_aufenthalt_eu_efta BOOLEAN DEFAULT false,
  eltern1_aufenthalt_drittstaat BOOLEAN DEFAULT false,
  eltern1_erwerbstaetig_ja BOOLEAN DEFAULT false,
  eltern1_erwerbstaetig_nein BOOLEAN DEFAULT false,
  eltern1_selbststaendig_ja BOOLEAN DEFAULT false,
  eltern1_selbststaendig_nein BOOLEAN DEFAULT false,
  eltern1_einkommen_nichtselbststaendig NUMERIC,
  eltern1_einkommen_selbststaendig NUMERIC,
  eltern1_einkommen_sonstige NUMERIC,
  
  -- Elternteil 2 Stammdaten
  eltern2_vorname TEXT,
  eltern2_nachname TEXT,
  eltern2_geburtsdatum DATE,
  eltern2_geschlecht_weiblich BOOLEAN DEFAULT false,
  eltern2_geschlecht_maennlich BOOLEAN DEFAULT false,
  eltern2_geschlecht_divers BOOLEAN DEFAULT false,
  eltern2_geschlecht_ohne_angabe BOOLEAN DEFAULT false,
  eltern2_steuer_id TEXT,
  eltern2_wohnsitz_de_ja BOOLEAN DEFAULT false,
  eltern2_wohnsitz_de_nein BOOLEAN DEFAULT false,
  eltern2_adresse_strasse TEXT,
  eltern2_adresse_hausnr TEXT,
  eltern2_adresse_plz TEXT,
  eltern2_adresse_ort TEXT,
  eltern2_telefon TEXT,
  eltern2_email TEXT,
  eltern2_staatsangehoerigkeit TEXT,
  eltern2_aufenthalt_eu_efta BOOLEAN DEFAULT false,
  eltern2_aufenthalt_drittstaat BOOLEAN DEFAULT false,
  eltern2_erwerbstaetig_ja BOOLEAN DEFAULT false,
  eltern2_erwerbstaetig_nein BOOLEAN DEFAULT false,
  eltern2_selbststaendig_ja BOOLEAN DEFAULT false,
  eltern2_selbststaendig_nein BOOLEAN DEFAULT false,
  eltern2_einkommen_nichtselbststaendig NUMERIC,
  eltern2_einkommen_selbststaendig NUMERIC,
  eltern2_einkommen_sonstige NUMERIC,
  
  -- Geschwisterbonus Kind 1
  geschwisterbonus_kind1_vorname TEXT,
  geschwisterbonus_kind1_nachname TEXT,
  geschwisterbonus_kind1_geburtsdatum DATE,
  geschwisterbonus_kind1_gdb_flag BOOLEAN DEFAULT false,
  geschwisterbonus_kind1_beziehung_eltern1_leiblich BOOLEAN DEFAULT false,
  geschwisterbonus_kind1_beziehung_eltern1_adoptiv BOOLEAN DEFAULT false,
  geschwisterbonus_kind1_beziehung_eltern1_partnerkind BOOLEAN DEFAULT false,
  geschwisterbonus_kind1_beziehung_eltern1_andere BOOLEAN DEFAULT false,
  geschwisterbonus_kind1_beziehung_eltern2_leiblich BOOLEAN DEFAULT false,
  geschwisterbonus_kind1_beziehung_eltern2_adoptiv BOOLEAN DEFAULT false,
  geschwisterbonus_kind1_beziehung_eltern2_partnerkind BOOLEAN DEFAULT false,
  geschwisterbonus_kind1_beziehung_eltern2_andere BOOLEAN DEFAULT false,
  
  -- Geschwisterbonus Kind 2
  geschwisterbonus_kind2_vorname TEXT,
  geschwisterbonus_kind2_nachname TEXT,
  geschwisterbonus_kind2_geburtsdatum DATE,
  geschwisterbonus_kind2_gdb_flag BOOLEAN DEFAULT false,
  geschwisterbonus_kind2_beziehung_eltern1_leiblich BOOLEAN DEFAULT false,
  geschwisterbonus_kind2_beziehung_eltern1_adoptiv BOOLEAN DEFAULT false,
  geschwisterbonus_kind2_beziehung_eltern1_partnerkind BOOLEAN DEFAULT false,
  geschwisterbonus_kind2_beziehung_eltern1_andere BOOLEAN DEFAULT false,
  geschwisterbonus_kind2_beziehung_eltern2_leiblich BOOLEAN DEFAULT false,
  geschwisterbonus_kind2_beziehung_eltern2_adoptiv BOOLEAN DEFAULT false,
  geschwisterbonus_kind2_beziehung_eltern2_partnerkind BOOLEAN DEFAULT false,
  geschwisterbonus_kind2_beziehung_eltern2_andere BOOLEAN DEFAULT false,
  
  -- Geschwisterbonus Kind 3
  geschwisterbonus_kind3_vorname TEXT,
  geschwisterbonus_kind3_nachname TEXT,
  geschwisterbonus_kind3_geburtsdatum DATE,
  geschwisterbonus_kind3_gdb_flag BOOLEAN DEFAULT false,
  geschwisterbonus_kind3_beziehung_eltern1_leiblich BOOLEAN DEFAULT false,
  geschwisterbonus_kind3_beziehung_eltern1_adoptiv BOOLEAN DEFAULT false,
  geschwisterbonus_kind3_beziehung_eltern1_partnerkind BOOLEAN DEFAULT false,
  geschwisterbonus_kind3_beziehung_eltern1_andere BOOLEAN DEFAULT false,
  geschwisterbonus_kind3_beziehung_eltern2_leiblich BOOLEAN DEFAULT false,
  geschwisterbonus_kind3_beziehung_eltern2_adoptiv BOOLEAN DEFAULT false,
  geschwisterbonus_kind3_beziehung_eltern2_partnerkind BOOLEAN DEFAULT false,
  geschwisterbonus_kind3_beziehung_eltern2_andere BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, antrag_id)
);

-- Enable RLS
ALTER TABLE elterngeldantrag_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own elterngeldantrag_data"
  ON elterngeldantrag_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own elterngeldantrag_data"
  ON elterngeldantrag_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own elterngeldantrag_data"
  ON elterngeldantrag_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own elterngeldantrag_data"
  ON elterngeldantrag_data FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_elterngeldantrag_data_updated_at
  BEFORE UPDATE ON elterngeldantrag_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();