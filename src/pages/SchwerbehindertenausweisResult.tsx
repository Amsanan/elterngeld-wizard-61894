import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2, Accessibility, Calendar, FileCheck } from "lucide-react";
import { toast } from "sonner";

export default function SchwerbehindertenausweisResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const { data: record, error } = await supabase
        .from('schwerbehindertenausweise')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setData(record);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('schwerbehindertenausweise')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      toast.success("Änderungen gespeichert");
    } catch (error) {
      console.error('Error saving:', error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/schwerbehindertenausweise")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Liste
          </Button>
          <Card className="mt-6">
            <CardContent className="py-12 text-center text-muted-foreground">
              Datensatz nicht gefunden
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const merkzeichen = [
    { key: 'merkzeichen_g', label: 'G - Gehbehindert' },
    { key: 'merkzeichen_ag', label: 'aG - Außergewöhnlich gehbehindert' },
    { key: 'merkzeichen_b', label: 'B - Begleitperson' },
    { key: 'merkzeichen_bl', label: 'Bl - Blind' },
    { key: 'merkzeichen_gl', label: 'Gl - Gehörlos' },
    { key: 'merkzeichen_h', label: 'H - Hilflos' },
    { key: 'merkzeichen_rf', label: 'RF - Rundfunkgebührenbefreiung' },
    { key: 'merkzeichen_tbl', label: 'TBl - Taubblind' },
    { key: 'merkzeichen_1kl', label: '1. Kl. - 1. Klasse Bahn' },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/schwerbehindertenausweise")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Liste
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Speichern
          </Button>
        </div>

        {/* Personal Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Accessibility className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Persönliche Daten</CardTitle>
                <CardDescription>Angaben zum Ausweisinhaber</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Vorname</Label>
              <Input
                value={data.vorname_inhaber || ''}
                onChange={(e) => updateField('vorname_inhaber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nachname</Label>
              <Input
                value={data.name_inhaber || ''}
                onChange={(e) => updateField('name_inhaber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Geburtsdatum</Label>
              <Input
                type="date"
                value={data.geburtsdatum || ''}
                onChange={(e) => updateField('geburtsdatum', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Geschlecht</Label>
              <Input
                value={data.geschlecht || ''}
                onChange={(e) => updateField('geschlecht', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Disability Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Behinderungsgrad</CardTitle>
                <CardDescription>GdB und Gültigkeit</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Grad der Behinderung (GdB)</Label>
              <Input
                type="number"
                min="20"
                max="100"
                step="10"
                value={data.grad_der_behinderung || ''}
                onChange={(e) => updateField('grad_der_behinderung', parseInt(e.target.value) || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>GdB gültig ab</Label>
              <Input
                type="date"
                value={data.gdb_ab_datum || ''}
                onChange={(e) => updateField('gdb_ab_datum', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Gültig bis</Label>
              <Input
                type="date"
                value={data.gueltig_bis || ''}
                onChange={(e) => updateField('gueltig_bis', e.target.value)}
                disabled={data.unbefristet}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="unbefristet"
                checked={data.unbefristet || false}
                onCheckedChange={(checked) => {
                  updateField('unbefristet', checked);
                  if (checked) updateField('gueltig_bis', null);
                }}
              />
              <Label htmlFor="unbefristet">Unbefristet gültig</Label>
            </div>
          </CardContent>
        </Card>

        {/* Merkzeichen */}
        <Card>
          <CardHeader>
            <CardTitle>Merkzeichen</CardTitle>
            <CardDescription>Im Ausweis eingetragene Merkzeichen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {merkzeichen.map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={data[key] || false}
                    onCheckedChange={(checked) => updateField(key, checked)}
                  />
                  <Label htmlFor={key} className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Authority Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Ausstellende Behörde</CardTitle>
                <CardDescription>Angaben zur Ausstellung</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Behörde</Label>
              <Input
                value={data.ausstellende_behoerde || ''}
                onChange={(e) => updateField('ausstellende_behoerde', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Aktenzeichen</Label>
              <Input
                value={data.aktenzeichen || ''}
                onChange={(e) => updateField('aktenzeichen', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ausstellungsdatum</Label>
              <Input
                type="date"
                value={data.ausstellungsdatum || ''}
                onChange={(e) => updateField('ausstellungsdatum', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
