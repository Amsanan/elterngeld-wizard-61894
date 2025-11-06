-- Add columns for second partner in joint tax returns
ALTER TABLE public.einkommensteuerbescheide
ADD COLUMN partner1_vorname TEXT,
ADD COLUMN partner1_nachname TEXT,
ADD COLUMN partner1_steuer_id TEXT,
ADD COLUMN partner2_vorname TEXT,
ADD COLUMN partner2_nachname TEXT,
ADD COLUMN partner2_steuer_id TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN public.einkommensteuerbescheide.partner1_vorname IS 'First partner first name (Ehemann) for joint tax returns';
COMMENT ON COLUMN public.einkommensteuerbescheide.partner1_nachname IS 'First partner last name (Ehemann) for joint tax returns';
COMMENT ON COLUMN public.einkommensteuerbescheide.partner1_steuer_id IS 'First partner tax ID (Ehemann) for joint tax returns';
COMMENT ON COLUMN public.einkommensteuerbescheide.partner2_vorname IS 'Second partner first name (Ehefrau) for joint tax returns';
COMMENT ON COLUMN public.einkommensteuerbescheide.partner2_nachname IS 'Second partner last name (Ehefrau) for joint tax returns';
COMMENT ON COLUMN public.einkommensteuerbescheide.partner2_steuer_id IS 'Second partner tax ID (Ehefrau) for joint tax returns';