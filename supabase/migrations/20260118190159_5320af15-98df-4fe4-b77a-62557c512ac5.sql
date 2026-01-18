-- Add unique constraint for upsert operations on pdf_field_mappings
ALTER TABLE pdf_field_mappings 
ADD CONSTRAINT pdf_field_mappings_unique_mapping 
UNIQUE (document_type, pdf_field_name);