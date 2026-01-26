import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TargetPerson = 
  | 'elternteil_1'
  | 'elternteil_2'
  | 'antragskind'
  | 'geschwister_1'
  | 'geschwister_2'
  | 'geschwister_3'
  | 'mehrling_1'
  | 'mehrling_2'
  | 'mehrling_3'
  | 'beide_eltern'
  | 'universal';

interface TargetPersonBadgeProps {
  targetPerson: TargetPerson | string;
  className?: string;
}

const badgeConfig: Record<string, { label: string; className: string }> = {
  elternteil_1: { 
    label: 'E1', 
    className: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30' 
  },
  elternteil_2: { 
    label: 'E2', 
    className: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30' 
  },
  antragskind: { 
    label: 'AK', 
    className: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30' 
  },
  geschwister_1: { 
    label: 'G1', 
    className: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30' 
  },
  geschwister_2: { 
    label: 'G2', 
    className: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30' 
  },
  geschwister_3: { 
    label: 'G3', 
    className: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30' 
  },
  mehrling_1: { 
    label: 'M1', 
    className: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' 
  },
  mehrling_2: { 
    label: 'M2', 
    className: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' 
  },
  mehrling_3: { 
    label: 'M3', 
    className: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' 
  },
  beide_eltern: { 
    label: 'BE', 
    className: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/30' 
  },
  universal: { 
    label: '—', 
    className: 'bg-muted text-muted-foreground border-muted-foreground/20' 
  },
};

export function TargetPersonBadge({ targetPerson, className }: TargetPersonBadgeProps) {
  const config = badgeConfig[targetPerson] || badgeConfig.universal;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-[10px] px-1.5 py-0 h-4 font-semibold",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

export function getTargetPersonLabel(targetPerson: string): string {
  const labels: Record<string, string> = {
    elternteil_1: 'Elternteil 1',
    elternteil_2: 'Elternteil 2',
    antragskind: 'Antragskind',
    geschwister_1: '1. Geschwister',
    geschwister_2: '2. Geschwister',
    geschwister_3: '3. Geschwister',
    mehrling_1: '1. Mehrling',
    mehrling_2: '2. Mehrling',
    mehrling_3: '3. Mehrling',
    beide_eltern: 'Beide Eltern',
    universal: 'Allgemein',
  };
  return labels[targetPerson] || targetPerson;
}
