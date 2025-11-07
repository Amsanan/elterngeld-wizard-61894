-- Add missing payslip deduction columns to gehaltsnachweise table
ALTER TABLE gehaltsnachweise
ADD COLUMN IF NOT EXISTS arbeitslosenversicherung numeric,
ADD COLUMN IF NOT EXISTS krankenversicherung numeric,
ADD COLUMN IF NOT EXISTS rentenversicherung numeric,
ADD COLUMN IF NOT EXISTS pflegeversicherung numeric,
ADD COLUMN IF NOT EXISTS lohnsteuer numeric,
ADD COLUMN IF NOT EXISTS kirchensteuer numeric,
ADD COLUMN IF NOT EXISTS solidaritaetszuschlag numeric,
ADD COLUMN IF NOT EXISTS vermoegenswirksame_leistungen numeric,
ADD COLUMN IF NOT EXISTS sonstige_bezuege numeric,
ADD COLUMN IF NOT EXISTS sonstige_abzuege numeric;