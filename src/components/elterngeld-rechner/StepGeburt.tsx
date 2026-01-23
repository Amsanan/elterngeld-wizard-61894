import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, Calendar, Users } from "lucide-react";

interface StepGeburtProps {
  geburtsdatum: string;
  istFruehgeburt: boolean;
  fruehgeburtWochen: number;
  anzahlMehrlinge: number;
  onGeburtsdatumChange: (value: string) => void;
  onIstFruehgeburtChange: (value: boolean) => void;
  onFruehgeburtWochenChange: (value: number) => void;
  onAnzahlMehrlingeChange: (value: number) => void;
  prefilled?: {
    geburtsdatum?: string;
    istFruehgeburt?: boolean;
    anzahlMehrlinge?: number;
  };
}

export function StepGeburt({
  geburtsdatum,
  istFruehgeburt,
  fruehgeburtWochen,
  anzahlMehrlinge,
  onGeburtsdatumChange,
  onIstFruehgeburtChange,
  onFruehgeburtWochenChange,
  onAnzahlMehrlingeChange,
  prefilled,
}: StepGeburtProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Geburtsdatum
          </CardTitle>
          <CardDescription>
            Geben Sie das Geburtsdatum oder den errechneten Geburtstermin ein
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="geburtsdatum">Geburtsdatum des Kindes</Label>
            <Input
              id="geburtsdatum"
              type="date"
              value={geburtsdatum}
              onChange={(e) => onGeburtsdatumChange(e.target.value)}
            />
            {prefilled?.geburtsdatum && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                ✓ Aus Geburtsurkunde geladen
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5" />
            Frühgeburt
          </CardTitle>
          <CardDescription>
            Bei einer Frühgeburt können zusätzliche Elterngeld-Monate gewährt werden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="fruehgeburt">Frühgeburt</Label>
              <p className="text-sm text-muted-foreground">
                Kind wurde vor dem errechneten Geburtstermin geboren
              </p>
            </div>
            <Switch
              id="fruehgeburt"
              checked={istFruehgeburt}
              onCheckedChange={onIstFruehgeburtChange}
            />
          </div>

          {istFruehgeburt && (
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="fruehgeburtWochen">Wochen vor errechnetem Termin</Label>
              <Input
                id="fruehgeburtWochen"
                type="number"
                min={1}
                max={20}
                value={fruehgeburtWochen}
                onChange={(e) => onFruehgeburtWochenChange(parseInt(e.target.value) || 0)}
              />
              <p className="text-sm text-muted-foreground">
                {fruehgeburtWochen >= 12 && "→ 4 zusätzliche Monate Elterngeld"}
                {fruehgeburtWochen >= 8 && fruehgeburtWochen < 12 && "→ 3 zusätzliche Monate Elterngeld"}
                {fruehgeburtWochen >= 6 && fruehgeburtWochen < 8 && "→ 2 zusätzliche Monate Elterngeld"}
                {fruehgeburtWochen >= 4 && fruehgeburtWochen < 6 && "→ 1 zusätzlicher Monat Elterngeld"}
                {fruehgeburtWochen < 4 && fruehgeburtWochen > 0 && "→ Keine zusätzlichen Monate (erst ab 4 Wochen)"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mehrlinge
          </CardTitle>
          <CardDescription>
            Bei Mehrlingen erhalten Sie 300 EUR zusätzlich pro weiterem Kind
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="mehrlinge">Anzahl gleichzeitig geborener Kinder</Label>
            <Input
              id="mehrlinge"
              type="number"
              min={1}
              max={6}
              value={anzahlMehrlinge}
              onChange={(e) => onAnzahlMehrlingeChange(parseInt(e.target.value) || 1)}
            />
            {prefilled?.anzahlMehrlinge && prefilled.anzahlMehrlinge > 1 && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                ✓ Mehrlinge aus Geburtsurkunden erkannt
              </p>
            )}
            {anzahlMehrlinge > 1 && (
              <p className="text-sm text-primary font-medium">
                → Mehrlingszuschlag: {(anzahlMehrlinge - 1) * 300} EUR monatlich
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
