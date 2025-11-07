-- =====================================================
-- DATABASE SCHEMA EXPORT
-- Generated: 2025-11-07
-- Database: Elterngeld Application System
-- =====================================================

-- =====================================================
-- SECTION 1: DATABASE FUNCTIONS
-- =====================================================

-- Function: handle_new_user
-- Purpose: Automatically create profile entry when new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$function$;

-- Function: update_updated_at_column
-- Purpose: Automatically update the updated_at timestamp on row changes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- =====================================================
-- SECTION 2: TABLE DEFINITIONS
-- =====================================================

-- Table: profiles
-- Purpose: User profile information
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    email text NOT NULL,
    vorname text,
    nachname text,
    geburtsdatum date,
    strasse text,
    hausnummer text,
    plz text,
    wohnort text,
    telefon text,
    steuer_id text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);

-- Table: antraege
-- Purpose: Main application/request tracking
CREATE TABLE IF NOT EXISTS public.antraege (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT antraege_pkey PRIMARY KEY (id)
);

-- Table: geburtsurkunden
-- Purpose: Birth certificates
CREATE TABLE IF NOT EXISTS public.geburtsurkunden (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    file_path text,
    urkundennummer text,
    ausstelldatum date,
    behoerde_name text,
    kind_vorname text,
    kind_nachname text,
    kind_geburtsdatum date,
    kind_geburtsort text,
    kind_geburtsnummer text,
    mutter_vorname text,
    mutter_nachname text,
    mutter_geburtsname text,
    vater_vorname text,
    vater_nachname text,
    verwendungszweck text,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT geburtsurkunden_pkey PRIMARY KEY (id)
);

-- Table: eltern_dokumente
-- Purpose: Parent identification documents (ID, passport, residence permit)
CREATE TABLE IF NOT EXISTS public.eltern_dokumente (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    document_type text NOT NULL,
    person_type text NOT NULL,
    file_path text,
    vorname text,
    nachname text,
    geburtsname text,
    geburtsdatum date,
    geburtsort text,
    staatsangehoerigkeit text,
    ausweisnummer text,
    ausstelldatum date,
    gueltig_bis date,
    ausstellende_behoerde text,
    ausstellort text,
    strasse text,
    hausnummer text,
    wohnungsnummer text,
    plz text,
    wohnort text,
    aufenthaltstitel_art text,
    aufenthaltstitel_nummer text,
    aufenthaltstitel_gueltig_von date,
    aufenthaltstitel_gueltig_bis date,
    aufenthaltstitel_zweck text,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT eltern_dokumente_pkey PRIMARY KEY (id)
);

-- Table: meldebescheinigungen
-- Purpose: Registration certificates
CREATE TABLE IF NOT EXISTS public.meldebescheinigungen (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    antrag_id uuid,
    person_type text NOT NULL,
    file_path text,
    vorname text,
    nachname text,
    geburtsdatum date,
    strasse text,
    hausnummer text,
    plz text,
    wohnort text,
    meldedatum date,
    ausstelldatum date,
    behoerde text,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT meldebescheinigungen_pkey PRIMARY KEY (id)
);

-- Table: bankverbindungen
-- Purpose: Bank account information
CREATE TABLE IF NOT EXISTS public.bankverbindungen (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    antrag_id uuid,
    file_path text,
    kontoinhaber text,
    iban text,
    bic text,
    bank_name text,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT bankverbindungen_pkey PRIMARY KEY (id)
);

-- Table: arbeitgeberbescheinigungen
-- Purpose: Employer certificates
CREATE TABLE IF NOT EXISTS public.arbeitgeberbescheinigungen (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    antrag_id uuid,
    person_type text NOT NULL,
    file_path text,
    arbeitgeber_name text,
    arbeitgeber_adresse text,
    beschaeftigungsbeginn date,
    beschaeftigungsende date,
    wochenstunden numeric,
    bruttogehalt numeric,
    ausstelldatum date,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT arbeitgeberbescheinigungen_pkey PRIMARY KEY (id)
);

