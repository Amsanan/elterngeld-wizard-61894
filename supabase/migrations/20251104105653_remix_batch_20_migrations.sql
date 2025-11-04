
-- Migration: 20251012053951
-- Enable Row Level Security
ALTER DATABASE postgres SET timezone TO 'Europe/Berlin';

-- Create enum types
CREATE TYPE geschlecht_type AS ENUM ('weiblich', 'maennlich', 'divers', 'ohne_angabe');
CREATE TYPE file_status AS ENUM ('uploaded', 'processing', 'extracted', 'completed', 'error');

-- Main application table (Antrag)
CREATE TABLE public.antrag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ort VARCHAR(100),
  datum DATE,
  adresse_elterngeldstelle VARCHAR(255),
  ort_datum VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days')
);

-- Child information table (Kind)
CREATE TABLE public.kind (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  vorname VARCHAR(100),
  nachname VARCHAR(100),
  anzahl_mehrlinge INT,
  geburtsdatum DATE,
  fruehgeboren BOOLEAN DEFAULT FALSE,
  errechneter_geburtsdatum DATE,
  behinderung BOOLEAN DEFAULT FALSE,
  keine_weitere_kinder BOOLEAN DEFAULT FALSE,
  insgesamt BOOLEAN DEFAULT FALSE,
  anzahl_weitere_kinder INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Single parent information (Antrag_2A_Alleinerziehende)
CREATE TABLE public.antrag_2a_alleinerziehende (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  ist_alleinerziehend BOOLEAN DEFAULT FALSE,
  anderer_unmoeglich_betreuung BOOLEAN DEFAULT FALSE,
  betreuung_gefaehrdet_wohl BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Parent information (Antrag_2B_Elternteil)
CREATE TABLE public.antrag_2b_elternteil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  vorname VARCHAR(100),
  nachname VARCHAR(100),
  geburtsdatum DATE,
  geschlecht geschlecht_type,
  steuer_identifikationsnummer CHAR(11),
  vorname_2 VARCHAR(100),
  nachname_2 VARCHAR(100),
  geburtsdatum_2 DATE,
  geschlecht_2 geschlecht_type,
  steuer_identifikationsnummer_2 CHAR(11),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Residence information (Antrag_2C_WohnsitzAufenthalt)
CREATE TABLE public.antrag_2c_wohnsitz_aufenthalt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  wohnsitz_in_deutschland BOOLEAN DEFAULT TRUE,
  seit_meiner_geburt BOOLEAN DEFAULT FALSE,
  seit_in_deutschland BOOLEAN DEFAULT FALSE,
  seit_datum_deutschland DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Address information (Antrag_2C_Wohnsitz)
CREATE TABLE public.antrag_2c_wohnsitz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  strasse VARCHAR(150),
  hausnr VARCHAR(20),
  plz VARCHAR(10),
  ort VARCHAR(100),
  adresszusatz VARCHAR(100),
  wohnsitz_ausland BOOLEAN DEFAULT FALSE,
  ausland_staat VARCHAR(100),
  ausland_strasse VARCHAR(150),
  ausland_aufenthaltsgrund VARCHAR(255),
  aufenthalt_befristet BOOLEAN DEFAULT FALSE,
  aufenthalt_befristet_von DATE,
  aufenthalt_befristet_bis DATE,
  aufenthalt_unbefristet BOOLEAN DEFAULT FALSE,
  aufenthalt_unbefristet_seit DATE,
  arbeitsvertrag_deutsches_recht_ja BOOLEAN DEFAULT FALSE,
  arbeitsvertrag_deutsches_recht_nein BOOLEAN DEFAULT FALSE,
  ausland_arbeitgeber_sitz_plz VARCHAR(10),
  ausland_arbeitgeber_sitz_ort VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Uploaded files table
CREATE TABLE public.user_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID REFERENCES public.antrag(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  storage_path TEXT,
  status file_status DEFAULT 'uploaded',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days')
);

-- OCR extraction logs
CREATE TABLE public.extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_file_id UUID NOT NULL REFERENCES public.user_files(id) ON DELETE CASCADE,
  antrag_id UUID REFERENCES public.antrag(id) ON DELETE CASCADE,
  extracted_text TEXT,
  confidence_score DECIMAL(5,2),
  field_name VARCHAR(100),
  field_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.antrag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kind ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antrag_2a_alleinerziehende ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antrag_2b_elternteil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antrag_2c_wohnsitz_aufenthalt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antrag_2c_wohnsitz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for antrag
CREATE POLICY "Users can view their own applications"
  ON public.antrag FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications"
  ON public.antrag FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
  ON public.antrag FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications"
  ON public.antrag FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for kind
CREATE POLICY "Users can view child data for their applications"
  ON public.kind FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = kind.antrag_id AND antrag.user_id = auth.uid()
  ));

CREATE POLICY "Users can create child data for their applications"
  ON public.kind FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = kind.antrag_id AND antrag.user_id = auth.uid()
  ));

CREATE POLICY "Users can update child data for their applications"
  ON public.kind FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = kind.antrag_id AND antrag.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete child data for their applications"
  ON public.kind FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = kind.antrag_id AND antrag.user_id = auth.uid()
  ));

-- RLS Policies for antrag_2a_alleinerziehende
CREATE POLICY "Users can manage their single parent data"
  ON public.antrag_2a_alleinerziehende FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = antrag_2a_alleinerziehende.antrag_id AND antrag.user_id = auth.uid()
  ));

-- RLS Policies for antrag_2b_elternteil
CREATE POLICY "Users can manage their parent data"
  ON public.antrag_2b_elternteil FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = antrag_2b_elternteil.antrag_id AND antrag.user_id = auth.uid()
  ));

-- RLS Policies for antrag_2c_wohnsitz_aufenthalt
CREATE POLICY "Users can manage their residence data"
  ON public.antrag_2c_wohnsitz_aufenthalt FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = antrag_2c_wohnsitz_aufenthalt.antrag_id AND antrag.user_id = auth.uid()
  ));

-- RLS Policies for antrag_2c_wohnsitz
CREATE POLICY "Users can manage their address data"
  ON public.antrag_2c_wohnsitz FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = antrag_2c_wohnsitz.antrag_id AND antrag.user_id = auth.uid()
  ));

-- RLS Policies for user_files
CREATE POLICY "Users can view their own files"
  ON public.user_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own files"
  ON public.user_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON public.user_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON public.user_files FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for extraction_logs
CREATE POLICY "Users can view extraction logs for their files"
  ON public.extraction_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_files
    WHERE user_files.id = extraction_logs.user_file_id AND user_files.user_id = auth.uid()
  ));

