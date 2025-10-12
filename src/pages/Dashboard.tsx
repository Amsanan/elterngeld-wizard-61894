import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Upload, List, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TemplateUploader } from "@/components/TemplateUploader";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Erfolgreich abgemeldet",
      description: "Sie wurden sicher abgemeldet.",
    });
    navigate("/");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-foreground">Willkommen zurück!</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="p-8 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate("/upload")}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Neuer Antrag</h3>
                  <p className="text-muted-foreground">
                    Dokumente hochladen und neuen Elterngeldantrag erstellen
                  </p>
                </div>
                <Button className="mt-4">Jetzt starten</Button>
              </div>
            </Card>

            <Card 
              className="p-8 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate("/applications")}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                  <List className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Meine Anträge</h3>
                  <p className="text-muted-foreground">
                    Gespeicherte und abgeschlossene Anträge einsehen
                  </p>
                </div>
                <Button variant="outline" className="mt-4">Anzeigen</Button>
              </div>
            </Card>
          </div>

          {/* Template Upload Component - for initial setup */}
          <div className="mt-8">
            <TemplateUploader />
          </div>

          {/* Info Card */}
          <Card className="mt-6 p-6 bg-secondary/20 border-accent/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-accent" />
              Datenschutzhinweis
            </h4>
            <p className="text-sm text-muted-foreground">
              Alle Ihre hochgeladenen Dokumente und Daten werden DSGVO-konform verschlüsselt 
              gespeichert und nach 30 Tagen automatisch und unwiderruflich gelöscht.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
