// Fill Mode Engine - Core logic for the Elterngeld Wizard

export type FillMode = 'AUTO_FILL' | 'SUGGEST' | 'CONFIRM_ONLY';

export type FieldStatus = 
  | 'empty'
  | 'auto_filled'
  | 'suggested_pending'
  | 'confirmed'
  | 'user_edited'
  | 'skipped';

export interface FillModeConfig {
  pdf_field_name: string;
  fill_mode: FillMode;
  fill_reason: string;
  doc_types: string[];
  entities: string[];
  max_confidence: number;
  has_analysis_link: boolean;
  analysis_reference: string | null;
}

export interface FieldState {
  status: FieldStatus;
  value: any;
  suggestedValue?: any;
  sourceDocType?: string;
  sourceDocId?: string;
  confidence?: number;
  confirmedAt?: string;
  editedAt?: string;
}

export interface FillAction {
  action: FillMode;
  value: any;
  write: boolean;
  reason: string;
}

export interface DocEvidence {
  docType: string;
  docId?: string;
  confidence: number;
  extractedKey?: string;
}

/**
 * Apply fill policy based on field configuration and extracted value
 * CRITICAL: Checkboxes are NEVER auto-filled
 */
export function applyFillPolicy(
  fieldName: string,
  fieldType: string,
  extractedValue: any,
  fillModeConfig: FillModeConfig | null
): FillAction {
  
  // RULE 1: Checkboxes NEVER auto-fill - regardless of config
  if (fieldType === 'PDFCheckBox' || fieldType === 'checkbox' || 
      fieldName.startsWith('cb.') || fieldName.startsWith('cb_')) {
    return { 
      action: 'CONFIRM_ONLY', 
      value: extractedValue, 
      write: false,
      reason: 'Checkbox erfordert Benutzerbestätigung' 
    };
  }
  
  // If no config, default to SUGGEST for text fields
  if (!fillModeConfig) {
    return {
      action: 'SUGGEST',
      value: extractedValue,
      write: false,
      reason: 'Keine Konfiguration - Benutzerprüfung erforderlich'
    };
  }
  
  const { fill_mode, fill_reason, max_confidence } = fillModeConfig;
  
  // RULE 2: Apply configured fill mode
  switch (fill_mode) {
    case 'AUTO_FILL':
      // Only auto-fill if we have a value and confidence is sufficient
      if (extractedValue !== null && extractedValue !== undefined && extractedValue !== '') {
        return { 
          action: 'AUTO_FILL', 
          value: extractedValue, 
          write: true,
          reason: fill_reason
        };
      }
      // No value available, suggest manual entry
      return {
        action: 'SUGGEST',
        value: null,
        write: false,
        reason: 'Kein Wert extrahiert - manuelle Eingabe erforderlich'
      };
      
    case 'SUGGEST':
      return { 
        action: 'SUGGEST', 
        value: extractedValue, 
        write: false,
        reason: fill_reason
      };
      
    case 'CONFIRM_ONLY':
    default:
      return { 
        action: 'CONFIRM_ONLY', 
        value: extractedValue, 
        write: false,
        reason: fill_reason
      };
  }
}

/**
 * Get initial field state based on fill action
 */
export function getInitialFieldState(
  fillAction: FillAction,
  evidence?: DocEvidence
): FieldState {
  switch (fillAction.action) {
    case 'AUTO_FILL':
      return {
        status: 'auto_filled',
        value: fillAction.value,
        sourceDocType: evidence?.docType,
        sourceDocId: evidence?.docId,
        confidence: evidence?.confidence
      };
      
    case 'SUGGEST':
      return {
        status: fillAction.value ? 'suggested_pending' : 'empty',
        value: null,
        suggestedValue: fillAction.value,
        sourceDocType: evidence?.docType,
        sourceDocId: evidence?.docId,
        confidence: evidence?.confidence
      };
      
    case 'CONFIRM_ONLY':
    default:
      return {
        status: 'empty',
        value: null,
        suggestedValue: fillAction.value
      };
  }
}

/**
 * Check if a field requires user action
 */