CREATE POLICY "Users can create extraction logs"
  ON public.extraction_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_files
    WHERE user_files.id = extraction_logs.user_file_id AND user_files.user_id = auth.uid()
  ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for antrag updated_at
CREATE TRIGGER update_antrag_updated_at
  BEFORE UPDATE ON public.antrag
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically delete expired data (DSGVO compliance)
CREATE OR REPLACE FUNCTION public.delete_expired_data()
RETURNS void AS $$
BEGIN
  -- Delete expired applications and related data (CASCADE will handle related tables)
  DELETE FROM public.antrag
  WHERE expires_at < now();
  
  -- Delete expired files
  DELETE FROM public.user_files
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('application-documents', 'application-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for application documents
CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Migration: 20251012074459
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

-- Migration: 20251012080002
-- Update storage policies for form-templates bucket to allow uploads

-- Drop the existing public view policy if it exists
DROP POLICY IF EXISTS "Public can view form templates" ON storage.objects;

-- Allow authenticated users to upload templates
CREATE POLICY "Authenticated users can upload templates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'form-templates' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to update templates
CREATE POLICY "Authenticated users can update templates"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'form-templates' AND
    auth.role() = 'authenticated'
  );

-- Allow everyone to view templates (public bucket)
CREATE POLICY "Anyone can view templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-templates');

-- Migration: 20251012083247
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

-- Migration: 20251013111232
-- Create profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Migration: 20251013111637
-- Migrate existing users to profiles table
INSERT INTO public.profiles (user_id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);

-- Migration: 20251013115932
-- Create missing tables based on Mapping032025_1.xlsx

