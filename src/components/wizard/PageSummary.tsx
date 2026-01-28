import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Clock, AlertCircle } from "lucide-react";
import type { PageStats } from "@/lib/fill-mode-engine";

interface PageSummaryProps {
  pageNumber: number;
  pageTitle: string;
  stats: PageStats;
}

export function PageSummary({ pageNumber, pageTitle, stats }: PageSummaryProps) {
  return (
    <Card className="mb-4">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">Seite {pageNumber}: {pageTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {stats.total} Felder auf dieser Seite
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{stats.completionPercent}%</span>
            <p className="text-xs text-muted-foreground">abgeschlossen</p>
          </div>
        </div>
        
        <Progress value={stats.completionPercent} className="h-2 mb-4" />
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div>
              <span className="font-medium">{stats.autoFilled}</span>
              <span className="text-muted-foreground ml-1">Auto</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div>
              <span className="font-medium">{stats.suggestedPending}</span>
              <span className="text-muted-foreground ml-1">Ausstehend</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div>
              <span className="font-medium">{stats.confirmOnly + stats.empty}</span>
              <span className="text-muted-foreground ml-1">Entscheidung</span>
            </div>
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          {stats.autoFilled > 0 && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check className="h-3 w-3" />
              {stats.autoFilled} automatisch
            </div>
          )}
          {stats.confirmed > 0 && (
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <Check className="h-3 w-3" />
              {stats.confirmed} bestätigt
            </div>
          )}
          {stats.suggestedPending > 0 && (
            <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
              <Clock className="h-3 w-3" />
              {stats.suggestedPending} Vorschläge prüfen
            </div>
          )}
          {stats.empty > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              {stats.empty} offen
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
