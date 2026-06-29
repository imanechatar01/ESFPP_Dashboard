import { GridCell } from './GridCell';

export function GridRow({ unite, weeksCount = 52, onToggleCell, highlightWeeks = [] }) {
  const { ordre, nom, formateur, vhg, vh_realise, cells } = unite;
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

  return (
    <div className="flex w-fit hover:bg-muted/30 transition-colors group">
      {/* Sticky Left Panel */}
      <div className="flex border-b border-slate-300 group-hover:bg-muted/50 transition-colors shrink-0 font-['Arial_Black'] text-black">
        <div className="w-[41px] h-10 border-r border-slate-300 flex items-center justify-center text-[12px] font-bold bg-white">{ordre}</div>
        <div className="w-[483px] h-10 border-r border-slate-300 flex items-center px-3 text-[12px] font-bold truncate bg-logigramme-unit-name" title={nom}>{nom}</div>
        <div className="w-[160px] h-10 border-r border-slate-300 flex items-center px-3 text-[12px] font-bold text-[#003366] truncate bg-logigramme-formateur" title={formateur?.nom}>{formateur?.nom || '—'}</div>
        <div className="w-[46px] h-10 border-r border-slate-400 flex items-center justify-center text-[11px] font-bold bg-logigramme-vhg">{vhg}</div>
      </div>

      {/* 52 Week Cells */}
      <div className="flex shrink-0">
        {cellsArray.map((cell, idx) => (
          <GridCell
            key={idx}
            cell={cell}
            onToggle={onToggleCell}
            isHighlighted={cell && highlightWeeks.includes(cell.semaine)}
          />
        ))}
      </div>

      {/* Sticky Right Panel - Progress */}
      <div className="w-24 h-10 bg-white border-b border-l border-slate-300 flex items-center px-2 group-hover:bg-muted/50 transition-colors shrink-0">
        <div className="w-full">
           <div className="flex justify-between text-[9px] font-black mb-0.5">
             <span>{Math.round(vh_realise)}h</span>
             <span className={taux >= 100 ? 'text-emerald-600' : ''}>{Math.round(taux)}%</span>
           </div>
           <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
             <div
               className={`h-full transition-all duration-500 ${taux >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
               style={{ width: `${Math.min(taux, 100)}%` }}
             />
           </div>
        </div>
      </div>
    </div>
  );
}
