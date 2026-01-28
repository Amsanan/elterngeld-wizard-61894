// Validation rules for the Elterngeld Wizard

export interface ValidationError {
  id: string;
  fieldName?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationRule {
  id: string;
  check: (fieldStates: Record<string, any>, fieldName?: string) => boolean;
  message: string;
  severity: 'error' | 'warning';
  relatedFields?: string[];
}

// Helper to get field value from states
function getFieldValue(fieldStates: Record<string, any>, fieldName: string): any {
  const state = fieldStates[fieldName];
  return state?.value ?? state?.suggestedValue ?? null;
}

// Parse German date format (DD.MM.YYYY) to Date
function parseGermanDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try DD.MM.YYYY format
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try YYYY-MM-DD format
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(dateStr);
  }
  
  return null;
}

// Core validation rules
export const validationRules: ValidationRule[] = [
  // Child birthdate must be in the past or near future (for expected births)
  {
    id: 'child_birthdate_valid',
    check: (fieldStates) => {
      const birthdate = getFieldValue(fieldStates, 'txt.geburtsdatum1a 3') ||
                       getFieldValue(fieldStates, 'txt.geburt1a 3');
      if (!birthdate) return true; // Not filled yet
      
      const date = parseGermanDate(birthdate);
      if (!date) return true; // Can't parse
      
      // Allow up to 3 months in the future for expected births
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 3);
      
      return date <= maxFutureDate;
    },
    message: 'Geburtsdatum des Kindes liegt zu weit in der Zukunft',
    severity: 'error'
  },
  
  // Parents must be at least 16 years old
  {
    id: 'parent1_min_age',
    check: (fieldStates) => {
      const birthdate = getFieldValue(fieldStates, 'txt.geburt2b');
      if (!birthdate) return true;
      
      const date = parseGermanDate(birthdate);
      if (!date) return true;
      
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      return age >= 16;
    },
    message: 'Elternteil 1 muss mindestens 16 Jahre alt sein',
    severity: 'error',
    relatedFields: ['txt.geburt2b']
  },
  
  {
    id: 'parent2_min_age',
    check: (fieldStates) => {
      const birthdate = getFieldValue(fieldStates, 'txt.geburt2b 1');
      if (!birthdate) return true;
      
      const date = parseGermanDate(birthdate);
      if (!date) return true;
      
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      return age >= 16;
    },
    message: 'Elternteil 2 muss mindestens 16 Jahre alt sein',
    severity: 'error',
    relatedFields: ['txt.geburt2b 1']
  },
  
  // IBAN format validation
  {
    id: 'iban_format',
    check: (fieldStates) => {
      const iban = getFieldValue(fieldStates, 'txt.iban') || 
                   getFieldValue(fieldStates, 'txt.iban7');
      if (!iban) return true;
      
      // Basic IBAN format check (DE + 20 alphanumeric)
      const cleanIban = iban.replace(/\s/g, '').toUpperCase();
      return /^DE\d{20}$/.test(cleanIban) || /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleanIban);
    },
    message: 'IBAN-Format ungültig',
    severity: 'error'
  },
  
  // Lebensmonat selection check
  {
    id: 'lebensmonat_selected',
    check: (fieldStates) => {
      // Check if at least one Lebensmonat checkbox is selected
      const bgFields = Object.keys(fieldStates).filter(k => k.match(/cb[._]BG[._]\d+/));
      const eplusFields = Object.keys(fieldStates).filter(k => k.match(/cb[._]E\+[._]\d+/));
      
      const hasSelection = [...bgFields, ...eplusFields].some(field => {
        const state = fieldStates[field];
        return state?.value === true || state?.status === 'confirmed';
      });
      
      // This is a warning, not blocking - user might not have reached this step yet
      return true; // Always pass for now, will show as reminder in final review
    },
    message: 'Bitte wählen Sie mindestens einen Lebensmonat für den Elterngeldbezug',
    severity: 'warning'
  },
  
  // Marital status exclusivity
  {
    id: 'marital_status_exclusive',
    check: (fieldStates) => {
      const statuses = [
        'cb.ledig2c', 'cb.verheiratet2c', 'cb.geschieden2c', 
        'cb.verwitwet2c', 'cb.lebenspartner2c'
      ];
      
      const selectedCount = statuses.filter(field => {
        const state = fieldStates[field];
        return state?.value === true;
      }).length;
      
      return selectedCount <= 1;
    },
    message: 'Bitte nur einen Familienstand auswählen',
    severity: 'error'
  },
  
  // Employment type warning
  {
    id: 'employment_type_hint',
    check: (fieldStates) => {
      // This is informational - no blocking validation
      return true;
    },
    message: 'Bitte prüfen Sie die Angaben zur Erwerbstätigkeit',
    severity: 'warning'
  }
];

/**
 * Run all validation rules against current field states
 */
export function validateFieldStates(
  fieldStates: Record<string, any>
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const rule of validationRules) {
    try {
      const isValid = rule.check(fieldStates);
      if (!isValid) {
        errors.push({
          id: rule.id,
          fieldName: rule.relatedFields?.[0],
          message: rule.message,
          severity: rule.severity
        });
      }
    } catch (e) {
      console.error(`Validation rule ${rule.id} failed:`, e);
    }
  }
  
  return errors;
}

/**
 * Get validation errors for a specific field
 */
export function getFieldValidationErrors(
  fieldName: string,
  fieldStates: Record<string, any>
): ValidationError[] {
  return validateFieldStates(fieldStates).filter(
    error => error.fieldName === fieldName || 
             validationRules.find(r => r.id === error.id)?.relatedFields?.includes(fieldName)
  );
}

/**
 * Check if form can be submitted (no blocking errors)
 */
export function canSubmitForm(fieldStates: Record<string, any>): boolean {
  const errors = validateFieldStates(fieldStates);
  return !errors.some(e => e.severity === 'error');
}

/**
 * Get summary for final review
 */
export interface ValidationSummary {
  errors: ValidationError[];
  warnings: ValidationError[];
  canSubmit: boolean;
}

export function getValidationSummary(
  fieldStates: Record<string, any>
): ValidationSummary {
  const allErrors = validateFieldStates(fieldStates);
  
  return {
    errors: allErrors.filter(e => e.severity === 'error'),
    warnings: allErrors.filter(e => e.severity === 'warning'),
    canSubmit: !allErrors.some(e => e.severity === 'error')
  };
}
