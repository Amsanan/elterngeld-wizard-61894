import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FillMode } from "@/lib/fill-mode-engine";

interface FillModeBadgeProps {
  fillMode: FillMode;
  className?: string;
}

const fillModeConfig: Record<FillMode, { label: string; className: string }> = {
  AUTO_FILL: {
    label: 'Auto',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
  },
  SUGGEST: {
    label: 'Vorschlag',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800'
  },
  CONFIRM_ONLY: {
    label: 'Entscheidung',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
  }
};

export function FillModeBadge({ fillMode, className }: FillModeBadgeProps) {
  const config = fillModeConfig[fillMode];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
