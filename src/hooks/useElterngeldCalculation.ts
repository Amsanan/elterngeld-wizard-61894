import { useMemo } from 'react';

export interface ElterngeldInput {
  // Allgemeine Angaben
  bundesland: string;
  alleinerziehend: boolean;
  
  // Geburtsdaten
  geburtsdatum: string;
  istFruehgeburt: boolean;
  fruehgeburtWochen: number; // Wochen vor ET
  anzahlMehrlinge: number;
  
  // Geschwister
  kinderUnter3: number;
  kinderUnter6: number;
  kinderMitBehinderungUnter14: number;
  
  // Einkommen
  nettoeinkommenMutter: number;
  nettoeinkommenVater: number;
  beschaeftigungsartMutter: 'angestellt' | 'selbststaendig' | 'arbeitslos' | 'minijob' | 'nicht_erwerbstaetig';
  beschaeftigungsartVater: 'angestellt' | 'selbststaendig' | 'arbeitslos' | 'minijob' | 'nicht_erwerbstaetig';
  
  // Planung
  basiselterngeldMonateMutter: number;
  basiselterngeldMonateVater: number;
  elterngeldPlusMonateMutter: number;
  elterngeldPlusMonateVater: number;
  partnerschaftsbonusMonate: number;
}

export interface ElterngeldResult {
  // Monatliche Beträge Mutter
  basiselterngeldMutter: number;
  elterngeldPlusMutter: number;
  
  // Monatliche Beträge Vater
  basiselterngeldVater: number;
  elterngeldPlusVater: number;
  
  // Boni
  geschwisterbonus: number;
  geschwisterbonusPlus: number;
  mehrlingszuschlag: number;
  
  // Zusätzliche Monate bei Frühgeburt
  zusaetzlicheMonate: number;
  
  // Gesamtsummen
  gesamtMutter: number;
  gesamtVater: number;
  gesamtFamilie: number;
  
  // Details
  ersatzrateMutter: number;
  ersatzrateVater: number;
  maxMonateBasis: number;
  maxMonatePlus: number;
}

// Berechnet die Ersatzrate basierend auf dem Nettoeinkommen
function calculateReplacementRate(netIncome: number): number {
  if (netIncome <= 0) {
    return 0;
  }
  
  if (netIncome < 1000) {
    // Geringverdienerkomponente: +0.1% pro 2 EUR unter 1000
    // maximal 100% bei 0 EUR
    const bonusPercent = Math.min(33, (1000 - netIncome) / 2 * 0.1);
    return Math.min(100, 67 + bonusPercent);
  } else if (netIncome <= 1200) {
    // Standard-Ersatzrate
    return 67;
  } else if (netIncome <= 1240) {
    // Absenkung: -0.1% pro 2 EUR über 1200
    const reduction = (netIncome - 1200) / 2 * 0.1;
    return 67 - reduction;
  }
  // Ab 1240 EUR: 65%
  return 65;
}

// Berechnet das Basiselterngeld
function calculateBasiselterngeld(netIncome: number): number {
  if (netIncome <= 0) {
    return 300; // Mindestbetrag
  }
  
  const rate = calculateReplacementRate(netIncome);
  const elterngeld = netIncome * (rate / 100);
  
  // Mindestens 300 EUR, maximal 1800 EUR
  return Math.max(300, Math.min(1800, elterngeld));
}

// Berechnet ElterngeldPlus (halber Satz)
function calculateElterngeldPlus(netIncome: number): number {
  const basis = calculateBasiselterngeld(netIncome);
  // ElterngeldPlus ist maximal die Hälfte des Basiselterngeldes
  return Math.max(150, Math.min(900, basis / 2));
}

// Prüft ob Geschwisterbonus gilt
function hasGeschwisterbonus(kinderUnter3: number, kinderUnter6: number, kinderMitBehinderung: number): boolean {
  // Mindestens ein Kind unter 3 ODER
  // Mindestens zwei Kinder unter 6 ODER
  // Ein Kind mit Behinderung unter 14
  return kinderUnter3 >= 1 || kinderUnter6 >= 2 || kinderMitBehinderung >= 1;
}

// Berechnet Geschwisterbonus
function calculateGeschwisterbonus(basiselterngeld: number, isBasis: boolean): number {
  // 10% des Elterngeldes, mindestens 75 EUR (Basis) bzw. 37.50 EUR (Plus)
  const bonus = basiselterngeld * 0.1;
  const minimum = isBasis ? 75 : 37.5;
  return Math.max(minimum, bonus);
}

// Berechnet zusätzliche Monate bei Frühgeburt
function calculateFruehgeburtMonate(wochenVorET: number): number {
  if (wochenVorET >= 12) return 4;
  if (wochenVorET >= 8) return 3;
  if (wochenVorET >= 6) return 2;
  if (wochenVorET >= 4) return 1;
  return 0;
}

