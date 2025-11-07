-- Add auszahlungsbetrag column to gehaltsnachweise table
ALTER TABLE public.gehaltsnachweise 
ADD COLUMN auszahlungsbetrag numeric;