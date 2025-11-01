-- Add address fields to eltern_dokumente table
ALTER TABLE public.eltern_dokumente
ADD COLUMN IF NOT EXISTS plz text,
ADD COLUMN IF NOT EXISTS wohnort text,
ADD COLUMN IF NOT EXISTS strasse text,
ADD COLUMN IF NOT EXISTS hausnummer text,
ADD COLUMN IF NOT EXISTS wohnungsnummer text;