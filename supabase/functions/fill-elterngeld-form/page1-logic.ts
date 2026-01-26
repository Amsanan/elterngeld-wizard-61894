// Page 1 Business Logic for Elterngeld Form
// Handles: Mehrlinge counting, siblings, premature birth check, disability check
// Updated to use upload_position instead of kind_typ/kind_ordnungszahl/mehrling_nummer

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Page1Result {
  fieldValues: Record<string, string | boolean>;
  warnings: string[];
}

interface Geburtsurkunde {
  kind_vorname: string | null;
  kind_nachname: string | null;
  kind_geburtsdatum: string | null;
  upload_position: number;
  created_at: string;
}

interface AerztlichesZeugnis {
  errechneter_geburtstermin: string | null;
}

interface Schwerbehindertenausweis {
  vorname_inhaber: string | null;
  name_inhaber: string | null;
  geburtsdatum: string | null;
  grad_der_behinderung: number | null;
  upload_position: number;
}

/**
 * Calculates the difference between two dates in weeks
 */
function weeksDifference(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
  return diffWeeks;
}

/**
 * Format date to German DD.MM.YYYY format
 */
function formatDateGerman(dateStr: string): string {
  if (!dateStr) return '';
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [_, year, month, day] = dateMatch;
    return `${day}.${month}.${year}`;
  }
  return dateStr;
}

/**
 * Process Page 1 logic for Elterngeld form
 * 
 * Upload Position Logic:
 * - upload_position 0: Antragskind (primary child)
 * - upload_position 1-3: Mehrlinge (twins/triplets)
 * - upload_position 10-12: Geschwister (siblings for bonus)
 * 
 * PDF Fields handled (actual AcroForm names):
 * - txt.geburtsdatum1a 3: Antragskind Geburtsdatum
 * - txt.anzahl 4: Anzahl der Mehrlinge
 * - cb.keine1c 3: Checkbox "keine weiteren Geschwister"
 * - cb.insgesamt1c 3: Checkbox "insgesamt Geschwister"
 * - txt.anzahl1c 3: Anzahl Geschwister
 * - cb.ja1b 3: Checkbox "Frühgeburt ja"
 * - txt.geburtsdatum1b 3: Errechneter Geburtstermin (if premature)
 * - cb.nein1b 3: Checkbox "Kind mit Behinderung"
 */
