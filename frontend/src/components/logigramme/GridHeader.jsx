import { groupWeeksByMonth, formatShortDate } from '@/lib/logigramme-helpers';

export function GridHeader({ weeks, onMarkWeek }) {
  const monthGroups = groupWeeksByMonth(weeks);
  const weekColumnWidth = 40;
  const leftPanelWidth = 41 + 483 + 160 + 46; // 730px

  return (
    <div className="flex flex-col sticky top-0 z-30 shadow-md">
      {/* 1. Semesters and Months */}
      <div className="flex w-fit border-b border-slate-400">
         <div 
           style={{ width: `${leftPanelWidth}px` }}
           className="sticky left-0 z-40 bg-logigramme-header-semester border-r border-slate-400 flex items-center justify-center text-[27px] font-['Arial_Black'] font-bold uppercase text-black shrink-0"
         >
           Plan de formation
         </div>
         <div className="flex shrink-0">
           {monthGroups.map((group, idx) => (
             <div
               key={idx}
               style={{ width: `${group.count * 40}px` }}
               className="h-10 border-r border-slate-300 flex items-center justify-center text-[15px] font-['Calibri'] font-bold uppercase bg-logigramme-header-month text-black shrink-0"
             >
               {group.mois}
             </div>
           ))}
         </div>
         <div className="w-24 bg-slate-100 border-l border-slate-300 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase shrink-0">Progression</div>
      </div>

      {/* 2. Week Numbers */}
      <div className="flex w-fit bg-card border-b">
         <div className="flex bg-card border-r">
            <div className="w-10 h-8 flex items-center justify-center text-[9px] font-black text-muted-foreground">N°</div>
            <div className="w-64 h-8 flex items-center px-3 text-[9px] font-black text-muted-foreground uppercase">Unité de formation</div>
            <div className="w-40 h-8 flex items-center px-3 text-[9px] font-black text-muted-foreground uppercase">Formateur</div>
            <div className="w-16 h-8 flex items-center justify-center text-[9px] font-black text-muted-foreground uppercase">VHG</div>
         </div>
         <div className="flex shrink-0">
           {weeks.map((w, idx) => (
             <div
               key={idx}
               onClick={() => onMarkWeek && onMarkWeek(w.semaine, 'done')}
               className="w-10 h-8 border-r border-slate-300 flex items-center justify-center text-[10px] font-['Calibri'] font-normal text-black hover:bg-primary/10 cursor-pointer transition-colors shrink-0"
               title="Cliquer pour marquer toute la semaine comme 'Terminé'"
             >
               {w.semaine}
             </div>
           ))}
         </div>
         <div className="w-24 bg-card border-l h-8" />
      </div>

      {/* 3. Dates */}
      <div className="flex w-fit bg-white border-b border-slate-300">
         <div style={{ width: `${leftPanelWidth}px` }} className="sticky left-0 z-40 bg-white border-r border-slate-400 h-6 shrink-0" />
         <div className="flex shrink-0">
           {weeks.map((w, idx) => (
             <div
               key={idx}
               className="w-10 h-6 border-r border-slate-300 flex items-center justify-center text-[9px] font-['Calibri'] font-bold text-slate-600 shrink-0"
             >
               {formatShortDate(w.week_start_date)}
             </div>
           ))}
         </div>
         <div className="w-24 bg-white border-l h-6 shrink-0 border-slate-300" />
      </div>
    </div>
  );
}
