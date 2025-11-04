-- Create arbeitgeberbescheinigungen table
CREATE TABLE public.arbeitgeberbescheinigungen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  person_type TEXT NOT NULL,
  arbeitgeber_name TEXT,
  arbeitgeber_adresse TEXT,
  beschaeftigungsbeginn DATE,
  beschaeftigungsende DATE,
  wochenstunden NUMERIC,
  bruttogehalt NUMERIC,
  ausstelldatum DATE,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.arbeitgeberbescheinigungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own arbeitgeberbescheinigungen"
  ON public.arbeitgeberbescheinigungen FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own arbeitgeberbescheinigungen"
  ON public.arbeitgeberbescheinigungen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own arbeitgeberbescheinigungen"
  ON public.arbeitgeberbescheinigungen FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own arbeitgeberbescheinigungen"
  ON public.arbeitgeberbescheinigungen FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_arbeitgeberbescheinigungen_updated_at
  BEFORE UPDATE ON public.arbeitgeberbescheinigungen
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create gehaltsnachweise table
CREATE TABLE public.gehaltsnachweise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  person_type TEXT NOT NULL,
  abrechnungsmonat TEXT,
  bruttogehalt NUMERIC,
  nettogehalt NUMERIC,
  arbeitgeber_name TEXT,
  steuer_id TEXT,
  sozialversicherungsnummer TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gehaltsnachweise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gehaltsnachweise"
  ON public.gehaltsnachweise FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gehaltsnachweise"
  ON public.gehaltsnachweise FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gehaltsnachweise"
  ON public.gehaltsnachweise FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gehaltsnachweise"
  ON public.gehaltsnachweise FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_gehaltsnachweise_updated_at
  BEFORE UPDATE ON public.gehaltsnachweise
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create mutterschaftsgeld table
CREATE TABLE public.mutterschaftsgeld (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  krankenkasse_name TEXT,
  versichertennummer TEXT,
  leistungsbeginn DATE,
  leistungsende DATE,
  tagessatz NUMERIC,
  gesamtbetrag NUMERIC,
  bescheiddatum DATE,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mutterschaftsgeld ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mutterschaftsgeld"
  ON public.mutterschaftsgeld FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mutterschaftsgeld"
  ON public.mutterschaftsgeld FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mutterschaftsgeld"
  ON public.mutterschaftsgeld FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mutterschaftsgeld"
  ON public.mutterschaftsgeld FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_mutterschaftsgeld_updated_at
  BEFORE UPDATE ON public.mutterschaftsgeld
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create selbststaendigen_nachweise table
CREATE TABLE public.selbststaendigen_nachweise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  person_type TEXT NOT NULL,
  gewerbeart TEXT,
  gewerbeanmeldung_datum DATE,
  steuernummer TEXT,
  jahreseinkommen NUMERIC,
  nachweiszeitraum_von DATE,
  nachweiszeitraum_bis DATE,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.selbststaendigen_nachweise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own selbststaendigen_nachweise"
  ON public.selbststaendigen_nachweise FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own selbststaendigen_nachweise"
  ON public.selbststaendigen_nachweise FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own selbststaendigen_nachweise"
  ON public.selbststaendigen_nachweise FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own selbststaendigen_nachweise"
  ON public.selbststaendigen_nachweise FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_selbststaendigen_nachweise_updated_at
  BEFORE UPDATE ON public.selbststaendigen_nachweise
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();