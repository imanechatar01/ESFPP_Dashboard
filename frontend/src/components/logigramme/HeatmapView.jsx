import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useLogigrammeContext } from '@/contexts/logigramme-context';
import { groupWeeksByMonth, groupWeeksBySemester } from '@/lib/logigramme-helpers';
import { Loader2, AlertCircle } from 'lucide-react';

export function HeatmapView({ onSelectRow }) {
  const { filters } = useLogigrammeContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchHeatmap() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (filters.year_id) query.append('year_id', filters.year_id);
        if (filters.filiere_id) query.append('filiere_id', filters.filiere_id);
        
        const res = await apiRequest(`/api/logigramme/heatmap?${query.toString()}`);
        setData(res);
      } catch (err) {
        console.error('Failed to fetch heatmap:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHeatmap();
  }, [filters.year_id, filters.filiere_id]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-40 bg-card rounded-3xl border border-border">
        <Loader2 className="size-10 animate-spin text-primary/30 mb-4" />
        <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Calcul de la vue d'ensemble...</p>
      </div>
    );
  }

  if (!data) return null;

  const { weeks, rows } = data;
  const monthGroups = groupWeeksByMonth(weeks);
  const semesterGroups = groupWeeksBySemester(weeks);

  const getCellColor = (taux, hasCells) => {
    if (!hasCells) return 'bg-muted/30'; // diagonal hatch pattern could be added via CSS
    if (taux === 0) return 'bg-slate-200/50';
    if (taux === 1) return 'bg-emerald-500';
    if (taux >= 0.5) return 'bg-blue-400';
    return 'bg-orange-300';
  };

  return (
    <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="border-collapse w-full text-[10px]">
          <thead>
            {/* Semesters */}
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-20 bg-muted/50 border-b border-r border-border p-2 w-[240px]" />
              {semesterGroups.map((s, i) => (
                <th key={i} colSpan={s.count} className="border-b border-r border-border p-1 font-black uppercase tracking-tighter text-muted-foreground/60">
                  Semestre {s.semestre}
                </th>
              ))}
            </tr>
            {/* Months */}
            <tr className="bg-muted/20">
              <th className="sticky left-0 z-20 bg-muted/20 border-b border-r border-border p-2 w-[240px]" />
              {monthGroups.map((m, i) => (
                <th key={i} colSpan={m.count} className="border-b border-r border-border p-1 font-bold uppercase tracking-tighter text-muted-foreground/40">
                  {m.mois}
                </th>
              ))}
            </tr>
            {/* Week numbers */}
            <tr className="bg-white">
              <th className="sticky left-0 z-20 bg-white border-b border-r border-border p-2 w-[240px] text-left font-black uppercase tracking-widest text-muted-foreground/80">Logigramme</th>
              {weeks.map(w => (
                <th key={w.semaine} className="border-b border-r border-border w-6 h-6 font-bold text-muted-foreground/40">
                  {w.semaine}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.logigramme_id} className="group hover:bg-muted/10">
                <td 
                  className="sticky left-0 z-10 bg-white border-b border-r border-border p-2 w-[240px] font-bold text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                  onClick={() => onSelectRow(row.logigramme_id)}
                >
                  {row.label}
                </td>
                {weeks.map(w => {
                  const comp = row.weekly_completion.find(c => c.semaine === w.semaine);
                  return (
                    <td 
                      key={w.semaine} 
                      className={`border-b border-r border-border w-6 h-6 p-0.5`}
                      title={comp ? `S${w.semaine}: ${Math.round(comp.taux * 100)}%` : `S${w.semaine}: Pas de session`}
                    >
                      <div className={`w-full h-full rounded-sm transition-colors ${getCellColor(comp?.taux, !!comp)}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="p-4 bg-muted/5 border-t border-border flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-slate-200/50 rounded-sm" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">0%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-orange-300 rounded-sm" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">1-49%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-400 rounded-sm" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">50-99%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-muted/30 rounded-sm" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">Vacances/Exams</span>
        </div>
      </div>
    </div>
  );
}
