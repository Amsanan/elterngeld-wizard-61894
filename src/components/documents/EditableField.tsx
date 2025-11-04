import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface EditableFieldProps {
  label: string;
  value: string | null;
  isEditing: boolean;
  documentId: string;
  tableName: string;
  fieldName: string;
  type?: "text" | "date" | "number";
  onUpdate?: (value: string) => void;
  confidenceScore?: number;
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
  confidenceScore,
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
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {confidenceScore !== undefined && !isEditing && (
          <ConfidenceBadge score={confidenceScore} />
        )}
      </div>
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
