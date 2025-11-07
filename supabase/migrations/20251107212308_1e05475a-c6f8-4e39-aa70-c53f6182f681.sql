-- First, normalize all person_type values to lowercase
UPDATE eltern_dokumente SET person_type = LOWER(person_type) WHERE person_type IS NOT NULL;
UPDATE einkommensteuerbescheide SET person_type = LOWER(person_type) WHERE person_type IS NOT NULL;
UPDATE arbeitgeberbescheinigungen SET person_type = LOWER(person_type) WHERE person_type IS NOT NULL;
UPDATE gehaltsnachweise SET person_type = LOWER(person_type) WHERE person_type IS NOT NULL;
UPDATE selbststaendigen_nachweise SET person_type = LOWER(person_type) WHERE person_type IS NOT NULL;
UPDATE leistungsbescheide SET person_type = LOWER(person_type) WHERE person_type IS NOT NULL;
UPDATE meldebescheinigungen SET person_type = LOWER(person_type) WHERE person_type IS NOT NULL;
UPDATE krankenversicherung_nachweise SET person_type = LOWER(person_type) WHERE person_type IS NOT NULL;

-- Drop existing CHECK constraints on person_type columns
ALTER TABLE eltern_dokumente DROP CONSTRAINT IF EXISTS eltern_dokumente_person_type_check;
ALTER TABLE einkommensteuerbescheide DROP CONSTRAINT IF EXISTS einkommensteuerbescheide_person_type_check;
ALTER TABLE arbeitgeberbescheinigungen DROP CONSTRAINT IF EXISTS arbeitgeberbescheinigungen_person_type_check;
ALTER TABLE gehaltsnachweise DROP CONSTRAINT IF EXISTS gehaltsnachweise_person_type_check;
ALTER TABLE selbststaendigen_nachweise DROP CONSTRAINT IF EXISTS selbststaendigen_nachweise_person_type_check;
ALTER TABLE leistungsbescheide DROP CONSTRAINT IF EXISTS leistungsbescheide_person_type_check;
ALTER TABLE meldebescheinigungen DROP CONSTRAINT IF EXISTS meldebescheinigungen_person_type_check;
ALTER TABLE krankenversicherung_nachweise DROP CONSTRAINT IF EXISTS krankenversicherung_nachweise_person_type_check;

-- Create enum for person_type
CREATE TYPE person_type_enum AS ENUM ('mutter', 'vater');

-- Alter all tables to use the enum
ALTER TABLE eltern_dokumente 
  ALTER COLUMN person_type TYPE person_type_enum USING person_type::person_type_enum;

ALTER TABLE einkommensteuerbescheide 
  ALTER COLUMN person_type TYPE person_type_enum USING person_type::person_type_enum;

ALTER TABLE arbeitgeberbescheinigungen 
  ALTER COLUMN person_type TYPE person_type_enum USING person_type::person_type_enum;

ALTER TABLE gehaltsnachweise 
  ALTER COLUMN person_type TYPE person_type_enum USING person_type::person_type_enum;

ALTER TABLE selbststaendigen_nachweise 
  ALTER COLUMN person_type TYPE person_type_enum USING person_type::person_type_enum;

ALTER TABLE leistungsbescheide 
  ALTER COLUMN person_type TYPE person_type_enum USING person_type::person_type_enum;

ALTER TABLE meldebescheinigungen 
  ALTER COLUMN person_type TYPE person_type_enum USING person_type::person_type_enum;

ALTER TABLE krankenversicherung_nachweise 
  ALTER COLUMN person_type TYPE person_type_enum USING person_type::person_type_enum;