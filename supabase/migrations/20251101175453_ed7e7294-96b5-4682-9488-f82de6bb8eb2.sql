-- Create table for parent documents (ID cards and passports)
CREATE TABLE public.eltern_dokumente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('personalausweis', 'reisepass')),
  person_type TEXT NOT NULL CHECK (person_type IN ('mutter', 'vater')),
  vorname TEXT,
  nachname TEXT,
  geburtsname TEXT,
  geburtsdatum DATE,
  geburtsort TEXT,
  staatsangehoerigkeit TEXT,
  ausweisnummer TEXT,
  ausstelldatum DATE,
  gueltig_bis DATE,
  ausstellende_behoerde TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.eltern_dokumente ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own eltern_dokumente" 
ON public.eltern_dokumente 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own eltern_dokumente" 
ON public.eltern_dokumente 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own eltern_dokumente" 
ON public.eltern_dokumente 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own eltern_dokumente" 
ON public.eltern_dokumente 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_eltern_dokumente_updated_at
BEFORE UPDATE ON public.eltern_dokumente
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();