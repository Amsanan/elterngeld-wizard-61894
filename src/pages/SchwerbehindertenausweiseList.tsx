import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Loader2, Accessibility, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function SchwerbehindertenausweiseList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('schwerbehindertenausweise')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading records:', error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen Eintrag wirklich löschen?")) return;

    try {
      const { error } = await supabase
        .from('schwerbehindertenausweise')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRecords(records.filter(r => r.id !== id));
      toast.success("Eintrag gelöscht");
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error("Fehler beim Löschen");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd.MM.yyyy", { locale: de });
    } catch {
      return dateStr;
    }
  };

  const getPersonLabel = (personType: string | null) => {
    switch (personType) {
      case 'mutter': return 'Mutter';
      case 'vater': return 'Vater';
      case 'kind': return 'Kind';
      default: return '-';
    }
  };

  const getMerkzeichenList = (record: any) => {
    const merkzeichen = [];
    if (record.merkzeichen_g) merkzeichen.push('G');
    if (record.merkzeichen_ag) merkzeichen.push('aG');
    if (record.merkzeichen_b) merkzeichen.push('B');
    if (record.merkzeichen_bl) merkzeichen.push('Bl');
    if (record.merkzeichen_gl) merkzeichen.push('Gl');
    if (record.merkzeichen_h) merkzeichen.push('H');
    if (record.merkzeichen_rf) merkzeichen.push('RF');
    if (record.merkzeichen_tbl) merkzeichen.push('TBl');
    if (record.merkzeichen_1kl) merkzeichen.push('1.Kl');
    return merkzeichen;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Dashboard
          </Button>
          <Button onClick={() => navigate("/upload-schwerbehindertenausweis")}>
            <Plus className="mr-2 h-4 w-4" />
            Neuen Ausweis hochladen
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Accessibility className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Schwerbehindertenausweise</CardTitle>
                <CardDescription>
                  Übersicht aller hochgeladenen Schwerbehindertenausweise und Feststellungsbescheide
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Accessibility className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Noch keine Schwerbehindertenausweise hochgeladen</p>
                <Button 
                  variant="link" 
                  onClick={() => navigate("/upload-schwerbehindertenausweis")}
                  className="mt-2"
                >
                  Ersten Ausweis hochladen
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>GdB</TableHead>
                    <TableHead>Merkzeichen</TableHead>
                    <TableHead>Gültig bis</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {getPersonLabel(record.person_type)}
                          {record.person_type === 'kind' && record.kind_ordnungszahl !== null && 
                            ` ${record.kind_ordnungszahl + 1}`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.vorname_inhaber || record.name_inhaber 
                          ? `${record.vorname_inhaber || ''} ${record.name_inhaber || ''}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {record.grad_der_behinderung ? (
                          <Badge>{record.grad_der_behinderung}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getMerkzeichenList(record).map(m => (
                            <Badge key={m} variant="secondary" className="text-xs">
                              {m}
                            </Badge>
                          ))}
                          {getMerkzeichenList(record).length === 0 && '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.unbefristet ? (
                          <Badge variant="outline">Unbefristet</Badge>
                        ) : (
                          formatDate(record.gueltig_bis)
                        )}
                      </TableCell>
                      <TableCell>{formatDate(record.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/schwerbehindertenausweis-result/${record.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
