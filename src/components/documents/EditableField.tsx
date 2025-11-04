import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface EditableFieldProps {
  label: string;
  value: string | null;
  isEditing: boolean;
  documentId: string;
  tableName: string;
  fieldName: string;
  type?: "text" | "date" | "number";
  onUpdate?: (value: string) => void;
}

export const EditableField = ({
  label,
  value,
  isEditing,
  documentId,
  tableName,
  fieldName,
  type = "text",
  onUpdate,
}: EditableFieldProps) => {
  const [localValue, setLocalValue] = useState(value || "");

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleBlur = async () => {
    if (localValue === value) return;

    try {
      const updateData: any = {};
      updateData[fieldName] = localValue || null;

      const { error } = await supabase
        .from(tableName as any)
        .update(updateData)
        .eq("id", documentId);

      if (error) throw error;

      if (onUpdate) {
        onUpdate(localValue);
      }
    } catch (error) {
      console.error("Error updating field:", error);
      setLocalValue(value || "");
    }
  };

  const displayValue = type === "date" && value
    ? new Date(value).toLocaleDateString("de-DE")
    : value || "Nicht extrahiert";

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      {isEditing ? (
        <Input
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          className="font-medium"
        />
      ) : (
        <p className="font-medium">{displayValue}</p>
      )}
    </div>
  );
};