-- Table: gehaltsnachweise
-- Purpose: Salary statements
CREATE TABLE IF NOT EXISTS public.gehaltsnachweise (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    antrag_id uuid,
    person_type text NOT NULL,
    file_path text,
    arbeitgeber_name text,
    abrechnungsmonat text,
    bruttogehalt numeric,
    nettogehalt numeric,
    auszahlungsbetrag numeric,
    steuer_id text,
    sozialversicherungsnummer text,
    lohnsteuer numeric,
    kirchensteuer numeric,
    solidaritaetszuschlag numeric,
    krankenversicherung numeric,
    pflegeversicherung numeric,
    rentenversicherung numeric,
    arbeitslosenversicherung numeric,
    vermoegenswirksame_leistungen numeric,
    sonstige_bezuege numeric,
    sonstige_abzuege numeric,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT gehaltsnachweise_pkey PRIMARY KEY (id)
);

-- Table: einkommensteuerbescheide
-- Purpose: Income tax assessments
CREATE TABLE IF NOT EXISTS public.einkommensteuerbescheide (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    person_type text NOT NULL,
    file_path text,
    steuerjahr text,
    steuernummer text,
    steuer_id_nummer text,
    bescheiddatum date,
    finanzamt_name text,
    finanzamt_adresse text,
    vorname text,
    nachname text,
    adresse text,
    plz text,
    wohnort text,
    gemeinsame_veranlagung boolean DEFAULT false,
    partner1_vorname text,
    partner1_nachname text,
    partner1_steuer_id text,
    partner2_vorname text,
    partner2_nachname text,
    partner2_steuer_id text,
    bruttoarbeitslohn text,
    werbungskosten text,
    einkuenfte_nichtselbstaendig text,
    einkuenfte_selbstaendig text,
    summe_der_einkuenfte text,
    gesamtbetrag_der_einkuenfte text,
    sonderausgaben text,
    altersvorsorgeaufwendungen text,
    krankenversicherung text,
    pflegeversicherung text,
    zu_versteuerndes_einkommen text,
    festgesetzte_steuer text,
    solidaritaetszuschlag text,
    steuerabzug_vom_lohn text,
    vorauszahlungen text,
    verbleibende_steuer text,
    jahreseinkommen text,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT einkommensteuerbescheide_pkey PRIMARY KEY (id)
);

-- Table: selbststaendigen_nachweise
-- Purpose: Self-employment proofs
CREATE TABLE IF NOT EXISTS public.selbststaendigen_nachweise (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    antrag_id uuid,
    person_type text NOT NULL,
    file_path text,
    gewerbeart text,
    gewerbeanmeldung_datum date,
    steuernummer text,
    jahreseinkommen numeric,
    nachweiszeitraum_von date,
    nachweiszeitraum_bis date,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT selbststaendigen_nachweise_pkey PRIMARY KEY (id)
);

-- Table: krankenversicherung_nachweise
-- Purpose: Health insurance proofs
CREATE TABLE IF NOT EXISTS public.krankenversicherung_nachweise (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    antrag_id uuid,
    person_type text NOT NULL,
    file_path text,
    krankenkasse_name text,
    versichertennummer text,
    versicherungsart text,
    versicherungsbeginn date,
    beitragssatz numeric,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT krankenversicherung_nachweise_pkey PRIMARY KEY (id)
);

-- Table: mutterschaftsgeld
-- Purpose: Maternity benefit documents
CREATE TABLE IF NOT EXISTS public.mutterschaftsgeld (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    antrag_id uuid,
    file_path text,
    krankenkasse_name text,
    versichertennummer text,
    bescheiddatum date,
    leistungsbeginn date,
    leistungsende date,
    tagessatz numeric,
    gesamtbetrag numeric,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT mutterschaftsgeld_pkey PRIMARY KEY (id)
);

-- Table: leistungsbescheide
-- Purpose: Benefit decision notices
CREATE TABLE IF NOT EXISTS public.leistungsbescheide (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    antrag_id uuid,
    person_type text NOT NULL,
    file_path text,
    leistungsart text,
    bewilligungsstelle text,
    bescheiddatum date,
    leistungsbeginn date,
    leistungsende date,
    monatsbetrag numeric,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT leistungsbescheide_pkey PRIMARY KEY (id)
);

