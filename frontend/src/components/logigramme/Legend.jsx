export function Legend() {
  return (
    <div className="p-4 bg-muted/30 border-t border-border flex flex-wrap gap-x-6 gap-y-3 items-center">
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-yellow-50 border border-yellow-100 rounded" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Session normale</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-emerald-500 rounded" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Terminé</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-pink-100 border border-pink-200 rounded" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Vacance</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-slate-200 border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Examen</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-yellow-400 border border-yellow-500 rounded" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">TIFF / Clôture</span>
       </div>
    </div>
  );
}
