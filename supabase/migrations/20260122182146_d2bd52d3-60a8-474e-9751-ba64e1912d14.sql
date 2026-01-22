-- Phase 1: Erweitere elterngeldantrag_data mit fehlenden Spalten

-- Familienstand Elternteil 1 (Vater)
ALTER TABLE public.elterngeldantrag_data 
ADD COLUMN IF NOT EXISTS eltern1_familienstand_ledig BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern1_familienstand_verheiratet BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern1_familienstand_geschieden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern1_familienstand_verwitwet BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern1_familienstand_verpartnert BOOLEAN DEFAULT false;

-- Familienstand Elternteil 2 (Mutter)
ALTER TABLE public.elterngeldantrag_data 
ADD COLUMN IF NOT EXISTS eltern2_familienstand_ledig BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern2_familienstand_verheiratet BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern2_familienstand_geschieden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern2_familienstand_verwitwet BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern2_familienstand_verpartnert BOOLEAN DEFAULT false;

-- Staatsangehörigkeit Elternteil 1 (Vater)
ALTER TABLE public.elterngeldantrag_data 
ADD COLUMN IF NOT EXISTS eltern1_staatsangehoerigkeit_deutsch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern1_staatsangehoerigkeit_andere BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern1_staatenlos BOOLEAN DEFAULT false;

-- Staatsangehörigkeit Elternteil 2 (Mutter)
ALTER TABLE public.elterngeldantrag_data 
ADD COLUMN IF NOT EXISTS eltern2_staatsangehoerigkeit_deutsch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern2_staatsangehoerigkeit_andere BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern2_staatenlos BOOLEAN DEFAULT false;

-- Geschlecht Elternteil 2 (Mutter) - Checkboxen
ALTER TABLE public.elterngeldantrag_data 
ADD COLUMN IF NOT EXISTS eltern2_geschlecht_weiblich BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern2_geschlecht_maennlich BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern2_geschlecht_divers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eltern2_geschlecht_ohne_angabe BOOLEAN DEFAULT false;

-- Geschwisterbonus Kind 1 - Beziehung Elternteil 2
ALTER TABLE public.elterngeldantrag_data 
ADD COLUMN IF NOT EXISTS geschwisterbonus_kind1_beziehung_eltern2_leiblich BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS geschwisterbonus_kind1_beziehung_eltern2_adoptiv BOOLEAN DEFAULT false;

-- Geschwisterbonus Kind 2 - Beziehung Elternteil 2
ALTER TABLE public.elterngeldantrag_data 
ADD COLUMN IF NOT EXISTS geschwisterbonus_kind2_beziehung_eltern2_leiblich BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS geschwisterbonus_kind2_beziehung_eltern2_adoptiv BOOLEAN DEFAULT false;

-- Geschwisterbonus Kind 3 - Beziehung Elternteil 2
ALTER TABLE public.elterngeldantrag_data 
ADD COLUMN IF NOT EXISTS geschwisterbonus_kind3_beziehung_eltern2_leiblich BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS geschwisterbonus_kind3_beziehung_eltern2_adoptiv BOOLEAN DEFAULT false;

-- Kontaktdaten
ALTER TABLE public.elterngeldantrag_data 
ADD COLUMN IF NOT EXISTS eltern1_telefon TEXT,
ADD COLUMN IF NOT EXISTS eltern1_email TEXT,
ADD COLUMN IF NOT EXISTS eltern2_telefon TEXT,
ADD COLUMN IF NOT EXISTS eltern2_email TEXT;

-- Phase 2: Erweitere krankenversicherung_nachweise mit Adressfeldern
ALTER TABLE public.krankenversicherung_nachweise 
ADD COLUMN IF NOT EXISTS krankenkasse_strasse TEXT,
ADD COLUMN IF NOT EXISTS krankenkasse_plz TEXT,
ADD COLUMN IF NOT EXISTS krankenkasse_ort TEXT,
ADD COLUMN IF NOT EXISTS mitgliedsnummer TEXT;