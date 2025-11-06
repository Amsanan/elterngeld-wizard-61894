-- Create pdf_field_mappings table for dynamic field mapping
CREATE TABLE public.pdf_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_field TEXT NOT NULL,
  pdf_field_name TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0,
  mapping_status TEXT DEFAULT 'auto',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(document_type, source_field, pdf_field_name)
);

-- Enable RLS
ALTER TABLE public.pdf_field_mappings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view mappings
CREATE POLICY "Users can view field mappings"
  ON public.pdf_field_mappings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only authenticated users can insert mappings
CREATE POLICY "Users can insert field mappings"
  ON public.pdf_field_mappings
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Only authenticated users can update mappings
CREATE POLICY "Users can update field mappings"
  ON public.pdf_field_mappings
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Only authenticated users can delete mappings
CREATE POLICY "Users can delete field mappings"
  ON public.pdf_field_mappings
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_pdf_field_mappings_updated_at
  BEFORE UPDATE ON public.pdf_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();