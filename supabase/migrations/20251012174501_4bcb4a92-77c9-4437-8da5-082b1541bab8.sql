-- Create template versions table for form management
CREATE TABLE public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  valid_from DATE NOT NULL,
  valid_until DATE,
  storage_path TEXT NOT NULL,
  mapping_file_path TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(template_name, version)
);

-- Enable RLS on form_templates (read-only for authenticated users)
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view active templates
CREATE POLICY "Users can view active templates"
  ON public.form_templates FOR SELECT
  USING (is_active = true);

-- Create storage bucket for form templates (public for easier access)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('form-templates', 'form-templates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for form templates
CREATE POLICY "Public can view form templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-templates');

-- Function to get current active template
CREATE OR REPLACE FUNCTION public.get_active_template(p_template_name VARCHAR)
RETURNS TABLE (
  id UUID,
  template_name VARCHAR,
  version VARCHAR,
  display_name VARCHAR,
  storage_path TEXT,
  mapping_file_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.id,
    ft.template_name,
    ft.version,
    ft.display_name,
    ft.storage_path,
    ft.mapping_file_path
  FROM public.form_templates ft
  WHERE ft.template_name = p_template_name
    AND ft.is_active = true
    AND ft.valid_from <= CURRENT_DATE
    AND (ft.valid_until IS NULL OR ft.valid_until >= CURRENT_DATE)
  ORDER BY ft.valid_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for form_templates updated_at
CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the initial Elterngeldantrag template metadata
INSERT INTO public.form_templates (
  template_name,
  version,
  display_name,
  description,
  valid_from,
  valid_until,
  storage_path,
  mapping_file_path,
  is_active
) VALUES (
  'elterngeldantrag',
  'bis_Maerz25',
  'Elterngeldantrag (gültig bis März 2025)',
  'Offizielles Elterngeldantragsformular für Geburten ab dem 01.04.2024, gültig bis März 2025',
  '2024-04-01',
  '2025-03-31',
  'templates/elterngeldantrag_bis_Maerz25.pdf',
  'templates/Mapping032025_1.xlsx',
  true
);