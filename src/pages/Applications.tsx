import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, ArrowLeft, Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Applications = () => {
  const navigate = useNavigate();

  // Mock data - will be replaced with actual database queries
  const applications = [
    {
      id: 1,
      date: "2025-10-10",
      status: "completed",
      childName: "Max Mustermann",
    },
  ];

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
          {applications.length === 0 ? (
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
                          Antrag für {app.childName}
                        </h3>
                        <Badge className="bg-success/10 text-success border-success/20">
                          Abgeschlossen
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Erstellt am: {new Date(app.date).toLocaleDateString("de-DE")}
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
    </div>
  );
};

export default Applications;
