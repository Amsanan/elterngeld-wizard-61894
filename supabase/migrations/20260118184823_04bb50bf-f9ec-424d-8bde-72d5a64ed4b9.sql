-- Phase 1: Create Nachweise Catalog and User Nachweise Tables

-- 1.1 Create Nachweise Master Catalog Table
CREATE TABLE public.nachweise_katalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nachweis_id TEXT UNIQUE NOT NULL,
  seite INTEGER,
  kategorie TEXT,
  bezeichnung_de TEXT NOT NULL,
  ausloeser_bedingung TEXT,
  referenz_felder TEXT[],
  erkennungslogik TEXT,
  validierung_typ TEXT,
  ziel_tabelle TEXT,
  ziel_feld TEXT,
  hinweis TEXT,
  person_type TEXT,
  prioritaet INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.2 Create User Nachweise Status Table
CREATE TABLE public.user_nachweise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID REFERENCES public.antraege(id),
  nachweis_katalog_id UUID REFERENCES public.nachweise_katalog(id),
  status TEXT DEFAULT 'pending',
  file_path TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.nachweise_katalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_nachweise ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nachweise_katalog (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view nachweise_katalog"
ON public.nachweise_katalog
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for user_nachweise
CREATE POLICY "Users can view their own nachweise"
ON public.user_nachweise
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nachweise"
ON public.user_nachweise
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nachweise"
ON public.user_nachweise
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nachweise"
ON public.user_nachweise
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_nachweise_katalog_kategorie ON public.nachweise_katalog(kategorie);
CREATE INDEX idx_nachweise_katalog_seite ON public.nachweise_katalog(seite);
CREATE INDEX idx_user_nachweise_user_id ON public.user_nachweise(user_id);
CREATE INDEX idx_user_nachweise_status ON public.user_nachweise(status);
CREATE INDEX idx_user_nachweise_antrag_id ON public.user_nachweise(antrag_id);

-- Trigger for updated_at
CREATE TRIGGER update_nachweise_katalog_updated_at
BEFORE UPDATE ON public.nachweise_katalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_nachweise_updated_at
BEFORE UPDATE ON public.user_nachweise
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();