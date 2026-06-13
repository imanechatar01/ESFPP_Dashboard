import { Check } from 'lucide-react';
import { getCellClassName } from '@/lib/logigramme-helpers';
import { cn } from '@/lib/utils';

export function GridCell({ cell, onToggle, isHighlighted = false }) {
  if (!cell) {
    return <div className="w-10 h-10 border-r border-b bg-white/30" />;
  }

  const { id, cell_type, heures, completion_status } = cell;
  const isDone = completion_status === 'done' || completion_status === 'auto_done';
  const isNormal = cell_type === 'normal';

  const handleClick = () => {
    if (isNormal && onToggle) {
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
      {cell_type === 'exam' && 'E'}
      {cell_type === 'tiff' && 'T'}
      {isNormal && (
        isDone ? <Check className="size-4" /> : Math.round(heures)
      )}
    </div>
  );
}
