-- Create leistungsbescheide table
CREATE TABLE public.leistungsbescheide (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  person_type TEXT NOT NULL,
  leistungsart TEXT,
  bewilligungsstelle TEXT,
  leistungsbeginn DATE,
  leistungsende DATE,
  monatsbetrag NUMERIC,
  bescheiddatum DATE,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leistungsbescheide ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own leistungsbescheide"
  ON public.leistungsbescheide FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leistungsbescheide"
  ON public.leistungsbescheide FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leistungsbescheide"
  ON public.leistungsbescheide FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leistungsbescheide"
  ON public.leistungsbescheide FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_leistungsbescheide_updated_at
  BEFORE UPDATE ON public.leistungsbescheide
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create bankverbindungen table
CREATE TABLE public.bankverbindungen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  kontoinhaber TEXT,
  iban TEXT,
  bic TEXT,
  bank_name TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bankverbindungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bankverbindungen"
  ON public.bankverbindungen FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bankverbindungen"
  ON public.bankverbindungen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bankverbindungen"
  ON public.bankverbindungen FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bankverbindungen"
  ON public.bankverbindungen FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_bankverbindungen_updated_at
  BEFORE UPDATE ON public.bankverbindungen
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create meldebescheinigungen table
CREATE TABLE public.meldebescheinigungen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  person_type TEXT NOT NULL,
  vorname TEXT,
  nachname TEXT,
  geburtsdatum DATE,
  strasse TEXT,
  hausnummer TEXT,
  plz TEXT,
  wohnort TEXT,
  meldedatum DATE,
  ausstelldatum DATE,
  behoerde TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meldebescheinigungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meldebescheinigungen"
  ON public.meldebescheinigungen FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meldebescheinigungen"
  ON public.meldebescheinigungen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meldebescheinigungen"
  ON public.meldebescheinigungen FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meldebescheinigungen"
  ON public.meldebescheinigungen FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_meldebescheinigungen_updated_at
  BEFORE UPDATE ON public.meldebescheinigungen
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();