export function fieldRequiresAction(state: FieldState): boolean {
  return state.status === 'empty' || state.status === 'suggested_pending';
}

/**
 * Check if a field is complete (confirmed, auto-filled, or explicitly skipped)
 */
export function fieldIsComplete(state: FieldState): boolean {
  return ['auto_filled', 'confirmed', 'user_edited', 'skipped'].includes(state.status);
}

/**
 * Calculate page completion stats
 */
export interface PageStats {
  total: number;
  autoFilled: number;
  suggestedPending: number;
  confirmOnly: number;
  confirmed: number;
  skipped: number;
  empty: number;
  completionPercent: number;
}

export function calculatePageStats(
  fieldStates: Record<string, FieldState>,
  fillModeConfigs: Record<string, FillModeConfig>
): PageStats {
  const stats: PageStats = {
    total: 0,
    autoFilled: 0,
    suggestedPending: 0,
    confirmOnly: 0,
    confirmed: 0,
    skipped: 0,
    empty: 0,
    completionPercent: 0
  };
  
  for (const [fieldName, state] of Object.entries(fieldStates)) {
    stats.total++;
    
    switch (state.status) {
      case 'auto_filled':
        stats.autoFilled++;
        break;
      case 'suggested_pending':
        stats.suggestedPending++;
        break;
      case 'confirmed':
      case 'user_edited':
        stats.confirmed++;
        break;
      case 'skipped':
        stats.skipped++;
        break;
      case 'empty':
      default:
        stats.empty++;
        break;
    }
  }
  
  // Count CONFIRM_ONLY fields that are still empty
  for (const [fieldName, config] of Object.entries(fillModeConfigs)) {
    if (config.fill_mode === 'CONFIRM_ONLY') {
      const state = fieldStates[fieldName];
      if (!state || state.status === 'empty') {
        stats.confirmOnly++;
      }
    }
  }
  
  const completed = stats.autoFilled + stats.confirmed + stats.skipped;
  stats.completionPercent = stats.total > 0 ? Math.round((completed / stats.total) * 100) : 0;
  
  return stats;
}

/**
 * Sort fields by priority for display
 * Order: CONFIRM_ONLY empty → SUGGEST pending → AUTO_FILL (for review)
 */
export function sortFieldsByPriority(
  fieldNames: string[],
  fieldStates: Record<string, FieldState>,
  fillModeConfigs: Record<string, FillModeConfig>
): string[] {
  return [...fieldNames].sort((a, b) => {
    const stateA = fieldStates[a];
    const stateB = fieldStates[b];
    const configA = fillModeConfigs[a];
    const configB = fillModeConfigs[b];
    
    // Priority scores (lower = higher priority)
    const getScore = (fieldName: string, state?: FieldState, config?: FillModeConfig) => {
      if (!state || state.status === 'empty') {
        if (config?.fill_mode === 'CONFIRM_ONLY') return 0; // Highest priority
        return 1;
      }
      if (state.status === 'suggested_pending') return 2;
      if (state.status === 'auto_filled') return 3;
      if (state.status === 'confirmed' || state.status === 'user_edited') return 4;
      if (state.status === 'skipped') return 5;
      return 6;
    };
    
    return getScore(a, stateA, configA) - getScore(b, stateB, configB);
  });
}

/**
 * Map document type aliases to canonical names
 */
export const DOC_TYPE_LABELS: Record<string, string> = {
  'geburtsurkunde': 'Geburtsurkunde',
  'eltern_dokument': 'Personalausweis',
  'meldebescheinigung': 'Meldebescheinigung',
  'bankverbindung': 'Banknachweis',
  'einkommensteuerbescheid': 'Steuerbescheid',
  'gehaltsnachweis': 'Gehaltsnachweis',
  'arbeitgeberbescheinigung': 'Arbeitgeberbescheinigung',
  'mutterschaftsgeld': 'Mutterschaftsgeld-Bescheid',
  'krankenversicherung': 'Krankenversicherungsnachweis'
};

export function getDocTypeLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] || docType;
}