export async function processPage1Logic(
  supabase: SupabaseClient,
  userId: string
): Promise<Page1Result> {
  const fieldValues: Record<string, string | boolean> = {};
  const warnings: string[] = [];

  console.log('=== PROCESSING PAGE 1 BUSINESS LOGIC ===');

  // Step 1: Fetch Geburtsurkunden (order by upload_position)
  const { data: geburtsurkunden, error: gebError } = await supabase
    .from('geburtsurkunden')
    .select('kind_vorname, kind_nachname, kind_geburtsdatum, upload_position, created_at')
    .eq('user_id', userId)
    .order('upload_position', { ascending: true });

  if (gebError) {
    console.error('Error fetching Geburtsurkunden:', gebError);
    warnings.push('Fehler beim Laden der Geburtsurkunden');
    return { fieldValues, warnings };
  }

  if (!geburtsurkunden || geburtsurkunden.length === 0) {
    console.log('No Geburtsurkunde found - skipping page 1 logic');
    warnings.push('Geburtsurkunde fehlt - Bitte hochladen um Seite 1 auszufüllen');
    return { fieldValues, warnings };
  }

  // Find primary child (Antragskind): upload_position = 0
  const antragskind = geburtsurkunden.find(g => g.upload_position === 0) || geburtsurkunden[0];

  console.log('Antragskind found:', antragskind);

  if (!antragskind.kind_vorname || !antragskind.kind_nachname) {
    console.log('Antragskind name incomplete');
    warnings.push('Antragskind Name unvollständig');
  }

  // Set Geburtsdatum for Antragskind
  if (antragskind.kind_geburtsdatum) {
    fieldValues['txt.geburtsdatum1a 3'] = formatDateGerman(antragskind.kind_geburtsdatum);
  }

  // Count Mehrlinge (upload_position 1-3) and Geschwister (upload_position >= 10)
  let mehrlingeCount = 0;
  let geschwisterCount = 0;

  for (const geb of geburtsurkunden) {
    if (geb === antragskind || geb.upload_position === 0) continue;
    
    if (geb.upload_position >= 1 && geb.upload_position <= 3) {
      // Mehrling (twin/triplet)
      mehrlingeCount++;
      console.log(`Mehrling found (position ${geb.upload_position}): ${geb.kind_vorname} ${geb.kind_nachname}`);
    } else if (geb.upload_position >= 10) {
      // Geschwister (sibling)
      geschwisterCount++;
      console.log(`Geschwister found (position ${geb.upload_position}): ${geb.kind_vorname} ${geb.kind_nachname}`);
    }
  }

  console.log(`Mehrlinge count: ${mehrlingeCount}, Geschwister count: ${geschwisterCount}`);

  // Set Mehrlinge count (txt.anzahl 4)
  if (mehrlingeCount > 0) {
    fieldValues['txt.anzahl 4'] = String(mehrlingeCount);
  }

  // Handle Geschwister checkboxes (Section 1.C - Weitere Kinder im Haushalt)
  if (geschwisterCount === 0) {
    // No other siblings - check "keine" checkbox
    fieldValues['cb.keine1c 3'] = true;
  } else {
    // Has siblings - check "insgesamt" checkbox AND fill count
    fieldValues['cb.insgesamt1c 3'] = true;
    fieldValues['txt.anzahl1c 3'] = String(geschwisterCount);
  }

  // Step 2: Check for premature birth (Frühgeburt)
  const { data: aerztZeugnisse, error: azError } = await supabase
    .from('aerztliche_zeugnisse')
    .select('errechneter_geburtstermin')
    .eq('user_id', userId)
    .maybeSingle();

  if (azError) {
    console.error('Error fetching aerztliche_zeugnisse:', azError);
  }

  if (antragskind.kind_geburtsdatum && aerztZeugnisse?.errechneter_geburtstermin) {
    const actualBirth = new Date(antragskind.kind_geburtsdatum);
    const expectedBirth = new Date(aerztZeugnisse.errechneter_geburtstermin);
    
    // Check if birth was more than 6 weeks early
    const weeksDiff = weeksDifference(actualBirth, expectedBirth);
    const isFruehgeburt = actualBirth < expectedBirth && weeksDiff > 6;

    console.log(`Frühgeburt check: actual=${antragskind.kind_geburtsdatum}, expected=${aerztZeugnisse.errechneter_geburtstermin}, weeks=${weeksDiff.toFixed(1)}, isFrueh=${isFruehgeburt}`);

    if (isFruehgeburt) {
      fieldValues['cb.ja1b 3'] = true;
      fieldValues['txt.geburtsdatum1b 3'] = formatDateGerman(aerztZeugnisse.errechneter_geburtstermin);
    }
  } else if (!aerztZeugnisse?.errechneter_geburtstermin) {
    warnings.push('Ärztliches Zeugnis fehlt - Frühgeburtsprüfung wird übersprungen');
  }

  // Step 3: Check for disability (Schwerbehindertenausweis)
  const { data: schwerbehinderte, error: sbError } = await supabase
    .from('schwerbehindertenausweise')
    .select('vorname_inhaber, name_inhaber, geburtsdatum, grad_der_behinderung, upload_position')
    .eq('user_id', userId);

  if (sbError) {
    console.error('Error fetching Schwerbehindertenausweise:', sbError);
  }

  let hasDisability = false;

  if (schwerbehinderte && schwerbehinderte.length > 0) {
    // Check for disability at upload_position 0 (Antragskind) or match by name
    for (const sb of schwerbehinderte) {
      const isAntragskindPosition = sb.upload_position === 0;
      const nameMatch = 
        sb.vorname_inhaber?.toLowerCase() === antragskind.kind_vorname?.toLowerCase() &&
        sb.name_inhaber?.toLowerCase() === antragskind.kind_nachname?.toLowerCase();
      
      const dateMatch = sb.geburtsdatum === antragskind.kind_geburtsdatum;

      if (isAntragskindPosition || (nameMatch && dateMatch)) {
        console.log(`Disability document found for Antragskind: GdB=${sb.grad_der_behinderung}`);
        hasDisability = true;
        break;
      }
    }
  }

  // Check aerztliche_zeugnisse for disability note (if zeugnis_typ contains 'behinderung')
  const { data: disabilityZeugnis, error: dzError } = await supabase
    .from('aerztliche_zeugnisse')
    .select('zeugnis_typ')
    .eq('user_id', userId)
    .ilike('zeugnis_typ', '%behinderung%')
    .maybeSingle();

  if (disabilityZeugnis) {
    console.log('Disability noted in aerztliches Zeugnis');
    hasDisability = true;
  }

  if (hasDisability) {
    // cb.nein1b 3 = true means "yes, child has disability" (confusing naming in PDF)
    fieldValues['cb.nein1b 3'] = true;
  }

  console.log('=== PAGE 1 LOGIC COMPLETE ===');
  console.log('Field values before cleanup:', fieldValues);
  console.log('Warnings:', warnings);

  // Filter out null, undefined, and empty string values
  const cleanedFieldValues: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(fieldValues)) {
    if (value !== null && value !== undefined && value !== '') {
      cleanedFieldValues[key] = value;
    }
  }

  console.log('Field values after cleanup:', cleanedFieldValues);

  return { fieldValues: cleanedFieldValues, warnings };
}
