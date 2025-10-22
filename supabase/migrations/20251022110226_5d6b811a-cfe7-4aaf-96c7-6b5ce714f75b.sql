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
-- Note: Files in storage buckets must be deleted manually or via storage API