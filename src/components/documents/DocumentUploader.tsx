import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X } from 'lucide-react';

interface UploadedFile {
  file: File;
  ocrResult?: any;
  documentType?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

interface DocumentUploaderProps {
  title: string;
  documentType: string;
  onFilesProcessed: (files: UploadedFile[]) => void;
  processFile: (file: File) => Promise<any>;
}

export function DocumentUploader({
  title,
  documentType,
  onFilesProcessed,
  processFile,
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = Array.from(selectedFiles).map((file) => ({
      file,
      documentType,
      status: 'pending' as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    for (const uploadedFile of newFiles) {
      await processFileHandler(uploadedFile);
    }
  };

  const processFileHandler = async (uploadedFile: UploadedFile) => {
    setCurrentFile(uploadedFile.file.name);
    setOcrProgress(0);

    setFiles((prev) =>
      prev.map((f) =>
        f.file === uploadedFile.file ? { ...f, status: 'processing' } : f
      )
    );

    try {
      const result = await processFile(uploadedFile.file);

      setFiles((prev) => {
        const updated = prev.map((f) =>
          f.file === uploadedFile.file
            ? { ...f, ocrResult: result, status: 'completed' as const }
            : f
        );
        onFilesProcessed(updated);
        return updated;
      });
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === uploadedFile.file ? { ...f, status: 'error' } : f
        )
      );
    } finally {
      setCurrentFile(null);
      setOcrProgress(0);
    }
  };

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            id={`file-upload-${documentType}`}
            className="hidden"
            onChange={handleFileChange}
            accept="application/pdf,image/*"
            multiple
          />
          <label
            htmlFor={`file-upload-${documentType}`}
            className="cursor-pointer"
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Klicken Sie hier oder ziehen Sie Dateien hierher
            </p>
          </label>
        </div>

        {currentFile && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Verarbeite: {currentFile}
            </p>
            <Progress value={ocrProgress} />
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((uploadedFile, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">{uploadedFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Status: {uploadedFile.status}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadedFile.file)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
