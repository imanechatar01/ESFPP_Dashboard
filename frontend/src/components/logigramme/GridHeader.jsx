import { groupWeeksByMonth, formatShortDate, getDominantWeekMonth } from '@/lib/logigramme-helpers';

export function GridHeader({ weeks, onMarkWeek, onContextMenu }) {
  const weekColumnWidth = 40;

  return (
    <div className="flex flex-col sticky top-0 z-30 shadow-sm select-none">
      {/* 1. Semesters and Months */}
      <div className="flex w-fit bg-card border-b border-border">
         <div className="sticky left-0 z-30 w-[520px] bg-status-header border-r border-border flex items-center justify-center text-[12px] font-black uppercase tracking-[0.25em] text-status-header-fg flex-shrink-0">
           Plan de formation
         </div>
         <div className="flex">
           {weeks.map((w, idx) => {
             const monthName = getDominantWeekMonth(w);
             const isFirstInMonth = idx === 0 || getDominantWeekMonth(weeks[idx - 1]) !== monthName;
             const isLastInMonth = idx === weeks.length - 1 || getDominantWeekMonth(weeks[idx + 1]) !== monthName;

             let groupCount = 0;
             if (isFirstInMonth) {
               for (let i = idx; i < weeks.length; i++) {
                 if (getDominantWeekMonth(weeks[i]) === monthName) {
                   groupCount++;
                 } else {
                   break;
                 }
               }
             }

             return (
               <div
                 key={idx}
                 className={`relative w-10 h-10 bg-card flex items-center justify-center ${
                   isLastInMonth ? 'border-r border-border' : ''
                 }`}
               >
                 {isFirstInMonth && (
                   <div
                     className="absolute left-0 top-0 h-full flex items-center justify-center pointer-events-none z-10"
                     style={{ width: `${groupCount * weekColumnWidth}px` }}
                   >
                     <span className="text-[11px] font-extrabold uppercase text-foreground tracking-wider whitespace-nowrap">
                       {monthName}
                     </span>
                   </div>
                 )}
               </div>
             );
           })}
         </div>
         <div className="sticky right-0 z-30 w-24 bg-card border-l border-border flex items-center justify-center text-[11px] font-black text-foreground uppercase flex-shrink-0">Progression</div>
      </div>

      {/* 2. Week Numbers */}
      <div className="flex w-fit bg-card border-b border-border">
         <div className="sticky left-0 z-30 flex bg-card border-r border-border flex-shrink-0">
            <div className="w-10 h-8 flex items-center justify-center text-[10px] font-black text-muted-foreground border-r border-border">N°</div>
            <div className="w-64 h-8 flex items-center px-3 text-[10px] font-black text-muted-foreground border-r border-border uppercase">Unité de formation</div>
            <div className="w-40 h-8 flex items-center justify-center px-3 text-[10px] font-black text-muted-foreground border-r border-border uppercase">Formateur</div>
            <div className="w-16 h-8 flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase">VHG</div>
         </div>
         <div className="flex">
           {weeks.map((w, idx) => (
             <div
               key={idx}
               onClick={() => onMarkWeek && onMarkWeek(w.semaine, 'done')}
               onContextMenu={onContextMenu ? (e) => onContextMenu(e, w.semaine) : undefined}
               className="w-10 h-8 border-r border-border flex items-center justify-center text-[10px] font-extrabold text-foreground hover:bg-muted cursor-pointer transition-colors"
               title="Clic droit pour ouvrir les options de semaine"
             >
               {w.semaine}
             </div>
           ))}
         </div>
         <div className="sticky right-0 z-30 w-24 bg-card border-l border-border h-8 flex-shrink-0" />
      </div>

      {/* 3. Dates */}
      <div className="flex w-fit bg-card border-b border-border">
         <div className="sticky left-0 z-30 w-[520px] bg-card border-r border-border h-6 flex-shrink-0" />
         <div className="flex">
           {weeks.map((w, idx) => (
             <div
               key={idx}
               className="w-10 h-6 border-r border-border flex items-center justify-center text-[8px] font-bold text-muted-foreground"
             >
               {formatShortDate(w.week_start_date)}
             </div>
           ))}
         </div>
         <div className="sticky right-0 z-30 w-24 bg-card border-l border-border h-6 flex-shrink-0" />
      </div>
    </div>
  );
}
