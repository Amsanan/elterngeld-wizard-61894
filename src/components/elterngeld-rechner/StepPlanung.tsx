import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";

interface StepPlanungProps {
  alleinerziehend: boolean;
  maxMonateBasis: number;
  maxMonatePlus: number;
  basiselterngeldMonateMutter: number;
  basiselterngeldMonateVater: number;
  elterngeldPlusMonateMutter: number;
  elterngeldPlusMonateVater: number;
  partnerschaftsbonusMonate: number;
  onBasiselterngeldMonateMutterChange: (value: number) => void;
  onBasiselterngeldMonateVaterChange: (value: number) => void;
  onElterngeldPlusMonateMutterChange: (value: number) => void;
  onElterngeldPlusMonateVaterChange: (value: number) => void;
  onPartnerschaftsbonusMonateChange: (value: number) => void;
}

function MonatePlanung({
  label,
  basisMonate,
  plusMonate,
  maxBasis,
  maxPlus,
  onBasisChange,
  onPlusChange,
}: {
  label: string;
  basisMonate: number;
  plusMonate: number;
  maxBasis: number;
  maxPlus: number;
  onBasisChange: (value: number) => void;
  onPlusChange: (value: number) => void;
}) {
  // 2 Basiselterngeld-Monate = 4 ElterngeldPlus-Monate
  // Verfügbare Monate berechnen
  const verbrauchteEinheiten = basisMonate + (plusMonate / 2);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {label}
        </CardTitle>
        <CardDescription>
          Planen Sie, wie viele Monate Sie beziehen möchten
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              Basiselterngeld
              <Badge variant="outline">{basisMonate} Monate</Badge>
            </Label>
            <span className="text-sm text-muted-foreground">
              Max. {maxBasis} Monate
            </span>
          </div>
          <Slider
            value={[basisMonate]}
            onValueChange={([value]) => onBasisChange(value)}
            max={maxBasis}
            min={0}
            step={1}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Voller Elterngeld-Satz für bis zu {maxBasis} Monate
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              ElterngeldPlus
              <Badge variant="outline">{plusMonate} Monate</Badge>
            </Label>
            <span className="text-sm text-muted-foreground">
              Max. {maxPlus} Monate
            </span>
          </div>
          <Slider
            value={[plusMonate]}
            onValueChange={([value]) => onPlusChange(value)}
            max={maxPlus}
            min={0}
            step={1}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Halber Satz, doppelte Laufzeit - ideal bei Teilzeit
          </p>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Gesamt-Bezugszeitraum</span>
              <span className="font-bold">
                {basisMonate + plusMonate} Monate
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Entspricht {verbrauchteEinheiten.toFixed(1)} Basiselterngeld-Einheiten
            </p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

export function StepPlanung({
  alleinerziehend,
  maxMonateBasis,
  maxMonatePlus,
  basiselterngeldMonateMutter,
  basiselterngeldMonateVater,
  elterngeldPlusMonateMutter,
  elterngeldPlusMonateVater,
  partnerschaftsbonusMonate,
  onBasiselterngeldMonateMutterChange,
  onBasiselterngeldMonateVaterChange,
  onElterngeldPlusMonateMutterChange,
  onElterngeldPlusMonateVaterChange,
  onPartnerschaftsbonusMonateChange,
}: StepPlanungProps) {
  // Maximale Monate pro Elternteil bei gemeinsamer Planung
  const maxBasisProElternteil = alleinerziehend ? maxMonateBasis : Math.min(12, maxMonateBasis);
  const maxPlusProElternteil = alleinerziehend ? maxMonatePlus : Math.min(24, maxMonatePlus);

  if (alleinerziehend) {
    return (
      <div className="space-y-6">
        <MonatePlanung
          label="Ihre Elternzeit-Planung"
          basisMonate={basiselterngeldMonateMutter}
          plusMonate={elterngeldPlusMonateMutter}
          maxBasis={maxMonateBasis}
          maxPlus={maxMonatePlus}
          onBasisChange={onBasiselterngeldMonateMutterChange}
          onPlusChange={onElterngeldPlusMonateMutterChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="mutter" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mutter">Elternteil 1</TabsTrigger>
          <TabsTrigger value="vater">Elternteil 2</TabsTrigger>
        </TabsList>
        
        <TabsContent value="mutter" className="mt-6">
          <MonatePlanung
            label="Planung Elternteil 1"
            basisMonate={basiselterngeldMonateMutter}
            plusMonate={elterngeldPlusMonateMutter}
            maxBasis={maxBasisProElternteil}
            maxPlus={maxPlusProElternteil}
            onBasisChange={onBasiselterngeldMonateMutterChange}
            onPlusChange={onElterngeldPlusMonateMutterChange}
          />
        </TabsContent>
        
        <TabsContent value="vater" className="mt-6">
          <MonatePlanung
            label="Planung Elternteil 2"
            basisMonate={basiselterngeldMonateVater}
            plusMonate={elterngeldPlusMonateVater}
            maxBasis={maxBasisProElternteil}
            maxPlus={maxPlusProElternteil}
            onBasisChange={onBasiselterngeldMonateVaterChange}
            onPlusChange={onElterngeldPlusMonateVaterChange}
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Partnerschaftsbonus
          </CardTitle>
          <CardDescription>
            Wenn beide Elternteile gleichzeitig 24-32 Stunden arbeiten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              Partnerschaftsbonus-Monate
              <Badge variant="outline">{partnerschaftsbonusMonate} Monate</Badge>
            </Label>
            <span className="text-sm text-muted-foreground">
              Max. 4 Monate
            </span>
          </div>
          <Slider
            value={[partnerschaftsbonusMonate]}
            onValueChange={([value]) => onPartnerschaftsbonusMonateChange(value)}
            max={4}
            min={0}
            step={1}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Zusätzliche ElterngeldPlus-Monate bei partnerschaftlicher Teilzeit
          </p>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">
                Gesamte Familienplanung: {
                  basiselterngeldMonateMutter + basiselterngeldMonateVater +
                  elterngeldPlusMonateMutter + elterngeldPlusMonateVater +
                  partnerschaftsbonusMonate
                } Monate
              </p>
              <p className="text-sm text-muted-foreground">
                Elternteil 1: {basiselterngeldMonateMutter + elterngeldPlusMonateMutter} Monate | 
                Elternteil 2: {basiselterngeldMonateVater + elterngeldPlusMonateVater} Monate
                {partnerschaftsbonusMonate > 0 && ` | Bonus: ${partnerschaftsbonusMonate} Monate`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