-- Table: ehe_sorgerecht_nachweise
-- Purpose: Marriage and custody documents
CREATE TABLE IF NOT EXISTS public.ehe_sorgerecht_nachweise (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    antrag_id uuid,
    dokument_typ text NOT NULL,
    file_path text,
    partner1_vorname text,
    partner1_nachname text,
    partner2_vorname text,
    partner2_nachname text,
    heiratsdatum date,
    standesamt text,
    kind_vorname text,
    kind_nachname text,
    sorgerecht_art text,
    ausstelldatum date,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT ehe_sorgerecht_nachweise_pkey PRIMARY KEY (id)
);

-- Table: adoptions_pflege_dokumente
-- Purpose: Adoption and foster care documents
CREATE TABLE IF NOT EXISTS public.adoptions_pflege_dokumente (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    antrag_id uuid,
    dokument_typ text NOT NULL,
    file_path text,
    kind_vorname text,
    kind_nachname text,
    kind_geburtsdatum date,
    beschlussdatum date,
    aufnahmedatum date,
    jugendamt text,
    pflegestelle_name text,
    confidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT adoptions_pflege_dokumente_pkey PRIMARY KEY (id)
);

-- Table: antrag_geburtsurkunden
-- Purpose: Many-to-many relationship between applications and birth certificates
CREATE TABLE IF NOT EXISTS public.antrag_geburtsurkunden (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    antrag_id uuid NOT NULL,
    geburtsurkunde_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT antrag_geburtsurkunden_pkey PRIMARY KEY (id)
);

-- Table: pdf_field_mappings
-- Purpose: Mappings between database fields and PDF form fields
CREATE TABLE IF NOT EXISTS public.pdf_field_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_type text NOT NULL,
    source_table text NOT NULL,
    source_field text NOT NULL,
    pdf_field_name text NOT NULL,
    mapping_status text DEFAULT 'auto'::text,
    confidence_score numeric DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pdf_field_mappings_pkey PRIMARY KEY (id)
);

-- Table: elterngeldantrag_progress
-- Purpose: Track user progress through the application form
CREATE TABLE IF NOT EXISTS public.elterngeldantrag_progress (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    current_step integer DEFAULT 1,
    completed_steps integer[] DEFAULT '{}'::integer[],
    field_mappings jsonb DEFAULT '{}'::jsonb,
    partial_pdf_path text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT elterngeldantrag_progress_pkey PRIMARY KEY (id)
);

-- Table: document_audit_log
-- Purpose: Audit trail for document operations
CREATE TABLE IF NOT EXISTS public.document_audit_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    document_type text NOT NULL,
    document_id uuid NOT NULL,
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT document_audit_log_pkey PRIMARY KEY (id)
);

-- Table: document_cleanup_settings
-- Purpose: User preferences for automatic document cleanup
CREATE TABLE IF NOT EXISTS public.document_cleanup_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    is_enabled boolean NOT NULL DEFAULT true,
    cleanup_interval_hours integer NOT NULL DEFAULT 48,
    last_run_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT document_cleanup_settings_pkey PRIMARY KEY (id)
);

