import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

interface MappingStatsProps {
  mappings: any[];
}

export function MappingStats({ mappings }: MappingStatsProps) {
  const totalMappings = mappings.length;
  const highConfidence = mappings.filter(m => m.confidence_score >= 90).length;
  const mediumConfidence = mappings.filter(m => m.confidence_score >= 70 && m.confidence_score < 90).length;
  const lowConfidence = mappings.filter(m => m.confidence_score < 70).length;
  const manualMappings = mappings.filter(m => m.mapping_status === 'manual').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">Total Mappings</p>
            <p className="text-2xl font-bold">{totalMappings}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">High Confidence</p>
            <p className="text-2xl font-bold">{highConfidence}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-8 w-8 text-yellow-500" />
          <div>
            <p className="text-sm text-muted-foreground">Needs Review</p>
            <p className="text-2xl font-bold">{mediumConfidence + lowConfidence}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-sm text-muted-foreground">Manual Edits</p>
            <p className="text-2xl font-bold">{manualMappings}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}