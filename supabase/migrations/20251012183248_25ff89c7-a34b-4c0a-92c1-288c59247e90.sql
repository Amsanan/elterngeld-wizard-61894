-- Insert the template for elterngeldantrag if it doesn't exist
INSERT INTO public.form_templates (
  template_name,
  version,
  display_name,
  description,
  storage_path,
  mapping_file_path,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'elterngeldantrag',
  '2025-03',
  'Antrag auf Elterngeld März 2025',
  'Offizielles Formular für Elterngeldanträge, gültig ab März 2025',
  'templates/elterngeldantrag_bis_Maerz25.pdf',
  'templates/Mapping032025_1.xlsx',
  '2025-03-01',
  NULL,
  true
) ON CONFLICT (template_name, version) DO UPDATE SET
  is_active = true,
  valid_from = '2025-03-01',
  valid_until = NULL;