export function useElterngeldCalculation(input: ElterngeldInput): ElterngeldResult {
  return useMemo(() => {
    // Ersatzraten berechnen
    const ersatzrateMutter = calculateReplacementRate(input.nettoeinkommenMutter);
    const ersatzrateVater = calculateReplacementRate(input.nettoeinkommenVater);
    
    // Basis-Elterngeld berechnen
    let basiselterngeldMutter = calculateBasiselterngeld(input.nettoeinkommenMutter);
    let basiselterngeldVater = calculateBasiselterngeld(input.nettoeinkommenVater);
    
    // ElterngeldPlus berechnen
    let elterngeldPlusMutter = calculateElterngeldPlus(input.nettoeinkommenMutter);
    let elterngeldPlusVater = calculateElterngeldPlus(input.nettoeinkommenVater);
    
    // Geschwisterbonus prüfen und berechnen
    const hatGeschwisterbonus = hasGeschwisterbonus(
      input.kinderUnter3,
      input.kinderUnter6,
      input.kinderMitBehinderungUnter14
    );
    
    let geschwisterbonus = 0;
    let geschwisterbonusPlus = 0;
    
    if (hatGeschwisterbonus) {
      geschwisterbonus = calculateGeschwisterbonus(basiselterngeldMutter, true);
      geschwisterbonusPlus = calculateGeschwisterbonus(elterngeldPlusMutter, false);
      
      // Bonus zum Elterngeld addieren
      basiselterngeldMutter += geschwisterbonus;
      basiselterngeldVater += calculateGeschwisterbonus(basiselterngeldVater, true);
      elterngeldPlusMutter += geschwisterbonusPlus;
      elterngeldPlusVater += calculateGeschwisterbonus(elterngeldPlusVater, false);
    }
    
    // Mehrlingszuschlag: 300 EUR pro weiteren Mehrling (ab dem 2. Kind)
    const mehrlingszuschlag = Math.max(0, input.anzahlMehrlinge - 1) * 300;
    
    // Bei Mehrlingen zum Basiselterngeld addieren
    if (mehrlingszuschlag > 0) {
      basiselterngeldMutter += mehrlingszuschlag;
    }
    
    // Zusätzliche Monate bei Frühgeburt
    const zusaetzlicheMonate = input.istFruehgeburt 
      ? calculateFruehgeburtMonate(input.fruehgeburtWochen)
      : 0;
    
    // Maximale Monate berechnen
    const maxMonateBasis = input.alleinerziehend ? 14 : 12;
    const maxMonatePlus = input.alleinerziehend ? 28 : 24;
    
    // Gesamtsummen berechnen
    const gesamtMutter = 
      (basiselterngeldMutter * input.basiselterngeldMonateMutter) +
      (elterngeldPlusMutter * input.elterngeldPlusMonateMutter);
    
    const gesamtVater = 
      (basiselterngeldVater * input.basiselterngeldMonateVater) +
      (elterngeldPlusVater * input.elterngeldPlusMonateVater);
    
    const gesamtFamilie = gesamtMutter + gesamtVater;
    
    return {
      basiselterngeldMutter: Math.round(basiselterngeldMutter * 100) / 100,
      elterngeldPlusMutter: Math.round(elterngeldPlusMutter * 100) / 100,
      basiselterngeldVater: Math.round(basiselterngeldVater * 100) / 100,
      elterngeldPlusVater: Math.round(elterngeldPlusVater * 100) / 100,
      geschwisterbonus: Math.round(geschwisterbonus * 100) / 100,
      geschwisterbonusPlus: Math.round(geschwisterbonusPlus * 100) / 100,
      mehrlingszuschlag,
      zusaetzlicheMonate,
      gesamtMutter: Math.round(gesamtMutter * 100) / 100,
      gesamtVater: Math.round(gesamtVater * 100) / 100,
      gesamtFamilie: Math.round(gesamtFamilie * 100) / 100,
      ersatzrateMutter,
      ersatzrateVater,
      maxMonateBasis: maxMonateBasis + zusaetzlicheMonate,
      maxMonatePlus: maxMonatePlus + (zusaetzlicheMonate * 2),
    };
  }, [input]);
}

export const BUNDESLAENDER = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
] as const;

export const BESCHAEFTIGUNGSARTEN = [
  { value: 'angestellt', label: 'Angestellt' },
  { value: 'selbststaendig', label: 'Selbstständig' },
  { value: 'arbeitslos', label: 'Arbeitslos' },
  { value: 'minijob', label: 'Minijob' },
  { value: 'nicht_erwerbstaetig', label: 'Nicht erwerbstätig' },
] as const;