-- Antrag_2C_Kind_Adresse table
CREATE TABLE IF NOT EXISTS public.antrag_2c_kind_adresse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  kind_adresse_wie_sie BOOLEAN DEFAULT false,
  kind_adresse_wie_anderer BOOLEAN DEFAULT false,
  kind_adresse_abw BOOLEAN DEFAULT false,
  kind_abw_strasse VARCHAR(150),
  kind_abw_hausnr VARCHAR(20),
  kind_abw_plz VARCHAR(10),
  kind_abw_ort VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_2c_kind_adresse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage child address data" ON public.antrag_2c_kind_adresse
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_2c_kind_adresse.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_2D_Arbeit_im_Ausland table
CREATE TABLE IF NOT EXISTS public.antrag_2d_arbeit_im_ausland (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  arbeitsvertrag_auslaendisches_recht_ja BOOLEAN DEFAULT false,
  arbeitsvertrag_auslaendisches_recht_nein BOOLEAN DEFAULT false,
  nato_truppe_oder_ziv_gefolge_ja BOOLEAN DEFAULT false,
  nato_truppe_oder_ziv_gefolge_nein BOOLEAN DEFAULT false,
  diplomatische_mission_oder_beschaeftigt_ja BOOLEAN DEFAULT false,
  diplomatische_mission_oder_beschaeftigt_nein BOOLEAN DEFAULT false,
  arbeitsvertrag_auslaendisches_recht_2_ja BOOLEAN DEFAULT false,
  arbeitsvertrag_auslaendisches_recht_2_nein BOOLEAN DEFAULT false,
  nato_truppe_oder_ziv_gefolge_2_ja BOOLEAN DEFAULT false,
  nato_truppe_oder_ziv_gefolge_2_nein BOOLEAN DEFAULT false,
  diplomatische_mission_oder_beschaeftigt_2_ja BOOLEAN DEFAULT false,
  diplomatische_mission_oder_beschaeftigt_2_nein BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_2d_arbeit_im_ausland ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage foreign work data" ON public.antrag_2d_arbeit_im_ausland
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_2d_arbeit_im_ausland.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_2E_Antragstellende table  
CREATE TABLE IF NOT EXISTS public.antrag_2e_antragstellende (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  fuer_beide_elternteile BOOLEAN DEFAULT false,
  fuer_mich_spaeter_andere BOOLEAN DEFAULT false,
  fuer_mich_andere_bereits_beantragt BOOLEAN DEFAULT false,
  nur_fuer_mich BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_2e_antragstellende ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage applicant data" ON public.antrag_2e_antragstellende
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_2e_antragstellende.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_2F_Staatsangehoerigkeit table
CREATE TABLE IF NOT EXISTS public.antrag_2f_staatsangehoerigkeit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  staatsang_deutsch BOOLEAN DEFAULT false,
  staatsang_eu_ewr_ch BOOLEAN DEFAULT false,
  staatsang_eu_staatname VARCHAR(255),
  freizuegigkeit_ja BOOLEAN DEFAULT false,
  freizuegigkeit_nein BOOLEAN DEFAULT false,
  staatsang_anderer BOOLEAN DEFAULT false,
  staatsang_anderer_staatname VARCHAR(255),
  staatsang_keine BOOLEAN DEFAULT false,
  staatsang_deutsch_2 BOOLEAN DEFAULT false,
  staatsang_eu_ewr_ch_2 BOOLEAN DEFAULT false,
  staatsang_eu_staatname_2 VARCHAR(255),
  freizuegigkeit_ja_2 BOOLEAN DEFAULT false,
  freizuegigkeit_nein_2 BOOLEAN DEFAULT false,
  staatsang_anderer_2 BOOLEAN DEFAULT false,
  staatsang_anderer_staatname_2 VARCHAR(255),
  staatsang_keine_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_2f_staatsangehoerigkeit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage nationality data" ON public.antrag_2f_staatsangehoerigkeit
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_2f_staatsangehoerigkeit.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_2G_Familienstand table
CREATE TABLE IF NOT EXISTS public.antrag_2g_familienstand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  verheiratet BOOLEAN DEFAULT false,
  verheiratet_mit_partner_ja BOOLEAN DEFAULT false,
  verheiratet_mit_partner_nein BOOLEAN DEFAULT false,
  verpartnert BOOLEAN DEFAULT false,
  verpartnert_mit_partner_ja BOOLEAN DEFAULT false,
  verpartnert_mit_partner_nein BOOLEAN DEFAULT false,
  geschieden BOOLEAN DEFAULT false,
  verwitwet BOOLEAN DEFAULT false,
  ledig BOOLEAN DEFAULT false,
  verheiratet_2 BOOLEAN DEFAULT false,
  verheiratet_mit_partner_ja_2 BOOLEAN DEFAULT false,
  verheiratet_mit_partner_nein_2 BOOLEAN DEFAULT false,
  verpartnert_2 BOOLEAN DEFAULT false,
  verpartnert_mit_partner_ja_2 BOOLEAN DEFAULT false,
  verpartnert_mit_partner_nein_2 BOOLEAN DEFAULT false,
  geschieden_2 BOOLEAN DEFAULT false,
  verwitwet_2 BOOLEAN DEFAULT false,
  ledig_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_2g_familienstand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage marital status data" ON public.antrag_2g_familienstand
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_2g_familienstand.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_3A_Betreuung_Kind table
CREATE TABLE IF NOT EXISTS public.antrag_3a_betreuung_kind (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  selber_haushalt_ja BOOLEAN DEFAULT false,
  selber_haushalt_nein BOOLEAN DEFAULT false,
  selber_haushalt_ja_2 BOOLEAN DEFAULT false,
  selber_haushalt_nein_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_3a_betreuung_kind ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage child care data" ON public.antrag_3a_betreuung_kind
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_3a_betreuung_kind.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_3B_ElternKind_Beziehung table
CREATE TABLE IF NOT EXISTS public.antrag_3b_elternkind_beziehung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  leiblich BOOLEAN DEFAULT false,
  adoptiv BOOLEAN DEFAULT false,
  nicht_mein_kind BOOLEAN DEFAULT false,
  ein_anderes_kind BOOLEAN DEFAULT false,
  leiblich_2 BOOLEAN DEFAULT false,
  adoptiv_2 BOOLEAN DEFAULT false,
  nicht_mein_kind_2 BOOLEAN DEFAULT false,
  ein_anderes_kind_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_3b_elternkind_beziehung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage parent-child relationship data" ON public.antrag_3b_elternkind_beziehung
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_3b_elternkind_beziehung.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_3C_Adoption table
CREATE TABLE IF NOT EXISTS public.antrag_3c_adoption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  adaptions_datum DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_3c_adoption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage adoption data" ON public.antrag_3c_adoption
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_3c_adoption.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_4_weitere_Kinder_Info table
CREATE TABLE IF NOT EXISTS public.antrag_4_weitere_kinder_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  vorname VARCHAR(255),
  nachname VARCHAR(255),
  geburtsdatum DATE,
  behind_grad BOOLEAN DEFAULT false,
  leiblich BOOLEAN DEFAULT false,
  adoptiv BOOLEAN DEFAULT false,
  nicht_mein_kind BOOLEAN DEFAULT false,
  ein_anderes_kind BOOLEAN DEFAULT false,
  adoptions_datum DATE,
  vorname_2 VARCHAR(255),
  nachname_2 VARCHAR(255),
  geburtsdatum_2 DATE,
  behind_grad_2 BOOLEAN DEFAULT false,
  leiblich_2 BOOLEAN DEFAULT false,
  adoptiv_2 BOOLEAN DEFAULT false,
  nicht_mein_kind_2 BOOLEAN DEFAULT false,
  ein_anderes_kind_2 BOOLEAN DEFAULT false,
  adoptions_datum_2 DATE,
  vorname_3 VARCHAR(255),
  nachname_3 VARCHAR(255),
  geburtsdatum_3 DATE,
  behind_grad_3 BOOLEAN DEFAULT false,
  leiblich_3 BOOLEAN DEFAULT false,
  adoptiv_3 BOOLEAN DEFAULT false,
  nicht_mein_kind_3 BOOLEAN DEFAULT false,
  ein_anderes_kind_3 BOOLEAN DEFAULT false,
  adoptions_datum_3 DATE,
  leiblich_p2 BOOLEAN DEFAULT false,
  adoptiv_p2 BOOLEAN DEFAULT false,
  nicht_mein_kind_p2 BOOLEAN DEFAULT false,
  ein_anderes_kind_p2 BOOLEAN DEFAULT false,
  leiblich_2_p2 BOOLEAN DEFAULT false,
  adoptiv_2_p2 BOOLEAN DEFAULT false,
  nicht_mein_kind_2_p2 BOOLEAN DEFAULT false,
  ein_anderes_kind_2_p2 BOOLEAN DEFAULT false,
  leiblich_3_p2 BOOLEAN DEFAULT false,
  adoptiv_3_p2 BOOLEAN DEFAULT false,
  nicht_mein_kind_3_p2 BOOLEAN DEFAULT false,
  ein_anderes_kind_3_p2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_4_weitere_kinder_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage additional children data" ON public.antrag_4_weitere_kinder_info
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_4_weitere_kinder_info.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_5_Krankenversicherung table
CREATE TABLE IF NOT EXISTS public.antrag_5_krankenversicherung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  gesetzlich_ver BOOLEAN DEFAULT false,
  freiwillig_ver BOOLEAN DEFAULT false,
  familien_ver BOOLEAN DEFAULT false,
  privat_ver BOOLEAN DEFAULT false,
  frei_heifuer BOOLEAN DEFAULT false,
  nicht_in_de_ver BOOLEAN DEFAULT false,
  versichertennummer VARCHAR(255),
  krankenkassename VARCHAR(255),
  krankenkasse_strasse VARCHAR(255),
  krankenkasse_hausnummer VARCHAR(255),
  krankenkasse_postfach VARCHAR(255),
  krankenkasse_plz VARCHAR(255),
  krankenkasse_ort VARCHAR(255),
  krankenkasse_zusatz VARCHAR(255),
  gesetzlich_ver_2 BOOLEAN DEFAULT false,
  krankenkasse_gleich_wie_partner BOOLEAN DEFAULT false,
  freiwillig_ver_2 BOOLEAN DEFAULT false,
  familien_ver_2 BOOLEAN DEFAULT false,
  privat_ver_2 BOOLEAN DEFAULT false,
  frei_heifuer_2 BOOLEAN DEFAULT false,
  nicht_in_de_ver_2 BOOLEAN DEFAULT false,
  versichertennummer_2 VARCHAR(255),
  krankenkassename_2 VARCHAR(255),
  krankenkasse_strasse_2 VARCHAR(255),
  krankenkasse_hausnummer_2 VARCHAR(255),
  krankenkasse_postfach_2 VARCHAR(255),
  krankenkasse_plz_2 VARCHAR(255),
  krankenkasse_ort_2 VARCHAR(255),
  krankenkasse_zusatz_2 VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_5_krankenversicherung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage health insurance data" ON public.antrag_5_krankenversicherung
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_5_krankenversicherung.antrag_id AND antrag.user_id = auth.uid()
));

-- Migration: 20251013120127
-- Continue creating remaining tables from Mapping032025_1.xlsx

-- Antrag_6A_Gesamteinkommen table
CREATE TABLE IF NOT EXISTS public.antrag_6a_gesamteinkommen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  unter_200_tausend BOOLEAN DEFAULT false,
  ueber_200_tausend BOOLEAN DEFAULT false,
  vorraus_200_tausend BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_6a_gesamteinkommen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage total income data" ON public.antrag_6a_gesamteinkommen;
CREATE POLICY "Users can manage total income data" ON public.antrag_6a_gesamteinkommen
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_6a_gesamteinkommen.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_6B_Mindestbetrag table
CREATE TABLE IF NOT EXISTS public.antrag_6b_mindestbetrag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  beantrage_mindest BOOLEAN DEFAULT false,
  beantrage_mindest_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_6b_mindestbetrag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage minimum amount data" ON public.antrag_6b_mindestbetrag;
CREATE POLICY "Users can manage minimum amount data" ON public.antrag_6b_mindestbetrag
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_6b_mindestbetrag.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_7A_bisherige_erwerbstaetigkeit table
CREATE TABLE IF NOT EXISTS public.antrag_7a_bisherige_erwerbstaetigkeit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  einkuenfte_nicht_selbststaendig BOOLEAN DEFAULT false,
  gewinn_einkunft_vorhanden BOOLEAN DEFAULT false,
  gewerbe_einkuenfte BOOLEAN DEFAULT false,
  selbststaendig_einkuenfte BOOLEAN DEFAULT false,
  landwirtschaft_einkuenfte BOOLEAN DEFAULT false,
  keine_einkuenfte BOOLEAN DEFAULT false,
  einkuenfte_nicht_selbststaendig_2 BOOLEAN DEFAULT false,
  gewinn_einkunft_vorhanden_2 BOOLEAN DEFAULT false,
  gewerbe_einkuenfte_2 BOOLEAN DEFAULT false,
  selbststaendig_einkuenfte_2 BOOLEAN DEFAULT false,
  landwirtschaft_einkuenfte_2 BOOLEAN DEFAULT false,
  keine_einkuenfte_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_7a_bisherige_erwerbstaetigkeit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage previous employment data" ON public.antrag_7a_bisherige_erwerbstaetigkeit;
CREATE POLICY "Users can manage previous employment data" ON public.antrag_7a_bisherige_erwerbstaetigkeit
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_7a_bisherige_erwerbstaetigkeit.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_8A_einkomen_vor_geburt_bestimmt table
CREATE TABLE IF NOT EXISTS public.antrag_8a_einkomen_vor_geburt_bestimmt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  minijob BOOLEAN DEFAULT false,
  midijob BOOLEAN DEFAULT false,
  berufsausbildung BOOLEAN DEFAULT false,
  keine_der_bestimmten BOOLEAN DEFAULT false,
  minijob_2 BOOLEAN DEFAULT false,
  midijob_2 BOOLEAN DEFAULT false,
  berufsausbildung_2 BOOLEAN DEFAULT false,
  keine_der_bestimmten_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_8a_einkomen_vor_geburt_bestimmt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage pre-birth income data" ON public.antrag_8a_einkomen_vor_geburt_bestimmt;
CREATE POLICY "Users can manage pre-birth income data" ON public.antrag_8a_einkomen_vor_geburt_bestimmt
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_8a_einkomen_vor_geburt_bestimmt.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_8B_Steuern_und_Abgaben table
CREATE TABLE IF NOT EXISTS public.antrag_8b_steuern_und_abgaben (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  kirchensteuer BOOLEAN DEFAULT false,
  pflichtbeitrag_krankenkasse BOOLEAN DEFAULT false,
  rentenversicherung BOOLEAN DEFAULT false,
  arbeitslosenversicherung BOOLEAN DEFAULT false,
  keine_abgaben BOOLEAN DEFAULT false,
  kirchensteuer_2 BOOLEAN DEFAULT false,
  pflichtbeitrag_krankenkasse_2 BOOLEAN DEFAULT false,
  rentenversicherung_2 BOOLEAN DEFAULT false,
  arbeitslosenversicherung_2 BOOLEAN DEFAULT false,
  keine_abgaben_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_8b_steuern_und_abgaben ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage taxes data" ON public.antrag_8b_steuern_und_abgaben;
CREATE POLICY "Users can manage taxes data" ON public.antrag_8b_steuern_und_abgaben
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_8b_steuern_und_abgaben.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_9_einkommen_ersatz_leistungen table
CREATE TABLE IF NOT EXISTS public.antrag_9_einkommen_ersatz_leistungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  arbeitslosengeld_i BOOLEAN DEFAULT false,
  krankentage_geld BOOLEAN DEFAULT false,
  krankengeld BOOLEAN DEFAULT false,
  rente BOOLEAN DEFAULT false,
  art_rente1 VARCHAR(255),
  art_rente2 VARCHAR(255),
  elterngeld_fuer_aelteres BOOLEAN DEFAULT false,
  andere_einkommen_ersatz_leistung BOOLEAN DEFAULT false,
  art_ersatz_leistung1 VARCHAR(255),
  art_ersatz_leistung2 VARCHAR(255),
  arbeitslosengeld_i_2 BOOLEAN DEFAULT false,
  krankentage_geld_2 BOOLEAN DEFAULT false,
  krankengeld_2 BOOLEAN DEFAULT false,
  rente_2 BOOLEAN DEFAULT false,
  art_rente1_2 VARCHAR(255),
  art_rente2_2 VARCHAR(255),
  elterngeld_fuer_aelteres_2 BOOLEAN DEFAULT false,
  andere_einkommen_ersatz_leistung_2 BOOLEAN DEFAULT false,
  art_ersatz_leistung1_2 VARCHAR(255),
  art_ersatz_leistung2_2 VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_9_einkommen_ersatz_leistungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage income replacement data" ON public.antrag_9_einkommen_ersatz_leistungen;
CREATE POLICY "Users can manage income replacement data" ON public.antrag_9_einkommen_ersatz_leistungen
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_9_einkommen_ersatz_leistungen.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_10_mutterschafts_leistungen table
CREATE TABLE IF NOT EXISTS public.antrag_10_mutterschafts_leistungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  anspruch_mutterschaftsgeld_krankenkasse BOOLEAN DEFAULT false,
  von_mutterschaftsgeld_kk DATE,
  bis_mutterschaftsgeld_kk DATE,
  rufe_online_kk_bescheinigung_ab BOOLEAN DEFAULT false,
  anspruch_krankentage_geld BOOLEAN DEFAULT false,
  von_krankentage_geld DATE,
  bis_krankentage_geld DATE,
  anspruch_zuschuss_beamter BOOLEAN DEFAULT false,
  von_beamt DATE,
  bis_beamt DATE,
  anspruch_mutterschaftsgeld_von_arbeitgeber BOOLEAN DEFAULT false,
  von_mutterschaftsgeld_arbeit DATE,
  bis_mutterschaftsgeld_arbeit DATE,
  anspruch_zuschuss_beamter_dienst_anwaerter BOOLEAN DEFAULT false,
  von_beamt_dienst_anwaerter DATE,
  bis_beamt_dienst_anwaerter DATE,
  vergleichbare_mutterschaftsgeld_ausland BOOLEAN DEFAULT false,
  von_mutterschaftsgeld_mg_ausland DATE,
  bis_mutterschaftsgeld_mg_ausland DATE,
  kein_anspruch_mutterschaftsgeld BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_10_mutterschafts_leistungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage maternity benefits data" ON public.antrag_10_mutterschafts_leistungen;
CREATE POLICY "Users can manage maternity benefits data" ON public.antrag_10_mutterschafts_leistungen
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_10_mutterschafts_leistungen.antrag_id AND antrag.user_id = auth.uid()
));

