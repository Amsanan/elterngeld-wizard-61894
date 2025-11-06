-- Drop the old constraint
ALTER TABLE public.eltern_dokumente 
DROP CONSTRAINT IF EXISTS eltern_dokumente_document_type_check;

-- Add the updated constraint with all three document types
ALTER TABLE public.eltern_dokumente 
ADD CONSTRAINT eltern_dokumente_document_type_check 
CHECK (document_type = ANY (ARRAY['personalausweis'::text, 'reisepass'::text, 'aufenthaltstitel'::text]));