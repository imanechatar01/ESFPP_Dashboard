export function Legend() {
  return (
    <div className="px-3 py-2 bg-card border-t border-border flex flex-wrap gap-x-5 gap-y-2 items-center select-none">
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-status-normal border border-border rounded" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Session normale</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-status-done border border-border rounded" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Terminé</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-status-vacation border border-border rounded" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Vacance</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-status-exam border border-border rounded" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Examen</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-status-tiff border border-border rounded" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">TIFF / Clôture</span>
       </div>
    </div>
  );
}
