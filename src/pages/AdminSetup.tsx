import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminSetup = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  const uploadPdfTemplate = async () => {
    setUploading(true);
    setUploadStatus('idle');
    
    try {
      // Fetch the PDF from the public folder
      const response = await fetch('/elterngeldantrag_bis_Maerz25.pdf');
      
      if (!response.ok) {
        throw new Error('Failed to fetch PDF from public folder');
      }

      const blob = await response.blob();
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('form-templates')
        .upload('elterngeldantrag_bis_Maerz25.pdf', blob, {
          contentType: 'application/pdf',
          upsert: true // Overwrite if exists
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadStatus('success');
      toast({
        title: "Upload Successful",
        description: "The Elterngeld PDF template has been uploaded to storage.",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload PDF template",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          ← Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Admin Setup</CardTitle>
            <CardDescription>
              Upload the Elterngeld PDF template to the storage bucket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">What this does:</p>
                  <p>
                    This uploads the <code className="bg-background px-1.5 py-0.5 rounded">elterngeldantrag_bis_Maerz25.pdf</code> file 
                    from your public folder to the <code className="bg-background px-1.5 py-0.5 rounded">form-templates</code> storage 
                    bucket, making it available for the form filling edge functions.
                  </p>
                </div>
              </div>

              <Button
                onClick={uploadPdfTemplate}
                disabled={uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : uploadStatus === 'success' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Upload Complete
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload PDF Template
                  </>
                )}
              </Button>

              {uploadStatus === 'success' && (
                <div className="flex items-center gap-2 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">
                    Template uploaded successfully! The edge functions can now use it.
                  </p>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">
                    Upload failed. Check the console for details.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Storage Management</CardTitle>
            <CardDescription>
              Configure automatic cleanup of old documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/auto-cleanup-settings')}
              variant="outline"
              className="w-full"
            >
              Manage Auto-Cleanup Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSetup;
