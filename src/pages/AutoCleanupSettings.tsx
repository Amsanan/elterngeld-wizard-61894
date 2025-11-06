import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Save, Play, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AutoCleanupSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningManual, setRunningManual] = useState(false);
  const [settings, setSettings] = useState({
    cleanup_interval_hours: 48,
    is_enabled: true,
    last_run_at: null as string | null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('document_cleanup_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          cleanup_interval_hours: data.cleanup_interval_hours,
          is_enabled: data.is_enabled,
          last_run_at: data.last_run_at,
        });
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load cleanup settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('document_cleanup_settings')
        .upsert({
          user_id: user.id,
          cleanup_interval_hours: settings.cleanup_interval_hours,
          is_enabled: settings.is_enabled,
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your automatic cleanup settings have been updated.",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const runCleanupNow = async () => {
    setRunningManual(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-old-documents', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Cleanup Complete",
        description: `Deleted ${data.total_deleted || 0} old documents.`,
      });

      await loadSettings();
    } catch (error: any) {
      console.error('Error running cleanup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to run cleanup",
        variant: "destructive",
      });
    } finally {
      setRunningManual(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin-setup')}
          className="mb-6"
        >
          ← Back to Admin
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trash2 className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Automatic Document Cleanup</CardTitle>
                <CardDescription>
                  Automatically delete old documents from application-documents storage
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="cleanup-enabled" className="text-base font-medium">
                  Enable Automatic Cleanup
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically delete documents older than the specified interval
                </p>
              </div>
              <Switch
                id="cleanup-enabled"
                checked={settings.is_enabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, is_enabled: checked })
                }
              />
            </div>

            {/* Interval Setting */}
            <div className="space-y-3">
              <Label htmlFor="cleanup-interval" className="text-base font-medium">
                Cleanup Interval (Hours)
              </Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="cleanup-interval"
                  type="number"
                  min="1"
                  max="720"
                  value={settings.cleanup_interval_hours}
                  onChange={(e) => 
                    setSettings({ 
                      ...settings, 
                      cleanup_interval_hours: parseInt(e.target.value) || 48 
                    })
                  }
                  className="max-w-[200px]"
                />
                <span className="text-muted-foreground">
                  hours ({Math.floor(settings.cleanup_interval_hours / 24)} days)
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Documents older than this will be automatically deleted
              </p>
            </div>

            {/* Last Run Info */}
            {settings.last_run_at && (
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Last Cleanup Run</p>
                  <p className="text-muted-foreground">
                    {new Date(settings.last_run_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Warning Notice */}
            <div className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Warning</p>
                <p>
                  Deleted documents cannot be recovered. Make sure you've downloaded any important files before they're automatically removed.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>

              <Button
                onClick={runCleanupNow}
                disabled={runningManual}
                variant="outline"
              >
                {runningManual ? (
                  <>
                    <Play className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Now
                  </>
                )}
              </Button>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Automatic Schedule</p>
                <p className="text-muted-foreground">
                  The cleanup runs automatically every hour. Only files older than your configured interval will be deleted.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AutoCleanupSettings;
