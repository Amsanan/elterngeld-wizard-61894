import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  ArrowRight, 
  Calculator,
  Home,
  RefreshCw,
  Download
} from 'lucide-react';
import { 
  useElterngeldCalculation, 
  ElterngeldInput,
  BUNDESLAENDER 
} from '@/hooks/useElterngeldCalculation';
import {
  StepAllgemein,
  StepGeburt,
  StepGeschwister,
  StepEinkommen,
  StepPlanung,
  StepErgebnis,
} from '@/components/elterngeld-rechner';
import { differenceInYears } from 'date-fns';

const STEPS = [
  { id: 1, title: 'Allgemeine Angaben', icon: '📋' },
  { id: 2, title: 'Geburtsdaten', icon: '👶' },
  { id: 3, title: 'Geschwister', icon: '👨‍👩‍👧‍👦' },
  { id: 4, title: 'Einkommen', icon: '💰' },
  { id: 5, title: 'Planung', icon: '📅' },
  { id: 6, title: 'Ergebnis', icon: '✨' },
];

interface PrefilledData {
  alleinerziehend?: boolean;
  geburtsdatum?: string;
  istFruehgeburt?: boolean;
  anzahlMehrlinge?: number;
  kinderUnter3?: number;
  kinderUnter6?: number;
  kinderMitBehinderung?: number;
  nettoeinkommenMutter?: number;
  nettoeinkommenVater?: number;
}

