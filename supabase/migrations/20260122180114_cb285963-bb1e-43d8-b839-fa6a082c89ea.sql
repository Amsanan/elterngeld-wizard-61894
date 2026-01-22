-- =============================================
-- Phase 1: Erweitere geburtsurkunden Tabelle
-- =============================================

-- Neue Spalten für Mehrlinge und Geschwister-Unterstützung
ALTER TABLE public.geburtsurkunden
ADD COLUMN IF NOT EXISTS kind_typ TEXT DEFAULT 'primaer' CHECK (kind_typ IN ('primaer', 'mehrling', 'geschwister')),
ADD COLUMN IF NOT EXISTS kind_ordnungszahl INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mehrling_nummer INTEGER,
ADD COLUMN IF NOT EXISTS ist_fruehgeburt BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS errechneter_geburtstermin DATE;

-- Kommentare für Dokumentation
COMMENT ON COLUMN public.geburtsurkunden.kind_typ IS 'primaer = Hauptkind des Antrags, mehrling = Zwilling/Drilling, geschwister = älteres Geschwisterkind für Bonus';
COMMENT ON COLUMN public.geburtsurkunden.kind_ordnungszahl IS '0 = Primäres Kind, 1 = Jüngstes Geschwister, 2 = Zweitjüngstes, 3 = Drittjüngstes';
COMMENT ON COLUMN public.geburtsurkunden.mehrling_nummer IS 'NULL = kein Mehrling, 1/2/3 = Position bei Mehrlingen';

-- =============================================
-- Phase 2: Erweitere eltern_dokumente Tabelle
-- =============================================

ALTER TABLE public.eltern_dokumente
ADD COLUMN IF NOT EXISTS ist_antragsteller BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.eltern_dokumente.ist_antragsteller IS 'TRUE = Diese Person ist Elternteil 1 (Antragsteller) im Formular';

-- =============================================
-- Phase 3: Erstelle elterngeldantrag_data Tabelle
-- =============================================

