-- ============================================================================
-- DATABASE SCHEMA EXPORT
-- Generated: 2026-01-28
-- Project: Elterngeld Application System
-- ============================================================================

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.person_type_enum AS ENUM ('antragsteller', 'partner');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- adoptions_pflege_dokumente
-- ----------------------------------------------------------------------------
CREATE TABLE public.adoptions_pflege_dokumente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  dokument_typ TEXT NOT NULL,
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  aufnahmedatum DATE,
  pflegestelle_name TEXT,
  jugendamt TEXT,
  beschlussdatum DATE,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- aerztliche_zeugnisse
-- ----------------------------------------------------------------------------
CREATE TABLE public.aerztliche_zeugnisse (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  zeugnis_typ TEXT NOT NULL,
  arzt_name TEXT,
  arzt_praxis TEXT,
  ausstelldatum DATE,
  errechneter_geburtstermin DATE,
  verbot_beginn DATE,
  verbot_ende DATE,
  verbot_grund TEXT,
  verbot_art TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- antraege
-- ----------------------------------------------------------------------------
CREATE TABLE public.antraege (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- antrag_geburtsurkunden (junction table)
-- ----------------------------------------------------------------------------
CREATE TABLE public.antrag_geburtsurkunden (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  antrag_id UUID NOT NULL,
  geburtsurkunde_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (antrag_id, geburtsurkunde_id)
);

-- ----------------------------------------------------------------------------
-- antrag_progress
-- ----------------------------------------------------------------------------
CREATE TABLE public.antrag_progress (
  antrag_id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL,
  current_step INTEGER,
  completed_steps INTEGER[],
  field_mappings JSONB,
  partial_pdf_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- arbeitgeberbescheinigungen
-- ----------------------------------------------------------------------------
CREATE TABLE public.arbeitgeberbescheinigungen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
  elternzeit_1_von DATE,
  elternzeit_1_bis DATE,
  elternzeit_2_von DATE,
  elternzeit_2_bis DATE,
  elternzeit_3_von DATE,
  elternzeit_3_bis DATE,
  mutterschutz_beginn DATE,
  mutterschutz_ende DATE,
  urlaub_1_von DATE,
  urlaub_1_bis DATE,
  urlaub_2_von DATE,
  urlaub_2_bis DATE,
  resturlaub_tage INTEGER,
  ag_zuschuss_mutterschaftsgeld NUMERIC,
  ag_zuschuss_beginn DATE,
  ag_zuschuss_ende DATE,
  ag_zuschuss_tagessatz NUMERIC,
  sachbezuege_ja BOOLEAN DEFAULT false,
  sachbezuege_von DATE,
  sachbezuege_bis DATE,
  sachbezuege_tagessatz NUMERIC,
  teilzeit_elternzeit_ja BOOLEAN DEFAULT false,
  teilzeit_von DATE,
  teilzeit_bis DATE,
  teilzeit_stunden NUMERIC,
  teilzeit_brutto NUMERIC,
  teilzeit_netto NUMERIC,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- bankverbindungen
-- ----------------------------------------------------------------------------
CREATE TABLE public.bankverbindungen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  kontoinhaber TEXT,
  iban TEXT,
  bic TEXT,
  bank_name TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- computed_field_rules
-- ----------------------------------------------------------------------------
CREATE TABLE public.computed_field_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  page_number INTEGER,
  flow_definition JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  execution_order INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- document_audit_log
-- ----------------------------------------------------------------------------
CREATE TABLE public.document_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- document_cleanup_settings
-- ----------------------------------------------------------------------------
CREATE TABLE public.document_cleanup_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  cleanup_interval_hours INTEGER NOT NULL DEFAULT 48,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- document_field_provenance
-- ----------------------------------------------------------------------------
CREATE TABLE public.document_field_provenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pdf_field_name TEXT NOT NULL,
  source_document_type TEXT,
  source_document_id UUID,
  extracted_key TEXT,
  extracted_value TEXT,
  confidence NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, pdf_field_name)
);

-- ----------------------------------------------------------------------------
-- ehe_sorgerecht_nachweise
-- ----------------------------------------------------------------------------
CREATE TABLE public.ehe_sorgerecht_nachweise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  dokument_typ TEXT NOT NULL,
  partner1_vorname TEXT,
  partner1_nachname TEXT,
  partner2_vorname TEXT,
  partner2_nachname TEXT,
  heiratsdatum DATE,
  standesamt TEXT,
  ausstelldatum DATE,
  kind_vorname TEXT,
  kind_nachname TEXT,
  sorgerecht_art TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- einkommensteuerbescheide
-- ----------------------------------------------------------------------------
CREATE TABLE public.einkommensteuerbescheide (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  person_type person_type_enum NOT NULL,
  steuerjahr TEXT,
  steuernummer TEXT,
  steuer_id_nummer TEXT,
  vorname TEXT,
  nachname TEXT,
  adresse TEXT,
  plz TEXT,
  wohnort TEXT,
  bescheiddatum DATE,
  finanzamt_name TEXT,
  finanzamt_adresse TEXT,
  gemeinsame_veranlagung BOOLEAN DEFAULT false,
  partner1_vorname TEXT,
  partner1_nachname TEXT,
  partner1_steuer_id TEXT,
  partner2_vorname TEXT,
  partner2_nachname TEXT,
  partner2_steuer_id TEXT,
  jahreseinkommen TEXT,
  gesamtbetrag_der_einkuenfte TEXT,
  summe_der_einkuenfte TEXT,
  zu_versteuerndes_einkommen TEXT,
  festgesetzte_steuer TEXT,
  verbleibende_steuer TEXT,
  bruttoarbeitslohn TEXT,
  einkuenfte_nichtselbstaendig TEXT,
  einkuenfte_selbstaendig TEXT,
  werbungskosten TEXT,
  sonderausgaben TEXT,
  altersvorsorgeaufwendungen TEXT,
  krankenversicherung TEXT,
  pflegeversicherung TEXT,
  steuerabzug_vom_lohn TEXT,
  solidaritaetszuschlag TEXT,
  vorauszahlungen TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- eltern_dokumente
-- ----------------------------------------------------------------------------
CREATE TABLE public.eltern_dokumente (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
  ausstelldatum DATE,
  gueltig_bis DATE,
  ausstellende_behoerde TEXT,
  ausstellort TEXT,
  strasse TEXT,
  hausnummer TEXT,
  wohnungsnummer TEXT,
  plz TEXT,
  wohnort TEXT,
  aufenthaltstitel_art TEXT,
  aufenthaltstitel_nummer TEXT,
  aufenthaltstitel_zweck TEXT,
  aufenthaltstitel_gueltig_von DATE,
  aufenthaltstitel_gueltig_bis DATE,
  ist_antragsteller BOOLEAN DEFAULT false,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- elterngeldantrag_data
-- ----------------------------------------------------------------------------
CREATE TABLE public.elterngeldantrag_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  antragsteller_person_type TEXT,
  eltern1_wohnsitz_de_ja BOOLEAN,
  eltern1_geschlecht_maennlich BOOLEAN,
  eltern1_geschlecht_weiblich BOOLEAN,
  eltern1_geschlecht_divers BOOLEAN,
  eltern1_familienstand_ledig BOOLEAN,
  eltern1_familienstand_verheiratet BOOLEAN,
  eltern1_familienstand_verpartnert BOOLEAN,
  eltern1_familienstand_geschieden BOOLEAN,
  eltern1_familienstand_verwitwet BOOLEAN,
  eltern1_staatsangehoerigkeit TEXT,
  eltern1_staatsangehoerigkeit_deutsch BOOLEAN,
  eltern1_staatsangehoerigkeit_andere BOOLEAN,
  eltern1_staatenlos BOOLEAN,
  eltern1_telefon TEXT,
  eltern1_email TEXT,
  eltern2_wohnsitz_de_ja BOOLEAN,
  eltern2_geschlecht_maennlich BOOLEAN,
  eltern2_geschlecht_weiblich BOOLEAN,
  eltern2_geschlecht_divers BOOLEAN,
  eltern2_geschlecht_ohne_angabe BOOLEAN,
  eltern2_familienstand_ledig BOOLEAN,
  eltern2_familienstand_verheiratet BOOLEAN,
  eltern2_familienstand_verpartnert BOOLEAN,
  eltern2_familienstand_geschieden BOOLEAN,
  eltern2_familienstand_verwitwet BOOLEAN,
  eltern2_staatsangehoerigkeit TEXT,
  eltern2_staatsangehoerigkeit_deutsch BOOLEAN,
  eltern2_staatsangehoerigkeit_andere BOOLEAN,
  eltern2_staatenlos BOOLEAN,
  eltern2_telefon TEXT,
  eltern2_email TEXT,
  eltern_alleinerziehend BOOLEAN DEFAULT false,
  eltern_alleinerziehend_kindeswohl BOOLEAN,
  eltern_alleinerziehend_nichtbetreuung BOOLEAN,
  haushalt_weitere_kinder_vorhanden BOOLEAN,
  haushalt_weitere_kinder_keine BOOLEAN,
  haushalt_weitere_kinder_anzahl INTEGER,
  kind_fruehgeburt BOOLEAN DEFAULT false,
  kind_errechneter_termin DATE,
  kind_mehrlinge_ja BOOLEAN DEFAULT false,
  kind_mehrlinge_anzahl INTEGER,
  geschwisterbonus_kind1_vorname TEXT,
  geschwisterbonus_kind1_nachname TEXT,
  geschwisterbonus_kind1_geburtsdatum DATE,
  geschwisterbonus_kind1_beziehung_eltern1_leiblich BOOLEAN,
  geschwisterbonus_kind1_beziehung_eltern1_adoptiv BOOLEAN,
  geschwisterbonus_kind1_beziehung_eltern1_partnerkind BOOLEAN,
  geschwisterbonus_kind1_beziehung_eltern2_leiblich BOOLEAN,
  geschwisterbonus_kind1_beziehung_eltern2_adoptiv BOOLEAN,
  geschwisterbonus_kind1_beziehung_eltern2_partnerkind BOOLEAN,
  geschwisterbonus_kind1_gdb_flag BOOLEAN,
  geschwisterbonus_kind2_vorname TEXT,
  geschwisterbonus_kind2_nachname TEXT,
  geschwisterbonus_kind2_geburtsdatum DATE,
  geschwisterbonus_kind2_beziehung_eltern1_leiblich BOOLEAN,
  geschwisterbonus_kind2_beziehung_eltern1_adoptiv BOOLEAN,
  geschwisterbonus_kind2_beziehung_eltern1_partnerkind BOOLEAN,
  geschwisterbonus_kind2_beziehung_eltern2_leiblich BOOLEAN,
  geschwisterbonus_kind2_beziehung_eltern2_adoptiv BOOLEAN,
  geschwisterbonus_kind2_beziehung_eltern2_partnerkind BOOLEAN,
  geschwisterbonus_kind2_gdb_flag BOOLEAN,
  geschwisterbonus_kind3_vorname TEXT,
  geschwisterbonus_kind3_nachname TEXT,
  geschwisterbonus_kind3_geburtsdatum DATE,
  geschwisterbonus_kind3_beziehung_eltern1_leiblich BOOLEAN,
  geschwisterbonus_kind3_beziehung_eltern1_adoptiv BOOLEAN,
  geschwisterbonus_kind3_beziehung_eltern1_partnerkind BOOLEAN,
  geschwisterbonus_kind3_beziehung_eltern2_leiblich BOOLEAN,
  geschwisterbonus_kind3_beziehung_eltern2_adoptiv BOOLEAN,
  geschwisterbonus_kind3_beziehung_eltern2_partnerkind BOOLEAN,
  geschwisterbonus_kind3_gdb_flag BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- elterngeldantrag_progress
-- ----------------------------------------------------------------------------
CREATE TABLE public.elterngeldantrag_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_step INTEGER,
  completed_steps INTEGER[],
  field_mappings JSONB,
  field_states JSONB,
  partial_pdf_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- field_fill_modes
-- ----------------------------------------------------------------------------
CREATE TABLE public.field_fill_modes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdf_field_name TEXT NOT NULL,
  fill_mode TEXT NOT NULL,
  fill_reason TEXT,
  max_confidence NUMERIC DEFAULT 0.8,
  doc_types TEXT[] DEFAULT '{}'::text[],
  entities TEXT[] DEFAULT '{}'::text[],
  has_analysis_link BOOLEAN DEFAULT false,
  analysis_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- geburtsurkunden
-- ----------------------------------------------------------------------------
CREATE TABLE public.geburtsurkunden (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  kind_geburtsort TEXT,
  kind_geburtsnummer TEXT,
  kind_typ TEXT DEFAULT 'primaer',
  kind_ordnungszahl INTEGER DEFAULT 0,
  mehrling_nummer INTEGER,
  ist_fruehgeburt BOOLEAN DEFAULT false,
  errechneter_geburtstermin DATE,
  mutter_vorname TEXT,
  mutter_nachname TEXT,
  mutter_geburtsname TEXT,
  vater_vorname TEXT,
  vater_nachname TEXT,
  ausstelldatum DATE,
  behoerde_name TEXT,
  urkundennummer TEXT,
  verwendungszweck TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- gehaltsnachweise
-- ----------------------------------------------------------------------------
CREATE TABLE public.gehaltsnachweise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum NOT NULL,
  arbeitgeber_name TEXT,
  abrechnungsmonat TEXT,
  bruttogehalt NUMERIC,
  nettogehalt NUMERIC,
  auszahlungsbetrag NUMERIC,
  steuer_id TEXT,
  sozialversicherungsnummer TEXT,
  lohnsteuer NUMERIC,
  kirchensteuer NUMERIC,
  solidaritaetszuschlag NUMERIC,
  krankenversicherung NUMERIC,
  pflegeversicherung NUMERIC,
  rentenversicherung NUMERIC,
  arbeitslosenversicherung NUMERIC,
  vermoegenswirksame_leistungen NUMERIC,
  sonstige_bezuege NUMERIC,
  sonstige_abzuege NUMERIC,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- kindergeld_bescheide
-- ----------------------------------------------------------------------------
CREATE TABLE public.kindergeld_bescheide (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum,
  familienkasse TEXT,
  kindergeld_nummer TEXT,
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  kind_ordnungszahl INTEGER,
  bescheiddatum DATE,
  betrag_monatlich NUMERIC,
  zahlungsbeginn DATE,
  zahlungsende DATE,
  iban TEXT,
  kontoinhaber TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- krankenversicherung_nachweise
-- ----------------------------------------------------------------------------
CREATE TABLE public.krankenversicherung_nachweise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum NOT NULL,
  krankenkasse_name TEXT,
  krankenkasse_strasse TEXT,
  krankenkasse_plz TEXT,
  krankenkasse_ort TEXT,
  versichertennummer TEXT,
  mitgliedsnummer TEXT,
  versicherungsart TEXT,
  versicherungsbeginn DATE,
  beitragssatz NUMERIC,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- leistungsbescheide
-- ----------------------------------------------------------------------------
CREATE TABLE public.leistungsbescheide (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum NOT NULL,
  leistungsart TEXT,
  bewilligungsstelle TEXT,
  kundennummer TEXT,
  aktenzeichen TEXT,
  bescheiddatum DATE,
  leistungsbeginn DATE,
  leistungsende DATE,
  monatsbetrag NUMERIC,
  tagessatz NUMERIC,
  bemessungsentgelt NUMERIC,
  leistungssatz_prozent NUMERIC,
  qualifizierungszeit_von DATE,
  qualifizierungszeit_bis DATE,
  regelsatz NUMERIC,
  kosten_unterkunft NUMERIC,
  heizkosten NUMERIC,
  mehrbedarf NUMERIC,
  bedarfsgemeinschaft_groesse INTEGER,
  arbeitsunfaehig_seit DATE,
  bruttolohn_bemessung NUMERIC,
  arbeitgeber TEXT,
  krankenkasse TEXT,
  versichertennummer TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- meldebescheinigungen
-- ----------------------------------------------------------------------------
CREATE TABLE public.meldebescheinigungen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- mutterschaftsgeld
-- ----------------------------------------------------------------------------
CREATE TABLE public.mutterschaftsgeld (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  krankenkasse_name TEXT,
  versichertennummer TEXT,
  bescheiddatum DATE,
  leistungsbeginn DATE,
  leistungsende DATE,
  tagessatz NUMERIC,
  gesamtbetrag NUMERIC,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- pdf_field_mappings
-- ----------------------------------------------------------------------------
CREATE TABLE public.pdf_field_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_field TEXT NOT NULL,
  pdf_field_name TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0,
  mapping_status TEXT DEFAULT 'auto',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  filter_condition JSONB,
  page_number INTEGER,
  coord_x NUMERIC,
  coord_y NUMERIC,
  width NUMERIC,
  height NUMERIC,
  reading_order INTEGER,
  section_visual TEXT,
  field_label_de TEXT,
  field_type TEXT,
  format_hint TEXT,
  validation_rule_de TEXT,
  hint_de TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- pdf_field_registry
-- ----------------------------------------------------------------------------
CREATE TABLE public.pdf_field_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdf_field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'PDFTextField',
  target_person TEXT NOT NULL,
  page_number INTEGER NOT NULL DEFAULT 0,
  coord_x NUMERIC,
  coord_y NUMERIC,
  reading_order INTEGER,
  section_de TEXT,
  label_de TEXT,
  semantic_meaning TEXT,
  suffix_pattern TEXT,
  base_field_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- schwerbehindertenausweise
-- ----------------------------------------------------------------------------
CREATE TABLE public.schwerbehindertenausweise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type TEXT,
  kind_ordnungszahl INTEGER,
  name_inhaber TEXT,
  vorname_inhaber TEXT,
  geburtsdatum DATE,
  geschlecht TEXT,
  grad_der_behinderung INTEGER,
  gdb_ab_datum DATE,
  gueltig_bis DATE,
  unbefristet BOOLEAN DEFAULT false,
  merkzeichen_g BOOLEAN DEFAULT false,
  merkzeichen_ag BOOLEAN DEFAULT false,
  merkzeichen_b BOOLEAN DEFAULT false,
  merkzeichen_bl BOOLEAN DEFAULT false,
  merkzeichen_gl BOOLEAN DEFAULT false,
  merkzeichen_h BOOLEAN DEFAULT false,
  merkzeichen_rf BOOLEAN DEFAULT false,
  merkzeichen_tbl BOOLEAN DEFAULT false,
  merkzeichen_1kl BOOLEAN DEFAULT false,
  ausstellungsdatum DATE,
  ausstellende_behoerde TEXT,
  aktenzeichen TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- selbststaendigen_nachweise
-- ----------------------------------------------------------------------------
CREATE TABLE public.selbststaendigen_nachweise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  person_type person_type_enum NOT NULL,
  steuernummer TEXT,
  gewerbeart TEXT,
  gewerbeanmeldung_datum DATE,
  nachweiszeitraum_von DATE,
  nachweiszeitraum_bis DATE,
  jahreseinkommen NUMERIC,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- user_roles
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ----------------------------------------------------------------------------
-- vaterschaftsanerkennungen
-- ----------------------------------------------------------------------------
CREATE TABLE public.vaterschaftsanerkennungen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  antrag_id UUID,
  kind_vorname TEXT,
  kind_nachname TEXT,
  kind_geburtsdatum DATE,
  kind_geburtsort TEXT,
  vater_vorname TEXT,
  vater_nachname TEXT,
  vater_geburtsdatum DATE,
  mutter_vorname TEXT,
  mutter_nachname TEXT,
  mutter_geburtsdatum DATE,
  anerkennungsdatum DATE,
  zustimmungsdatum DATE,
  beurkundungsstelle TEXT,
  urkundennummer TEXT,
  file_path TEXT,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  upload_position INTEGER NOT NULL DEFAULT 0
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_aerztliche_zeugnisse_user_id ON public.aerztliche_zeugnisse USING btree (user_id);
CREATE INDEX idx_antrag_progress_user_id ON public.antrag_progress USING btree (user_id);
CREATE INDEX idx_computed_field_rules_active ON public.computed_field_rules USING btree (is_active);
CREATE INDEX idx_computed_field_rules_page ON public.computed_field_rules USING btree (page_number);
CREATE INDEX idx_document_field_provenance_field ON public.document_field_provenance USING btree (pdf_field_name);
CREATE INDEX idx_document_field_provenance_user ON public.document_field_provenance USING btree (user_id);
CREATE INDEX idx_eltern_dokumente_upload_position ON public.eltern_dokumente USING btree (user_id, person_type, upload_position);
CREATE INDEX idx_field_fill_modes_field ON public.field_fill_modes USING btree (pdf_field_name);
CREATE INDEX idx_gehaltsnachweise_user_person ON public.gehaltsnachweise USING btree (user_id, person_type);
CREATE INDEX idx_kindergeld_bescheide_user_id ON public.kindergeld_bescheide USING btree (user_id);
CREATE INDEX idx_pdf_field_mappings_document_type ON public.pdf_field_mappings USING btree (document_type);
CREATE INDEX idx_pdf_field_mappings_pdf_field ON public.pdf_field_mappings USING btree (pdf_field_name);
CREATE INDEX idx_pdf_field_registry_field ON public.pdf_field_registry USING btree (pdf_field_name);
CREATE INDEX idx_pdf_field_registry_page ON public.pdf_field_registry USING btree (page_number);
CREATE INDEX idx_schwerbehindertenausweise_user_id ON public.schwerbehindertenausweise USING btree (user_id);
CREATE INDEX idx_vaterschaftsanerkennungen_user_id ON public.vaterschaftsanerkennungen USING btree (user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_table_columns(table_names text[])
RETURNS TABLE(table_name text, column_name text, data_type text, is_nullable text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- ============================================================================
-- END OF SCHEMA EXPORT
-- ============================================================================
