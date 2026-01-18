-- ============================================
-- Create sonstige_nachweise table for generic document types
-- ============================================

-- Create the sonstige_nachweise table
CREATE TABLE IF NOT EXISTS public.sonstige_nachweise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID REFERENCES public.antraege(id) ON DELETE CASCADE,
  person_type public.person_type_enum,
  
  -- Document classification
  dokument_typ TEXT NOT NULL CHECK (dokument_typ IN (
    'aerztliches_attest',
    'hebammenzeugnis',
    'schwerbehindertenausweis',
    'sterbeurkunde',
    'haftbescheinigung',
    'elstam_auszug',
    'kindergeldbescheid',
    'rentenbescheid',
    'elterngeldbescheid_aelteres_kind',
    'beschaeftigungsverbot',
    'entsendungsbescheinigung',
    'vaterschaftsanerkennung',
    'einnahmen_ueberschuss_rechnung',
    'krankentagegeld_bescheinigung',
    'arbeitsvertrag',
    'ausbildungsvertrag',
    'bezuegemitteilung_beamte',
    'tagespflege_eignung',
    'leistungsnachweis_ausland',
    'vertretungsnachweis',
    'feststellungsbeschluss_familiengericht',
    'sonstige'
  )),
  
  -- Common fields
  ausstelldatum DATE,
  gueltig_von DATE,
  gueltig_bis DATE,
  aussteller TEXT,
  betrag NUMERIC,
  beschreibung TEXT,
  
  -- Flexible LLM extraction
  extracted_data JSONB DEFAULT '{}',
  
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.sonstige_nachweise ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sonstige_nachweise"
  ON public.sonstige_nachweise FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sonstige_nachweise"
  ON public.sonstige_nachweise FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sonstige_nachweise"
  ON public.sonstige_nachweise FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sonstige_nachweise"
  ON public.sonstige_nachweise FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_sonstige_nachweise_updated_at
  BEFORE UPDATE ON public.sonstige_nachweise
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_sonstige_nachweise_user_id ON public.sonstige_nachweise(user_id);
CREATE INDEX idx_sonstige_nachweise_dokument_typ ON public.sonstige_nachweise(dokument_typ);
CREATE INDEX idx_sonstige_nachweise_antrag_id ON public.sonstige_nachweise(antrag_id);