export default function ElterngeldRechner() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [prefilled, setPrefilled] = useState<PrefilledData>({});
  
  // Form state
  const [formData, setFormData] = useState<ElterngeldInput>({
    bundesland: '',
    alleinerziehend: false,
    geburtsdatum: '',
    istFruehgeburt: false,
    fruehgeburtWochen: 0,
    anzahlMehrlinge: 1,
    kinderUnter3: 0,
    kinderUnter6: 0,
    kinderMitBehinderungUnter14: 0,
    nettoeinkommenMutter: 0,
    nettoeinkommenVater: 0,
    beschaeftigungsartMutter: 'angestellt',
    beschaeftigungsartVater: 'angestellt',
    basiselterngeldMonateMutter: 6,
    basiselterngeldMonateVater: 2,
    elterngeldPlusMonateMutter: 0,
    elterngeldPlusMonateVater: 0,
    partnerschaftsbonusMonate: 0,
  });

  // Calculate result
  const result = useElterngeldCalculation(formData);

  // Load data from database on mount
  useEffect(() => {
    loadDataFromDatabase();
  }, []);

  const loadDataFromDatabase = async () => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Bitte melden Sie sich an');
        navigate('/auth');
        return;
      }

      const userId = session.user.id;
      const prefilledData: PrefilledData = {};
      const heute = new Date();

      // Load elterngeldantrag_data for alleinerziehend
      const { data: antragData } = await supabase
        .from('elterngeldantrag_data')
        .select('eltern_alleinerziehend')
        .eq('user_id', userId)
        .maybeSingle();

      if (antragData?.eltern_alleinerziehend !== undefined) {
        prefilledData.alleinerziehend = antragData.eltern_alleinerziehend;
      }

      // Load geburtsurkunden for birth date and siblings
      const { data: geburtsurkunden } = await supabase
        .from('geburtsurkunden')
        .select('kind_vorname, kind_geburtsdatum, kind_ordnungszahl, kind_typ')
        .eq('user_id', userId)
        .order('kind_ordnungszahl', { ascending: true });

      if (geburtsurkunden && geburtsurkunden.length > 0) {
        // Primary child (Antragskind)
        const antragskind = geburtsurkunden.find(g => g.kind_typ === 'primaer' || g.kind_ordnungszahl === 0) 
          || geburtsurkunden[0];
        
        if (antragskind?.kind_geburtsdatum) {
          prefilledData.geburtsdatum = antragskind.kind_geburtsdatum;
        }

        // Count multiples (same birthdate, different name)
        if (antragskind?.kind_geburtsdatum) {
          const mehrlinge = geburtsurkunden.filter(g => 
            g.kind_geburtsdatum === antragskind.kind_geburtsdatum
          ).length;
          if (mehrlinge > 1) {
            prefilledData.anzahlMehrlinge = mehrlinge;
          }
        }

        // Count siblings by age
        const siblings = geburtsurkunden.filter(g => g.kind_ordnungszahl !== 0 && g.kind_typ !== 'primaer');
        let unter3 = 0;
        let unter6 = 0;

        siblings.forEach(sibling => {
          if (sibling.kind_geburtsdatum) {
            const age = differenceInYears(heute, new Date(sibling.kind_geburtsdatum));
            if (age < 3) unter3++;
            if (age < 6) unter6++;
          }
        });

        if (unter3 > 0) prefilledData.kinderUnter3 = unter3;
        if (unter6 > 0) prefilledData.kinderUnter6 = unter6;
      }

      // Load schwerbehindertenausweise for children with disabilities
      const { data: ausweise } = await supabase
        .from('schwerbehindertenausweise')
        .select('geburtsdatum')
        .eq('user_id', userId);

      if (ausweise && ausweise.length > 0) {
        const kinderMitBehinderung = ausweise.filter(a => {
          if (!a.geburtsdatum) return false;
          const age = differenceInYears(heute, new Date(a.geburtsdatum));
          return age < 14;
        }).length;

        if (kinderMitBehinderung > 0) {
          prefilledData.kinderMitBehinderung = kinderMitBehinderung;
        }
      }

      // Load gehaltsnachweise for average income
      const { data: gehaltsnachweiseMutter } = await supabase
        .from('gehaltsnachweise')
        .select('nettogehalt')
        .eq('user_id', userId)
        .eq('person_type', 'mutter')
        .order('abrechnungsmonat', { ascending: false })
        .limit(12);

      if (gehaltsnachweiseMutter && gehaltsnachweiseMutter.length > 0) {
        const avgMutter = gehaltsnachweiseMutter.reduce((sum, g) => sum + (g.nettogehalt || 0), 0) 
          / gehaltsnachweiseMutter.length;
        prefilledData.nettoeinkommenMutter = Math.round(avgMutter);
      }

      const { data: gehaltsnachweiseVater } = await supabase
        .from('gehaltsnachweise')
        .select('nettogehalt')
        .eq('user_id', userId)
        .eq('person_type', 'vater')
        .order('abrechnungsmonat', { ascending: false })
        .limit(12);

      if (gehaltsnachweiseVater && gehaltsnachweiseVater.length > 0) {
        const avgVater = gehaltsnachweiseVater.reduce((sum, g) => sum + (g.nettogehalt || 0), 0) 
          / gehaltsnachweiseVater.length;
        prefilledData.nettoeinkommenVater = Math.round(avgVater);
      }

      // Set prefilled data
      setPrefilled(prefilledData);

      // Update form with prefilled data
      setFormData(prev => ({
        ...prev,
        alleinerziehend: prefilledData.alleinerziehend ?? prev.alleinerziehend,
        geburtsdatum: prefilledData.geburtsdatum ?? prev.geburtsdatum,
        anzahlMehrlinge: prefilledData.anzahlMehrlinge ?? prev.anzahlMehrlinge,
        kinderUnter3: prefilledData.kinderUnter3 ?? prev.kinderUnter3,
        kinderUnter6: prefilledData.kinderUnter6 ?? prev.kinderUnter6,
        kinderMitBehinderungUnter14: prefilledData.kinderMitBehinderung ?? prev.kinderMitBehinderungUnter14,
        nettoeinkommenMutter: prefilledData.nettoeinkommenMutter ?? prev.nettoeinkommenMutter,
        nettoeinkommenVater: prefilledData.nettoeinkommenVater ?? prev.nettoeinkommenVater,
      }));

      if (Object.keys(prefilledData).length > 0) {
        toast.success(`${Object.keys(prefilledData).length} Felder aus Ihren Dokumenten geladen`);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleReload = () => {
    loadDataFromDatabase();
  };

  const progress = (currentStep / STEPS.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepAllgemein
            bundesland={formData.bundesland}
            alleinerziehend={formData.alleinerziehend}
            onBundeslandChange={(value) => setFormData(prev => ({ ...prev, bundesland: value }))}
            onAlleinerziehendChange={(value) => setFormData(prev => ({ ...prev, alleinerziehend: value }))}
            prefilled={{ alleinerziehend: prefilled.alleinerziehend }}
          />
        );
      case 2:
        return (
          <StepGeburt
            geburtsdatum={formData.geburtsdatum}
            istFruehgeburt={formData.istFruehgeburt}
            fruehgeburtWochen={formData.fruehgeburtWochen}
            anzahlMehrlinge={formData.anzahlMehrlinge}
            onGeburtsdatumChange={(value) => setFormData(prev => ({ ...prev, geburtsdatum: value }))}
            onIstFruehgeburtChange={(value) => setFormData(prev => ({ ...prev, istFruehgeburt: value }))}
            onFruehgeburtWochenChange={(value) => setFormData(prev => ({ ...prev, fruehgeburtWochen: value }))}
            onAnzahlMehrlingeChange={(value) => setFormData(prev => ({ ...prev, anzahlMehrlinge: value }))}
            prefilled={{
              geburtsdatum: prefilled.geburtsdatum,
              istFruehgeburt: prefilled.istFruehgeburt,
              anzahlMehrlinge: prefilled.anzahlMehrlinge,
            }}
          />
        );
      case 3:
        return (
          <StepGeschwister
            kinderUnter3={formData.kinderUnter3}
            kinderUnter6={formData.kinderUnter6}
            kinderMitBehinderungUnter14={formData.kinderMitBehinderungUnter14}
            onKinderUnter3Change={(value) => setFormData(prev => ({ ...prev, kinderUnter3: value }))}
            onKinderUnter6Change={(value) => setFormData(prev => ({ ...prev, kinderUnter6: value }))}
            onKinderMitBehinderungChange={(value) => setFormData(prev => ({ ...prev, kinderMitBehinderungUnter14: value }))}
            prefilled={{
              kinderUnter3: prefilled.kinderUnter3,
              kinderUnter6: prefilled.kinderUnter6,
              kinderMitBehinderung: prefilled.kinderMitBehinderung,
            }}
          />
        );
      case 4:
        return (
          <StepEinkommen
            alleinerziehend={formData.alleinerziehend}
            nettoeinkommenMutter={formData.nettoeinkommenMutter}
            nettoeinkommenVater={formData.nettoeinkommenVater}
            beschaeftigungsartMutter={formData.beschaeftigungsartMutter}
            beschaeftigungsartVater={formData.beschaeftigungsartVater}
            onNettoeinkommenMutterChange={(value) => setFormData(prev => ({ ...prev, nettoeinkommenMutter: value }))}
            onNettoeinkommenVaterChange={(value) => setFormData(prev => ({ ...prev, nettoeinkommenVater: value }))}
            onBeschaeftigungsartMutterChange={(value) => setFormData(prev => ({ ...prev, beschaeftigungsartMutter: value as any }))}
            onBeschaeftigungsartVaterChange={(value) => setFormData(prev => ({ ...prev, beschaeftigungsartVater: value as any }))}
            prefilled={{
              nettoeinkommenMutter: prefilled.nettoeinkommenMutter,
              nettoeinkommenVater: prefilled.nettoeinkommenVater,
            }}
          />
        );
      case 5:
        return (
          <StepPlanung
            alleinerziehend={formData.alleinerziehend}
            maxMonateBasis={result.maxMonateBasis}
            maxMonatePlus={result.maxMonatePlus}
            basiselterngeldMonateMutter={formData.basiselterngeldMonateMutter}
            basiselterngeldMonateVater={formData.basiselterngeldMonateVater}
            elterngeldPlusMonateMutter={formData.elterngeldPlusMonateMutter}
            elterngeldPlusMonateVater={formData.elterngeldPlusMonateVater}
            partnerschaftsbonusMonate={formData.partnerschaftsbonusMonate}
            onBasiselterngeldMonateMutterChange={(value) => setFormData(prev => ({ ...prev, basiselterngeldMonateMutter: value }))}
            onBasiselterngeldMonateVaterChange={(value) => setFormData(prev => ({ ...prev, basiselterngeldMonateVater: value }))}
            onElterngeldPlusMonateMutterChange={(value) => setFormData(prev => ({ ...prev, elterngeldPlusMonateMutter: value }))}
            onElterngeldPlusMonateVaterChange={(value) => setFormData(prev => ({ ...prev, elterngeldPlusMonateVater: value }))}
            onPartnerschaftsbonusMonateChange={(value) => setFormData(prev => ({ ...prev, partnerschaftsbonusMonate: value }))}
          />
        );
      case 6:
        return (
          <StepErgebnis
            result={result}
            alleinerziehend={formData.alleinerziehend}
            basisMonateMutter={formData.basiselterngeldMonateMutter}
            basisMonateVater={formData.basiselterngeldMonateVater}
            plusMonateMutter={formData.elterngeldPlusMonateMutter}
            plusMonateVater={formData.elterngeldPlusMonateVater}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Calculator className="h-12 w-12 mx-auto animate-pulse text-primary" />
          <p className="text-muted-foreground">Lade Ihre Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Elterngeld-Rechner
              </h1>
              <p className="text-sm text-muted-foreground">
                Schritt {currentStep} von {STEPS.length}: {STEPS[currentStep - 1].title}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleReload}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Daten neu laden
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b bg-muted/30">
        <div className="container px-4 py-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`text-xs flex flex-col items-center gap-1 transition-colors ${
                  step.id === currentStep 
                    ? 'text-primary font-medium' 
                    : step.id < currentStep 
                      ? 'text-muted-foreground' 
                      : 'text-muted-foreground/50'
                }`}
              >
                <span className="text-lg">{step.icon}</span>
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container px-4 py-8 max-w-3xl mx-auto">
        {renderStep()}
      </main>

      {/* Footer Navigation */}
      <footer className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 max-w-3xl mx-auto">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>

          {currentStep === STEPS.length ? (
            <Button onClick={() => navigate('/dashboard')}>
              <Download className="h-4 w-4 mr-2" />
              Zum Antrag
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Weiter
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
