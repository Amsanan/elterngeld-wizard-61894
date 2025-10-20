-- Add geburtsname (birth name) column to elternteil table
ALTER TABLE public.elternteil ADD COLUMN IF NOT EXISTS geburtsname VARCHAR(255);