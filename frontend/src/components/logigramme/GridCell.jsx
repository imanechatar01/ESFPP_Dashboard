import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getCellClassName } from '@/lib/logigramme-helpers';
import { cn } from '@/lib/utils';

export function GridCell({ cell, semaine, onToggle, onCreateCell, isHighlighted = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Clear error flash after 1.5s
  useEffect(() => {
    if (hasError) {
      const timer = setTimeout(() => setHasError(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [hasError]);

  const isExistingNormal = cell && cell.cell_type === 'normal';

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onCreateCell && (!cell || isExistingNormal)) {
      setIsEditing(true);
    }
  };

  const commitValue = (value) => {
    setIsEditing(false);
    const numVal = parseFloat(value);
    if (!numVal || numVal <= 0) return; // Ignore empty or invalid

    if (onCreateCell) {
      // If it hasn't changed from existing value, we could skip, but let's just save
      if (isExistingNormal && numVal === cell.heures) return;
      
      onCreateCell(semaine, numVal).catch(() => {
        setHasError(true);
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue(e.target.value);
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleBlur = (e) => {
    commitValue(e.target.value);
  };

  // Editing state: show input on yellow background
  if (isEditing) {
    return (
      <div className="relative w-10 h-12 border-r border-b border-slate-300 bg-[#FEF9C3] flex items-center justify-center">
        <input
          ref={inputRef}
          type="number"
          min="1"
          step="1"
          defaultValue={isExistingNormal ? cell.heures : undefined}
          className="w-8 h-8 text-center text-[11px] font-bold bg-transparent border-b-2 border-slate-400 outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      </div>
    );
  }

  // ── Empty cell (no row in DB for this semaine/unité) ──
  if (!cell) {
    // Default empty cell with right-click support
    return (
      <div
        className={cn(
          "w-10 h-12 border-r border-b border-slate-300 bg-white",
          hasError && "ring-2 ring-red-500 ring-inset z-20"
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
      onContextMenu={isNormal ? handleContextMenu : undefined}
      className={cn(
        getCellClassName(cell_type, completion_status),
        isHighlighted && "ring-2 ring-destructive ring-inset z-20 shadow-[0_0_8px_rgba(239,68,68,0.4)]",
        hasError && "ring-2 ring-red-500 ring-inset z-20"
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
          <span>{heures > 0 ? Math.round(heures) : ''}</span>
          {isDone && <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-emerald-600">✔</span>}
        </>
      )}
    </div>
  );
}
