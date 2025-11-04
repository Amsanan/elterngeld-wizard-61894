import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, X, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentActionsProps {
  documentId: string;
  tableName: string;
  listRoute: string;
  onEditToggle: (isEditing: boolean) => void;
  onDataChange?: (data: any) => void;
}

export const DocumentActions = ({
  documentId,
  tableName,
  listRoute,
  onEditToggle,
  onDataChange,
}: DocumentActionsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEdit = () => {
    setIsEditing(!isEditing);
    onEditToggle(!isEditing);
  };

  const handleSave = async () => {
    setIsEditing(false);
    onEditToggle(false);
    toast({
      title: "Gespeichert",
      description: "Die Änderungen wurden erfolgreich gespeichert.",
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from(tableName as any).delete().eq("id", documentId);

      if (error) throw error;

      toast({
        title: "Gelöscht",
        description: "Das Dokument wurde erfolgreich gelöscht.",
      });

      navigate(listRoute);
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="flex gap-3">
        {isEditing ? (
          <>
            <Button onClick={handleSave} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
            <Button onClick={handleEdit} variant="outline" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleEdit} variant="outline" className="flex-1">
              <Pencil className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Das Dokument und
              alle extrahierten Daten werden permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Wird gelöscht..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
