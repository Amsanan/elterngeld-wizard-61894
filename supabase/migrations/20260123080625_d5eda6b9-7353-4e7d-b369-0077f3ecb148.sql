-- Create table for disability certificates (Schwerbehindertenausweise)
CREATE TABLE public.schwerbehindertenausweise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE SET NULL,
  person_type TEXT CHECK (person_type IN ('mutter', 'vater', 'kind')),
  kind_ordnungszahl INTEGER,
  
  -- Core disability certificate fields
  name_inhaber TEXT,
  vorname_inhaber TEXT,
  geburtsdatum DATE,
  geschlecht TEXT,
  
  -- Disability details
  grad_der_behinderung INTEGER, -- GdB value (20-100)
  gdb_ab_datum DATE, -- GdB valid from
  gueltig_bis DATE, -- Expiration date (unbefristet = null)
  unbefristet BOOLEAN DEFAULT false,
  
  -- Merkzeichen (disability markers)
  merkzeichen_g BOOLEAN DEFAULT false, -- Gehbehindert
  merkzeichen_ag BOOLEAN DEFAULT false, -- Außergewöhnlich gehbehindert
  merkzeichen_b BOOLEAN DEFAULT false, -- Begleitperson
  merkzeichen_bl BOOLEAN DEFAULT false, -- Blind
  merkzeichen_gl BOOLEAN DEFAULT false, -- Gehörlos
  merkzeichen_h BOOLEAN DEFAULT false, -- Hilflos
  merkzeichen_rf BOOLEAN DEFAULT false, -- Rundfunkgebührenbefreiung
  merkzeichen_tbl BOOLEAN DEFAULT false, -- Taubblind
  merkzeichen_1kl BOOLEAN DEFAULT false, -- 1. Klasse Bahn
  
  -- Issuing authority
  ausstellende_behoerde TEXT,
  aktenzeichen TEXT,
  ausstellungsdatum DATE,
  
  -- Document metadata
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schwerbehindertenausweise ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own disability certificates"
ON public.schwerbehindertenausweise FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own disability certificates"
ON public.schwerbehindertenausweise FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own disability certificates"
ON public.schwerbehindertenausweise FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own disability certificates"
ON public.schwerbehindertenausweise FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_schwerbehindertenausweise_updated_at
BEFORE UPDATE ON public.schwerbehindertenausweise
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_schwerbehindertenausweise_user_id ON public.schwerbehindertenausweise(user_id);
CREATE INDEX idx_schwerbehindertenausweise_antrag_id ON public.schwerbehindertenausweise(antrag_id);