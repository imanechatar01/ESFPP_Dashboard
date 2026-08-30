import { useRef, useEffect } from 'react';
import { useLogigrammeContext } from '@/contexts/logigramme-context';
import { cn } from '@/lib/utils';
import { GridCell } from './GridCell';

export function GridRow({ unite, rowIndex, weeksCount = 52, onToggleCell, onContextMenu, highlightWeeks = [] }) {
  const { nom, formateur, vhg, vh_realise, cells } = unite;
  const taux = vhg > 0 ? (vh_realise / vhg) * 100 : 0;

  const logContext = useLogigrammeContext();
  const { 
    highlightUniteId, 
    highlightWeek, 
    highlightCellId, 
    setHighlightUniteId, 
    setHighlightWeek, 
    setHighlightCellId,
    setHighlightLogigrammeId
  } = logContext || {};

  const isTarget = highlightUniteId && unite.id === highlightUniteId;
  const rowRef = useRef(null);

  useEffect(() => {
    if (isTarget) {
      if (rowRef.current) {
        setTimeout(() => {
          rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      const timer = setTimeout(() => {
        if (setHighlightUniteId) setHighlightUniteId(null);
        if (setHighlightWeek) setHighlightWeek(null);
        if (setHighlightCellId) setHighlightCellId(null);
        if (setHighlightLogigrammeId) setHighlightLogigrammeId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isTarget, setHighlightUniteId, setHighlightWeek, setHighlightCellId, setHighlightLogigrammeId]);

  // Map sparse cells to 52-week array
  const weekMap = {};
  cells.forEach(c => {
    weekMap[c.semaine] = c;
  });

  const cellsArray = [];
  for (let i = 1; i <= weeksCount; i++) {
    cellsArray.push(weekMap[i] || null);
  }

  const normalAndExamCells = cells.filter(c => c.cell_type === 'normal' || c.cell_type === 'exam');
  const totalCellsCount = normalAndExamCells.length;
  const completedCellsCount = normalAndExamCells.filter(c => c.completion_status === 'done' || c.completion_status === 'auto_done').length;
  const completionPercentage = totalCellsCount > 0 ? Math.round((completedCellsCount / totalCellsCount) * 100) : 0;

  return (
    <div 
      ref={rowRef}
      className={cn(
        "flex w-fit bg-card hover:bg-muted transition-all duration-300 group isolate",
        isTarget && "bg-accent/5 ring-2 ring-accent ring-inset"
      )}
    >
      {/* Sticky Left Panel */}
      <div className="sticky left-0 z-20 flex bg-card border-b border-border group-hover:bg-muted transition-colors select-none flex-shrink-0">
        <div className={cn("w-10 h-12 border-r border-border flex items-center justify-center text-[11px] font-extrabold text-foreground bg-card", isTarget && "bg-accent/10")}>{rowIndex}</div>
        <div className={cn("w-64 h-12 border-r border-border flex items-center px-3 text-[11px] font-bold text-foreground truncate", isTarget ? "bg-accent text-white animate-pulse" : "bg-status-normal")} title={nom}>{nom}</div>
        <div className={cn("w-40 h-12 border-r border-border flex items-center justify-center px-3 text-[11px] font-bold text-primary hover:underline cursor-pointer truncate", isTarget ? "bg-accent text-white animate-pulse" : "bg-status-normal")} title={formateur?.nom}>{formateur?.nom || '—'}</div>
        <div className={cn("w-16 h-12 border-r border-border flex items-center justify-center text-[11px] font-extrabold text-foreground", isTarget ? "bg-accent text-white animate-pulse" : "bg-status-normal")}>{vhg}</div>
      </div>

      {/* 52 Week Cells */}
      <div className="flex">
        {cellsArray.map((cell, idx) => (
          <GridCell
            key={idx}
            cell={cell}
            semaine={idx + 1}
            onToggle={onToggleCell}
            onContextMenu={onContextMenu ? (e, semaine, cell) => onContextMenu(e, unite, semaine, cell) : undefined}
            isHighlighted={cell && highlightWeeks.includes(cell.semaine)}
            isExamHighlight={isTarget && (highlightWeek === (idx + 1) || (cell && cell.id === highlightCellId))}
          />
        ))}
      </div>

      {/* Sticky Right Panel - Progress */}
      <div className="sticky right-0 z-20 w-24 h-12 bg-card border-b border-l border-border flex items-center px-2 group-hover:bg-muted transition-colors select-none flex-shrink-0">
        <div className="w-full">
           <div className="flex justify-between text-[9px] font-black text-muted-foreground mb-0.5">
             <span>{Number(vh_realise.toFixed(1))}h / {vhg}h</span>
             <span className={completionPercentage >= 100 ? 'text-accent' : ''}>{completionPercentage}%</span>
           </div>
           <div className="text-[8px] font-extrabold text-muted-foreground uppercase mb-1">
             {completedCellsCount}/{totalCellsCount} CELLULES
           </div>
           <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden border border-border">
             <div
               className={`h-full transition-all duration-500 ${completionPercentage >= 100 ? 'bg-status-done' : 'bg-status-progression'}`}
               style={{ width: `${Math.min(completionPercentage, 100)}%` }}
             />
           </div>
        </div>
      </div>
    </div>
  );
}
