import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  type FillMode,
  type FillModeConfig,
  type FieldState,
  type FieldStatus,
  type DocEvidence,
  type PageStats,
  applyFillPolicy,
  getInitialFieldState,
  calculatePageStats,
  sortFieldsByPriority
} from '@/lib/fill-mode-engine';
import { validateFieldStates, getValidationSummary, type ValidationSummary } from '@/lib/validation-rules';

export interface PdfFieldInfo {
  pdf_field_name: string;
  field_type: string;
  target_person: string;
  page_number: number;
  semantic_meaning: string;
  label_de?: string;
}

export interface UseFillModeEngineResult {
  // State
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  fieldStates: Record<string, FieldState>;
  fillModeConfigs: Record<string, FillModeConfig>;
  pdfFields: PdfFieldInfo[];
  
  // Page data
  pageFields: PdfFieldInfo[];
  pageStats: PageStats;
  allPageStats: PageStats[];
  
  // Validation
  validationSummary: ValidationSummary;
  
  // Actions
  setCurrentPage: (page: number) => void;
  confirmField: (fieldName: string, value: any) => void;
  editField: (fieldName: string, value: any) => void;
  skipField: (fieldName: string) => void;
  undoField: (fieldName: string) => void;
  saveProgress: () => Promise<void>;
  loadProgress: () => Promise<void>;
  
  // Export
  generatePreview: () => Promise<string | null>;
  generateFinal: () => Promise<string | null>;
}

