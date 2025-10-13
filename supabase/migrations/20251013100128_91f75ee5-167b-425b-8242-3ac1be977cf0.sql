-- Continue creating remaining tables from Mapping032025_1.xlsx

-- Antrag_6A_Gesamteinkommen table
CREATE TABLE IF NOT EXISTS public.antrag_6a_gesamteinkommen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  unter_200_tausend BOOLEAN DEFAULT false,
  ueber_200_tausend BOOLEAN DEFAULT false,
  vorraus_200_tausend BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_6a_gesamteinkommen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage total income data" ON public.antrag_6a_gesamteinkommen;
CREATE POLICY "Users can manage total income data" ON public.antrag_6a_gesamteinkommen
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_6a_gesamteinkommen.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_6B_Mindestbetrag table
CREATE TABLE IF NOT EXISTS public.antrag_6b_mindestbetrag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  beantrage_mindest BOOLEAN DEFAULT false,
  beantrage_mindest_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_6b_mindestbetrag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage minimum amount data" ON public.antrag_6b_mindestbetrag;
CREATE POLICY "Users can manage minimum amount data" ON public.antrag_6b_mindestbetrag
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_6b_mindestbetrag.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_7A_bisherige_erwerbstaetigkeit table
CREATE TABLE IF NOT EXISTS public.antrag_7a_bisherige_erwerbstaetigkeit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  einkuenfte_nicht_selbststaendig BOOLEAN DEFAULT false,
  gewinn_einkunft_vorhanden BOOLEAN DEFAULT false,
  gewerbe_einkuenfte BOOLEAN DEFAULT false,
  selbststaendig_einkuenfte BOOLEAN DEFAULT false,
  landwirtschaft_einkuenfte BOOLEAN DEFAULT false,
  keine_einkuenfte BOOLEAN DEFAULT false,
  einkuenfte_nicht_selbststaendig_2 BOOLEAN DEFAULT false,
  gewinn_einkunft_vorhanden_2 BOOLEAN DEFAULT false,
  gewerbe_einkuenfte_2 BOOLEAN DEFAULT false,
  selbststaendig_einkuenfte_2 BOOLEAN DEFAULT false,
  landwirtschaft_einkuenfte_2 BOOLEAN DEFAULT false,
  keine_einkuenfte_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_7a_bisherige_erwerbstaetigkeit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage previous employment data" ON public.antrag_7a_bisherige_erwerbstaetigkeit;
CREATE POLICY "Users can manage previous employment data" ON public.antrag_7a_bisherige_erwerbstaetigkeit
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_7a_bisherige_erwerbstaetigkeit.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_8A_einkomen_vor_geburt_bestimmt table
CREATE TABLE IF NOT EXISTS public.antrag_8a_einkomen_vor_geburt_bestimmt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  minijob BOOLEAN DEFAULT false,
  midijob BOOLEAN DEFAULT false,
  berufsausbildung BOOLEAN DEFAULT false,
  keine_der_bestimmten BOOLEAN DEFAULT false,
  minijob_2 BOOLEAN DEFAULT false,
  midijob_2 BOOLEAN DEFAULT false,
  berufsausbildung_2 BOOLEAN DEFAULT false,
  keine_der_bestimmten_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_8a_einkomen_vor_geburt_bestimmt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage pre-birth income data" ON public.antrag_8a_einkomen_vor_geburt_bestimmt;
