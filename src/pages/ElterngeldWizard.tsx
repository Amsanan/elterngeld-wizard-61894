import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  FileText, 
  CheckCircle2,
  Filter,
  Home
} from "lucide-react";

import { useFillModeEngine } from "@/hooks/useFillModeEngine";
import { FillModeFieldCard } from "@/components/wizard/FillModeFieldCard";
import { PageSummary } from "@/components/wizard/PageSummary";
import { FinalReviewChecklist } from "@/components/wizard/FinalReviewChecklist";
import { WhyAskedModal } from "@/components/wizard/WhyAskedModal";
import { sortFieldsByPriority, type DocEvidence } from "@/lib/fill-mode-engine";

// Page titles for the Elterngeld form
const PAGE_TITLES: Record<number, string> = {
  1: "Deckblatt",
  2: "Angaben zum Kind",
  3: "Angaben zu den Eltern",
  4: "Angaben zur Wohnung",
  5: "Angaben zur Erwerbstätigkeit",
  6: "Einkommen vor der Geburt",
  7: "Einkommen vor der Geburt (Forts.)",
  8: "Einkommen während Elterngeldbezug",
  9: "Einkommen während Elterngeldbezug (Forts.)",
  10: "Mutterschaftsleistungen",
  11: "Weitere Leistungen",
  12: "Krankenversicherung",
  13: "Bankverbindung",
  14: "Geschwisterbonus",
  15: "Geschwisterbonus (Forts.)",
  16: "Mehrlingsgeburt",
  17: "Bezugszeitraum Elternteil 1",
  18: "Bezugszeitraum Elternteil 2",
  19: "Partnerschaftsbonus",
  20: "Anlagen und Nachweise",
  21: "Erklärungen",
  22: "Unterschriften",
  23: "Anmerkungen"
};

type FilterType = 'all' | 'pending' | 'auto';

export default function ElterngeldWizard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [whyAskedField, setWhyAskedField] = useState<string | null>(null);
  
  const {
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
    generatePreview,
    generateFinal
  } = useFillModeEngine();
  
  // Get sorted and filtered fields for current page
  const sortedFieldNames = sortFieldsByPriority(
    pageFields.map(f => f.pdf_field_name),
    fieldStates,
    fillModeConfigs
  );
  
  const filteredFieldNames = sortedFieldNames.filter(fieldName => {
    const state = fieldStates[fieldName];
    if (filter === 'pending') {
      return state?.status === 'empty' || state?.status === 'suggested_pending';
    }
    if (filter === 'auto') {
      return state?.status === 'auto_filled';
    }
    return true;
  });
  
  // Calculate overall progress
  const overallStats = allPageStats.reduce((acc, stats) => ({
    total: acc.total + stats.total,
    completed: acc.completed + stats.autoFilled + stats.confirmed + stats.skipped
  }), { total: 0, completed: 0 });
  
  const overallPercent = overallStats.total > 0 
    ? Math.round((overallStats.completed / overallStats.total) * 100) 
    : 0;
  
  // Navigation
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else {
      setShowFinalReview(true);
    }
  };
  
  const handlePreview = async () => {
    const url = await generatePreview();
    if (url) {
      window.open(url, '_blank');
    }
  };
  
  const handleExport = async () => {
    const url = await generateFinal();
    if (url) {
      window.open(url, '_blank');
    }
  };
  
  // Get field info for WhyAsked modal
  const getFieldInfo = (fieldName: string) => {
    const field = pdfFields.find(f => f.pdf_field_name === fieldName);
    const config = fillModeConfigs[fieldName];
    return {
      field,
      config,
      labelDe: field?.semantic_meaning || fieldName
    };
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Fehler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{error}</p>
              <Button onClick={() => navigate('/dashboard')}>
                <Home className="h-4 w-4 mr-2" />
                Zurück zum Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (showFinalReview) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <FinalReviewChecklist
            fieldStates={fieldStates}
            pageStats={allPageStats}
            validationSummary={validationSummary}
            onGoBack={() => setShowFinalReview(false)}
            onPreview={handlePreview}
            onExport={handleExport}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            
            <div className="flex-1 max-w-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Gesamtfortschritt</span>
                <span className="text-sm text-muted-foreground">{overallPercent}%</span>
              </div>
              <Progress value={overallPercent} className="h-2" />
            </div>
            
            <Button onClick={saveProgress}>
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Page Summary */}
        <PageSummary
          pageNumber={currentPage}
          pageTitle={PAGE_TITLES[currentPage] || `Seite ${currentPage}`}
          stats={pageStats}
        />
        
        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="all">
                Alle ({pageFields.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Ausstehend ({pageStats.suggestedPending + pageStats.empty})
              </TabsTrigger>
              <TabsTrigger value="auto">
                Auto ({pageStats.autoFilled})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Fields List */}
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-4 pr-4">
            {filteredFieldNames.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Keine Felder in dieser Kategorie</p>
                </CardContent>
              </Card>
            ) : (
              filteredFieldNames.map(fieldName => {
                const field = pdfFields.find(f => f.pdf_field_name === fieldName);
                const config = fillModeConfigs[fieldName];
                const state = fieldStates[fieldName];
                
                if (!field) return null;
                
                // Build doc evidence
                const docEvidence: DocEvidence[] = (config?.doc_types || []).map(docType => ({
                  docType,
                  confidence: config?.max_confidence || 0
                }));
                
                // Determine field type
                let fieldType: 'text' | 'checkbox' | 'date' | 'number' = 'text';
                if (field.field_type === 'PDFCheckBox' || fieldName.startsWith('cb.')) {
                  fieldType = 'checkbox';
                } else if (field.semantic_meaning?.includes('datum') || field.semantic_meaning?.includes('geburt')) {
                  fieldType = 'date';
                }
                
                return (
                  <FillModeFieldCard
                    key={fieldName}
                    pdfFieldName={fieldName}
                    labelDe={field.semantic_meaning || fieldName}
                    currentValue={state?.value ?? null}
                    suggestedValue={state?.suggestedValue ?? null}
                    fillMode={config?.fill_mode || 'CONFIRM_ONLY'}
                    fillReason={config?.fill_reason || 'Keine Konfiguration verfügbar'}
                    docEvidence={docEvidence}
                    hasAnalysisLink={config?.has_analysis_link || false}
                    status={state?.status || 'empty'}
                    fieldType={fieldType}
                    onConfirm={(value) => confirmField(fieldName, value)}
                    onEdit={(value) => editField(fieldName, value)}
                    onSkip={() => skipField(fieldName)}
                    onUndo={() => undoField(fieldName)}
                    onWhyAsked={() => setWhyAskedField(fieldName)}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
        
        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Seite {currentPage} von {totalPages}
            </span>
          </div>
          
          <Button onClick={goToNextPage}>
            {currentPage === totalPages ? (
              <>
                Abschluss-Prüfung
                <FileText className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Weiter
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Why Asked Modal */}
      {whyAskedField && (
        <WhyAskedModal
          open={!!whyAskedField}
          onOpenChange={(open) => !open && setWhyAskedField(null)}
          fieldName={whyAskedField}
          labelDe={getFieldInfo(whyAskedField).labelDe}
          analysisReference={getFieldInfo(whyAskedField).config?.analysis_reference}
          fillReason={getFieldInfo(whyAskedField).config?.fill_reason || ''}
          docTypes={getFieldInfo(whyAskedField).config?.doc_types || []}
        />
      )}
    </div>
  );
}
