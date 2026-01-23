-- Computed Field Rules table for Visual Logic Builder
CREATE TABLE public.computed_field_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  page_number INTEGER,
  
  -- Der komplette Flow als JSON
  flow_definition JSONB NOT NULL DEFAULT '{"nodes": [], "edges": [], "variables": []}',
  
  is_active BOOLEAN DEFAULT true,
  execution_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.computed_field_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only
CREATE POLICY "Admins can view computed_field_rules"
ON public.computed_field_rules
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert computed_field_rules"
ON public.computed_field_rules
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update computed_field_rules"
ON public.computed_field_rules
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete computed_field_rules"
ON public.computed_field_rules
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_computed_field_rules_updated_at
BEFORE UPDATE ON public.computed_field_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_computed_field_rules_active ON public.computed_field_rules(is_active);
CREATE INDEX idx_computed_field_rules_page ON public.computed_field_rules(page_number);