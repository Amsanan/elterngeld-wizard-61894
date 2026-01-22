-- Phase 1: Extend arbeitgeberbescheinigungen table with additional columns
ALTER TABLE arbeitgeberbescheinigungen 
  ADD COLUMN IF NOT EXISTS elternzeit_1_von DATE,
  ADD COLUMN IF NOT EXISTS elternzeit_1_bis DATE,
  ADD COLUMN IF NOT EXISTS elternzeit_2_von DATE,
  ADD COLUMN IF NOT EXISTS elternzeit_2_bis DATE,
  ADD COLUMN IF NOT EXISTS elternzeit_3_von DATE,
  ADD COLUMN IF NOT EXISTS elternzeit_3_bis DATE,
  ADD COLUMN IF NOT EXISTS mutterschutz_beginn DATE,
  ADD COLUMN IF NOT EXISTS mutterschutz_ende DATE,
  ADD COLUMN IF NOT EXISTS urlaub_1_von DATE,
  ADD COLUMN IF NOT EXISTS urlaub_1_bis DATE,
  ADD COLUMN IF NOT EXISTS urlaub_2_von DATE,
  ADD COLUMN IF NOT EXISTS urlaub_2_bis DATE,
  ADD COLUMN IF NOT EXISTS resturlaub_tage INTEGER,
  ADD COLUMN IF NOT EXISTS ag_zuschuss_mutterschaftsgeld NUMERIC,
  ADD COLUMN IF NOT EXISTS ag_zuschuss_beginn DATE,
  ADD COLUMN IF NOT EXISTS ag_zuschuss_ende DATE,
  ADD COLUMN IF NOT EXISTS ag_zuschuss_tagessatz NUMERIC,
  ADD COLUMN IF NOT EXISTS sachbezuege_ja BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sachbezuege_von DATE,
  ADD COLUMN IF NOT EXISTS sachbezuege_bis DATE,
  ADD COLUMN IF NOT EXISTS sachbezuege_tagessatz NUMERIC,
  ADD COLUMN IF NOT EXISTS teilzeit_elternzeit_ja BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS teilzeit_von DATE,
  ADD COLUMN IF NOT EXISTS teilzeit_bis DATE,
  ADD COLUMN IF NOT EXISTS teilzeit_stunden NUMERIC,
  ADD COLUMN IF NOT EXISTS teilzeit_brutto NUMERIC,
  ADD COLUMN IF NOT EXISTS teilzeit_netto NUMERIC;

-- Phase 2: Extend leistungsbescheide table with ALG I/Bürgergeld/Krankengeld specific columns
ALTER TABLE leistungsbescheide
  ADD COLUMN IF NOT EXISTS bemessungsentgelt NUMERIC,
  ADD COLUMN IF NOT EXISTS leistungssatz_prozent NUMERIC,
  ADD COLUMN IF NOT EXISTS qualifizierungszeit_von DATE,
  ADD COLUMN IF NOT EXISTS qualifizierungszeit_bis DATE,
  ADD COLUMN IF NOT EXISTS regelsatz NUMERIC,
  ADD COLUMN IF NOT EXISTS kosten_unterkunft NUMERIC,
  ADD COLUMN IF NOT EXISTS heizkosten NUMERIC,
  ADD COLUMN IF NOT EXISTS mehrbedarf NUMERIC,
  ADD COLUMN IF NOT EXISTS bedarfsgemeinschaft_groesse INTEGER,
  ADD COLUMN IF NOT EXISTS arbeitgeber TEXT,
  ADD COLUMN IF NOT EXISTS arbeitsunfaehig_seit DATE,
  ADD COLUMN IF NOT EXISTS krankenkasse TEXT,
  ADD COLUMN IF NOT EXISTS versichertennummer TEXT,
  ADD COLUMN IF NOT EXISTS bruttolohn_bemessung NUMERIC,
  ADD COLUMN IF NOT EXISTS tagessatz NUMERIC,
  ADD COLUMN IF NOT EXISTS kundennummer TEXT,
  ADD COLUMN IF NOT EXISTS aktenzeichen TEXT;