-- Migration: 20251013120254
-- Continue creating remaining tables from Mapping032025_1.xlsx

-- Antrag_6A_Gesamteinkommen table
CREATE TABLE IF NOT EXISTS public.antrag_6a_gesamteinkommen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  unter_200_tausend BOOLEAN DEFAULT false,
  ueber_200_tausend BOOLEAN DEFAULT false,
  vorraus_200_tausend BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_6a_gesamteinkommen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage total income data" ON public.antrag_6a_gesamteinkommen;
CREATE POLICY "Users can manage total income data" ON public.antrag_6a_gesamteinkommen
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_6a_gesamteinkommen.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_6B_Mindestbetrag table
CREATE TABLE IF NOT EXISTS public.antrag_6b_mindestbetrag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  beantrage_mindest BOOLEAN DEFAULT false,
  beantrage_mindest_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_6b_mindestbetrag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage minimum amount data" ON public.antrag_6b_mindestbetrag;
CREATE POLICY "Users can manage minimum amount data" ON public.antrag_6b_mindestbetrag
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_6b_mindestbetrag.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_7A_bisherige_erwerbstaetigkeit table
CREATE TABLE IF NOT EXISTS public.antrag_7a_bisherige_erwerbstaetigkeit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  einkuenfte_nicht_selbststaendig BOOLEAN DEFAULT false,
  gewinn_einkunft_vorhanden BOOLEAN DEFAULT false,
  gewerbe_einkuenfte BOOLEAN DEFAULT false,
  selbststaendig_einkuenfte BOOLEAN DEFAULT false,
  landwirtschaft_einkuenfte BOOLEAN DEFAULT false,
  keine_einkuenfte BOOLEAN DEFAULT false,
  einkuenfte_nicht_selbststaendig_2 BOOLEAN DEFAULT false,
  gewinn_einkunft_vorhanden_2 BOOLEAN DEFAULT false,
  gewerbe_einkuenfte_2 BOOLEAN DEFAULT false,
  selbststaendig_einkuenfte_2 BOOLEAN DEFAULT false,
  landwirtschaft_einkuenfte_2 BOOLEAN DEFAULT false,
  keine_einkuenfte_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_7a_bisherige_erwerbstaetigkeit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage previous employment data" ON public.antrag_7a_bisherige_erwerbstaetigkeit;
