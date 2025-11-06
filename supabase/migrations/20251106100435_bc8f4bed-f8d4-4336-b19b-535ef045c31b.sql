-- Add confidence_scores column to all document tables that need it
ALTER TABLE public.geburtsurkunden 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.gehaltsnachweise 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.arbeitgeberbescheinigungen 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.bankverbindungen 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.meldebescheinigungen 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.krankenversicherung_nachweise 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.mutterschaftsgeld 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.leistungsbescheide 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.selbststaendigen_nachweise 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.ehe_sorgerecht_nachweise 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.adoptions_pflege_dokumente 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.eltern_dokumente 
ADD COLUMN IF NOT EXISTS confidence_scores jsonb DEFAULT '{}'::jsonb;