-- =====================================================
-- SECTION 3: INDEXES
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_antraege_user_id ON public.antraege USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_geburtsurkunden_user_id ON public.geburtsurkunden USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_eltern_dokumente_user_id ON public.eltern_dokumente USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_meldebescheinigungen_user_id ON public.meldebescheinigungen USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_meldebescheinigungen_antrag_id ON public.meldebescheinigungen USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_bankverbindungen_user_id ON public.bankverbindungen USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_bankverbindungen_antrag_id ON public.bankverbindungen USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_arbeitgeberbescheinigungen_user_id ON public.arbeitgeberbescheinigungen USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_arbeitgeberbescheinigungen_antrag_id ON public.arbeitgeberbescheinigungen USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_gehaltsnachweise_user_id ON public.gehaltsnachweise USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_gehaltsnachweise_antrag_id ON public.gehaltsnachweise USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_einkommensteuerbescheide_user_id ON public.einkommensteuerbescheide USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_selbststaendigen_nachweise_user_id ON public.selbststaendigen_nachweise USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_selbststaendigen_nachweise_antrag_id ON public.selbststaendigen_nachweise USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_krankenversicherung_nachweise_user_id ON public.krankenversicherung_nachweise USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_krankenversicherung_nachweise_antrag_id ON public.krankenversicherung_nachweise USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_mutterschaftsgeld_user_id ON public.mutterschaftsgeld USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_mutterschaftsgeld_antrag_id ON public.mutterschaftsgeld USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_leistungsbescheide_user_id ON public.leistungsbescheide USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_leistungsbescheide_antrag_id ON public.leistungsbescheide USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_ehe_sorgerecht_nachweise_user_id ON public.ehe_sorgerecht_nachweise USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_ehe_sorgerecht_nachweise_antrag_id ON public.ehe_sorgerecht_nachweise USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_adoptions_pflege_dokumente_user_id ON public.adoptions_pflege_dokumente USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_adoptions_pflege_dokumente_antrag_id ON public.adoptions_pflege_dokumente USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_antrag_geburtsurkunden_antrag_id ON public.antrag_geburtsurkunden USING btree (antrag_id);
CREATE INDEX IF NOT EXISTS idx_antrag_geburtsurkunden_geburtsurkunde_id ON public.antrag_geburtsurkunden USING btree (geburtsurkunde_id);
CREATE INDEX IF NOT EXISTS idx_pdf_field_mappings_document_type ON public.pdf_field_mappings USING btree (document_type);
CREATE INDEX IF NOT EXISTS idx_pdf_field_mappings_is_active ON public.pdf_field_mappings USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_elterngeldantrag_progress_user_id ON public.elterngeldantrag_progress USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_log_user_id ON public.document_audit_log USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_log_document_type ON public.document_audit_log USING btree (document_type);
CREATE INDEX IF NOT EXISTS idx_document_cleanup_settings_user_id ON public.document_cleanup_settings USING btree (user_id);

-- =====================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antraege ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geburtsurkunden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eltern_dokumente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meldebescheinigungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankverbindungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbeitgeberbescheinigungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gehaltsnachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.einkommensteuerbescheide ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selbststaendigen_nachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.krankenversicherung_nachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutterschaftsgeld ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leistungsbescheide ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ehe_sorgerecht_nachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoptions_pflege_dokumente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antrag_geburtsurkunden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elterngeldantrag_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_cleanup_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Antraege policies
CREATE POLICY "Users can view their own antraege" ON public.antraege FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own antraege" ON public.antraege FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own antraege" ON public.antraege FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own antraege" ON public.antraege FOR DELETE USING (auth.uid() = user_id);

-- Geburtsurkunden policies
CREATE POLICY "Users can view their own geburtsurkunden" ON public.geburtsurkunden FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own geburtsurkunden" ON public.geburtsurkunden FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own geburtsurkunden" ON public.geburtsurkunden FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own geburtsurkunden" ON public.geburtsurkunden FOR DELETE USING (auth.uid() = user_id);

-- Eltern_dokumente policies
CREATE POLICY "Users can view their own eltern_dokumente" ON public.eltern_dokumente FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own eltern_dokumente" ON public.eltern_dokumente FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own eltern_dokumente" ON public.eltern_dokumente FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own eltern_dokumente" ON public.eltern_dokumente FOR DELETE USING (auth.uid() = user_id);

-- Meldebescheinigungen policies
CREATE POLICY "Users can view their own meldebescheinigungen" ON public.meldebescheinigungen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meldebescheinigungen" ON public.meldebescheinigungen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meldebescheinigungen" ON public.meldebescheinigungen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meldebescheinigungen" ON public.meldebescheinigungen FOR DELETE USING (auth.uid() = user_id);

-- Bankverbindungen policies
CREATE POLICY "Users can view their own bankverbindungen" ON public.bankverbindungen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bankverbindungen" ON public.bankverbindungen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bankverbindungen" ON public.bankverbindungen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bankverbindungen" ON public.bankverbindungen FOR DELETE USING (auth.uid() = user_id);

-- Arbeitgeberbescheinigungen policies
CREATE POLICY "Users can view their own arbeitgeberbescheinigungen" ON public.arbeitgeberbescheinigungen FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own arbeitgeberbescheinigungen" ON public.arbeitgeberbescheinigungen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own arbeitgeberbescheinigungen" ON public.arbeitgeberbescheinigungen FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own arbeitgeberbescheinigungen" ON public.arbeitgeberbescheinigungen FOR DELETE USING (auth.uid() = user_id);