CREATE POLICY "Users can manage previous employment data" ON public.antrag_7a_bisherige_erwerbstaetigkeit
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_7a_bisherige_erwerbstaetigkeit.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_8A_einkomen_vor_geburt_bestimmt table
CREATE TABLE IF NOT EXISTS public.antrag_8a_einkomen_vor_geburt_bestimmt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  minijob BOOLEAN DEFAULT false,
  midijob BOOLEAN DEFAULT false,
  berufsausbildung BOOLEAN DEFAULT false,
  keine_der_bestimmten BOOLEAN DEFAULT false,
  minijob_2 BOOLEAN DEFAULT false,
  midijob_2 BOOLEAN DEFAULT false,
  berufsausbildung_2 BOOLEAN DEFAULT false,
  keine_der_bestimmten_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_8a_einkomen_vor_geburt_bestimmt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage pre-birth income data" ON public.antrag_8a_einkomen_vor_geburt_bestimmt;
CREATE POLICY "Users can manage pre-birth income data" ON public.antrag_8a_einkomen_vor_geburt_bestimmt
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_8a_einkomen_vor_geburt_bestimmt.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_8B_Steuern_und_Abgaben table
CREATE TABLE IF NOT EXISTS public.antrag_8b_steuern_und_abgaben (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  kirchensteuer BOOLEAN DEFAULT false,
  pflichtbeitrag_krankenkasse BOOLEAN DEFAULT false,
  rentenversicherung BOOLEAN DEFAULT false,
  arbeitslosenversicherung BOOLEAN DEFAULT false,
  keine_abgaben BOOLEAN DEFAULT false,
  kirchensteuer_2 BOOLEAN DEFAULT false,
  pflichtbeitrag_krankenkasse_2 BOOLEAN DEFAULT false,
  rentenversicherung_2 BOOLEAN DEFAULT false,
  arbeitslosenversicherung_2 BOOLEAN DEFAULT false,
  keine_abgaben_2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_8b_steuern_und_abgaben ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage taxes data" ON public.antrag_8b_steuern_und_abgaben;
CREATE POLICY "Users can manage taxes data" ON public.antrag_8b_steuern_und_abgaben
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_8b_steuern_und_abgaben.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_9_einkommen_ersatz_leistungen table
CREATE TABLE IF NOT EXISTS public.antrag_9_einkommen_ersatz_leistungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  arbeitslosengeld_i BOOLEAN DEFAULT false,
  krankentage_geld BOOLEAN DEFAULT false,
  krankengeld BOOLEAN DEFAULT false,
  rente BOOLEAN DEFAULT false,
  art_rente1 VARCHAR(255),
  art_rente2 VARCHAR(255),
  elterngeld_fuer_aelteres BOOLEAN DEFAULT false,
  andere_einkommen_ersatz_leistung BOOLEAN DEFAULT false,
  art_ersatz_leistung1 VARCHAR(255),
  art_ersatz_leistung2 VARCHAR(255),
  arbeitslosengeld_i_2 BOOLEAN DEFAULT false,
  krankentage_geld_2 BOOLEAN DEFAULT false,
  krankengeld_2 BOOLEAN DEFAULT false,
  rente_2 BOOLEAN DEFAULT false,
  art_rente1_2 VARCHAR(255),
  art_rente2_2 VARCHAR(255),
  elterngeld_fuer_aelteres_2 BOOLEAN DEFAULT false,
  andere_einkommen_ersatz_leistung_2 BOOLEAN DEFAULT false,
  art_ersatz_leistung1_2 VARCHAR(255),
  art_ersatz_leistung2_2 VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_9_einkommen_ersatz_leistungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage income replacement data" ON public.antrag_9_einkommen_ersatz_leistungen;
CREATE POLICY "Users can manage income replacement data" ON public.antrag_9_einkommen_ersatz_leistungen
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_9_einkommen_ersatz_leistungen.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_10_mutterschafts_leistungen table
CREATE TABLE IF NOT EXISTS public.antrag_10_mutterschafts_leistungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  anspruch_mutterschaftsgeld_krankenkasse BOOLEAN DEFAULT false,
  von_mutterschaftsgeld_kk DATE,
  bis_mutterschaftsgeld_kk DATE,
  rufe_online_kk_bescheinigung_ab BOOLEAN DEFAULT false,
  anspruch_krankentage_geld BOOLEAN DEFAULT false,
  von_krankentage_geld DATE,
  bis_krankentage_geld DATE,
  anspruch_zuschuss_beamter BOOLEAN DEFAULT false,
  von_beamt DATE,
  bis_beamt DATE,
  anspruch_mutterschaftsgeld_von_arbeitgeber BOOLEAN DEFAULT false,
  von_mutterschaftsgeld_arbeit DATE,
  bis_mutterschaftsgeld_arbeit DATE,
  anspruch_zuschuss_beamter_dienst_anwaerter BOOLEAN DEFAULT false,
  von_beamt_dienst_anwaerter DATE,
  bis_beamt_dienst_anwaerter DATE,
  vergleichbare_mutterschaftsgeld_ausland BOOLEAN DEFAULT false,
  von_mutterschaftsgeld_mg_ausland DATE,
  bis_mutterschaftsgeld_mg_ausland DATE,
  kein_anspruch_mutterschaftsgeld BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_10_mutterschafts_leistungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage maternity benefits data" ON public.antrag_10_mutterschafts_leistungen;
CREATE POLICY "Users can manage maternity benefits data" ON public.antrag_10_mutterschafts_leistungen
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_10_mutterschafts_leistungen.antrag_id AND antrag.user_id = auth.uid()
));

