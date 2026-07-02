import { Check } from 'lucide-react';
import { getCellClassName } from '@/lib/logigramme-helpers';
import { cn } from '@/lib/utils';

export function GridCell({ cell, onToggle, isHighlighted = false }) {
  if (!cell) {
    return <div className="w-10 h-12 border-r border-b border-slate-300 bg-white" />;
  }

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
      className={cn(
        getCellClassName(cell_type, completion_status),
        isHighlighted && "ring-2 ring-destructive ring-inset z-20 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
      )}
      title={isHighlighted ? "CONFLIT D'HORAIRE ! " + (isNormal ? `${heures}h` : cell_type) : (isNormal ? `${heures}h - ${completion_status}` : cell_type)}
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
          <span>{Math.round(heures)}</span>
          {isDone && <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-emerald-600">✔</span>}
        </>
      )}
    </div>
  );
}
