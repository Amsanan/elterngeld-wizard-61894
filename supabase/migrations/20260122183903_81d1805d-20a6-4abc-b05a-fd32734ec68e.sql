-- Phase 2: Meldebescheinigungen -> PDF (14 new mappings)
INSERT INTO public.pdf_field_mappings (document_type, source_table, source_field, pdf_field_name, confidence_score, mapping_status, is_active, notes, filter_condition) VALUES
-- Vater Meldebescheinigung
('meldebescheinigung', 'meldebescheinigungen', 'vorname', 'txt.vorname2b', 95, 'confirmed', true, 'Vorname Vater aus Meldebescheinigung', '{"person_type": "vater"}'),
('meldebescheinigung', 'meldebescheinigungen', 'nachname', 'txt.name2b', 95, 'confirmed', true, 'Nachname Vater aus Meldebescheinigung', '{"person_type": "vater"}'),
('meldebescheinigung', 'meldebescheinigungen', 'strasse', 'txt.strasse2c', 95, 'confirmed', true, 'Straße Vater aus Meldebescheinigung', '{"person_type": "vater"}'),
('meldebescheinigung', 'meldebescheinigungen', 'hausnummer', 'txt.nummer2c', 95, 'confirmed', true, 'Hausnummer Vater aus Meldebescheinigung', '{"person_type": "vater"}'),
('meldebescheinigung', 'meldebescheinigungen', 'plz', 'txt.plz2c', 95, 'confirmed', true, 'PLZ Vater aus Meldebescheinigung', '{"person_type": "vater"}'),
('meldebescheinigung', 'meldebescheinigungen', 'wohnort', 'txt.ort2c', 95, 'confirmed', true, 'Wohnort Vater aus Meldebescheinigung', '{"person_type": "vater"}'),
('meldebescheinigung', 'meldebescheinigungen', 'geburtsdatum', 'txt.geburt2b', 95, 'confirmed', true, 'Geburtsdatum Vater aus Meldebescheinigung', '{"person_type": "vater"}'),
-- Mutter Meldebescheinigung
('meldebescheinigung', 'meldebescheinigungen', 'vorname', 'txt.vorname2b 1', 95, 'confirmed', true, 'Vorname Mutter aus Meldebescheinigung', '{"person_type": "mutter"}'),
('meldebescheinigung', 'meldebescheinigungen', 'nachname', 'txt.name2b 1', 95, 'confirmed', true, 'Nachname Mutter aus Meldebescheinigung', '{"person_type": "mutter"}'),
('meldebescheinigung', 'meldebescheinigungen', 'strasse', 'txt.strasse2c 1', 95, 'confirmed', true, 'Straße Mutter aus Meldebescheinigung', '{"person_type": "mutter"}'),
('meldebescheinigung', 'meldebescheinigungen', 'hausnummer', 'txt.nummer2c 1', 95, 'confirmed', true, 'Hausnummer Mutter aus Meldebescheinigung', '{"person_type": "mutter"}'),
('meldebescheinigung', 'meldebescheinigungen', 'plz', 'txt.plz2c 1', 95, 'confirmed', true, 'PLZ Mutter aus Meldebescheinigung', '{"person_type": "mutter"}'),
('meldebescheinigung', 'meldebescheinigungen', 'wohnort', 'txt.ort2c 1', 95, 'confirmed', true, 'Wohnort Mutter aus Meldebescheinigung', '{"person_type": "mutter"}'),
('meldebescheinigung', 'meldebescheinigungen', 'geburtsdatum', 'txt.geburt2b 1', 95, 'confirmed', true, 'Geburtsdatum Mutter aus Meldebescheinigung', '{"person_type": "mutter"}'),