-- Migration: 20251013120334
-- Create final batch of tables from Mapping032025_1.xlsx

-- Antrag_16A_Bankverbindung table
CREATE TABLE IF NOT EXISTS public.antrag_16a_bankverbindung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  kontoinhaber VARCHAR(255),
  iban VARCHAR(34),
  bic VARCHAR(11),
  kreditinstitut VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_16a_bankverbindung ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage bank account data" ON public.antrag_16a_bankverbindung;
CREATE POLICY "Users can manage bank account data" ON public.antrag_16a_bankverbindung
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_16a_bankverbindung.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_16B_Kontakt table
CREATE TABLE IF NOT EXISTS public.antrag_16b_kontakt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  telefon VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_16b_kontakt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage contact data" ON public.antrag_16b_kontakt;
CREATE POLICY "Users can manage contact data" ON public.antrag_16b_kontakt
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_16b_kontakt.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_16C_Mitteilung table
CREATE TABLE IF NOT EXISTS public.antrag_16c_mitteilung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  mitteilung_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_16c_mitteilung ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage notification data" ON public.antrag_16c_mitteilung;
CREATE POLICY "Users can manage notification data" ON public.antrag_16c_mitteilung
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_16c_mitteilung.antrag_id AND antrag.user_id = auth.uid()
));

-- Antrag_16D_Unterschrift table
CREATE TABLE IF NOT EXISTS public.antrag_16d_unterschrift (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  ort_datum VARCHAR(255),
  unterschrift_vorhanden BOOLEAN DEFAULT false,
  unterschrift_2_vorhanden BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id)
);

ALTER TABLE public.antrag_16d_unterschrift ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage signature data" ON public.antrag_16d_unterschrift;
CREATE POLICY "Users can manage signature data" ON public.antrag_16d_unterschrift
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.antrag WHERE antrag.id = antrag_16d_unterschrift.antrag_id AND antrag.user_id = auth.uid()
));

-- Migration: 20251019123855
-- Phase 1: Create normalized elternteil table
CREATE TABLE public.elternteil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL REFERENCES public.antrag(id) ON DELETE CASCADE,
  parent_number INTEGER NOT NULL CHECK (parent_number IN (1, 2)),
  vorname VARCHAR(100),
  nachname VARCHAR(100),
  geburtsdatum DATE,
  geschlecht geschlecht_type,
  steuer_identifikationsnummer CHAR(11),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(antrag_id, parent_number)
);

-- Enable RLS
ALTER TABLE public.elternteil ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own parent data"
  ON public.elternteil
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = elternteil.antrag_id
    AND antrag.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own parent data"
  ON public.elternteil
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = elternteil.antrag_id
    AND antrag.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own parent data"
  ON public.elternteil
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = elternteil.antrag_id
    AND antrag.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own parent data"
  ON public.elternteil
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.antrag
    WHERE antrag.id = elternteil.antrag_id
    AND antrag.user_id = auth.uid()
  ));

-- Migrate existing data from antrag_2b_elternteil
INSERT INTO public.elternteil (antrag_id, parent_number, vorname, nachname, geburtsdatum, geschlecht, steuer_identifikationsnummer)
SELECT 
  antrag_id,
  1 as parent_number,
  vorname,
  nachname,
  geburtsdatum,
  geschlecht,
  steuer_identifikationsnummer
FROM public.antrag_2b_elternteil
WHERE vorname IS NOT NULL OR nachname IS NOT NULL OR geburtsdatum IS NOT NULL;

INSERT INTO public.elternteil (antrag_id, parent_number, vorname, nachname, geburtsdatum, geschlecht, steuer_identifikationsnummer)
SELECT 
  antrag_id,
  2 as parent_number,
  vorname_2,
  nachname_2,
  geburtsdatum_2,
  geschlecht_2,
  steuer_identifikationsnummer_2
FROM public.antrag_2b_elternteil
WHERE vorname_2 IS NOT NULL OR nachname_2 IS NOT NULL OR geburtsdatum_2 IS NOT NULL;

-- Add elternteil_id to related tables
ALTER TABLE public.antrag_2c_wohnsitz ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_2c_wohnsitz_aufenthalt ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_2f_staatsangehoerigkeit ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_2g_familienstand ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_5_krankenversicherung ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_7a_bisherige_erwerbstaetigkeit ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_8a_einkomen_vor_geburt_bestimmt ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_8b_steuern_und_abgaben ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;
ALTER TABLE public.antrag_9_einkommen_ersatz_leistungen ADD COLUMN elternteil_id UUID REFERENCES public.elternteil(id) ON DELETE CASCADE;

