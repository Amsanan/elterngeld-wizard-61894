-- Add filter_condition column to pdf_field_mappings table
ALTER TABLE public.pdf_field_mappings 
ADD COLUMN filter_condition jsonb DEFAULT NULL;

COMMENT ON COLUMN public.pdf_field_mappings.filter_condition IS 'JSON object specifying filter conditions for fetching data, e.g., {"person_type": "mutter"} to filter eltern_dokumente records';