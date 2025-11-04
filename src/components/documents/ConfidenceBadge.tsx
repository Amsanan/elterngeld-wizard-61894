import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface ConfidenceBadgeProps {
  score: number;
  showLabel?: boolean;
}

export const ConfidenceBadge = ({ score, showLabel = true }: ConfidenceBadgeProps) => {
  const getConfidenceInfo = (score: number) => {
    if (score >= 80) {
      return {
        variant: "default" as const,
        icon: CheckCircle2,
        label: "Hoch",
        color: "text-green-600 dark:text-green-400"
      };
    } else if (score >= 50) {
      return {
        variant: "secondary" as const,
        icon: AlertCircle,
        label: "Mittel",
        color: "text-yellow-600 dark:text-yellow-400"
      };
    } else {
      return {
        variant: "destructive" as const,
        icon: XCircle,
        label: "Niedrig",
        color: "text-red-600 dark:text-red-400"
      };
    }
  };

  const info = getConfidenceInfo(score);
  const Icon = info.icon;

  return (
    <Badge variant={info.variant} className="text-xs">
      <Icon className="w-3 h-3 mr-1" />
      {showLabel && info.label} {score}%
    </Badge>
  );
};
