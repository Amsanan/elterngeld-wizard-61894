import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { deleteAllFilesInBucket } from '@/lib/storageUtils';
import { Trash2 } from 'lucide-react';

export default function StorageManager() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete ALL files in the application-documents bucket? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAllFilesInBucket('application-documents');
      
      if (result.success) {
        toast.success(`Successfully deleted ${result.deletedCount} files`);
      } else {
        toast.error(`Failed to delete files: ${result.error?.message}`);
      }
    } catch (error) {
      toast.error('Unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Storage Manager</CardTitle>
          <CardDescription>
            Delete all files from the application-documents bucket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will permanently delete all uploaded files in the application-documents storage bucket.
            </p>
            <p className="text-sm font-semibold text-destructive">
              This action cannot be undone!
            </p>
          </div>

          <Button
            onClick={handleDeleteAll}
            disabled={isDeleting}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete All Files'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
