import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Upload, CheckCircle2, Download, Shield, Clock } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Elterngeldantrag Auto-Fill</h1>
                <p className="text-sm text-muted-foreground">KI-gestützte Formularausfüllung</p>
              </div>
            </div>
            <a href="/auth">
              <Button variant="outline">Anmelden</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Elterngeldantrag automatisch ausfüllen
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sparen Sie Zeit mit unserer KI-gestützten Lösung. Laden Sie Ihre Dokumente hoch, 
            und wir füllen Ihren Elterngeldantrag automatisch und DSGVO-konform aus.
          </p>
          <a href="/auth">
            <Button size="lg" className="text-lg px-8">
              Jetzt kostenlos starten
            </Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 container mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12 text-foreground">Wie es funktioniert</h3>
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2 text-foreground">1. Dokumente hochladen</h4>
            <p className="text-sm text-muted-foreground">
              Laden Sie Ihre erforderlichen Unterlagen sicher hoch
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-accent" />
            </div>
            <h4 className="font-semibold mb-2 text-foreground">2. KI-Extraktion</h4>
            <p className="text-sm text-muted-foreground">
              Unsere KI liest und versteht Ihre Dokumente automatisch
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h4 className="font-semibold mb-2 text-foreground">3. Überprüfung</h4>
            <p className="text-sm text-muted-foreground">
              Prüfen und korrigieren Sie die extrahierten Daten
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Download className="h-6 w-6 text-warning" />
            </div>
            <h4 className="font-semibold mb-2 text-foreground">4. PDF generieren</h4>
            <p className="text-sm text-muted-foreground">
              Laden Sie Ihren ausgefüllten Antrag herunter
            </p>
          </Card>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 bg-secondary/20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-foreground">
            Sicherheit und Datenschutz
          </h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex gap-4">
              <Shield className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-2 text-foreground">DSGVO-konform</h4>
                <p className="text-sm text-muted-foreground">
                  Alle Daten werden verschlüsselt gespeichert und nach 30 Tagen automatisch gelöscht
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Clock className="h-8 w-8 text-accent flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-2 text-foreground">Automatische Löschung</h4>
                <p className="text-sm text-muted-foreground">
                  Ihre Daten werden automatisch nach der vorgegebenen Frist entfernt
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Elterngeldantrag Auto-Fill. Alle Rechte vorbehalten.</p>
          <p className="mt-2">DSGVO-konform • Sicher • Zuverlässig</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
