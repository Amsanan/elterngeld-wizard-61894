-- Create missing tables based on Mapping032025_1.xlsx

-- Antrag_2C_Kind_Adresse table
CREATE TABLE IF NOT EXISTS public.antrag_2c_kind_adresse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  kind_adresse_wie_sie BOOLEAN DEFAULT false,
  kind_adresse_wie_anderer BOOLEAN DEFAULT false,
  kind_adresse_abw BOOLEAN DEFAULT false,
  kind_abw_strasse VARCHAR(150),
  kind_abw_hausnr VARCHAR(20),
  kind_abw_plz VARCHAR(10),
  kind_abw_ort VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_2c_kind_adresse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage child address data" ON public.antrag_2c_kind_adresse
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_2c_kind_adresse.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_2D_Arbeit_im_Ausland table
CREATE TABLE IF NOT EXISTS public.antrag_2d_arbeit_im_ausland (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  arbeitsvertrag_auslaendisches_recht_ja BOOLEAN DEFAULT false,
  arbeitsvertrag_auslaendisches_recht_nein BOOLEAN DEFAULT false,
  nato_truppe_oder_ziv_gefolge_ja BOOLEAN DEFAULT false,
  nato_truppe_oder_ziv_gefolge_nein BOOLEAN DEFAULT false,
  diplomatische_mission_oder_beschaeftigt_ja BOOLEAN DEFAULT false,
  diplomatische_mission_oder_beschaeftigt_nein BOOLEAN DEFAULT false,
  arbeitsvertrag_auslaendisches_recht_2_ja BOOLEAN DEFAULT false,
  arbeitsvertrag_auslaendisches_recht_2_nein BOOLEAN DEFAULT false,
  nato_truppe_oder_ziv_gefolge_2_ja BOOLEAN DEFAULT false,
  nato_truppe_oder_ziv_gefolge_2_nein BOOLEAN DEFAULT false,
  diplomatische_mission_oder_beschaeftigt_2_ja BOOLEAN DEFAULT false,
  diplomatische_mission_oder_beschaeftigt_2_nein BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_2d_arbeit_im_ausland ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage foreign work data" ON public.antrag_2d_arbeit_im_ausland
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_2d_arbeit_im_ausland.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_2E_Antragstellende table  
CREATE TABLE IF NOT EXISTS public.antrag_2e_antragstellende (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  fuer_beide_elternteile BOOLEAN DEFAULT false,
  fuer_mich_spaeter_andere BOOLEAN DEFAULT false,
  fuer_mich_andere_bereits_beantragt BOOLEAN DEFAULT false,
  nur_fuer_mich BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_2e_antragstellende ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage applicant data" ON public.antrag_2e_antragstellende
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_2e_antragstellende.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_2F_Staatsangehoerigkeit table
CREATE TABLE IF NOT EXISTS public.antrag_2f_staatsangehoerigkeit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  staatsang_deutsch BOOLEAN DEFAULT false,
  staatsang_eu_ewr_ch BOOLEAN DEFAULT false,
  staatsang_eu_staatname VARCHAR(255),
  freizuegigkeit_ja BOOLEAN DEFAULT false,
  freizuegigkeit_nein BOOLEAN DEFAULT false,
  staatsang_anderer BOOLEAN DEFAULT false,
  staatsang_anderer_staatname VARCHAR(255),
  staatsang_keine BOOLEAN DEFAULT false,
  staatsang_deutsch_2 BOOLEAN DEFAULT false,
  staatsang_eu_ewr_ch_2 BOOLEAN DEFAULT false,
  staatsang_eu_staatname_2 VARCHAR(255),
  freizuegigkeit_ja_2 BOOLEAN DEFAULT false,
  freizuegigkeit_nein_2 BOOLEAN DEFAULT false,
  staatsang_anderer_2 BOOLEAN DEFAULT false,
  staatsang_anderer_staatname_2 VARCHAR(255),
  staatsang_keine_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_2f_staatsangehoerigkeit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage nationality data" ON public.antrag_2f_staatsangehoerigkeit
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_2f_staatsangehoerigkeit.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_2G_Familienstand table
CREATE TABLE IF NOT EXISTS public.antrag_2g_familienstand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  verheiratet BOOLEAN DEFAULT false,
  verheiratet_mit_partner_ja BOOLEAN DEFAULT false,
  verheiratet_mit_partner_nein BOOLEAN DEFAULT false,
  verpartnert BOOLEAN DEFAULT false,
  verpartnert_mit_partner_ja BOOLEAN DEFAULT false,
  verpartnert_mit_partner_nein BOOLEAN DEFAULT false,
  geschieden BOOLEAN DEFAULT false,
  verwitwet BOOLEAN DEFAULT false,
  ledig BOOLEAN DEFAULT false,
  verheiratet_2 BOOLEAN DEFAULT false,
  verheiratet_mit_partner_ja_2 BOOLEAN DEFAULT false,
  verheiratet_mit_partner_nein_2 BOOLEAN DEFAULT false,
  verpartnert_2 BOOLEAN DEFAULT false,
  verpartnert_mit_partner_ja_2 BOOLEAN DEFAULT false,
  verpartnert_mit_partner_nein_2 BOOLEAN DEFAULT false,
  geschieden_2 BOOLEAN DEFAULT false,
  verwitwet_2 BOOLEAN DEFAULT false,
  ledig_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_2g_familienstand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage marital status data" ON public.antrag_2g_familienstand
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_2g_familienstand.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_3A_Betreuung_Kind table
CREATE TABLE IF NOT EXISTS public.antrag_3a_betreuung_kind (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  selber_haushalt_ja BOOLEAN DEFAULT false,
  selber_haushalt_nein BOOLEAN DEFAULT false,
  selber_haushalt_ja_2 BOOLEAN DEFAULT false,
  selber_haushalt_nein_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_3a_betreuung_kind ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage child care data" ON public.antrag_3a_betreuung_kind
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_3a_betreuung_kind.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_3B_ElternKind_Beziehung table
CREATE TABLE IF NOT EXISTS public.antrag_3b_elternkind_beziehung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  leiblich BOOLEAN DEFAULT false,
  adoptiv BOOLEAN DEFAULT false,
  nicht_mein_kind BOOLEAN DEFAULT false,
  ein_anderes_kind BOOLEAN DEFAULT false,
  leiblich_2 BOOLEAN DEFAULT false,
  adoptiv_2 BOOLEAN DEFAULT false,
  nicht_mein_kind_2 BOOLEAN DEFAULT false,
  ein_anderes_kind_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_3b_elternkind_beziehung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage parent-child relationship data" ON public.antrag_3b_elternkind_beziehung
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_3b_elternkind_beziehung.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_3C_Adoption table
CREATE TABLE IF NOT EXISTS public.antrag_3c_adoption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  adaptions_datum DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_3c_adoption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage adoption data" ON public.antrag_3c_adoption
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_3c_adoption.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_4_weitere_Kinder_Info table
CREATE TABLE IF NOT EXISTS public.antrag_4_weitere_kinder_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  vorname VARCHAR(255),
  nachname VARCHAR(255),
  geburtsdatum DATE,
  behind_grad BOOLEAN DEFAULT false,
  leiblich BOOLEAN DEFAULT false,
  adoptiv BOOLEAN DEFAULT false,
  nicht_mein_kind BOOLEAN DEFAULT false,
  ein_anderes_kind BOOLEAN DEFAULT false,
  adoptions_datum DATE,
  vorname_2 VARCHAR(255),
  nachname_2 VARCHAR(255),
  geburtsdatum_2 DATE,
  behind_grad_2 BOOLEAN DEFAULT false,
  leiblich_2 BOOLEAN DEFAULT false,
  adoptiv_2 BOOLEAN DEFAULT false,
  nicht_mein_kind_2 BOOLEAN DEFAULT false,
  ein_anderes_kind_2 BOOLEAN DEFAULT false,
  adoptions_datum_2 DATE,
  vorname_3 VARCHAR(255),
  nachname_3 VARCHAR(255),
  geburtsdatum_3 DATE,
  behind_grad_3 BOOLEAN DEFAULT false,
  leiblich_3 BOOLEAN DEFAULT false,
  adoptiv_3 BOOLEAN DEFAULT false,
  nicht_mein_kind_3 BOOLEAN DEFAULT false,
  ein_anderes_kind_3 BOOLEAN DEFAULT false,
  adoptions_datum_3 DATE,
  leiblich_p2 BOOLEAN DEFAULT false,
  adoptiv_p2 BOOLEAN DEFAULT false,
  nicht_mein_kind_p2 BOOLEAN DEFAULT false,
  ein_anderes_kind_p2 BOOLEAN DEFAULT false,
  leiblich_2_p2 BOOLEAN DEFAULT false,
  adoptiv_2_p2 BOOLEAN DEFAULT false,
  nicht_mein_kind_2_p2 BOOLEAN DEFAULT false,
  ein_anderes_kind_2_p2 BOOLEAN DEFAULT false,
  leiblich_3_p2 BOOLEAN DEFAULT false,
  adoptiv_3_p2 BOOLEAN DEFAULT false,
  nicht_mein_kind_3_p2 BOOLEAN DEFAULT false,
  ein_anderes_kind_3_p2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_4_weitere_kinder_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage additional children data" ON public.antrag_4_weitere_kinder_info
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_4_weitere_kinder_info.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_5_Krankenversicherung table
CREATE TABLE IF NOT EXISTS public.antrag_5_krankenversicherung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  gesetzlich_ver BOOLEAN DEFAULT false,
  freiwillig_ver BOOLEAN DEFAULT false,
  familien_ver BOOLEAN DEFAULT false,
  privat_ver BOOLEAN DEFAULT false,
  frei_heifuer BOOLEAN DEFAULT false,
  nicht_in_de_ver BOOLEAN DEFAULT false,
  versichertennummer VARCHAR(255),
  krankenkassename VARCHAR(255),
  krankenkasse_strasse VARCHAR(255),
  krankenkasse_hausnummer VARCHAR(255),
  krankenkasse_postfach VARCHAR(255),
  krankenkasse_plz VARCHAR(255),
  krankenkasse_ort VARCHAR(255),
  krankenkasse_zusatz VARCHAR(255),
  gesetzlich_ver_2 BOOLEAN DEFAULT false,
  krankenkasse_gleich_wie_partner BOOLEAN DEFAULT false,
  freiwillig_ver_2 BOOLEAN DEFAULT false,
  familien_ver_2 BOOLEAN DEFAULT false,
  privat_ver_2 BOOLEAN DEFAULT false,
  frei_heifuer_2 BOOLEAN DEFAULT false,
  nicht_in_de_ver_2 BOOLEAN DEFAULT false,
  versichertennummer_2 VARCHAR(255),
  krankenkassename_2 VARCHAR(255),
  krankenkasse_strasse_2 VARCHAR(255),
  krankenkasse_hausnummer_2 VARCHAR(255),
  krankenkasse_postfach_2 VARCHAR(255),
  krankenkasse_plz_2 VARCHAR(255),
  krankenkasse_ort_2 VARCHAR(255),
  krankenkasse_zusatz_2 VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_5_krankenversicherung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage health insurance data" ON public.antrag_5_krankenversicherung
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_5_krankenversicherung.antrag_id AND antrag.user_id = auth.uid()
));