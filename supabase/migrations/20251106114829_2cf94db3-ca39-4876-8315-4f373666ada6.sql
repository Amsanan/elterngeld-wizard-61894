-- Add the missing ausstellort column to eltern_dokumente table
ALTER TABLE public.eltern_dokumente 
ADD COLUMN IF NOT EXISTS ausstellort text;