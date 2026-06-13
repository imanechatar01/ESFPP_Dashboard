import { groupWeeksByMonth, formatShortDate } from '@/lib/logigramme-helpers';

export function GridHeader({ weeks, onMarkWeek }) {
  const monthGroups = groupWeeksByMonth(weeks);

  return (
    <div className="flex flex-col sticky top-0 z-30 shadow-md">
      {/* 1. Semesters and Months */}
      <div className="flex w-fit bg-slate-100 border-b border-slate-300">
         <div className="sticky left-0 z-40 w-[520px] bg-slate-100 border-r flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
           Plan de formation
         </div>
         <div className="flex">
           {monthGroups.map((group, idx) => (
             <div
               key={idx}
               style={{ width: `${group.span * 40}px` }}
               className="h-10 border-r border-slate-300 flex items-center justify-center text-[10px] font-black uppercase bg-slate-50 text-slate-700"
             >
               {group.mois}
             </div>
           ))}
         </div>
         <div className="sticky right-0 z-40 w-24 bg-slate-100 border-l border-slate-300 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">Progression</div>
      </div>

      {/* 2. Week Numbers */}
      <div className="flex w-fit bg-card border-b">
         <div className="sticky left-0 z-40 flex bg-card border-r">
            <div className="w-10 h-8 flex items-center justify-center text-[9px] font-black text-muted-foreground">N°</div>
            <div className="w-64 h-8 flex items-center px-3 text-[9px] font-black text-muted-foreground uppercase">Unité de formation</div>
            <div className="w-40 h-8 flex items-center px-3 text-[9px] font-black text-muted-foreground uppercase">Formateur</div>
            <div className="w-16 h-8 flex items-center justify-center text-[9px] font-black text-muted-foreground uppercase">VHG</div>
         </div>
         <div className="flex">
           {weeks.map((w, idx) => (
             <div
               key={idx}
               onClick={() => onMarkWeek && onMarkWeek(w.semaine, 'done')}
               className="w-10 h-8 border-r flex items-center justify-center text-[10px] font-bold text-primary hover:bg-primary/10 cursor-pointer transition-colors"
               title="Cliquer pour marquer toute la semaine comme 'Terminé'"
             >
               {w.semaine}
             </div>
           ))}
         </div>
         <div className="sticky right-0 z-40 w-24 bg-card border-l h-8" />
      </div>

      {/* 3. Dates */}
      <div className="flex w-fit bg-muted/50 border-b">
         <div className="sticky left-0 z-40 w-[520px] bg-muted/30 border-r h-6" />
         <div className="flex">
           {weeks.map((w, idx) => (
             <div
               key={idx}
               className="w-10 h-6 border-r flex items-center justify-center text-[8px] font-medium text-muted-foreground/70"
             >
               {formatShortDate(w.week_start_date)}
             </div>
           ))}
         </div>
         <div className="sticky right-0 z-40 w-24 bg-muted/30 border-l h-6" />
      </div>
    </div>
  );
}