-- Phase 3: Arbeitgeberbescheinigungen -> PDF (20 new mappings)
-- Vater Arbeitgeberbescheinigung
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'elternzeit_1_von', 'txt.datum1_7d_1', 90, 'confirmed', true, 'Elternzeit 1 von Vater', '{"person_type": "vater"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'elternzeit_1_bis', 'txt.datum2_7d_1', 90, 'confirmed', true, 'Elternzeit 1 bis Vater', '{"person_type": "vater"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'elternzeit_2_von', 'txt.datum3_7d_1', 90, 'confirmed', true, 'Elternzeit 2 von Vater', '{"person_type": "vater"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'elternzeit_2_bis', 'txt.datum4_7d_1', 90, 'confirmed', true, 'Elternzeit 2 bis Vater', '{"person_type": "vater"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'mutterschutz_beginn', 'txt.datum1_7e_1', 85, 'confirmed', true, 'Mutterschutz Beginn Vater (falls zutreffend)', '{"person_type": "vater"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'mutterschutz_ende', 'txt.datum2_7e_1', 85, 'confirmed', true, 'Mutterschutz Ende Vater (falls zutreffend)', '{"person_type": "vater"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'ag_zuschuss_mutterschaftsgeld', 'txt.zuschuss7e_1', 85, 'confirmed', true, 'AG Zuschuss Mutterschaftsgeld Vater', '{"person_type": "vater"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'teilzeit_brutto', 'txt.brutto7f_1', 85, 'confirmed', true, 'Teilzeit Brutto Vater', '{"person_type": "vater"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'teilzeit_netto', 'txt.netto7f_1', 85, 'confirmed', true, 'Teilzeit Netto Vater', '{"person_type": "vater"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'teilzeit_wochenstunden', 'txt.stunden7f_1', 85, 'confirmed', true, 'Teilzeit Wochenstunden Vater', '{"person_type": "vater"}'),
-- Mutter Arbeitgeberbescheinigung
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'elternzeit_1_von', 'txt.datum1_7d_2', 90, 'confirmed', true, 'Elternzeit 1 von Mutter', '{"person_type": "mutter"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'elternzeit_1_bis', 'txt.datum2_7d_2', 90, 'confirmed', true, 'Elternzeit 1 bis Mutter', '{"person_type": "mutter"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'elternzeit_2_von', 'txt.datum3_7d_2', 90, 'confirmed', true, 'Elternzeit 2 von Mutter', '{"person_type": "mutter"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'elternzeit_2_bis', 'txt.datum4_7d_2', 90, 'confirmed', true, 'Elternzeit 2 bis Mutter', '{"person_type": "mutter"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'mutterschutz_beginn', 'txt.datum1_7e_2', 90, 'confirmed', true, 'Mutterschutz Beginn Mutter', '{"person_type": "mutter"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'mutterschutz_ende', 'txt.datum2_7e_2', 90, 'confirmed', true, 'Mutterschutz Ende Mutter', '{"person_type": "mutter"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'ag_zuschuss_mutterschaftsgeld', 'txt.zuschuss7e_2', 90, 'confirmed', true, 'AG Zuschuss Mutterschaftsgeld Mutter', '{"person_type": "mutter"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'teilzeit_brutto', 'txt.brutto7f_2', 85, 'confirmed', true, 'Teilzeit Brutto Mutter', '{"person_type": "mutter"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'teilzeit_netto', 'txt.netto7f_2', 85, 'confirmed', true, 'Teilzeit Netto Mutter', '{"person_type": "mutter"}'),
('arbeitgeberbescheinigung', 'arbeitgeberbescheinigungen', 'teilzeit_wochenstunden', 'txt.stunden7f_2', 85, 'confirmed', true, 'Teilzeit Wochenstunden Mutter', '{"person_type": "mutter"}'),

-- Phase 4: Adoptions/Pflege-Dokumente -> PDF (5 new mappings)
('adoptions_pflege', 'adoptions_pflege_dokumente', 'aufnahmedatum', 'txt.aufnahmedatum', 90, 'confirmed', true, 'Aufnahmedatum bei Adoption/Pflege', NULL),
('adoptions_pflege', 'adoptions_pflege_dokumente', 'kind_vorname', 'txt.vorname1a', 85, 'confirmed', true, 'Vorname des Adoptiv-/Pflegekindes', NULL),
('adoptions_pflege', 'adoptions_pflege_dokumente', 'kind_nachname', 'txt.name1a', 85, 'confirmed', true, 'Nachname des Adoptiv-/Pflegekindes', NULL),
('adoptions_pflege', 'adoptions_pflege_dokumente', 'kind_geburtsdatum', 'txt.geburt1a', 85, 'confirmed', true, 'Geburtsdatum des Adoptiv-/Pflegekindes', NULL),
('adoptions_pflege', 'adoptions_pflege_dokumente', 'pflegestelle_name', 'txt.pflege', 85, 'confirmed', true, 'Name der Pflegestelle', NULL),

-- Phase 5: Selbstständigen-Nachweise -> PDF (8 new mappings)
-- Vater
('selbststaendigen_nachweis', 'selbststaendigen_nachweise', 'gewerbeart', 'cb.gewerbe1', 85, 'confirmed', true, 'Gewerbebetrieb Vater Checkbox', '{"person_type": "vater"}'),
('selbststaendigen_nachweis', 'selbststaendigen_nachweise', 'jahreseinkommen', 'txt.14A_Euro_1', 90, 'confirmed', true, 'Jahreseinkommen Selbstständigkeit Vater', '{"person_type": "vater"}'),
('selbststaendigen_nachweis', 'selbststaendigen_nachweise', 'nachweiszeitraum_von', 'txt.14A_einkunft1_1', 85, 'confirmed', true, 'Nachweiszeitraum von Vater', '{"person_type": "vater"}'),
('selbststaendigen_nachweis', 'selbststaendigen_nachweise', 'nachweiszeitraum_bis', 'txt.14A_einkunft2_1', 85, 'confirmed', true, 'Nachweiszeitraum bis Vater', '{"person_type": "vater"}'),
-- Mutter
('selbststaendigen_nachweis', 'selbststaendigen_nachweise', 'gewerbeart', 'cb.gewerbe2', 85, 'confirmed', true, 'Gewerbebetrieb Mutter Checkbox', '{"person_type": "mutter"}'),
('selbststaendigen_nachweis', 'selbststaendigen_nachweise', 'jahreseinkommen', 'txt.14A_Euro_2', 90, 'confirmed', true, 'Jahreseinkommen Selbstständigkeit Mutter', '{"person_type": "mutter"}'),
('selbststaendigen_nachweis', 'selbststaendigen_nachweise', 'nachweiszeitraum_von', 'txt.14A_einkunft1_2', 85, 'confirmed', true, 'Nachweiszeitraum von Mutter', '{"person_type": "mutter"}'),
('selbststaendigen_nachweis', 'selbststaendigen_nachweise', 'nachweiszeitraum_bis', 'txt.14A_einkunft2_2', 85, 'confirmed', true, 'Nachweiszeitraum bis Mutter', '{"person_type": "mutter"}'),

-- Phase 6: Geburtsurkunden -> PDF (5 new mappings for additional fields)
('geburtsurkunde', 'geburtsurkunden', 'kind_geburtsort', 'txt.geburtsort1a', 90, 'confirmed', true, 'Geburtsort des Antragskind', '{"kind_ordnungszahl": 0}'),
('geburtsurkunde', 'geburtsurkunden', 'standesamt_name', 'txt.standesamt1a', 85, 'confirmed', true, 'Standesamt Name', '{"kind_ordnungszahl": 0}'),
('geburtsurkunde', 'geburtsurkunden', 'urkundennummer', 'txt.urkundennr1a', 80, 'confirmed', true, 'Urkundennummer', '{"kind_ordnungszahl": 0}'),
('geburtsurkunde', 'geburtsurkunden', 'ausstellungsdatum', 'txt.ausstelldatum1a', 85, 'confirmed', true, 'Ausstellungsdatum der Urkunde', '{"kind_ordnungszahl": 0}'),
('geburtsurkunde', 'geburtsurkunden', 'mehrlingsgeburt', 'cb.mehrling1a', 85, 'confirmed', true, 'Mehrlingsgeburt Checkbox', '{"kind_ordnungszahl": 0}'),

-- Phase 7: Kindergeld-Bescheide -> PDF (6 new mappings for Geschwisterbonus)
('kindergeld_bescheid', 'kindergeld_bescheide', 'kind_vorname', 'txt.vorname4_1', 85, 'confirmed', true, 'Geschwister 1 Vorname aus Kindergeld-Bescheid', '{"kind_ordnungszahl": 1}'),
('kindergeld_bescheid', 'kindergeld_bescheide', 'kind_nachname', 'txt.nachname4_1', 85, 'confirmed', true, 'Geschwister 1 Nachname aus Kindergeld-Bescheid', '{"kind_ordnungszahl": 1}'),
('kindergeld_bescheid', 'kindergeld_bescheide', 'kind_geburtsdatum', 'txt.geb4_1', 85, 'confirmed', true, 'Geschwister 1 Geburtsdatum aus Kindergeld-Bescheid', '{"kind_ordnungszahl": 1}'),
('kindergeld_bescheid', 'kindergeld_bescheide', 'kind_vorname', 'txt.vorname4_2', 85, 'confirmed', true, 'Geschwister 2 Vorname aus Kindergeld-Bescheid', '{"kind_ordnungszahl": 2}'),
('kindergeld_bescheid', 'kindergeld_bescheide', 'kind_nachname', 'txt.nachname4_2', 85, 'confirmed', true, 'Geschwister 2 Nachname aus Kindergeld-Bescheid', '{"kind_ordnungszahl": 2}'),
('kindergeld_bescheid', 'kindergeld_bescheide', 'kind_geburtsdatum', 'txt.geb4_2', 85, 'confirmed', true, 'Geschwister 2 Geburtsdatum aus Kindergeld-Bescheid', '{"kind_ordnungszahl": 2}'),

-- Phase 8: Vaterschaftsanerkennungen -> PDF (1 new mapping - beurkundungsstelle only, anerkennungsdatum already exists)
('vaterschaftsanerkennung', 'vaterschaftsanerkennungen', 'beurkundungsstelle', 'txt.stelle3c', 85, 'confirmed', true, 'Beurkundungsstelle', NULL),

-- Phase 9: Leistungsbescheide -> PDF (10 new mappings)
-- Vater
('leistungsbescheid', 'leistungsbescheide', 'leistungsbeginn', 'txt.datum10_1_von', 90, 'confirmed', true, 'Leistungsbeginn Vater', '{"person_type": "vater"}'),
('leistungsbescheid', 'leistungsbescheide', 'leistungsende', 'txt.datum10_1_bis', 90, 'confirmed', true, 'Leistungsende Vater', '{"person_type": "vater"}'),
('leistungsbescheid', 'leistungsbescheide', 'monatsbetrag', 'txt.betrag10_1', 85, 'confirmed', true, 'Monatsbetrag Leistung Vater', '{"person_type": "vater"}'),
('leistungsbescheid', 'leistungsbescheide', 'tagessatz', 'txt.tagessatz10_1', 85, 'confirmed', true, 'Tagessatz (Krankengeld) Vater', '{"person_type": "vater", "leistungsart": "krankengeld"}'),
('leistungsbescheid', 'leistungsbescheide', 'bemessungsentgelt', 'txt.bemessung10_1', 85, 'confirmed', true, 'Bemessungsentgelt ALG1 Vater', '{"person_type": "vater", "leistungsart": "alg1"}'),
-- Mutter
('leistungsbescheid', 'leistungsbescheide', 'leistungsbeginn', 'txt.datum10_2_von', 90, 'confirmed', true, 'Leistungsbeginn Mutter', '{"person_type": "mutter"}'),
('leistungsbescheid', 'leistungsbescheide', 'leistungsende', 'txt.datum10_2_bis', 90, 'confirmed', true, 'Leistungsende Mutter', '{"person_type": "mutter"}'),
('leistungsbescheid', 'leistungsbescheide', 'monatsbetrag', 'txt.betrag10_2', 85, 'confirmed', true, 'Monatsbetrag Leistung Mutter', '{"person_type": "mutter"}'),
('leistungsbescheid', 'leistungsbescheide', 'tagessatz', 'txt.tagessatz10_2', 85, 'confirmed', true, 'Tagessatz (Krankengeld) Mutter', '{"person_type": "mutter", "leistungsart": "krankengeld"}'),
('leistungsbescheid', 'leistungsbescheide', 'bemessungsentgelt', 'txt.bemessung10_2', 85, 'confirmed', true, 'Bemessungsentgelt ALG1 Mutter', '{"person_type": "mutter", "leistungsart": "alg1"}')