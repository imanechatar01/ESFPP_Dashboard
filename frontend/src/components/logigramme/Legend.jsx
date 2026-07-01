export function Legend() {
  return (
    <div className="px-3 py-2 bg-white border-t border-slate-300 flex flex-wrap gap-x-5 gap-y-2 items-center select-none">
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-[#FEF9C3] border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">Session normale</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-[#BBF7D0] border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">Terminé</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-[#F472B6] border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">Vacance</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-slate-200 border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">Examen</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-yellow-400 border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">TIFF / Clôture</span>
       </div>
    </div>
  );
}