-- Gehaltsnachweise policies
CREATE POLICY "Users can view their own gehaltsnachweise" ON public.gehaltsnachweise FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own gehaltsnachweise" ON public.gehaltsnachweise FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gehaltsnachweise" ON public.gehaltsnachweise FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gehaltsnachweise" ON public.gehaltsnachweise FOR DELETE USING (auth.uid() = user_id);

-- Einkommensteuerbescheide policies
CREATE POLICY "Users can view their own einkommensteuerbescheide" ON public.einkommensteuerbescheide FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own einkommensteuerbescheide" ON public.einkommensteuerbescheide FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own einkommensteuerbescheide" ON public.einkommensteuerbescheide FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own einkommensteuerbescheide" ON public.einkommensteuerbescheide FOR DELETE USING (auth.uid() = user_id);

-- Selbststaendigen_nachweise policies
CREATE POLICY "Users can view their own selbststaendigen_nachweise" ON public.selbststaendigen_nachweise FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own selbststaendigen_nachweise" ON public.selbststaendigen_nachweise FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own selbststaendigen_nachweise" ON public.selbststaendigen_nachweise FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own selbststaendigen_nachweise" ON public.selbststaendigen_nachweise FOR DELETE USING (auth.uid() = user_id);

-- Krankenversicherung_nachweise policies
CREATE POLICY "Users can view their own krankenversicherung_nachweise" ON public.krankenversicherung_nachweise FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own krankenversicherung_nachweise" ON public.krankenversicherung_nachweise FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own krankenversicherung_nachweise" ON public.krankenversicherung_nachweise FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own krankenversicherung_nachweise" ON public.krankenversicherung_nachweise FOR DELETE USING (auth.uid() = user_id);

-- Mutterschaftsgeld policies
CREATE POLICY "Users can view their own mutterschaftsgeld" ON public.mutterschaftsgeld FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mutterschaftsgeld" ON public.mutterschaftsgeld FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mutterschaftsgeld" ON public.mutterschaftsgeld FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own mutterschaftsgeld" ON public.mutterschaftsgeld FOR DELETE USING (auth.uid() = user_id);

-- Leistungsbescheide policies
CREATE POLICY "Users can view their own leistungsbescheide" ON public.leistungsbescheide FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own leistungsbescheide" ON public.leistungsbescheide FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leistungsbescheide" ON public.leistungsbescheide FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leistungsbescheide" ON public.leistungsbescheide FOR DELETE USING (auth.uid() = user_id);

-- Ehe_sorgerecht_nachweise policies
CREATE POLICY "Users can view their own ehe_sorgerecht_nachweise" ON public.ehe_sorgerecht_nachweise FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ehe_sorgerecht_nachweise" ON public.ehe_sorgerecht_nachweise FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ehe_sorgerecht_nachweise" ON public.ehe_sorgerecht_nachweise FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ehe_sorgerecht_nachweise" ON public.ehe_sorgerecht_nachweise FOR DELETE USING (auth.uid() = user_id);

-- Adoptions_pflege_dokumente policies
CREATE POLICY "Users can view their own adoptions_pflege_dokumente" ON public.adoptions_pflege_dokumente FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own adoptions_pflege_dokumente" ON public.adoptions_pflege_dokumente FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own adoptions_pflege_dokumente" ON public.adoptions_pflege_dokumente FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own adoptions_pflege_dokumente" ON public.adoptions_pflege_dokumente FOR DELETE USING (auth.uid() = user_id);

-- Antrag_geburtsurkunden policies
CREATE POLICY "Users can view their own antrag_geburtsurkunden" ON public.antrag_geburtsurkunden FOR SELECT USING (EXISTS (SELECT 1 FROM antraege WHERE antraege.id = antrag_geburtsurkunden.antrag_id AND antraege.user_id = auth.uid()));
CREATE POLICY "Users can insert their own antrag_geburtsurkunden" ON public.antrag_geburtsurkunden FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM antraege WHERE antraege.id = antrag_geburtsurkunden.antrag_id AND antraege.user_id = auth.uid()));
CREATE POLICY "Users can delete their own antrag_geburtsurkunden" ON public.antrag_geburtsurkunden FOR DELETE USING (EXISTS (SELECT 1 FROM antraege WHERE antraege.id = antrag_geburtsurkunden.antrag_id AND antraege.user_id = auth.uid()));

