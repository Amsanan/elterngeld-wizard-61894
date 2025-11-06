import { useState, useRef, DragEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, CheckCircle, AlertCircle, FileUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminSetup = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access admin features",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const uploadPdfFromFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadStatus('idle');
    
    try {
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('form-templates')
        .upload('elterngeldantrag_bis_Maerz25.pdf', file, {
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
      await uploadPdfFromFile(new File([blob], 'elterngeldantrag_bis_Maerz25.pdf', { type: 'application/pdf' }));
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload PDF template",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadPdfFromFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadPdfFromFile(files[0]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
                    to the <code className="bg-background px-1.5 py-0.5 rounded">form-templates</code> storage 
                    bucket, making it available for the form filling edge functions.
                  </p>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragging 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
                  }
                  ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <FileUp className={`mx-auto h-12 w-12 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-lg font-medium mb-2">
                  {isDragging ? 'Drop PDF here' : 'Drag & drop PDF file here'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Accepted format: PDF only
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button
                onClick={uploadPdfTemplate}
                disabled={uploading}
                variant="outline"
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
                    Upload from Public Folder
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
