import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Euro, 
  TrendingUp, 
  Users, 
  Baby, 
  Heart,
  Calendar,
  ArrowRight
} from "lucide-react";
import { ElterngeldResult } from "@/hooks/useElterngeldCalculation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StepErgebnisProps {
  result: ElterngeldResult;
  alleinerziehend: boolean;
  basisMonateMutter: number;
  basisMonateVater: number;
  plusMonateMutter: number;
  plusMonateVater: number;
}

export function StepErgebnis({
  result,
  alleinerziehend,
  basisMonateMutter,
  basisMonateVater,
  plusMonateMutter,
  plusMonateVater,
}: StepErgebnisProps) {
  // Daten für Chart vorbereiten
  const chartData = alleinerziehend
    ? [
        {
          name: 'Basiselterngeld',
          Betrag: result.basiselterngeldMutter,
          Monate: basisMonateMutter,
        },
        {
          name: 'ElterngeldPlus',
          Betrag: result.elterngeldPlusMutter,
          Monate: plusMonateMutter,
        },
      ]
    : [
        {
          name: 'Basis E1',
          Betrag: result.basiselterngeldMutter,
          Monate: basisMonateMutter,
        },
        {
          name: 'Plus E1',
          Betrag: result.elterngeldPlusMutter,
          Monate: plusMonateMutter,
        },
        {
          name: 'Basis E2',
          Betrag: result.basiselterngeldVater,
          Monate: basisMonateVater,
        },
        {
          name: 'Plus E2',
          Betrag: result.elterngeldPlusVater,
          Monate: plusMonateVater,
        },
      ];

  return (
    <div className="space-y-6">
      {/* Hauptergebnis */}
      <Card className="border-primary bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Euro className="h-6 w-6" />
            Ihr Elterngeld
          </CardTitle>
          <CardDescription>
            Geschätzte Gesamtsumme über den Bezugszeitraum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-primary">
              {result.gesamtFamilie.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-muted-foreground mt-2">
              Gesamtes Elterngeld für Ihre Familie
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Monatliche Beträge */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {alleinerziehend ? 'Ihr monatliches Elterngeld' : 'Elternteil 1 (Mutter)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Basiselterngeld</span>
              <span className="font-bold">{result.basiselterngeldMutter.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center">
              <span>ElterngeldPlus</span>
              <span className="font-bold">{result.elterngeldPlusMutter.toFixed(2)} €</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span>Ersatzrate</span>
              <Badge variant="secondary">{result.ersatzrateMutter.toFixed(1)}%</Badge>
            </div>
            <div className="flex justify-between items-center text-primary font-semibold">
              <span>Gesamt über Bezugszeit</span>
              <span>{result.gesamtMutter.toLocaleString('de-DE')} €</span>
            </div>
          </CardContent>
        </Card>

        {!alleinerziehend && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" />
                Elternteil 2 (Vater)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Basiselterngeld</span>
                <span className="font-bold">{result.basiselterngeldVater.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span>ElterngeldPlus</span>
                <span className="font-bold">{result.elterngeldPlusVater.toFixed(2)} €</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span>Ersatzrate</span>
                <Badge variant="secondary">{result.ersatzrateVater.toFixed(1)}%</Badge>
              </div>
              <div className="flex justify-between items-center text-primary font-semibold">
                <span>Gesamt über Bezugszeit</span>
                <span>{result.gesamtVater.toLocaleString('de-DE')} €</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Boni */}
      {(result.geschwisterbonus > 0 || result.mehrlingszuschlag > 0 || result.zusaetzlicheMonate > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Zusätzliche Leistungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.geschwisterbonus > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Geschwisterbonus</p>
                    <p className="text-sm text-muted-foreground">10% Zuschlag auf Elterngeld</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">+{result.geschwisterbonus.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground">pro Monat (Basis)</p>
                </div>
              </div>
            )}

            {result.mehrlingszuschlag > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Baby className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Mehrlingszuschlag</p>
                    <p className="text-sm text-muted-foreground">300 € pro weiterem Kind</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">+{result.mehrlingszuschlag} €</p>
                  <p className="text-xs text-muted-foreground">pro Monat</p>
                </div>
              </div>
            )}

            {result.zusaetzlicheMonate > 0 && (
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Frühgeburts-Bonus</p>
                    <p className="text-sm text-muted-foreground">Zusätzliche Bezugsmonate</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-600">+{result.zusaetzlicheMonate} Monate</p>
                  <p className="text-xs text-muted-foreground">Basiselterngeld</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visualisierung */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Übersicht</CardTitle>
          <CardDescription>Monatliche Beträge nach Elterngeld-Art</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)} €`, 'Monatlich']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Legend />
                <Bar dataKey="Betrag" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hinweise */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Hinweis:</strong> Dies ist eine unverbindliche Schätzung basierend auf Ihren Angaben.
                Der tatsächliche Elterngeld-Betrag kann abweichen und wird von der Elterngeldstelle berechnet.
              </p>
              <p>
                Maximale Bezugsdauer: {result.maxMonateBasis} Monate Basiselterngeld oder 
                {' '}{result.maxMonatePlus} Monate ElterngeldPlus.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
