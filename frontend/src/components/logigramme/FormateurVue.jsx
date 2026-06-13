import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useLogigrammeContext } from '@/contexts/logigramme-context';
import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';
import { Legend } from './Legend';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FormateurVue({ formateurId, onToggleCell, onMarkWeek }) {
  const { filters } = useLogigrammeContext();
  const [data, setData] = useState(null);
  const [weeks, setWeeks] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchFormateurData() {
      if (!formateurId) return;
      setLoading(true);
      try {
        const [res, weeksRes] = await Promise.all([
          apiRequest(`/api/formateurs/${formateurId}/unites`),
          apiRequest(`/api/years/${filters.year_id}/weeks`)
        ]);
        setData(res);
        setWeeks(weeksRes);
      } catch (err) {
        console.error('Failed to fetch formateur data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFormateurData();
  }, [formateurId, filters.year_id]);

  if (loading && (!data || !weeks)) {
    return (
      <div className="flex flex-col items-center justify-center py-40 bg-card rounded-3xl border border-border">
        <Loader2 className="size-10 animate-spin text-primary/30 mb-4" />
        <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Calcul de la vue formateur...</p>
      </div>
    );
  }

  if (!data || !weeks) return null;

  const { unites, conflicts } = data;
  
  // Group units by logigramme
  const logigrammeGroups = unites.reduce((acc, unit) => {
    const logId = unit.logigramme_id;
    if (!acc[logId]) {
      acc[logId] = {
        meta: unit.logigramme,
        items: []
      };
    }
    acc[logId].items.push(unit);
    return acc;
  }, {});

  const totalVhg = unites.reduce((sum, u) => sum + (parseFloat(u.vhg) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Info className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-black text-primary uppercase tracking-widest">Mode Vue Formateur</p>
            <p className="text-sm font-medium text-muted-foreground">
              Enseigne dans <span className="font-black text-foreground">{Object.keys(logigrammeGroups).length} programmes</span> — <span className="font-black text-foreground">{totalVhg} heures</span> au total.
            </p>
          </div>
        </div>
        
        {conflicts.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-xl animate-bounce">
            <AlertTriangle className="size-4 text-destructive" />
            <p className="text-xs font-black text-destructive uppercase tracking-widest">
              {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''} d'horaire détecté{conflicts.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Conflicts List (Task E) */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-destructive/60">Détails des conflits</h4>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {conflicts.map((conf, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white border border-destructive/10 shadow-sm">
                <p className="text-[10px] font-black text-destructive mb-1">Semaine {conf.semaine} ({conf.week_start_date})</p>
                <ul className="space-y-1">
                  {conf.programmes.map((p, pidx) => (
                    <li key={idx + '-' + pidx} className="text-[9px] font-bold text-muted-foreground leading-tight">
                      • {p.label}: <span className="text-foreground">{p.unite_nom}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grids per Logigramme */}
      {Object.values(logigrammeGroups).map((group) => (
        <div key={group.meta.id} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary text-white">
              {group.meta.filiere.code}
            </span>
            <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
              {group.meta.filiere.name} — {group.meta.classe.label}
            </h3>
          </div>

          <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <div className="w-fit min-w-full">
                <GridHeader weeks={weeks} onMarkWeek={onMarkWeek} />
                <div className="flex flex-col">
                  {group.items.map(unite => (
                    <GridRow
                      key={unite.id}
                      unite={unite}
                      weeksCount={weeks.length}
                      onToggleCell={onToggleCell}
                      highlightWeeks={conflicts.map(c => c.semaine)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <Legend />
    </div>
  );
}