-- PDF field mappings policies
CREATE POLICY "Users can view field mappings" ON public.pdf_field_mappings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert field mappings" ON public.pdf_field_mappings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);
CREATE POLICY "Users can update field mappings" ON public.pdf_field_mappings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete field mappings" ON public.pdf_field_mappings FOR DELETE USING (auth.uid() IS NOT NULL);

-- Elterngeldantrag progress policies
CREATE POLICY "Users can view own progress" ON public.elterngeldantrag_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.elterngeldantrag_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.elterngeldantrag_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.elterngeldantrag_progress FOR DELETE USING (auth.uid() = user_id);

-- Document audit log policies
CREATE POLICY "Users can view their own audit logs" ON public.document_audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own audit logs" ON public.document_audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Document cleanup settings policies
CREATE POLICY "Users can view their own cleanup settings" ON public.document_cleanup_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cleanup settings" ON public.document_cleanup_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cleanup settings" ON public.document_cleanup_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cleanup settings" ON public.document_cleanup_settings FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- SECTION 5: TRIGGERS
-- =====================================================

-- Trigger: update_updated_at on antraege
CREATE TRIGGER update_antraege_updated_at
    BEFORE UPDATE ON public.antraege
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on geburtsurkunden
CREATE TRIGGER update_geburtsurkunden_updated_at
    BEFORE UPDATE ON public.geburtsurkunden
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on eltern_dokumente
CREATE TRIGGER update_eltern_dokumente_updated_at
    BEFORE UPDATE ON public.eltern_dokumente
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on meldebescheinigungen
CREATE TRIGGER update_meldebescheinigungen_updated_at
    BEFORE UPDATE ON public.meldebescheinigungen
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on bankverbindungen
CREATE TRIGGER update_bankverbindungen_updated_at
    BEFORE UPDATE ON public.bankverbindungen
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on arbeitgeberbescheinigungen
CREATE TRIGGER update_arbeitgeberbescheinigungen_updated_at
    BEFORE UPDATE ON public.arbeitgeberbescheinigungen
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on gehaltsnachweise
CREATE TRIGGER update_gehaltsnachweise_updated_at
    BEFORE UPDATE ON public.gehaltsnachweise
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on einkommensteuerbescheide
CREATE TRIGGER update_einkommensteuerbescheide_updated_at
    BEFORE UPDATE ON public.einkommensteuerbescheide
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on selbststaendigen_nachweise
CREATE TRIGGER update_selbststaendigen_nachweise_updated_at
    BEFORE UPDATE ON public.selbststaendigen_nachweise
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on krankenversicherung_nachweise
CREATE TRIGGER update_krankenversicherung_nachweise_updated_at
    BEFORE UPDATE ON public.krankenversicherung_nachweise
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on mutterschaftsgeld
CREATE TRIGGER update_mutterschaftsgeld_updated_at
    BEFORE UPDATE ON public.mutterschaftsgeld
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on leistungsbescheide
CREATE TRIGGER update_leistungsbescheide_updated_at
    BEFORE UPDATE ON public.leistungsbescheide
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on ehe_sorgerecht_nachweise
CREATE TRIGGER update_ehe_sorgerecht_nachweise_updated_at
    BEFORE UPDATE ON public.ehe_sorgerecht_nachweise
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on adoptions_pflege_dokumente
CREATE TRIGGER update_adoptions_pflege_dokumente_updated_at
    BEFORE UPDATE ON public.adoptions_pflege_dokumente
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on pdf_field_mappings
CREATE TRIGGER update_pdf_field_mappings_updated_at
    BEFORE UPDATE ON public.pdf_field_mappings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on elterngeldantrag_progress
CREATE TRIGGER update_elterngeldantrag_progress_updated_at
    BEFORE UPDATE ON public.elterngeldantrag_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update_updated_at on document_cleanup_settings
CREATE TRIGGER update_document_cleanup_settings_updated_at
    BEFORE UPDATE ON public.document_cleanup_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- END OF SCHEMA EXPORT
-- =====================================================