CREATE POLICY "Users can manage pre-birth income data" ON public.antrag_8a_einkomen_vor_geburt_bestimmt
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_8a_einkomen_vor_geburt_bestimmt.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_8B_Steuern_und_Abgaben table
CREATE TABLE IF NOT EXISTS public.antrag_8b_steuern_und_abgaben (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  kirchensteuer BOOLEAN DEFAULT false,
  pflichtbeitrag_krankenkasse BOOLEAN DEFAULT false,
  rentenversicherung BOOLEAN DEFAULT false,
  arbeitslosenversicherung BOOLEAN DEFAULT false,
  keine_abgaben BOOLEAN DEFAULT false,
  kirchensteuer_2 BOOLEAN DEFAULT false,
  pflichtbeitrag_krankenkasse_2 BOOLEAN DEFAULT false,
  rentenversicherung_2 BOOLEAN DEFAULT false,
  arbeitslosenversicherung_2 BOOLEAN DEFAULT false,
  keine_abgaben_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_8b_steuern_und_abgaben ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage taxes data" ON public.antrag_8b_steuern_und_abgaben;
CREATE POLICY "Users can manage taxes data" ON public.antrag_8b_steuern_und_abgaben
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_8b_steuern_und_abgaben.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_9_einkommen_ersatz_leistungen table
CREATE TABLE IF NOT EXISTS public.antrag_9_einkommen_ersatz_leistungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  arbeitslosengeld_i BOOLEAN DEFAULT false,
  krankentage_geld BOOLEAN DEFAULT false,
  krankengeld BOOLEAN DEFAULT false,
  rente BOOLEAN DEFAULT false,
  art_rente1 VARCHAR(255),
  art_rente2 VARCHAR(255),
  elterngeld_fuer_aelteres BOOLEAN DEFAULT false,
  andere_einkommen_ersatz_leistung BOOLEAN DEFAULT false,
  art_ersatz_leistung1 VARCHAR(255),
  art_ersatz_leistung2 VARCHAR(255),
  arbeitslosengeld_i_2 BOOLEAN DEFAULT false,
  krankentage_geld_2 BOOLEAN DEFAULT false,
  krankengeld_2 BOOLEAN DEFAULT false,
  rente_2 BOOLEAN DEFAULT false,
  art_rente1_2 VARCHAR(255),
  art_rente2_2 VARCHAR(255),
  elterngeld_fuer_aelteres_2 BOOLEAN DEFAULT false,
  andere_einkommen_ersatz_leistung_2 BOOLEAN DEFAULT false,
  art_ersatz_leistung1_2 VARCHAR(255),
  art_ersatz_leistung2_2 VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_9_einkommen_ersatz_leistungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage income replacement data" ON public.antrag_9_einkommen_ersatz_leistungen;
CREATE POLICY "Users can manage income replacement data" ON public.antrag_9_einkommen_ersatz_leistungen
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_9_einkommen_ersatz_leistungen.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_10_mutterschafts_leistungen table
CREATE TABLE IF NOT EXISTS public.antrag_10_mutterschafts_leistungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  anspruch_mutterschaftsgeld_krankenkasse BOOLEAN DEFAULT false,
  von_mutterschaftsgeld_kk DATE,
  bis_mutterschaftsgeld_kk DATE,
  rufe_online_kk_bescheinigung_ab BOOLEAN DEFAULT false,
  anspruch_krankentage_geld BOOLEAN DEFAULT false,
  von_krankentage_geld DATE,
  bis_krankentage_geld DATE,
  anspruch_zuschuss_beamter BOOLEAN DEFAULT false,
  von_beamt DATE,
  bis_beamt DATE,
  anspruch_mutterschaftsgeld_von_arbeitgeber BOOLEAN DEFAULT false,
  von_mutterschaftsgeld_arbeit DATE,
  bis_mutterschaftsgeld_arbeit DATE,
  anspruch_zuschuss_beamter_dienst_anwaerter BOOLEAN DEFAULT false,
  von_beamt_dienst_anwaerter DATE,
  bis_beamt_dienst_anwaerter DATE,
  vergleichbare_mutterschaftsgeld_ausland BOOLEAN DEFAULT false,
  von_mutterschaftsgeld_mg_ausland DATE,
  bis_mutterschaftsgeld_mg_ausland DATE,
  kein_anspruch_mutterschaftsgeld BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_10_mutterschafts_leistungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage maternity benefits data" ON public.antrag_10_mutterschafts_leistungen;
CREATE POLICY "Users can manage maternity benefits data" ON public.antrag_10_mutterschafts_leistungen
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_10_mutterschafts_leistungen.antrag_id AND antrag.user_id = auth.uid()
));