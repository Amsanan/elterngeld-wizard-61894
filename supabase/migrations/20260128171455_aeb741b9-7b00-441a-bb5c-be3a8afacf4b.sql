-- Create field_fill_modes table for storing fill mode configuration per PDF field
CREATE TABLE public.field_fill_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_field_name TEXT NOT NULL UNIQUE,
  fill_mode TEXT NOT NULL CHECK (fill_mode IN ('AUTO_FILL', 'SUGGEST', 'CONFIRM_ONLY')),
  fill_reason TEXT,
  doc_types TEXT[] DEFAULT '{}',
  entities TEXT[] DEFAULT '{}',
  max_confidence NUMERIC DEFAULT 0.8,
  has_analysis_link BOOLEAN DEFAULT false,
  analysis_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_field_fill_modes_field_name ON public.field_fill_modes(pdf_field_name);
CREATE INDEX idx_field_fill_modes_fill_mode ON public.field_fill_modes(fill_mode);

-- Enable RLS with public read access (config data is not user-specific)
ALTER TABLE public.field_fill_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for field_fill_modes" 
ON public.field_fill_modes 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage field_fill_modes" 
ON public.field_fill_modes 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create document_field_provenance table for tracking data sources
CREATE TABLE public.document_field_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pdf_field_name TEXT NOT NULL,
  source_document_type TEXT,
  source_document_id UUID,
  extracted_key TEXT,
  extracted_value TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pdf_field_name)
);

-- Create indexes for provenance lookups
CREATE INDEX idx_document_field_provenance_user ON public.document_field_provenance(user_id);
CREATE INDEX idx_document_field_provenance_field ON public.document_field_provenance(pdf_field_name);

-- Enable RLS for provenance data
ALTER TABLE public.document_field_provenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own provenance" 
ON public.document_field_provenance 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own provenance" 
ON public.document_field_provenance 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own provenance" 
ON public.document_field_provenance 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own provenance" 
ON public.document_field_provenance 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add field_states column to elterngeldantrag_progress for wizard state tracking
ALTER TABLE public.elterngeldantrag_progress 
ADD COLUMN IF NOT EXISTS field_states JSONB DEFAULT '{}';

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_field_fill_modes_updated_at
  BEFORE UPDATE ON public.field_fill_modes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_field_provenance_updated_at
  BEFORE UPDATE ON public.document_field_provenance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();