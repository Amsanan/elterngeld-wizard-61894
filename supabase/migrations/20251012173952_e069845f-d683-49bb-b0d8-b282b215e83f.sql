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