-- Phase 3: Create vaterschaftsanerkennungen table
CREATE TABLE IF NOT EXISTS vaterschaftsanerkennungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID REFERENCES antraege(id),
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  kind_geburtsort TEXT,
  vater_vorname TEXT,
  vater_nachname TEXT,
  vater_geburtsdatum DATE,
  mutter_vorname TEXT,
  mutter_nachname TEXT,
  mutter_geburtsdatum DATE,
  anerkennungsdatum DATE,
  zustimmungsdatum DATE,
  beurkundungsstelle TEXT,
  urkundennummer TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for vaterschaftsanerkennungen
ALTER TABLE vaterschaftsanerkennungen ENABLE ROW LEVEL SECURITY;

-- RLS policies for vaterschaftsanerkennungen
CREATE POLICY "Users can view their own vaterschaftsanerkennungen"
  ON vaterschaftsanerkennungen FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vaterschaftsanerkennungen"
  ON vaterschaftsanerkennungen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vaterschaftsanerkennungen"
  ON vaterschaftsanerkennungen FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vaterschaftsanerkennungen"
  ON vaterschaftsanerkennungen FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for vaterschaftsanerkennungen
CREATE INDEX IF NOT EXISTS idx_vaterschaftsanerkennungen_user_id ON vaterschaftsanerkennungen(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_vaterschaftsanerkennungen_updated_at
  BEFORE UPDATE ON vaterschaftsanerkennungen
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Phase 4: Create kindergeld_bescheide table
CREATE TABLE IF NOT EXISTS kindergeld_bescheide (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID REFERENCES antraege(id),
  person_type person_type_enum,
  familienkasse TEXT,
  kindergeld_nummer TEXT,
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  kind_ordnungszahl INTEGER,
  bescheiddatum DATE,
  betrag_monatlich NUMERIC,
  zahlungsbeginn DATE,
  zahlungsende DATE,
  iban TEXT,
  kontoinhaber TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for kindergeld_bescheide
ALTER TABLE kindergeld_bescheide ENABLE ROW LEVEL SECURITY;

-- RLS policies for kindergeld_bescheide
CREATE POLICY "Users can view their own kindergeld_bescheide"
  ON kindergeld_bescheide FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own kindergeld_bescheide"
  ON kindergeld_bescheide FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own kindergeld_bescheide"
  ON kindergeld_bescheide FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own kindergeld_bescheide"
  ON kindergeld_bescheide FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for kindergeld_bescheide
CREATE INDEX IF NOT EXISTS idx_kindergeld_bescheide_user_id ON kindergeld_bescheide(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_kindergeld_bescheide_updated_at
  BEFORE UPDATE ON kindergeld_bescheide
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Phase 5: Create aerztliche_zeugnisse table
CREATE TABLE IF NOT EXISTS aerztliche_zeugnisse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID REFERENCES antraege(id),
  zeugnis_typ TEXT NOT NULL,
  arzt_name TEXT,
  arzt_praxis TEXT,
  ausstelldatum DATE,
  errechneter_geburtstermin DATE,
  verbot_beginn DATE,
  verbot_ende DATE,
  verbot_grund TEXT,
  verbot_art TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for aerztliche_zeugnisse
ALTER TABLE aerztliche_zeugnisse ENABLE ROW LEVEL SECURITY;

-- RLS policies for aerztliche_zeugnisse
CREATE POLICY "Users can view their own aerztliche_zeugnisse"
  ON aerztliche_zeugnisse FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own aerztliche_zeugnisse"
  ON aerztliche_zeugnisse FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own aerztliche_zeugnisse"
  ON aerztliche_zeugnisse FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own aerztliche_zeugnisse"
  ON aerztliche_zeugnisse FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for aerztliche_zeugnisse
CREATE INDEX IF NOT EXISTS idx_aerztliche_zeugnisse_user_id ON aerztliche_zeugnisse(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_aerztliche_zeugnisse_updated_at
  BEFORE UPDATE ON aerztliche_zeugnisse
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();