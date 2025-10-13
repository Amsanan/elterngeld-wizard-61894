import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, ArrowLeft, Download, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Applications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAntragId, setSelectedAntragId] = useState<string | null>(null);

  // Fetch applications from database
  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('antrag')
        .select(`
          id,
          created_at,
          status,
          kind (
            vorname,
            nachname
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleDeleteClick = (antragId: string) => {
    setSelectedAntragId(antragId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAntragId) return;

    try {
      const { error } = await supabase
        .from('antrag')
        .delete()
        .eq('id', selectedAntragId);

      if (error) throw error;

      toast({
        title: "Antrag gelöscht",
        description: "Der Antrag wurde erfolgreich gelöscht.",
      });

      queryClient.invalidateQueries({ queryKey: ['applications'] });
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: "Fehler",
        description: "Der Antrag konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedAntragId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Meine Anträge</h1>
                <p className="text-sm text-muted-foreground">Übersicht aller Anträge</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Lade Anträge...</p>
            </Card>
          ) : !applications || applications.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">Keine Anträge vorhanden</h3>
              <p className="text-muted-foreground mb-6">
                Sie haben noch keine Elterngeldanträge erstellt.
              </p>
              <Button onClick={() => navigate("/upload")}>
                Neuen Antrag erstellen
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <Card key={app.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          Antrag für {app.kind?.[0]?.vorname} {app.kind?.[0]?.nachname}
                        </h3>
                        <Badge 
                          className={
                            app.status === 'completed' 
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-secondary/10 text-secondary border-secondary/20"
                          }
                        >
                          {app.status === 'completed' ? 'Abgeschlossen' : 'Entwurf'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Erstellt am: {new Date(app.created_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Ansehen
                      </Button>
                      <Button size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Herunterladen
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteClick(app.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="mt-8 p-6 bg-secondary/20">
            <h4 className="font-semibold mb-2 text-foreground">Hinweis zur Datenspeicherung</h4>
            <p className="text-sm text-muted-foreground">
              Alle Anträge und hochgeladenen Dokumente werden nach 30 Tagen automatisch 
              und unwiderruflich von unseren Servern gelöscht. Bitte stellen Sie sicher, 
              dass Sie wichtige Dokumente rechtzeitig herunterladen.
            </p>
          </Card>
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Antrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diesen Antrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Applications;
