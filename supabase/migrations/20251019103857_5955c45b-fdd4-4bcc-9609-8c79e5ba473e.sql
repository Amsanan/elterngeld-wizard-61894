-- Phase 1: Create normalized elternteil table
CREATE TABLE public.elternteil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  parent_number INTEGER NOT NULL CHECK (parent_number IN (1, 2)),
  vorname VARCHAR(100),
  nachname VARCHAR(100),
  geburtsdatum DATE,
  geschlecht geschlecht_type,
  steuer_identifikationsnummer CHAR(11),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id, parent_number)
);

-- Enable RLS
ALTER TABLE public.elternteil ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own parent data"
  ON public.elternteil
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = elternteil.antrag_id
    AND antrag.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own parent data"
  ON public.elternteil
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = elternteil.antrag_id
    AND antrag.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own parent data"
  ON public.elternteil
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = elternteil.antrag_id
    AND antrag.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own parent data"
  ON public.elternteil
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = elternteil.antrag_id
    AND antrag.user_id = auth.uid()
  ));

-- Migrate existing data from antrag_2b_elternteil
INSERT INTO public.elternteil (antrag_id, parent_number, vorname, nachname, geburtsdatum, geschlecht, steuer_identifikationsnummer)
SELECT 
  antrag_id,
  1 as parent_number,
  vorname,
  nachname,
  geburtsdatum,
  geschlecht,
  steuer_identifikationsnummer
FROM public.antrag_2b_elternteil
WHERE vorname IS NOT NULL OR nachname IS NOT NULL OR geburtsdatum IS NOT NULL;

INSERT INTO public.elternteil (antrag_id, parent_number, vorname, nachname, geburtsdatum, geschlecht, steuer_identifikationsnummer)
SELECT 
  antrag_id,
  2 as parent_number,
  vorname_2,
  nachname_2,
  geburtsdatum_2,
  geschlecht_2,
  steuer_identifikationsnummer_2
FROM public.antrag_2b_elternteil
WHERE vorname_2 IS NOT NULL OR nachname_2 IS NOT NULL OR geburtsdatum_2 IS NOT NULL;

-- Add elternteil_id to related tables
ALTER TABLE public.antrag_2c_wohnsitz ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_2c_wohnsitz_aufenthalt ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_2f_staatsangehoerigkeit ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_2g_familienstand ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_5_krankenversicherung ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_7a_bisherige_erwerbstaetigkeit ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_8a_einkomen_vor_geburt_bestimmt ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_8b_steuern_und_abgaben ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_9_einkommen_ersatz_leistungen ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;

-- Create trigger for updated_at
CREATE TRIGGER update_elternteil_updated_at
  BEFORE UPDATE ON public.elternteil
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_elternteil_antrag_id ON public.elternteil(antrag_id);
CREATE INDEX idx_elternteil_parent_number ON public.elternteil(parent_number);