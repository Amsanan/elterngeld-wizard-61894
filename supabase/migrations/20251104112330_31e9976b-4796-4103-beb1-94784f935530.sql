-- Create ehe_sorgerecht_nachweise table
CREATE TABLE public.ehe_sorgerecht_nachweise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  dokument_typ TEXT NOT NULL,
  partner1_vorname TEXT,
  partner1_nachname TEXT,
  partner2_vorname TEXT,
  partner2_nachname TEXT,
  heiratsdatum DATE,
  ausstelldatum DATE,
  standesamt TEXT,
  kind_vorname TEXT,
  kind_nachname TEXT,
  sorgerecht_art TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ehe_sorgerecht_nachweise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ehe_sorgerecht_nachweise"
  ON public.ehe_sorgerecht_nachweise FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ehe_sorgerecht_nachweise"
  ON public.ehe_sorgerecht_nachweise FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ehe_sorgerecht_nachweise"
  ON public.ehe_sorgerecht_nachweise FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ehe_sorgerecht_nachweise"
  ON public.ehe_sorgerecht_nachweise FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_ehe_sorgerecht_nachweise_updated_at
  BEFORE UPDATE ON public.ehe_sorgerecht_nachweise
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create krankenversicherung_nachweise table
CREATE TABLE public.krankenversicherung_nachweise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  person_type TEXT NOT NULL,
  krankenkasse_name TEXT,
  versichertennummer TEXT,
  versicherungsart TEXT,
  versicherungsbeginn DATE,
  beitragssatz NUMERIC,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.krankenversicherung_nachweise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own krankenversicherung_nachweise"
  ON public.krankenversicherung_nachweise FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own krankenversicherung_nachweise"
  ON public.krankenversicherung_nachweise FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own krankenversicherung_nachweise"
  ON public.krankenversicherung_nachweise FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own krankenversicherung_nachweise"
  ON public.krankenversicherung_nachweise FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_krankenversicherung_nachweise_updated_at
  BEFORE UPDATE ON public.krankenversicherung_nachweise
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create adoptions_pflege_dokumente table
CREATE TABLE public.adoptions_pflege_dokumente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  dokument_typ TEXT NOT NULL,
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  aufnahmedatum DATE,
  pflegestelle_name TEXT,
  jugendamt TEXT,
  beschlussdatum DATE,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.adoptions_pflege_dokumente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own adoptions_pflege_dokumente"
  ON public.adoptions_pflege_dokumente FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own adoptions_pflege_dokumente"
  ON public.adoptions_pflege_dokumente FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own adoptions_pflege_dokumente"
  ON public.adoptions_pflege_dokumente FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own adoptions_pflege_dokumente"
  ON public.adoptions_pflege_dokumente FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_adoptions_pflege_dokumente_updated_at
  BEFORE UPDATE ON public.adoptions_pflege_dokumente
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create document_audit_log table
CREATE TABLE public.document_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON public.document_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
  ON public.document_audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);