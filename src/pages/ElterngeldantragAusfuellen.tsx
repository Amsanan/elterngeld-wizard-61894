import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, User, Home, FileCheck, DollarSign, 
  Briefcase, Heart, CreditCard, Users, ChevronLeft, 
  ChevronRight, Download, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PdfViewer } from "@/components/pdf/PdfViewer";

const WORKFLOW_STEPS = [
  { step: 1, title: "Geburtsurkunde", documentType: "geburtsurkunde", tableName: "geburtsurkunden", icon: FileText },
  { step: 2, title: "Personalausweis Vater", documentType: "eltern_dokument_vater", tableName: "eltern_dokumente", filter: { person_type: "vater", document_type: "personalausweis" }, icon: User },
  { step: 3, title: "Personalausweis Mutter", documentType: "eltern_dokument_mutter", tableName: "eltern_dokumente", filter: { person_type: "mutter", document_type: "personalausweis" }, icon: User },
  { step: 4, title: "Meldebescheinigung Vater", documentType: "meldebescheinigung_vater", tableName: "meldebescheinigungen", filter: { person_type: "vater" }, icon: Home },
  { step: 5, title: "Meldebescheinigung Mutter", documentType: "meldebescheinigung_mutter", tableName: "meldebescheinigungen", filter: { person_type: "mutter" }, icon: Home },
  { step: 6, title: "Einkommenssteuerbescheid", documentType: "einkommensteuerbescheid", tableName: "einkommensteuerbescheide", icon: FileCheck },
  { step: 7, title: "Gehaltsnachweise Vater", documentType: "gehaltsnachweis_vater", tableName: "gehaltsnachweise", filter: { person_type: "vater" }, icon: DollarSign },
  { step: 8, title: "Gehaltsnachweise Mutter", documentType: "gehaltsnachweis_mutter", tableName: "gehaltsnachweise", filter: { person_type: "mutter" }, icon: DollarSign },
  { step: 9, title: "Arbeitgeberbescheinigung Vater", documentType: "arbeitgeberbescheinigung_vater", tableName: "arbeitgeberbescheinigungen", filter: { person_type: "vater" }, icon: Briefcase },
  { step: 10, title: "Arbeitgeberbescheinigung Mutter", documentType: "arbeitgeberbescheinigung_mutter", tableName: "arbeitgeberbescheinigungen", filter: { person_type: "mutter" }, icon: Briefcase },
  { step: 11, title: "Krankenversicherung", documentType: "krankenversicherung", tableName: "krankenversicherung_nachweise", icon: Heart },
  { step: 12, title: "Bankverbindung", documentType: "bankverbindung", tableName: "bankverbindungen", icon: CreditCard },
  { step: 13, title: "Ehe-/Sorgerecht", documentType: "ehe_sorgerecht", tableName: "ehe_sorgerecht_nachweise", icon: Users }
];

export default function ElterngeldantragAusfuellen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState<any>(null);
  const [editedData, setEditedData] = useState<any>({});
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [previousPdfPath, setPreviousPdfPath] = useState<string | null>(null);
  const [hasData, setHasData] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const currentConfig = WORKFLOW_STEPS[currentStep - 1];

  useEffect(() => {
    loadStepData();
  }, [currentStep]);

  const loadStepData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Load data from database
      let query = supabase
        .from(currentConfig.tableName as any)
        .select()
        .eq('user_id', user.id);

      if (currentConfig.filter) {
        Object.entries(currentConfig.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) {
        console.error(`Error fetching data for step ${currentStep}:`, error);
        toast({
          title: "Fehler",
          description: `Fehler beim Laden der Daten: ${error.message}`,
          variant: "destructive"
        });
        setHasData(false);
        setStepData(null);
        setEditedData({});
        return;
      }

      if (!data) {
        console.log(`No data found for step ${currentStep}`);
        setHasData(false);
        setStepData(null);
        setEditedData({});
        return;
      }

      setHasData(true);
      setStepData(data);
      setEditedData(data);

      // Call edge function to fill PDF
      await fillPDF(data);

    } catch (error) {
      console.error("Error loading step data:", error);
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fillPDF = async (data: any) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('fill-elterngeld-form', {
        body: {
          step: currentStep,
          tableName: currentConfig.tableName,
          filter: currentConfig.filter || {},
          extractedData: data,
          previousPdfPath: previousPdfPath
        }
      });

      if (error) throw error;
      if (!result) throw new Error("No result returned from edge function");
      if (!result.pdfUrl) throw new Error("No PDF URL returned");
      
      setPdfUrl(result.pdfUrl);
      setPreviousPdfPath(result.pdfPath);

      toast({
        title: "PDF aktualisiert",
        description: `${result.filledFieldsCount} Felder befüllt (${result.completionPercentage}%)`,
      });

    } catch (error) {
      console.error("Error filling PDF:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Fehler beim Befüllen",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    if (hasData && JSON.stringify(editedData) !== JSON.stringify(stepData)) {
      await fillPDF(editedData);
    }
    
    if (currentStep < 13) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < 13) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      // Add download parameter to Supabase Storage URL for proper file download
      const url = new URL(pdfUrl);
      url.searchParams.set('download', 'elterngeldantrag.pdf');
      
      const link = document.createElement('a');
      link.href = url.toString();
      link.download = 'elterngeldantrag.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const Icon = currentConfig.icon;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Zurück zum Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Elterngeldantrag ausfüllen</h1>
          <div className="w-32" />
        </div>

        {/* Progress Bar */}
        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Schritt {currentStep} von 13</span>
              <span>{Math.round((currentStep / 13) * 100)}% abgeschlossen</span>
            </div>
            <Progress value={(currentStep / 13) * 100} />
          </div>
        </Card>

        {/* Step Indicator */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {WORKFLOW_STEPS.map((step) => (
            <div
              key={step.step}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                step.step === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : step.step < currentStep
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <step.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* PDF Preview - Full Width on Top */}
          <Card className="p-6 w-full">
            <h3 className="text-lg font-semibold mb-4">PDF Vorschau</h3>
            <PdfViewer
              pdfUrl={pdfUrl}
              downloadUrl={pdfUrl}
            />
          </Card>

          {/* Data Review & Edit - Below PDF */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{currentConfig.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {WORKFLOW_STEPS.find(s => s.step === currentStep)?.title}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !hasData ? (
              <Alert>
                <AlertDescription>
                  Keine Daten für diesen Schritt vorhanden. Sie können diesen Schritt überspringen oder das entsprechende Dokument hochladen.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {Object.entries(editedData).map(([key, value]) => {
                  if (key === 'id' || key === 'user_id' || key === 'created_at' || key === 'updated_at' || key === 'file_path' || key === 'confidence_scores') {
                    return null;
                  }
                  return (
                    <div key={key}>
                      <Label htmlFor={key} className="capitalize">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      <Input
                        id={key}
                        value={String(value || '')}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Action Buttons */}
        <Card className="p-6">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={!pdfUrl || isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Zwischenstand herunterladen
              </Button>

              {!hasData && (
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  Überspringen
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={isLoading || currentStep === 13}
              >
                {currentStep === 13 ? 'Fertig' : 'Weiter'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
