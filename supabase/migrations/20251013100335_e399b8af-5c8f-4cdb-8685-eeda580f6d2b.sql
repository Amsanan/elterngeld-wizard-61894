-- Create final batch of tables from Mapping032025_1.xlsx

-- Antrag_16A_Bankverbindung table
CREATE TABLE IF NOT EXISTS public.antrag_16a_bankverbindung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  kontoinhaber VARCHAR(255),
  iban VARCHAR(34),
  bic VARCHAR(11),
  kreditinstitut VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_16a_bankverbindung ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage bank account data" ON public.antrag_16a_bankverbindung;
CREATE POLICY "Users can manage bank account data" ON public.antrag_16a_bankverbindung
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_16a_bankverbindung.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_16B_Kontakt table
CREATE TABLE IF NOT EXISTS public.antrag_16b_kontakt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  telefon VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_16b_kontakt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage contact data" ON public.antrag_16b_kontakt;
CREATE POLICY "Users can manage contact data" ON public.antrag_16b_kontakt
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_16b_kontakt.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_16C_Mitteilung table
CREATE TABLE IF NOT EXISTS public.antrag_16c_mitteilung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  mitteilung_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_16c_mitteilung ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage notification data" ON public.antrag_16c_mitteilung;
CREATE POLICY "Users can manage notification data" ON public.antrag_16c_mitteilung
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_16c_mitteilung.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_16D_Unterschrift table
CREATE TABLE IF NOT EXISTS public.antrag_16d_unterschrift (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  ort_datum VARCHAR(255),
  unterschrift_vorhanden BOOLEAN DEFAULT false,
  unterschrift_2_vorhanden BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_16d_unterschrift ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage signature data" ON public.antrag_16d_unterschrift;
CREATE POLICY "Users can manage signature data" ON public.antrag_16d_unterschrift
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_16d_unterschrift.antrag_id AND antrag.user_id = auth.uid()
));