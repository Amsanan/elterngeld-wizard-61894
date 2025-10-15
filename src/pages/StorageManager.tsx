import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { deleteFolder } from '@/lib/storageUtils';
import { Trash2 } from 'lucide-react';

export default function StorageManager() {
  const [bucketName, setBucketName] = useState('application-documents');
  const [folderPath, setFolderPath] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteFolder = async () => {
    if (!folderPath.trim()) {
      toast.error('Please enter a folder path');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteFolder(bucketName, folderPath);
      
      if (result.success) {
        toast.success(`Deleted ${result.deletedCount} files from folder`);
        setFolderPath('');
      } else {
        toast.error(`Failed to delete folder: ${result.error?.message}`);
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
            Delete folders and their contents from Cloud storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bucket">Bucket Name</Label>
            <Input
              id="bucket"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="application-documents"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder">Folder Path</Label>
            <Input
              id="folder"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="e.g., user-123/documents"
            />
            <p className="text-sm text-muted-foreground">
              Enter the folder path you want to delete (without leading or trailing slashes)
            </p>
          </div>

          <Button
            onClick={handleDeleteFolder}
            disabled={isDeleting}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Folder'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
