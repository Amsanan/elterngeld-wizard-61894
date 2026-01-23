import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, User } from "lucide-react";
import { BUNDESLAENDER } from "@/hooks/useElterngeldCalculation";

interface StepAllgemeinProps {
  bundesland: string;
  alleinerziehend: boolean;
  onBundeslandChange: (value: string) => void;
  onAlleinerziehendChange: (value: boolean) => void;
  prefilled?: {
    alleinerziehend?: boolean;
  };
}

export function StepAllgemein({
  bundesland,
  alleinerziehend,
  onBundeslandChange,
  onAlleinerziehendChange,
  prefilled,
}: StepAllgemeinProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Bundesland
          </CardTitle>
          <CardDescription>
            Wählen Sie das Bundesland, in dem Sie Ihren Wohnsitz haben
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={bundesland} onValueChange={onBundeslandChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Bundesland auswählen" />
            </SelectTrigger>
            <SelectContent>
              {BUNDESLAENDER.map((land) => (
                <SelectItem key={land} value={land}>
                  {land}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Familiensituation
          </CardTitle>
          <CardDescription>
            Sind Sie alleinerziehend?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="alleinerziehend">Alleinerziehend</Label>
              <p className="text-sm text-muted-foreground">
                Als Alleinerziehende/r können Sie bis zu 14 Monate Basiselterngeld beziehen
              </p>
              {prefilled?.alleinerziehend !== undefined && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  ✓ Aus Ihren Dokumenten geladen
                </p>
              )}
            </div>
            <Switch
              id="alleinerziehend"
              checked={alleinerziehend}
              onCheckedChange={onAlleinerziehendChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
