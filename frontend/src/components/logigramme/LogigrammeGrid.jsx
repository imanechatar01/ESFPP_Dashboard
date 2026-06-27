import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';
import { Legend } from './Legend';
import { Loader2 } from 'lucide-react';

export function LogigrammeGrid({ data, loading, onToggleCell, onMarkWeek }) {
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-border">
        <Loader2 className="size-10 animate-spin text-primary/30 mb-4" />
        <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Chargement du logigramme...</p>
      </div>
    );
  }

  if (!data) return null;

  const { weeks, unites } = data;

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar">
        <div className="w-fit min-w-full">
          <GridHeader
            weeks={weeks}
            onMarkWeek={(sem, status) => {
               if (confirm(`Voulez-vous marquer toute la semaine ${sem} comme '${status}'?`)) {
                 onMarkWeek(sem, status);
               }
            }}
          />
          <div className="flex flex-col">
            {unites.map(unite => (
              <GridRow
                key={unite.id}
                unite={unite}
                weeksCount={weeks.length}
                onToggleCell={onToggleCell}
              />
            ))}
          </div>
        </div>
      </div>

      <Legend />
    </div>
  );
}
