-- ============================================
-- Migration: Vereinfachung Kind/Eltern-Indexierung
-- Ersetzt kind_typ, kind_ordnungszahl, mehrling_nummer durch upload_position
-- ============================================

-- 1. geburtsurkunden: upload_position hinzufügen und migrieren
ALTER TABLE public.geburtsurkunden 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

UPDATE public.geburtsurkunden 
SET upload_position = CASE
  WHEN kind_typ = 'primaer' THEN 0
  WHEN kind_typ = 'mehrling' THEN COALESCE(mehrling_nummer, 1)
  WHEN kind_typ = 'geschwister' THEN COALESCE(kind_ordnungszahl, 0) + 10
  ELSE COALESCE(kind_ordnungszahl, 0)
END
WHERE upload_position = 0 AND (kind_typ IS NOT NULL OR kind_ordnungszahl IS NOT NULL);

-- 2. kindergeld_bescheide: upload_position hinzufügen
ALTER TABLE public.kindergeld_bescheide 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

UPDATE public.kindergeld_bescheide 
SET upload_position = COALESCE(kind_ordnungszahl, 0)
WHERE upload_position = 0 AND kind_ordnungszahl IS NOT NULL;

-- 3. schwerbehindertenausweise: upload_position hinzufügen
ALTER TABLE public.schwerbehindertenausweise 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

UPDATE public.schwerbehindertenausweise 
SET upload_position = COALESCE(kind_ordnungszahl, 0)
WHERE upload_position = 0 AND kind_ordnungszahl IS NOT NULL;

-- 4. eltern_dokumente: upload_position hinzufügen
ALTER TABLE public.eltern_dokumente 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 5. meldebescheinigungen: upload_position hinzufügen
ALTER TABLE public.meldebescheinigungen 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 6. gehaltsnachweise: upload_position hinzufügen
ALTER TABLE public.gehaltsnachweise 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 7. arbeitgeberbescheinigungen: upload_position hinzufügen
ALTER TABLE public.arbeitgeberbescheinigungen 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 8. einkommensteuerbescheide: upload_position hinzufügen
ALTER TABLE public.einkommensteuerbescheide 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 9. adoptions_pflege_dokumente: upload_position hinzufügen
ALTER TABLE public.adoptions_pflege_dokumente 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 10. aerztliche_zeugnisse: upload_position hinzufügen
ALTER TABLE public.aerztliche_zeugnisse 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 11. mutterschaftsgeld (korrekter Name): upload_position hinzufügen
ALTER TABLE public.mutterschaftsgeld 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 12. selbststaendigen_nachweise: upload_position hinzufügen
ALTER TABLE public.selbststaendigen_nachweise 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 13. krankenversicherung_nachweise (korrekter Name): upload_position hinzufügen
ALTER TABLE public.krankenversicherung_nachweise 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 14. leistungsbescheide: upload_position hinzufügen
ALTER TABLE public.leistungsbescheide 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 15. bankverbindungen: upload_position hinzufügen
ALTER TABLE public.bankverbindungen 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 16. ehe_sorgerecht_nachweise: upload_position hinzufügen
ALTER TABLE public.ehe_sorgerecht_nachweise 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- 17. vaterschaftsanerkennungen: upload_position hinzufügen
ALTER TABLE public.vaterschaftsanerkennungen 
ADD COLUMN IF NOT EXISTS upload_position INTEGER NOT NULL DEFAULT 0;

-- Indexes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_geburtsurkunden_upload_position ON public.geburtsurkunden(user_id, upload_position);
CREATE INDEX IF NOT EXISTS idx_eltern_dokumente_upload_position ON public.eltern_dokumente(user_id, person_type, upload_position);
CREATE INDEX IF NOT EXISTS idx_meldebescheinigungen_upload_position ON public.meldebescheinigungen(user_id, person_type, upload_position);
CREATE INDEX IF NOT EXISTS idx_gehaltsnachweise_upload_position ON public.gehaltsnachweise(user_id, person_type, upload_position);

-- Dokumentation
COMMENT ON COLUMN public.geburtsurkunden.upload_position IS 'Upload-Reihenfolge: 0=Antragskind, 1-3=Mehrlinge, 10-12=Geschwister';
COMMENT ON COLUMN public.eltern_dokumente.upload_position IS 'Upload-Reihenfolge pro person_type: 0=erstes Dokument, 1=zweites, etc.';