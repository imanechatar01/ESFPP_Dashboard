import { GridCell } from './GridCell';

export function GridRow({ unite, rowIndex, weeksCount = 52, onToggleCell, onCreateCell, highlightWeeks = [] }) {
  const { nom, formateur, vhg, vh_realise, cells } = unite;
  const taux = vhg > 0 ? (vh_realise / vhg) * 100 : 0;

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
    <div className="flex w-fit bg-white hover:bg-slate-50 transition-colors group isolate">
      {/* Sticky Left Panel */}
      <div className="sticky left-0 z-20 flex bg-white border-b border-slate-300 group-hover:bg-slate-50 transition-colors select-none flex-shrink-0">
        <div className="w-10 h-12 border-r border-slate-300 flex items-center justify-center text-[11px] font-extrabold text-slate-800 bg-white">{rowIndex}</div>
        <div className="w-64 h-12 border-r border-slate-300 flex items-center px-3 text-[11px] font-bold text-slate-800 bg-[#FEF9C3] truncate" title={nom}>{nom}</div>
        <div className="w-40 h-12 border-r border-slate-300 flex items-center justify-center px-3 text-[11px] font-bold text-blue-700 hover:underline cursor-pointer bg-[#FEF9C3] truncate" title={formateur?.nom}>{formateur?.nom || '—'}</div>
        <div className="w-16 h-12 border-r border-slate-300 flex items-center justify-center text-[11px] font-extrabold text-slate-800 bg-[#FEF9C3]">{vhg}</div>
      </div>

      {/* 52 Week Cells */}
      <div className="flex">
        {cellsArray.map((cell, idx) => (
          <GridCell
            key={idx}
            cell={cell}
            semaine={idx + 1}
            onToggle={onToggleCell}
            onCreateCell={onCreateCell ? (semaine, heures) => onCreateCell(unite.id, semaine, heures) : undefined}
            isHighlighted={cell && highlightWeeks.includes(cell.semaine)}
          />
        ))}
      </div>

      {/* Sticky Right Panel - Progress */}
      <div className="sticky right-0 z-20 w-24 h-12 bg-white border-b border-l border-slate-300 flex items-center px-2 group-hover:bg-slate-50 transition-colors select-none flex-shrink-0">
        <div className="w-full">
           <div className="flex justify-between text-[9px] font-black text-slate-700 mb-0.5">
             <span>{Math.round(vh_realise)}h / {vhg}h</span>
             <span className={completionPercentage >= 100 ? 'text-emerald-600' : ''}>{completionPercentage}%</span>
           </div>
           <div className="text-[8px] font-extrabold text-slate-400 uppercase mb-1">
             {completedCellsCount}/{totalCellsCount} CELLULES
           </div>
           <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
             <div
               className={`h-full transition-all duration-500 ${completionPercentage >= 100 ? 'bg-emerald-500' : 'bg-[#0F4C81]'}`}
               style={{ width: `${Math.min(completionPercentage, 100)}%` }}
             />
           </div>
        </div>
      </div>
    </div>
  );
}
