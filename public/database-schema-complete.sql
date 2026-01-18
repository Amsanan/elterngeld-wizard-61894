-- ============================================
-- ELTERNGELD APPLICATION DATABASE SCHEMA
-- Generated: 2024-12-14
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.geschlecht_type AS ENUM ('weiblich', 'maennlich', 'divers', 'ohne_angabe');
CREATE TYPE public.person_type_enum AS ENUM ('mutter', 'vater');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user registration
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

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to get table columns (for schema introspection)
CREATE OR REPLACE FUNCTION public.get_table_columns(table_names text[])
RETURNS TABLE(table_name text, column_name text, data_type text, is_nullable text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = ANY(table_names)
  ORDER BY c.table_name, c.ordinal_position;
END;
$$;

-- ============================================
-- TABLES
-- ============================================

-- User Roles Table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  vorname TEXT,
  nachname TEXT,
  geburtsdatum DATE,
  steuer_id TEXT,
  telefon TEXT,
  strasse TEXT,
  hausnummer TEXT,
  plz TEXT,
  wohnort TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Applications (Antraege) Table
CREATE TABLE public.antraege (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Birth Certificates (Geburtsurkunden) Table
CREATE TABLE public.geburtsurkunden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  kind_geburtsort TEXT,
  kind_geburtsnummer TEXT,
  mutter_vorname TEXT,
  mutter_nachname TEXT,
  mutter_geburtsname TEXT,
  vater_vorname TEXT,
  vater_nachname TEXT,
  behoerde_name TEXT,
  urkundennummer TEXT,
  verwendungszweck TEXT,
  ausstelldatum DATE,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Parent Documents (Eltern Dokumente) Table
CREATE TABLE public.eltern_dokumente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  person_type person_type_enum NOT NULL,
  document_type TEXT NOT NULL,
  vorname TEXT,
  nachname TEXT,
  geburtsname TEXT,
  geburtsdatum DATE,
  geburtsort TEXT,
  staatsangehoerigkeit TEXT,
  ausweisnummer TEXT,
  ausstellende_behoerde TEXT,
  ausstelldatum DATE,
  ausstellort TEXT,
  gueltig_bis DATE,
  plz TEXT,
  wohnort TEXT,
  strasse TEXT,
  hausnummer TEXT,
  wohnungsnummer TEXT,
  aufenthaltstitel_art TEXT,
  aufenthaltstitel_nummer TEXT,
  aufenthaltstitel_zweck TEXT,
  aufenthaltstitel_gueltig_von DATE,
  aufenthaltstitel_gueltig_bis DATE,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Registration Certificates (Meldebescheinigungen) Table
CREATE TABLE public.meldebescheinigungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum NOT NULL,
  vorname TEXT,
  nachname TEXT,
  geburtsdatum DATE,
  strasse TEXT,
  hausnummer TEXT,
  plz TEXT,
  wohnort TEXT,
  meldedatum DATE,
  ausstelldatum DATE,
  behoerde TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bank Details (Bankverbindungen) Table
CREATE TABLE public.bankverbindungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID,
  kontoinhaber TEXT,
  iban TEXT,
  bic TEXT,
  bank_name TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employer Certificates (Arbeitgeberbescheinigungen) Table
CREATE TABLE public.arbeitgeberbescheinigungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum NOT NULL,
  arbeitgeber_name TEXT,
  arbeitgeber_adresse TEXT,
  beschaeftigungsbeginn DATE,
  beschaeftigungsende DATE,
  wochenstunden NUMERIC,
  bruttogehalt NUMERIC,
  ausstelldatum DATE,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Salary Statements (Gehaltsnachweise) Table
CREATE TABLE public.gehaltsnachweise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum NOT NULL,
  abrechnungsmonat TEXT,
  arbeitgeber_name TEXT,
  steuer_id TEXT,
  sozialversicherungsnummer TEXT,
  bruttogehalt NUMERIC,
  nettogehalt NUMERIC,
  lohnsteuer NUMERIC,
  kirchensteuer NUMERIC,
  solidaritaetszuschlag NUMERIC,
  krankenversicherung NUMERIC,
  rentenversicherung NUMERIC,
  arbeitslosenversicherung NUMERIC,
  pflegeversicherung NUMERIC,
  vermoegenswirksame_leistungen NUMERIC,
  sonstige_bezuege NUMERIC,
  sonstige_abzuege NUMERIC,
  auszahlungsbetrag NUMERIC,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Health Insurance Certificates (Krankenversicherung Nachweise) Table
CREATE TABLE public.krankenversicherung_nachweise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum NOT NULL,
  krankenkasse_name TEXT,
  versichertennummer TEXT,
  versicherungsart TEXT,
  versicherungsbeginn DATE,
  beitragssatz NUMERIC,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maternity Benefit (Mutterschaftsgeld) Table
CREATE TABLE public.mutterschaftsgeld (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID,
  krankenkasse_name TEXT,
  versichertennummer TEXT,
  leistungsbeginn DATE,
  leistungsende DATE,
  tagessatz NUMERIC,
  gesamtbetrag NUMERIC,
  bescheiddatum DATE,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Benefit Notices (Leistungsbescheide) Table
CREATE TABLE public.leistungsbescheide (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum NOT NULL,
  leistungsart TEXT,
  bewilligungsstelle TEXT,
  leistungsbeginn DATE,
  leistungsende DATE,
  monatsbetrag NUMERIC,
  bescheiddatum DATE,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Self-Employment Certificates (Selbststaendigen Nachweise) Table
CREATE TABLE public.selbststaendigen_nachweise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum NOT NULL,
  gewerbeart TEXT,
  steuernummer TEXT,
  gewerbeanmeldung_datum DATE,
  jahreseinkommen NUMERIC,
  nachweiszeitraum_von DATE,
  nachweiszeitraum_bis DATE,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tax Assessments (Einkommensteuerbescheide) Table
CREATE TABLE public.einkommensteuerbescheide (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  person_type person_type_enum NOT NULL,
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
  steuer_id_nummer TEXT,
  finanzamt_name TEXT,
  finanzamt_adresse TEXT,
  bescheiddatum DATE,
  gemeinsame_veranlagung BOOLEAN DEFAULT false,
  solidaritaetszuschlag TEXT,
  steuerabzug_vom_lohn TEXT,
  verbleibende_steuer TEXT,
  summe_der_einkuenfte TEXT,
  gesamtbetrag_der_einkuenfte TEXT,
  sonderausgaben TEXT,
  altersvorsorgeaufwendungen TEXT,
  krankenversicherung TEXT,
  pflegeversicherung TEXT,
  einkuenfte_selbstaendig TEXT,
  einkuenfte_nichtselbstaendig TEXT,
  bruttoarbeitslohn TEXT,
  werbungskosten TEXT,
  vorauszahlungen TEXT,
  partner1_vorname TEXT,
  partner1_nachname TEXT,
  partner1_steuer_id TEXT,
  partner2_vorname TEXT,
  partner2_nachname TEXT,
  partner2_steuer_id TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Marriage/Custody Certificates (Ehe Sorgerecht Nachweise) Table
CREATE TABLE public.ehe_sorgerecht_nachweise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID,
  dokument_typ TEXT NOT NULL,
  partner1_vorname TEXT,
  partner1_nachname TEXT,
  partner2_vorname TEXT,
  partner2_nachname TEXT,
  heiratsdatum DATE,
  standesamt TEXT,
  kind_vorname TEXT,
  kind_nachname TEXT,
  sorgerecht_art TEXT,
  ausstelldatum DATE,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adoption/Foster Documents (Adoptions Pflege Dokumente) Table
CREATE TABLE public.adoptions_pflege_dokumente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  antrag_id UUID,
  dokument_typ TEXT NOT NULL,
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  aufnahmedatum DATE,
  beschlussdatum DATE,
  pflegestelle_name TEXT,
  jugendamt TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Application-Birth Certificate Junction Table
CREATE TABLE public.antrag_geburtsurkunden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  antrag_id UUID NOT NULL,
  geburtsurkunde_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PDF Field Mappings Table
CREATE TABLE public.pdf_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_field TEXT NOT NULL,
  pdf_field_name TEXT NOT NULL,
  mapping_status TEXT DEFAULT 'auto',
  confidence_score NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  filter_condition JSONB,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document Audit Log Table
CREATE TABLE public.document_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document Cleanup Settings Table
CREATE TABLE public.document_cleanup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  cleanup_interval_hours INTEGER NOT NULL DEFAULT 48,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Elterngeld Application Progress Table
CREATE TABLE public.elterngeldantrag_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT '{}',
  field_mappings JSONB DEFAULT '{}',
  partial_pdf_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antraege ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geburtsurkunden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eltern_dokumente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meldebescheinigungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankverbindungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbeitgeberbescheinigungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gehaltsnachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.krankenversicherung_nachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutterschaftsgeld ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leistungsbescheide ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selbststaendigen_nachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.einkommensteuerbescheide ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehe_sorgerecht_nachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoptions_pflege_dokumente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antrag_geburtsurkunden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_cleanup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elterngeldantrag_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- User Roles Policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Antraege Policies
CREATE POLICY "Users can view their own antraege" ON public.antraege
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own antraege" ON public.antraege
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own antraege" ON public.antraege
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own antraege" ON public.antraege
  FOR DELETE USING (auth.uid() = user_id);

-- Geburtsurkunden Policies
CREATE POLICY "Users can view their own geburtsurkunden" ON public.geburtsurkunden
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own geburtsurkunden" ON public.geburtsurkunden
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own geburtsurkunden" ON public.geburtsurkunden
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own geburtsurkunden" ON public.geburtsurkunden
  FOR DELETE USING (auth.uid() = user_id);

-- Eltern Dokumente Policies
CREATE POLICY "Users can view their own eltern_dokumente" ON public.eltern_dokumente
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own eltern_dokumente" ON public.eltern_dokumente
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own eltern_dokumente" ON public.eltern_dokumente
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own eltern_dokumente" ON public.eltern_dokumente
  FOR DELETE USING (auth.uid() = user_id);

-- Meldebescheinigungen Policies
CREATE POLICY "Users can view their own meldebescheinigungen" ON public.meldebescheinigungen
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meldebescheinigungen" ON public.meldebescheinigungen
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meldebescheinigungen" ON public.meldebescheinigungen
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meldebescheinigungen" ON public.meldebescheinigungen
  FOR DELETE USING (auth.uid() = user_id);

-- Bankverbindungen Policies
CREATE POLICY "Users can view their own bankverbindungen" ON public.bankverbindungen
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bankverbindungen" ON public.bankverbindungen
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bankverbindungen" ON public.bankverbindungen
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bankverbindungen" ON public.bankverbindungen
  FOR DELETE USING (auth.uid() = user_id);

-- Arbeitgeberbescheinigungen Policies
CREATE POLICY "Users can view their own arbeitgeberbescheinigungen" ON public.arbeitgeberbescheinigungen
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own arbeitgeberbescheinigungen" ON public.arbeitgeberbescheinigungen
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own arbeitgeberbescheinigungen" ON public.arbeitgeberbescheinigungen
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own arbeitgeberbescheinigungen" ON public.arbeitgeberbescheinigungen
  FOR DELETE USING (auth.uid() = user_id);

-- Gehaltsnachweise Policies
CREATE POLICY "Users can view their own gehaltsnachweise" ON public.gehaltsnachweise
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gehaltsnachweise" ON public.gehaltsnachweise
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gehaltsnachweise" ON public.gehaltsnachweise
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gehaltsnachweise" ON public.gehaltsnachweise
  FOR DELETE USING (auth.uid() = user_id);

-- Krankenversicherung Nachweise Policies
CREATE POLICY "Users can view their own krankenversicherung_nachweise" ON public.krankenversicherung_nachweise
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own krankenversicherung_nachweise" ON public.krankenversicherung_nachweise
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own krankenversicherung_nachweise" ON public.krankenversicherung_nachweise
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own krankenversicherung_nachweise" ON public.krankenversicherung_nachweise
  FOR DELETE USING (auth.uid() = user_id);

-- Mutterschaftsgeld Policies
CREATE POLICY "Users can view their own mutterschaftsgeld" ON public.mutterschaftsgeld
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mutterschaftsgeld" ON public.mutterschaftsgeld
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mutterschaftsgeld" ON public.mutterschaftsgeld
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mutterschaftsgeld" ON public.mutterschaftsgeld
  FOR DELETE USING (auth.uid() = user_id);

-- Leistungsbescheide Policies
CREATE POLICY "Users can view their own leistungsbescheide" ON public.leistungsbescheide
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leistungsbescheide" ON public.leistungsbescheide
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leistungsbescheide" ON public.leistungsbescheide
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leistungsbescheide" ON public.leistungsbescheide
  FOR DELETE USING (auth.uid() = user_id);

-- Selbststaendigen Nachweise Policies
CREATE POLICY "Users can view their own selbststaendigen_nachweise" ON public.selbststaendigen_nachweise
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own selbststaendigen_nachweise" ON public.selbststaendigen_nachweise
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own selbststaendigen_nachweise" ON public.selbststaendigen_nachweise
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own selbststaendigen_nachweise" ON public.selbststaendigen_nachweise
  FOR DELETE USING (auth.uid() = user_id);

-- Einkommensteuerbescheide Policies
CREATE POLICY "Users can view their own einkommensteuerbescheide" ON public.einkommensteuerbescheide
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own einkommensteuerbescheide" ON public.einkommensteuerbescheide
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own einkommensteuerbescheide" ON public.einkommensteuerbescheide
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own einkommensteuerbescheide" ON public.einkommensteuerbescheide
  FOR DELETE USING (auth.uid() = user_id);

-- Ehe Sorgerecht Nachweise Policies
CREATE POLICY "Users can view their own ehe_sorgerecht_nachweise" ON public.ehe_sorgerecht_nachweise
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ehe_sorgerecht_nachweise" ON public.ehe_sorgerecht_nachweise
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ehe_sorgerecht_nachweise" ON public.ehe_sorgerecht_nachweise
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ehe_sorgerecht_nachweise" ON public.ehe_sorgerecht_nachweise
  FOR DELETE USING (auth.uid() = user_id);

-- Adoptions Pflege Dokumente Policies
CREATE POLICY "Users can view their own adoptions_pflege_dokumente" ON public.adoptions_pflege_dokumente
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own adoptions_pflege_dokumente" ON public.adoptions_pflege_dokumente
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own adoptions_pflege_dokumente" ON public.adoptions_pflege_dokumente
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own adoptions_pflege_dokumente" ON public.adoptions_pflege_dokumente
  FOR DELETE USING (auth.uid() = user_id);

-- Antrag Geburtsurkunden Policies
CREATE POLICY "Users can view their own antrag_geburtsurkunden" ON public.antrag_geburtsurkunden
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM antraege WHERE antraege.id = antrag_geburtsurkunden.antrag_id AND antraege.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own antrag_geburtsurkunden" ON public.antrag_geburtsurkunden
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM antraege WHERE antraege.id = antrag_geburtsurkunden.antrag_id AND antraege.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own antrag_geburtsurkunden" ON public.antrag_geburtsurkunden
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM antraege WHERE antraege.id = antrag_geburtsurkunden.antrag_id AND antraege.user_id = auth.uid()
  ));

-- PDF Field Mappings Policies
CREATE POLICY "Users can view field mappings" ON public.pdf_field_mappings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert field mappings" ON public.pdf_field_mappings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Users can update field mappings" ON public.pdf_field_mappings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete field mappings" ON public.pdf_field_mappings
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Document Audit Log Policies
CREATE POLICY "Users can view their own audit logs" ON public.document_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs" ON public.document_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Document Cleanup Settings Policies
CREATE POLICY "Users can view their own cleanup settings" ON public.document_cleanup_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cleanup settings" ON public.document_cleanup_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cleanup settings" ON public.document_cleanup_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cleanup settings" ON public.document_cleanup_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Elterngeldantrag Progress Policies
CREATE POLICY "Users can view own progress" ON public.elterngeldantrag_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.elterngeldantrag_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.elterngeldantrag_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON public.elterngeldantrag_progress
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at triggers
CREATE TRIGGER update_antraege_updated_at BEFORE UPDATE ON public.antraege
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_geburtsurkunden_updated_at BEFORE UPDATE ON public.geburtsurkunden
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eltern_dokumente_updated_at BEFORE UPDATE ON public.eltern_dokumente
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meldebescheinigungen_updated_at BEFORE UPDATE ON public.meldebescheinigungen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bankverbindungen_updated_at BEFORE UPDATE ON public.bankverbindungen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_arbeitgeberbescheinigungen_updated_at BEFORE UPDATE ON public.arbeitgeberbescheinigungen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gehaltsnachweise_updated_at BEFORE UPDATE ON public.gehaltsnachweise
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_krankenversicherung_nachweise_updated_at BEFORE UPDATE ON public.krankenversicherung_nachweise
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mutterschaftsgeld_updated_at BEFORE UPDATE ON public.mutterschaftsgeld
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leistungsbescheide_updated_at BEFORE UPDATE ON public.leistungsbescheide
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_selbststaendigen_nachweise_updated_at BEFORE UPDATE ON public.selbststaendigen_nachweise
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_einkommensteuerbescheide_updated_at BEFORE UPDATE ON public.einkommensteuerbescheide
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ehe_sorgerecht_nachweise_updated_at BEFORE UPDATE ON public.ehe_sorgerecht_nachweise
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_adoptions_pflege_dokumente_updated_at BEFORE UPDATE ON public.adoptions_pflege_dokumente
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pdf_field_mappings_updated_at BEFORE UPDATE ON public.pdf_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_cleanup_settings_updated_at BEFORE UPDATE ON public.document_cleanup_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_elterngeldantrag_progress_updated_at BEFORE UPDATE ON public.elterngeldantrag_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_geburtsurkunden_user_id ON public.geburtsurkunden(user_id);
CREATE INDEX idx_eltern_dokumente_user_id ON public.eltern_dokumente(user_id);
CREATE INDEX idx_meldebescheinigungen_user_id ON public.meldebescheinigungen(user_id);
CREATE INDEX idx_bankverbindungen_user_id ON public.bankverbindungen(user_id);
CREATE INDEX idx_arbeitgeberbescheinigungen_user_id ON public.arbeitgeberbescheinigungen(user_id);
CREATE INDEX idx_gehaltsnachweise_user_id ON public.gehaltsnachweise(user_id);
CREATE INDEX idx_krankenversicherung_nachweise_user_id ON public.krankenversicherung_nachweise(user_id);
CREATE INDEX idx_mutterschaftsgeld_user_id ON public.mutterschaftsgeld(user_id);
CREATE INDEX idx_leistungsbescheide_user_id ON public.leistungsbescheide(user_id);
CREATE INDEX idx_selbststaendigen_nachweise_user_id ON public.selbststaendigen_nachweise(user_id);
CREATE INDEX idx_einkommensteuerbescheide_user_id ON public.einkommensteuerbescheide(user_id);
CREATE INDEX idx_ehe_sorgerecht_nachweise_user_id ON public.ehe_sorgerecht_nachweise(user_id);
CREATE INDEX idx_adoptions_pflege_dokumente_user_id ON public.adoptions_pflege_dokumente(user_id);
CREATE INDEX idx_antraege_user_id ON public.antraege(user_id);
CREATE INDEX idx_pdf_field_mappings_document_type ON public.pdf_field_mappings(document_type);
CREATE INDEX idx_pdf_field_mappings_source_table ON public.pdf_field_mappings(source_table);
CREATE INDEX idx_document_audit_log_user_id ON public.document_audit_log(user_id);
CREATE INDEX idx_document_audit_log_document_id ON public.document_audit_log(document_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================
-- STORAGE BUCKETS (Reference Only)
-- ============================================
-- These need to be created via Lovable Cloud or API:
-- 
-- Bucket: application-documents (private)
-- Bucket: form-templates (public)
-- Bucket: xml-schemas (public)
-- Bucket: elterngeldantrag-drafts (public)

-- ============================================
-- END OF SCHEMA
-- ============================================
