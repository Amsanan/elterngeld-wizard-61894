import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Upload, List, LogOut, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [isCreatingAntrag, setIsCreatingAntrag] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("alle");
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

  const handleCreateAntrag = () => {
    navigate("/upload-geburtsurkunde");
  };

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
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-foreground">Willkommen zurück!</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Kategorie filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Dokumente</SelectItem>
                  <SelectItem value="identitaet">Identität & Geburt</SelectItem>
                  <SelectItem value="einkommen">Einkommen & Steuern</SelectItem>
                  <SelectItem value="soziales">Sozialleistungen</SelectItem>
                  <SelectItem value="bank">Bank & Versicherung</SelectItem>
                  <SelectItem value="familie">Familie & Sorgerecht</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {(filterCategory === "alle" || filterCategory === "identitaet") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Geburtsurkunde</h3>
                    <p className="text-muted-foreground">
                      Geburtsurkunde für Elterngeldantrag
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={handleCreateAntrag} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/geburtsurkunden-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "identitaet") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Eltern-Dokument</h3>
                    <p className="text-muted-foreground">
                      Personalausweis, Reisepass oder Aufenthaltstitel
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-eltern-dokument")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/eltern-dokumente-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "einkommen") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Steuerbescheid</h3>
                    <p className="text-muted-foreground">
                      Einkommensteuerbescheid der Eltern
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-steuerbescheid")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/steuerbescheide-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "einkommen") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Arbeitgeberbescheinigung</h3>
                    <p className="text-muted-foreground">
                      Bescheinigung vom Arbeitgeber
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-arbeitgeberbescheinigung")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/arbeitgeberbescheinigungen-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "einkommen") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Gehaltsnachweis</h3>
                    <p className="text-muted-foreground">
                      Gehaltsabrechnung
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-gehaltsnachweis")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/gehaltsnachweise-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "soziales") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Mutterschaftsgeld</h3>
                    <p className="text-muted-foreground">
                      Bescheid über Mutterschaftsgeld
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-mutterschaftsgeld")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/mutterschaftsgeld-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "einkommen") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Selbstständigen-Nachweis</h3>
                    <p className="text-muted-foreground">
                      Einkommensnachweis für Selbstständige
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-selbststaendigen-nachweis")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/selbststaendigen-nachweise-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "soziales") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Leistungsbescheid</h3>
                    <p className="text-muted-foreground">
                      ALG, Bürgergeld oder Krankengeld
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-leistungsbescheid")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/leistungsbescheide-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "bank") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Bankverbindung</h3>
                    <p className="text-muted-foreground">
                      Kontoauszug oder Bankbestätigung
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-bankverbindung")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/bankverbindungen-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "identitaet") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Meldebescheinigung</h3>
                    <p className="text-muted-foreground">
                      Meldebestätigung vom Einwohnermeldeamt
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-meldebescheinigung")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/meldebescheinigungen-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "bank") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Krankenversicherung</h3>
                    <p className="text-muted-foreground">
                      Versicherungsnachweis der Krankenkasse
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-krankenversicherung")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/krankenversicherung-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "familie") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Ehe-/Sorgerechtsdokument</h3>
                    <p className="text-muted-foreground">
                      Heiratsurkunde oder Sorgerechtsbescheinigung
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-ehe-sorgerecht")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/ehe-sorgerecht-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(filterCategory === "alle" || filterCategory === "familie") && (
              <Card className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Adoptions-/Pflegedokument</h3>
                    <p className="text-muted-foreground">
                      Adoptionsbeschluss oder Pflegeerlaubnis
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button onClick={() => navigate("/upload-adoptions-pflege")} className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/adoptions-pflege-list")} className="flex-1">
                      <List className="h-4 w-4 mr-2" />
                      Meine Dokumente
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Info Card */}
          <Card className="mt-8 p-6 bg-secondary/20 border-accent/20">
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
