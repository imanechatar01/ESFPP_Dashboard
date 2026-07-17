import { useState, useCallback } from 'react';
import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';
import { Legend } from './Legend';
import { CellContextMenu } from './CellContextMenu';
import { WeekContextMenu } from './WeekContextMenu';
import { Loader2 } from 'lucide-react';

export function LogigrammeGrid({ data, loading, onToggleCell, onActionCell, onActionWeek }) {
  const [cellMenu, setCellMenu] = useState(null); // { x, y, unite, semaine, cell }
  const [weekMenu, setWeekMenu] = useState(null); // { x, y, semaine }

  const handleCellContextMenu = useCallback((e, unite, semaine, cell) => {
    e.preventDefault();
    setCellMenu({ x: e.clientX, y: e.clientY, unite, semaine, cell });
    setWeekMenu(null);
  }, []);

  const handleWeekContextMenu = useCallback((e, semaine) => {
    e.preventDefault();
    setWeekMenu({ x: e.clientX, y: e.clientY, semaine });
    setCellMenu(null);
  }, []);

  const handleCellSelect = useCallback((cell_type, heures) => {
    if (!cellMenu) return;
    const { unite, semaine } = cellMenu;
    onActionCell(unite.id, semaine, cell_type, heures ?? null);
    setCellMenu(null);
  }, [cellMenu, onActionCell]);

  const handleWeekSelect = useCallback((action) => {
    if (!weekMenu) return;
    onActionWeek(weekMenu.semaine, action);
    setWeekMenu(null);
  }, [weekMenu, onActionWeek]);

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
                 onActionWeek(sem, 'mark_done');
               }
            }}
            onContextMenu={handleWeekContextMenu}
          />
          <div className="flex flex-col">
            {unites.map((unite, index) => (
              <GridRow
                key={unite.id}
                unite={unite}
                rowIndex={index + 1}
                weeksCount={weeks.length}
                onToggleCell={onToggleCell}
                onContextMenu={handleCellContextMenu}
              />
            ))}
          </div>
        </div>
      </div>

      <Legend />

      {cellMenu && (
        <CellContextMenu
          x={cellMenu.x}
          y={cellMenu.y}
          onClose={() => setCellMenu(null)}
          onSelect={handleCellSelect}
        />
      )}
      {weekMenu && (
        <WeekContextMenu
          x={weekMenu.x}
          y={weekMenu.y}
          onClose={() => setWeekMenu(null)}
          onSelect={handleWeekSelect}
        />
      )}
    </div>
  );
}
