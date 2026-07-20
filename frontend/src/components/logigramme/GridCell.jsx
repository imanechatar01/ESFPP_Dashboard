import { Check } from 'lucide-react';
import { getCellClassName } from '@/lib/logigramme-helpers';
import { cn } from '@/lib/utils';

export function GridCell({ cell, semaine, onToggle, onContextMenu, isHighlighted = false }) {
  const isExistingNormal = cell && cell.cell_type === 'normal';
  const displayHeures = isExistingNormal && cell.heures !== null && cell.heures !== undefined
    ? Number(cell.heures)
    : null;
  const displayHeuresLabel = displayHeures !== null ? `${displayHeures}` : '';

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(e, semaine, cell);
    }
  };

  // ── Empty cell (no row in DB for this semaine/unité) ──
  if (!cell) {
    // Default empty cell with right-click support
    return (
      <div
        className={cn(
          "w-10 h-12 border-r border-b border-slate-300 bg-white"
        )}
        onContextMenu={handleContextMenu}
      />
    );
  }

  // ── Existing cell ──
  const { id, cell_type, heures, completion_status } = cell;
  const isDone = completion_status === 'done' || completion_status === 'auto_done';
  const isNormal = cell_type === 'normal';

  const handleClick = () => {
    if ((isNormal || cell_type === 'exam') && onToggle) {
      onToggle(id, completion_status);
    }
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={cn(
        getCellClassName(cell_type, completion_status),
        isHighlighted && "ring-2 ring-destructive ring-inset z-20 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
      )}
      title={isHighlighted ? "CONFLIT D'HORAIRE ! " + (isNormal ? `${displayHeuresLabel}h` : cell_type) : (isNormal ? `${displayHeuresLabel}h - ${completion_status}` : cell_type)}
    >
      {cell_type === 'vacation' && 'V'}
      {cell_type === 'exam' && (
        <>
          <span>E</span>
          {isDone && <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-emerald-600">✔</span>}
        </>
      )}
      {cell_type === 'tiff' && 'T'}
      {isNormal && (
        <>
          <span>{displayHeures !== null ? displayHeures : ''}</span>
          {isDone && <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-emerald-600">✔</span>}
        </>
      )}
    </div>
  );
}
