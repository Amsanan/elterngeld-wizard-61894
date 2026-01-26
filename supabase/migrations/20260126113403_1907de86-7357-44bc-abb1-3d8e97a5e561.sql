-- Create pdf_field_registry table for pre-classified PDF fields
CREATE TABLE public.pdf_field_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  pdf_field_name TEXT NOT NULL UNIQUE,
  field_type TEXT NOT NULL DEFAULT 'PDFTextField',
  
  -- Person/Child Classification (THE CORE!)
  target_person TEXT NOT NULL CHECK (target_person IN (
    'elternteil_1',
    'elternteil_2',
    'antragskind',
    'geschwister_1',
    'geschwister_2',
    'geschwister_3',
    'mehrling_1',
    'mehrling_2',
    'mehrling_3',
    'beide_eltern',
    'universal'
  )),
  
  -- Position in PDF
  page_number INTEGER NOT NULL DEFAULT 0,
  coord_x NUMERIC,
  coord_y NUMERIC,
  reading_order INTEGER,
  
  -- Semantic Information
  section_de TEXT,
  label_de TEXT,
  semantic_meaning TEXT,
  
  -- Suffix Pattern (for validation)
  suffix_pattern TEXT,
  base_field_name TEXT,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_field_registry ENABLE ROW LEVEL SECURITY;

-- Create policy for read access (all authenticated users can read)
CREATE POLICY "Authenticated users can read pdf_field_registry"
ON public.pdf_field_registry
FOR SELECT
TO authenticated
USING (true);

-- Create policy for admin write access (only admins can modify)
CREATE POLICY "Admins can modify pdf_field_registry"
ON public.pdf_field_registry
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes for fast lookups
CREATE INDEX idx_pdf_field_target_person ON public.pdf_field_registry(target_person);
CREATE INDEX idx_pdf_field_semantic ON public.pdf_field_registry(semantic_meaning);
CREATE INDEX idx_pdf_field_page ON public.pdf_field_registry(page_number);

-- Trigger for updated_at
CREATE TRIGGER update_pdf_field_registry_updated_at
BEFORE UPDATE ON public.pdf_field_registry
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();