CREATE TABLE IF NOT EXISTS public.elterngeldantrag_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE CASCADE,
  
  -- Antragsteller-Bestimmung (KRITISCH für korrekte PDF-Zuordnung)
  antragsteller_person_type TEXT CHECK (antragsteller_person_type IN ('mutter', 'vater')),
  
  -- Elternteil 1 (= Antragsteller) Zusatzdaten
  eltern1_email TEXT,
  eltern1_telefon TEXT,
  eltern1_staatsangehoerigkeit TEXT,
  eltern1_wohnsitz_de_ja BOOLEAN,
  eltern1_geschlecht_maennlich BOOLEAN,
  eltern1_geschlecht_weiblich BOOLEAN,
  eltern1_geschlecht_divers BOOLEAN,
  
  -- Elternteil 2 (= Partner) Zusatzdaten
  eltern2_email TEXT,
  eltern2_telefon TEXT,
  eltern2_staatsangehoerigkeit TEXT,
  eltern2_wohnsitz_de_ja BOOLEAN,
  eltern2_geschlecht_maennlich BOOLEAN,
  eltern2_geschlecht_weiblich BOOLEAN,
  eltern2_geschlecht_divers BOOLEAN,
  
  -- Alleinerziehend
  eltern_alleinerziehend BOOLEAN DEFAULT FALSE,
  eltern_alleinerziehend_kindeswohl BOOLEAN,
  eltern_alleinerziehend_nichtbetreuung BOOLEAN,
  
  -- Haushalt / Weitere Kinder
  haushalt_weitere_kinder_vorhanden BOOLEAN,
  haushalt_weitere_kinder_keine BOOLEAN,
  haushalt_weitere_kinder_anzahl INTEGER,
  
  -- Kind-Zusatzdaten (Primäres Kind)
  kind_fruehgeburt BOOLEAN DEFAULT FALSE,
  kind_errechneter_termin DATE,
  kind_mehrlinge_ja BOOLEAN DEFAULT FALSE,
  kind_mehrlinge_anzahl INTEGER,
  
  -- Geschwisterbonus Kind 1 (Jüngstes Geschwister)
  geschwisterbonus_kind1_vorname TEXT,
  geschwisterbonus_kind1_nachname TEXT,
  geschwisterbonus_kind1_geburtsdatum DATE,
  geschwisterbonus_kind1_beziehung_eltern1_leiblich BOOLEAN,
  geschwisterbonus_kind1_beziehung_eltern1_adoptiv BOOLEAN,
  geschwisterbonus_kind1_beziehung_eltern1_partnerkind BOOLEAN,
  geschwisterbonus_kind1_beziehung_eltern2_leiblich BOOLEAN,
  geschwisterbonus_kind1_beziehung_eltern2_adoptiv BOOLEAN,
  geschwisterbonus_kind1_beziehung_eltern2_partnerkind BOOLEAN,
  geschwisterbonus_kind1_gdb_flag BOOLEAN,
  
  -- Geschwisterbonus Kind 2 (Zweitjüngstes Geschwister)
  geschwisterbonus_kind2_vorname TEXT,
  geschwisterbonus_kind2_nachname TEXT,
  geschwisterbonus_kind2_geburtsdatum DATE,
  geschwisterbonus_kind2_beziehung_eltern1_leiblich BOOLEAN,
  geschwisterbonus_kind2_beziehung_eltern1_adoptiv BOOLEAN,
  geschwisterbonus_kind2_beziehung_eltern1_partnerkind BOOLEAN,
  geschwisterbonus_kind2_beziehung_eltern2_leiblich BOOLEAN,
  geschwisterbonus_kind2_beziehung_eltern2_adoptiv BOOLEAN,
  geschwisterbonus_kind2_beziehung_eltern2_partnerkind BOOLEAN,
  geschwisterbonus_kind2_gdb_flag BOOLEAN,
  
  -- Geschwisterbonus Kind 3 (Drittjüngstes Geschwister)
  geschwisterbonus_kind3_vorname TEXT,
  geschwisterbonus_kind3_nachname TEXT,
  geschwisterbonus_kind3_geburtsdatum DATE,
  geschwisterbonus_kind3_beziehung_eltern1_leiblich BOOLEAN,
  geschwisterbonus_kind3_beziehung_eltern1_adoptiv BOOLEAN,
  geschwisterbonus_kind3_beziehung_eltern1_partnerkind BOOLEAN,
  geschwisterbonus_kind3_beziehung_eltern2_leiblich BOOLEAN,
  geschwisterbonus_kind3_beziehung_eltern2_adoptiv BOOLEAN,
  geschwisterbonus_kind3_beziehung_eltern2_partnerkind BOOLEAN,
  geschwisterbonus_kind3_gdb_flag BOOLEAN,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: Ein User hat maximal einen Datensatz pro Antrag
CREATE UNIQUE INDEX IF NOT EXISTS idx_elterngeldantrag_data_user_antrag 
ON public.elterngeldantrag_data(user_id, antrag_id);

-- Index für schnelle User-Abfragen
CREATE INDEX IF NOT EXISTS idx_elterngeldantrag_data_user 
ON public.elterngeldantrag_data(user_id);

-- Enable RLS
ALTER TABLE public.elterngeldantrag_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own elterngeldantrag_data"
ON public.elterngeldantrag_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own elterngeldantrag_data"
ON public.elterngeldantrag_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own elterngeldantrag_data"
ON public.elterngeldantrag_data FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own elterngeldantrag_data"
ON public.elterngeldantrag_data FOR DELETE
USING (auth.uid() = user_id);

-- Trigger für updated_at
CREATE TRIGGER update_elterngeldantrag_data_updated_at
BEFORE UPDATE ON public.elterngeldantrag_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();