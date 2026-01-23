import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Baby, Heart, AlertCircle } from "lucide-react";

interface StepGeschwisterProps {
  kinderUnter3: number;
  kinderUnter6: number;
  kinderMitBehinderungUnter14: number;
  onKinderUnter3Change: (value: number) => void;
  onKinderUnter6Change: (value: number) => void;
  onKinderMitBehinderungChange: (value: number) => void;
  prefilled?: {
    kinderUnter3?: number;
    kinderUnter6?: number;
    kinderMitBehinderung?: number;
  };
}

export function StepGeschwister({
  kinderUnter3,
  kinderUnter6,
  kinderMitBehinderungUnter14,
  onKinderUnter3Change,
  onKinderUnter6Change,
  onKinderMitBehinderungChange,
  prefilled,
}: StepGeschwisterProps) {
  // Prüfen ob Geschwisterbonus gilt
  const hatGeschwisterbonus = kinderUnter3 >= 1 || kinderUnter6 >= 2 || kinderMitBehinderungUnter14 >= 1;

  return (
    <div className="space-y-6">
      {hatGeschwisterbonus && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Heart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">
                  Geschwisterbonus qualifiziert!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Sie erhalten 10% zusätzlich (mind. 75 EUR bei Basiselterngeld)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5" />
            Weitere Kinder im Haushalt
          </CardTitle>
          <CardDescription>
            Der Geschwisterbonus wird gewährt, wenn weitere Kinder im Haushalt leben
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="kinderUnter3" className="flex items-center gap-2">
              Kinder unter 3 Jahren
              <Badge variant="secondary">+1 = Bonus</Badge>
            </Label>
            <Input
              id="kinderUnter3"
              type="number"
              min={0}
              max={10}
              value={kinderUnter3}
              onChange={(e) => onKinderUnter3Change(parseInt(e.target.value) || 0)}
            />
            {prefilled?.kinderUnter3 !== undefined && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                ✓ {prefilled.kinderUnter3} Kind(er) aus Geburtsurkunden erkannt
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Mindestens ein Kind unter 3 Jahren berechtigt zum Geschwisterbonus
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kinderUnter6" className="flex items-center gap-2">
              Kinder unter 6 Jahren
              <Badge variant="secondary">+2 = Bonus</Badge>
            </Label>
            <Input
              id="kinderUnter6"
              type="number"
              min={0}
              max={10}
              value={kinderUnter6}
              onChange={(e) => onKinderUnter6Change(parseInt(e.target.value) || 0)}
            />
            {prefilled?.kinderUnter6 !== undefined && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                ✓ {prefilled.kinderUnter6} Kind(er) aus Geburtsurkunden erkannt
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Mindestens zwei Kinder unter 6 Jahren berechtigen zum Geschwisterbonus
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kinderMitBehinderung" className="flex items-center gap-2">
              Kinder mit Behinderung unter 14 Jahren
              <Badge variant="secondary">+1 = Bonus</Badge>
            </Label>
            <Input
              id="kinderMitBehinderung"
              type="number"
              min={0}
              max={10}
              value={kinderMitBehinderungUnter14}
              onChange={(e) => onKinderMitBehinderungChange(parseInt(e.target.value) || 0)}
            />
            {prefilled?.kinderMitBehinderung !== undefined && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                ✓ {prefilled.kinderMitBehinderung} Kind(er) aus Schwerbehindertenausweisen erkannt
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Ein Kind mit Behinderung (GdB mind. 20%) unter 14 Jahren berechtigt zum Geschwisterbonus
            </p>
          </div>
        </CardContent>
      </Card>

      {!hatGeschwisterbonus && (
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                Aktuell kein Anspruch auf Geschwisterbonus. Voraussetzungen: 1 Kind unter 3, 
                2 Kinder unter 6, oder 1 Kind mit Behinderung unter 14 Jahren.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
