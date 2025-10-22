-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create storage bucket for XML schemas
INSERT INTO storage.buckets (id, name, public)
VALUES ('xml-schemas', 'xml-schemas', true);

-- Create RLS policies for xml-schemas bucket
CREATE POLICY "XML schemas are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'xml-schemas');

CREATE POLICY "Authenticated users can upload XML schemas"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'xml-schemas' AND auth.uid() IS NOT NULL);

-- Create table for parsed birth certificate data
CREATE TABLE public.geburtsurkunden (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Kind data
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  kind_geburtsort TEXT,
  kind_geburtsnummer TEXT,
  
  -- Mutter data
  mutter_vorname TEXT,
  mutter_nachname TEXT,
  mutter_geburtsname TEXT,
  
  -- Vater data
  vater_vorname TEXT,
  vater_nachname TEXT,
  
  -- Behörde data
  behoerde_name TEXT,
  urkundennummer TEXT,
  ausstelldatum DATE,
  
  verwendungszweck TEXT,
  
  -- File reference
  file_path TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geburtsurkunden ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own geburtsurkunden"
ON public.geburtsurkunden
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own geburtsurkunden"
ON public.geburtsurkunden
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own geburtsurkunden"
ON public.geburtsurkunden
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own geburtsurkunden"
ON public.geburtsurkunden
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_geburtsurkunden_updated_at
BEFORE UPDATE ON public.geburtsurkunden
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();