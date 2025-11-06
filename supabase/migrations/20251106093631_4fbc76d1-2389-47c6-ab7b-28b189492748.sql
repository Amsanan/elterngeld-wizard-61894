-- Add residence permit fields to eltern_dokumente table
ALTER TABLE public.eltern_dokumente
ADD COLUMN aufenthaltstitel_art TEXT,
ADD COLUMN aufenthaltstitel_nummer TEXT,
ADD COLUMN aufenthaltstitel_gueltig_von DATE,
ADD COLUMN aufenthaltstitel_gueltig_bis DATE,
ADD COLUMN aufenthaltstitel_zweck TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.eltern_dokumente.aufenthaltstitel_art IS 'Type of residence permit (e.g., Aufenthaltserlaubnis, Niederlassungserlaubnis, Blaue Karte EU)';
COMMENT ON COLUMN public.eltern_dokumente.aufenthaltstitel_nummer IS 'Residence permit number';
COMMENT ON COLUMN public.eltern_dokumente.aufenthaltstitel_gueltig_von IS 'Residence permit valid from date';
COMMENT ON COLUMN public.eltern_dokumente.aufenthaltstitel_gueltig_bis IS 'Residence permit valid until date';
COMMENT ON COLUMN public.eltern_dokumente.aufenthaltstitel_zweck IS 'Purpose of residence (e.g., Erwerbstätigkeit, Studium, Familiennachzug)';