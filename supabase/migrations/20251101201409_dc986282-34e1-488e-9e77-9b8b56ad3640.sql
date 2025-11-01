-- Create table for income tax assessments (Einkommensteuerbescheid)
CREATE TABLE public.einkommensteuerbescheide (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  person_type TEXT NOT NULL CHECK (person_type IN ('mutter', 'vater')),
  file_path TEXT,
  steuerjahr TEXT,
  steuernummer TEXT,
  vorname TEXT,
  nachname TEXT,
  adresse TEXT,
  plz TEXT,
  wohnort TEXT,
  jahreseinkommen TEXT,
  zu_versteuerndes_einkommen TEXT,
  festgesetzte_steuer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.einkommensteuerbescheide ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own einkommensteuerbescheide"
ON public.einkommensteuerbescheide
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own einkommensteuerbescheide"
ON public.einkommensteuerbescheide
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own einkommensteuerbescheide"
ON public.einkommensteuerbescheide
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own einkommensteuerbescheide"
ON public.einkommensteuerbescheide
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_einkommensteuerbescheide_updated_at
BEFORE UPDATE ON public.einkommensteuerbescheide
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();