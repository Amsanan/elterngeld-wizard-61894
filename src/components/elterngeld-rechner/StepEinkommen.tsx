import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Euro, TrendingUp } from "lucide-react";
import { BESCHAEFTIGUNGSARTEN } from "@/hooks/useElterngeldCalculation";

interface StepEinkommenProps {
  alleinerziehend: boolean;
  nettoeinkommenMutter: number;
  nettoeinkommenVater: number;
  beschaeftigungsartMutter: string;
  beschaeftigungsartVater: string;
  onNettoeinkommenMutterChange: (value: number) => void;
  onNettoeinkommenVaterChange: (value: number) => void;
  onBeschaeftigungsartMutterChange: (value: string) => void;
  onBeschaeftigungsartVaterChange: (value: string) => void;
  prefilled?: {
    nettoeinkommenMutter?: number;
    nettoeinkommenVater?: number;
  };
}

function EinkommenCard({
  label,
  nettoeinkommen,
  beschaeftigungsart,
  onNettoeinkommenChange,
  onBeschaeftigungsartChange,
  isPrefilled,
}: {
  label: string;
  nettoeinkommen: number;
  beschaeftigungsart: string;
  onNettoeinkommenChange: (value: number) => void;
  onBeschaeftigungsartChange: (value: string) => void;
  isPrefilled?: boolean;
}) {
  // Ersatzrate berechnen für Anzeige
  const calculateDisplayRate = (income: number) => {
    if (income <= 0) return 0;
    if (income < 1000) return Math.min(100, 67 + (1000 - income) / 2 * 0.1);
    if (income <= 1200) return 67;
    if (income <= 1240) return 67 - (income - 1200) / 2 * 0.1;
    return 65;
  };

  const ersatzrate = calculateDisplayRate(nettoeinkommen);
  const geschaetztesElterngeld = Math.max(300, Math.min(1800, nettoeinkommen * (ersatzrate / 100)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          {label}
        </CardTitle>
        <CardDescription>
          Angaben zur Beschäftigung und zum durchschnittlichen Nettoeinkommen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Beschäftigungsart</Label>
          <Select value={beschaeftigungsart} onValueChange={onBeschaeftigungsartChange}>
            <SelectTrigger>
              <SelectValue placeholder="Beschäftigungsart wählen" />
            </SelectTrigger>
            <SelectContent>
              {BESCHAEFTIGUNGSARTEN.map((art) => (
                <SelectItem key={art.value} value={art.value}>
                  {art.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nettoeinkommen" className="flex items-center gap-2">
            <Euro className="h-4 w-4" />
            Durchschnittliches monatliches Nettoeinkommen
          </Label>
          <Input
            id="nettoeinkommen"
            type="number"
            min={0}
            step={100}
            value={nettoeinkommen}
            onChange={(e) => onNettoeinkommenChange(parseFloat(e.target.value) || 0)}
            className="text-lg"
          />
          {isPrefilled && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              ✓ Durchschnitt aus Gehaltsnachweisen berechnet
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Durchschnitt der letzten 12 Monate vor der Geburt
          </p>
        </div>

        {nettoeinkommen > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Voraussichtliches Elterngeld</span>
                </div>
                <span className="text-lg font-bold text-primary">
                  ca. {geschaetztesElterngeld.toFixed(0)} EUR
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ersatzrate: {ersatzrate.toFixed(1)}% 
                {ersatzrate > 67 && " (Geringverdiener-Bonus)"}
                {ersatzrate < 67 && ersatzrate >= 65 && " (Absenkung bei höherem Einkommen)"}
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

export function StepEinkommen({
  alleinerziehend,
  nettoeinkommenMutter,
  nettoeinkommenVater,
  beschaeftigungsartMutter,
  beschaeftigungsartVater,
  onNettoeinkommenMutterChange,
  onNettoeinkommenVaterChange,
  onBeschaeftigungsartMutterChange,
  onBeschaeftigungsartVaterChange,
  prefilled,
}: StepEinkommenProps) {
  if (alleinerziehend) {
    return (
      <div className="space-y-6">
        <EinkommenCard
          label="Ihr Einkommen"
          nettoeinkommen={nettoeinkommenMutter}
          beschaeftigungsart={beschaeftigungsartMutter}
          onNettoeinkommenChange={onNettoeinkommenMutterChange}
          onBeschaeftigungsartChange={onBeschaeftigungsartMutterChange}
          isPrefilled={prefilled?.nettoeinkommenMutter !== undefined}
        />
      </div>
    );
  }

  return (
    <Tabs defaultValue="mutter" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="mutter">Elternteil 1 (Mutter)</TabsTrigger>
        <TabsTrigger value="vater">Elternteil 2 (Vater)</TabsTrigger>
      </TabsList>
      
      <TabsContent value="mutter" className="space-y-6 mt-6">
        <EinkommenCard
          label="Einkommen Elternteil 1"
          nettoeinkommen={nettoeinkommenMutter}
          beschaeftigungsart={beschaeftigungsartMutter}
          onNettoeinkommenChange={onNettoeinkommenMutterChange}
          onBeschaeftigungsartChange={onBeschaeftigungsartMutterChange}
          isPrefilled={prefilled?.nettoeinkommenMutter !== undefined}
        />
      </TabsContent>
      
      <TabsContent value="vater" className="space-y-6 mt-6">
        <EinkommenCard
          label="Einkommen Elternteil 2"
          nettoeinkommen={nettoeinkommenVater}
          beschaeftigungsart={beschaeftigungsartVater}
          onNettoeinkommenChange={onNettoeinkommenVaterChange}
          onBeschaeftigungsartChange={onBeschaeftigungsartVaterChange}
          isPrefilled={prefilled?.nettoeinkommenVater !== undefined}
        />
      </TabsContent>
    </Tabs>
  );
}