export function useFillModeEngine(): UseFillModeEngineResult {
  const { toast } = useToast();
  
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(23); // Elterngeld form has ~23 pages
  
  // Data state
  const [pdfFields, setPdfFields] = useState<PdfFieldInfo[]>([]);
  const [fillModeConfigs, setFillModeConfigs] = useState<Record<string, FillModeConfig>>({});
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({});
  
  // Load PDF field registry and fill mode configs
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load PDF field registry
        const { data: registryData, error: registryError } = await supabase
          .from('pdf_field_registry')
          .select('pdf_field_name, field_type, target_person, page_number, semantic_meaning')
          .order('page_number', { ascending: true });
        
        if (registryError) throw registryError;
        
        if (!registryData || registryData.length === 0) {
          setError('PDF-Feld-Registry ist leer. Bitte führen Sie "Populate Registry" im Admin-Bereich aus.');
          setIsLoading(false);
          return;
        }
        
        setPdfFields(registryData);
        
        // Load fill mode configs
        const { data: fillModesData, error: fillModesError } = await supabase
          .from('field_fill_modes')
          .select('*');
        
        if (fillModesError) throw fillModesError;
        
        // Convert to map
        const configsMap: Record<string, FillModeConfig> = {};
        for (const config of (fillModesData || [])) {
          configsMap[config.pdf_field_name] = config as FillModeConfig;
        }
        setFillModeConfigs(configsMap);
        
        // Initialize field states
        const initialStates: Record<string, FieldState> = {};
        for (const field of registryData) {
          const config = configsMap[field.pdf_field_name];
          const fillAction = applyFillPolicy(
            field.pdf_field_name,
            field.field_type,
            null, // No extracted value yet
            config || null
          );
          initialStates[field.pdf_field_name] = getInitialFieldState(fillAction);
        }
        setFieldStates(initialStates);
        
        // Try to load saved progress
        await loadProgressInternal(initialStates);
        
      } catch (err) {
        console.error('Error loading fill mode data:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  // Load saved progress from database
  const loadProgressInternal = async (defaultStates: Record<string, FieldState>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: progress } = await supabase
        .from('elterngeldantrag_progress')
        .select('field_states, current_step')
        .eq('user_id', user.id)
        .single();
      
      if (progress?.field_states && typeof progress.field_states === 'object' && !Array.isArray(progress.field_states)) {
        // Merge saved states with defaults
        const savedStates = progress.field_states as unknown as Record<string, FieldState>;
        setFieldStates({
          ...defaultStates,
          ...savedStates
        });
        
        if (progress.current_step) {
          setCurrentPage(progress.current_step);
        }
      }
    } catch (err) {
      console.log('No saved progress found, using defaults');
    }
  };
  
  const loadProgress = useCallback(async () => {
    await loadProgressInternal(fieldStates);
  }, [fieldStates]);
  
  // Save progress to database
  const saveProgress = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Nicht angemeldet',
          description: 'Bitte melden Sie sich an, um den Fortschritt zu speichern.',
          variant: 'destructive'
        });
        return;
      }
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('elterngeldantrag_progress')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('elterngeldantrag_progress')
          .update({
            field_states: JSON.parse(JSON.stringify(fieldStates)),
            current_step: currentPage,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('elterngeldantrag_progress')
          .insert([{
            user_id: user.id,
            field_states: JSON.parse(JSON.stringify(fieldStates)),
            current_step: currentPage
          }]);
        
        if (error) throw error;
      }
      toast({
        title: 'Gespeichert',
        description: 'Ihr Fortschritt wurde gespeichert.'
      });
    } catch (err) {
      console.error('Error saving progress:', err);
      toast({
        title: 'Fehler',
        description: 'Fortschritt konnte nicht gespeichert werden.',
        variant: 'destructive'
      });
    }
  }, [fieldStates, currentPage, toast]);
  
  // Field actions
  const confirmField = useCallback((fieldName: string, value: any) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        status: 'confirmed',
        value,
        confirmedAt: new Date().toISOString()
      }
    }));
  }, []);
  
  const editField = useCallback((fieldName: string, value: any) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        status: 'user_edited',
        value,
        editedAt: new Date().toISOString()
      }
    }));
  }, []);
  
  const skipField = useCallback((fieldName: string) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        status: 'skipped'
      }
    }));
  }, []);
  
  const undoField = useCallback((fieldName: string) => {
    const config = fillModeConfigs[fieldName];
    const field = pdfFields.find(f => f.pdf_field_name === fieldName);
    
    if (field) {
      const fillAction = applyFillPolicy(
        fieldName,
        field.field_type,
        fieldStates[fieldName]?.suggestedValue ?? null,
        config || null
      );
      
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: getInitialFieldState(fillAction)
      }));
    }
  }, [fillModeConfigs, pdfFields, fieldStates]);
  
  // Derived data
  const pageFields = pdfFields.filter(f => f.page_number === currentPage);
  
  const pageFieldStates: Record<string, FieldState> = {};
  const pageFieldConfigs: Record<string, FillModeConfig> = {};
  for (const field of pageFields) {
    pageFieldStates[field.pdf_field_name] = fieldStates[field.pdf_field_name] || { status: 'empty', value: null };
    if (fillModeConfigs[field.pdf_field_name]) {
      pageFieldConfigs[field.pdf_field_name] = fillModeConfigs[field.pdf_field_name];
    }
  }
  
  const pageStats = calculatePageStats(pageFieldStates, pageFieldConfigs);
  
  // Calculate stats for all pages
  const allPageStats: PageStats[] = [];
  for (let page = 1; page <= totalPages; page++) {
    const fields = pdfFields.filter(f => f.page_number === page);
    const states: Record<string, FieldState> = {};
    const configs: Record<string, FillModeConfig> = {};
    for (const field of fields) {
      states[field.pdf_field_name] = fieldStates[field.pdf_field_name] || { status: 'empty', value: null };
      if (fillModeConfigs[field.pdf_field_name]) {
        configs[field.pdf_field_name] = fillModeConfigs[field.pdf_field_name];
      }
    }
    allPageStats.push(calculatePageStats(states, configs));
  }
  
  // Validation
  const validationSummary = getValidationSummary(fieldStates);
  
  // PDF Generation
  const generatePreview = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('fill-elterngeld-form', {
        body: {
          mode: 'preview',
          field_states: fieldStates
        }
      });
      
      if (error) throw error;
      
      return data?.pdfUrl || null;
    } catch (err) {
      console.error('Error generating preview:', err);
      toast({
        title: 'Fehler',
        description: 'Vorschau konnte nicht erstellt werden.',
        variant: 'destructive'
      });
      return null;
    }
  }, [fieldStates, toast]);
  
  const generateFinal = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('fill-elterngeld-form', {
        body: {
          mode: 'final',
          field_states: fieldStates
        }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Export erfolgreich',
        description: 'Ihr Elterngeldantrag wurde erstellt.'
      });
      
      return data?.pdfUrl || null;
    } catch (err) {
      console.error('Error generating final PDF:', err);
      toast({
        title: 'Fehler',
        description: 'PDF konnte nicht erstellt werden.',
        variant: 'destructive'
      });
      return null;
    }
  }, [fieldStates, toast]);
  
  return {
    isLoading,
    error,
    currentPage,
    totalPages,
    fieldStates,
    fillModeConfigs,
    pdfFields,
    pageFields,
    pageStats,
    allPageStats,
    validationSummary,
    setCurrentPage,
    confirmField,
    editField,
    skipField,
    undoField,
    saveProgress,
    loadProgress,
    generatePreview,
    generateFinal
  };
}
