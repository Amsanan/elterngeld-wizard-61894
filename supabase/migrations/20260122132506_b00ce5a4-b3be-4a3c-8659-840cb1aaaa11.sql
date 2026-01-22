-- Remove legacy/artifact tables that are no longer used
-- These have been replaced by document-specific tables

-- Phase 1: Drop tables with foreign keys first
DROP TABLE IF EXISTS public.user_nachweise CASCADE;

-- Phase 2: Drop referenced/standalone legacy tables
DROP TABLE IF EXISTS public.nachweise_katalog CASCADE;
DROP TABLE IF EXISTS public.sonstige_nachweise CASCADE;
DROP TABLE IF EXISTS public.elterngeldantrag_data CASCADE;