-- Create trigger for updated_at
CREATE TRIGGER update_elternteil_updated_at
  BEFORE UPDATE ON public.elternteil
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_elternteil_antrag_id ON public.elternteil(antrag_id);
CREATE INDEX idx_elternteil_parent_number ON public.elternteil(parent_number);

-- Migration: 20251019125423
-- Create function to delete antrag and all related data including storage files
CREATE OR REPLACE FUNCTION public.delete_antrag_cascade(p_antrag_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_file RECORD;
BEGIN
  -- Delete files from storage bucket for this antrag
  FOR v_file IN 
    SELECT storage_path 
    FROM public.user_files 
    WHERE antrag_id = p_antrag_id 
    AND storage_path IS NOT NULL
  LOOP
    -- Delete from storage.objects
    DELETE FROM storage.objects 
    WHERE bucket_id = 'application-documents' 
    AND name = v_file.storage_path;
  END LOOP;

  -- Delete extraction_logs related to this antrag
  DELETE FROM public.extraction_logs 
  WHERE antrag_id = p_antrag_id;

  -- Delete user_files related to this antrag
  DELETE FROM public.user_files 
  WHERE antrag_id = p_antrag_id;

  -- Delete all form-related tables (these should cascade automatically, but being explicit)
  DELETE FROM public.kind WHERE antrag_id = p_antrag_id;
  DELETE FROM public.elternteil WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2a_alleinerziehende WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2b_elternteil WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2c_wohnsitz WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2c_wohnsitz_aufenthalt WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2c_kind_adresse WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2d_arbeit_im_ausland WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2e_antragstellende WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2f_staatsangehoerigkeit WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_2g_familienstand WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_3a_betreuung_kind WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_3b_elternkind_beziehung WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_3c_adoption WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_4_weitere_kinder_info WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_5_krankenversicherung WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_6a_gesamteinkommen WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_6b_mindestbetrag WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_7a_bisherige_erwerbstaetigkeit WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_8a_einkomen_vor_geburt_bestimmt WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_8b_steuern_und_abgaben WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_9_einkommen_ersatz_leistungen WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_10_mutterschafts_leistungen WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_16a_bankverbindung WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_16b_kontakt WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_16c_mitteilung WHERE antrag_id = p_antrag_id;
  DELETE FROM public.antrag_16d_unterschrift WHERE antrag_id = p_antrag_id;

  -- Finally delete the antrag itself
  DELETE FROM public.antrag WHERE id = p_antrag_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_antrag_cascade(UUID) TO authenticated;

-- Migration: 20251020101645
-- Add geburtsname (birth name) column to elternteil table
ALTER TABLE public.elternteil ADD COLUMN IF NOT EXISTS geburtsname VARCHAR(255);

-- Migration: 20251022130225
-- DROP ALL APPLICATION TABLES AND FUNCTIONS
-- This will delete ALL data permanently!

-- Drop all form-related tables first (due to foreign keys)
DROP TABLE IF EXISTS public.antrag_10_mutterschafts_leistungen CASCADE;
DROP TABLE IF EXISTS public.antrag_16a_bankverbindung CASCADE;
DROP TABLE IF EXISTS public.antrag_16b_kontakt CASCADE;
DROP TABLE IF EXISTS public.antrag_16c_mitteilung CASCADE;
DROP TABLE IF EXISTS public.antrag_16d_unterschrift CASCADE;
DROP TABLE IF EXISTS public.antrag_2a_alleinerziehende CASCADE;
DROP TABLE IF EXISTS public.antrag_2b_elternteil CASCADE;
DROP TABLE IF EXISTS public.antrag_2c_kind_adresse CASCADE;
DROP TABLE IF EXISTS public.antrag_2c_wohnsitz CASCADE;
DROP TABLE IF EXISTS public.antrag_2c_wohnsitz_aufenthalt CASCADE;
DROP TABLE IF EXISTS public.antrag_2d_arbeit_im_ausland CASCADE;
DROP TABLE IF EXISTS public.antrag_2e_antragstellende CASCADE;
DROP TABLE IF EXISTS public.antrag_2f_staatsangehoerigkeit CASCADE;
DROP TABLE IF EXISTS public.antrag_2g_familienstand CASCADE;
DROP TABLE IF EXISTS public.antrag_3a_betreuung_kind CASCADE;
DROP TABLE IF EXISTS public.antrag_3b_elternkind_beziehung CASCADE;
DROP TABLE IF EXISTS public.antrag_3c_adoption CASCADE;
DROP TABLE IF EXISTS public.antrag_4_weitere_kinder_info CASCADE;
DROP TABLE IF EXISTS public.antrag_5_krankenversicherung CASCADE;
DROP TABLE IF EXISTS public.antrag_6a_gesamteinkommen CASCADE;
DROP TABLE IF EXISTS public.antrag_6b_mindestbetrag CASCADE;
DROP TABLE IF EXISTS public.antrag_7a_bisherige_erwerbstaetigkeit CASCADE;
DROP TABLE IF EXISTS public.antrag_8a_einkomen_vor_geburt_bestimmt CASCADE;
DROP TABLE IF EXISTS public.antrag_8b_steuern_und_abgaben CASCADE;
DROP TABLE IF EXISTS public.antrag_9_einkommen_ersatz_leistungen CASCADE;

-- Drop child tables
DROP TABLE IF EXISTS public.kind CASCADE;
DROP TABLE IF EXISTS public.elternteil CASCADE;

-- Drop file and log tables
DROP TABLE IF EXISTS public.extraction_logs CASCADE;
DROP TABLE IF EXISTS public.user_files CASCADE;

-- Drop template tables
DROP TABLE IF EXISTS public.form_templates CASCADE;

-- Drop main antrag table
DROP TABLE IF EXISTS public.antrag CASCADE;

-- Drop all custom functions (keep only handle_new_user for profiles)
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.delete_expired_data() CASCADE;
DROP FUNCTION IF EXISTS public.get_active_template(character varying) CASCADE;
DROP FUNCTION IF EXISTS public.delete_antrag_cascade(uuid) CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS public.geschlecht_enum CASCADE;
DROP TYPE IF EXISTS public.file_status CASCADE;

-- Clear storage bucket (tables are dropped, but bucket policies remain)
-- Note: Files in storage buckets must be deleted manually or via storage API;

-- Migration: 20251022131042
-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create storage bucket for XML schemas
INSERT INTO storage.buckets (id, name, public)
VALUES ('xml-schemas', 'xml-schemas', true);

-- Create RLS policies for xml-schemas bucket
CREATE POLICY "XML schemas are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'xml-schemas');

CREATE POLICY "Authenticated users can upload XML schemas"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'xml-schemas' AND auth.uid() IS NOT NULL);

-- Create table for parsed birth certificate data
CREATE TABLE public.geburtsurkunden (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Kind data
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  kind_geburtsort TEXT,
  kind_geburtsnummer TEXT,
  
  -- Mutter data
  mutter_vorname TEXT,
  mutter_nachname TEXT,
  mutter_geburtsname TEXT,
  
  -- Vater data
  vater_vorname TEXT,
  vater_nachname TEXT,
  
  -- Behörde data
  behoerde_name TEXT,
  urkundennummer TEXT,
  ausstelldatum DATE,
  
  verwendungszweck TEXT,
  
  -- File reference
  file_path TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geburtsurkunden ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own geburtsurkunden"
ON public.geburtsurkunden
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own geburtsurkunden"
ON public.geburtsurkunden
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own geburtsurkunden"
ON public.geburtsurkunden
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own geburtsurkunden"
ON public.geburtsurkunden
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_geburtsurkunden_updated_at
BEFORE UPDATE ON public.geburtsurkunden
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251022131344
-- Create antraege table
CREATE TABLE public.antraege (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.antraege ENABLE ROW LEVEL SECURITY;

-- RLS policies for antraege
CREATE POLICY "Users can view their own antraege"
ON public.antraege
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own antraege"
ON public.antraege
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own antraege"
ON public.antraege
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own antraege"
ON public.antraege
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_antraege_updated_at
BEFORE UPDATE ON public.antraege
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create join table between antraege and geburtsurkunden
CREATE TABLE public.antrag_geburtsurkunden (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  antrag_id UUID NOT NULL REFERENCES public.antraege(id) ON DELETE CASCADE,
  geburtsurkunde_id UUID NOT NULL REFERENCES public.geburtsurkunden(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(antrag_id, geburtsurkunde_id)
);

-- Enable RLS
ALTER TABLE public.antrag_geburtsurkunden ENABLE ROW LEVEL SECURITY;

-- RLS policies for antrag_geburtsurkunden
CREATE POLICY "Users can view their own antrag_geburtsurkunden"
ON public.antrag_geburtsurkunden
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.antraege
    WHERE antraege.id = antrag_geburtsurkunden.antrag_id
    AND antraege.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own antrag_geburtsurkunden"
ON public.antrag_geburtsurkunden
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.antraege
    WHERE antraege.id = antrag_geburtsurkunden.antrag_id
    AND antraege.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own antrag_geburtsurkunden"
ON public.antrag_geburtsurkunden
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.antraege
    WHERE antraege.id = antrag_geburtsurkunden.antrag_id
    AND antraege.user_id = auth.uid()
  )
);

-- Migration: 20251101185451
-- Create table for parent documents (ID cards and passports)
CREATE TABLE public.eltern_dokumente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('personalausweis', 'reisepass')),
  person_type TEXT NOT NULL CHECK (person_type IN ('mutter', 'vater')),
  vorname TEXT,
  nachname TEXT,
  geburtsname TEXT,
  geburtsdatum DATE,
  geburtsort TEXT,
  staatsangehoerigkeit TEXT,
  ausweisnummer TEXT,
  ausstelldatum DATE,
  gueltig_bis DATE,
  ausstellende_behoerde TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.eltern_dokumente ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own eltern_dokumente" 
ON public.eltern_dokumente 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own eltern_dokumente" 
ON public.eltern_dokumente 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own eltern_dokumente" 
ON public.eltern_dokumente 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own eltern_dokumente" 
ON public.eltern_dokumente 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_eltern_dokumente_updated_at
BEFORE UPDATE ON public.eltern_dokumente
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251101193510
-- Add address fields to eltern_dokumente table
ALTER TABLE public.eltern_dokumente
ADD COLUMN IF NOT EXISTS plz text,
ADD COLUMN IF NOT EXISTS wohnort text,
ADD COLUMN IF NOT EXISTS strasse text,
ADD COLUMN IF NOT EXISTS hausnummer text,
ADD COLUMN IF NOT EXISTS wohnungsnummer text;

-- Migration: 20251101211408
-- Create table for income tax assessments (Einkommensteuerbescheid)
CREATE TABLE public.einkommensteuerbescheide (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  person_type TEXT NOT NULL CHECK (person_type IN ('mutter', 'vater')),
  file_path TEXT,
  steuerjahr TEXT,
  steuernummer TEXT,
  vorname TEXT,
  nachname TEXT,
  adresse TEXT,
  plz TEXT,
  wohnort TEXT,
  jahreseinkommen TEXT,
  zu_versteuerndes_einkommen TEXT,
  festgesetzte_steuer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.einkommensteuerbescheide ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own einkommensteuerbescheide"
ON public.einkommensteuerbescheide
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own einkommensteuerbescheide"
ON public.einkommensteuerbescheide
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own einkommensteuerbescheide"
ON public.einkommensteuerbescheide
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own einkommensteuerbescheide"
ON public.einkommensteuerbescheide
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_einkommensteuerbescheide_updated_at
BEFORE UPDATE ON public.einkommensteuerbescheide
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251101211848
-- Add missing fields to einkommensteuerbescheide table based on real document analysis
ALTER TABLE public.einkommensteuerbescheide
ADD COLUMN steuer_id_nummer TEXT,
ADD COLUMN finanzamt_name TEXT,
ADD COLUMN finanzamt_adresse TEXT,
ADD COLUMN bescheiddatum DATE,
ADD COLUMN solidaritaetszuschlag TEXT,
ADD COLUMN gemeinsame_veranlagung BOOLEAN DEFAULT false,
ADD COLUMN steuerabzug_vom_lohn TEXT,
ADD COLUMN verbleibende_steuer TEXT,
ADD COLUMN summe_der_einkuenfte TEXT,
ADD COLUMN gesamtbetrag_der_einkuenfte TEXT,
ADD COLUMN sonderausgaben TEXT,
ADD COLUMN altersvorsorgeaufwendungen TEXT,
ADD COLUMN krankenversicherung TEXT,
ADD COLUMN pflegeversicherung TEXT,
ADD COLUMN einkuenfte_selbstaendig TEXT,
ADD COLUMN einkuenfte_nichtselbstaendig TEXT,
ADD COLUMN bruttoarbeitslohn TEXT,
ADD COLUMN werbungskosten TEXT,
ADD COLUMN vorauszahlungen TEXT;
