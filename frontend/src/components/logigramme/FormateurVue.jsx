import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useLogigrammeContext } from '@/contexts/logigramme-context';
import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';
import { Legend } from './Legend';
import { Loader2, AlertTriangle, Info } from 'lucide-react';

const calculateUnitMetrics = (unit) => {
  const cells = unit?.cells || [];
  const plannedHours = cells
    .filter(c => c.cell_type === 'normal')
    .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);

  const effectiveVhg = plannedHours > 0 ? plannedHours : (parseFloat(unit?.vhg) || 0);
  const vh_realise = cells
    .filter(c => c.cell_type === 'normal' && (c.completion_status === 'done' || c.completion_status === 'auto_done'))
    .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);

  return {
    ...unit,
    vhg: effectiveVhg,
    vh_realise,
    vh_restant: effectiveVhg - vh_realise,
    taux: effectiveVhg > 0 ? vh_realise / effectiveVhg : 0,
  };
};

export function FormateurVue({ formateurId }) {
  const { filters } = useLogigrammeContext();
  const [data, setData] = useState(null);
  const [weeks, setWeeks] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchFormateurData = async () => {
    if (!formateurId) return;
    try {
      // Build query parameters with all filters
      const queryParams = new URLSearchParams();
      if (filters.niveau_id) queryParams.append('niveau_id', filters.niveau_id);
      if (filters.filiere_id) queryParams.append('filiere_id', filters.filiere_id);
      if (filters.classe_id) queryParams.append('classe_id', filters.classe_id);

      const url = `/api/formateurs/${formateurId}/unites?${queryParams.toString()}`;
      console.log('[FormateurVue] Fetching with URL:', url);
      console.log('[FormateurVue] Current filters:', filters);

      const [res, weeksRes] = await Promise.all([
        apiRequest(url),
        apiRequest(`/api/years/${filters.year_id}/weeks`)
      ]);
      console.log('[FormateurVue] Response:', res);
      setData({
        ...res,
        unites: (res.unites || []).map(calculateUnitMetrics),
      });
      setWeeks(weeksRes);
    } catch (err) {
      console.error('Failed to fetch formateur data:', err);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchFormateurData();
      setLoading(false);
    }
    init();
  }, [formateurId, filters.year_id, filters.niveau_id, filters.filiere_id, filters.classe_id]);

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

  // ── Cell Interaction Handlers ──────────────────────────────────────────
  const handleToggleCell = async (cellId, currentStatus) => {
    const isDone = currentStatus === 'done' || currentStatus === 'auto_done';
    const nextStatus = isDone ? 'pending' : 'done';

    // Optimistic state update in FormateurVue
    setData(prev => {
      if (!prev) return prev;
      const nextUnites = prev.unites.map(u => {
        const hasCell = u.cells.some(c => c.id === cellId);
        if (!hasCell) return u;

        const nextCells = u.cells.map(c =>
          c.id === cellId ? { ...c, completion_status: nextStatus } : c
        );

        return calculateUnitMetrics({ ...u, cells: nextCells });
      });
      return { ...prev, unites: nextUnites };
    });

    try {
      await apiRequest(`/api/completion/cell/${cellId}`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {
      console.error('Failed to toggle cell:', err);
      fetchFormateurData(); // Revert on error
    }
  };

  const handleMarkWeek = async (logigrammeId, semaine, status) => {
    try {
      await apiRequest(`/api/completion/week`, {
        method: 'POST',
        body: JSON.stringify({ logigramme_id: logigrammeId, semaine, status })
      });
      // Refresh list to update all cells in that logigramme
      await fetchFormateurData();
    } catch (err) {
      console.error('Failed to mark week:', err);
    }
  };

  const handleCreateCell = async (uniteId, semaine, heures) => {
    // Determine completion_status based on auto_done logic
    const today = new Date().toISOString().split('T')[0];
    const week = weeks?.find(w => w.semaine === semaine);
    const isPast = week?.week_start_date && week.week_start_date < today;
    const completionStatus = isPast ? 'auto_done' : 'pending';

    const tempId = `temp-${Date.now()}`;
    let isUpdate = false;
    let oldCell = null;

    // Optimistic UI update
    setData(prev => {
      if (!prev) return prev;
      const nextUnites = prev.unites.map(u => {
        if (u.id !== uniteId) return u;

        const existingCellIndex = u.cells.findIndex(c => c.semaine === semaine);
        let nextCells;

        if (existingCellIndex >= 0) {
          isUpdate = true;
          oldCell = u.cells[existingCellIndex];
          if (heures === null || heures === undefined) {
            nextCells = u.cells.filter(c => c.semaine !== semaine);
          } else {
            nextCells = [...u.cells];
            nextCells[existingCellIndex] = {
              ...oldCell,
              heures,
            };
          }
        } else {
          if (heures === null || heures === undefined) {
            return u;
          }
          const optimisticCell = {
            id: tempId,
            semaine,
            cell_type: 'normal',
            heures,
            week_start_date: week?.week_start_date || null,
            completion_status: completionStatus,
          };
          nextCells = [...u.cells, optimisticCell];
        }

        return calculateUnitMetrics({ ...u, cells: nextCells });
      });
      return { ...prev, unites: nextUnites };
    });

    try {
      await apiRequest('/api/logigramme/cell', {
        method: 'POST',
        body: JSON.stringify({
          unite_id: uniteId,
          semaine,
          cell_type: 'normal',
          heures,
        })
      });
      // Refetch to get real DB ids and sync state
      await fetchFormateurData();
    } catch (err) {
      console.error('Failed to create cell:', err);
      // Rollback
      setData(prev => {
        if (!prev) return prev;
        const nextUnites = prev.unites.map(u => {
          if (u.id !== uniteId) return u;
          let nextCells;
          if (isUpdate) {
            nextCells = u.cells.map(c => c.semaine === semaine ? oldCell : c);
          } else {
            nextCells = u.cells.filter(c => c.id !== tempId);
          }
          return calculateUnitMetrics({ ...u, cells: nextCells });
        });
        return { ...prev, unites: nextUnites };
      });
      throw err; // Re-throw so GridCell can show error flash
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Info Banner ─────────────────────────────────────────────────── */}
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
              {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''} d&apos;horaire détecté{conflicts.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* ── Conflicts List ───────────────────────────────────────────────── */}
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

      {/* ── Grids per Logigramme ────────────────────────────────────────── */}
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
                <GridHeader
                  weeks={weeks}
                  onMarkWeek={(sem, status) => {
                    if (confirm(`Voulez-vous marquer toute la semaine ${sem} comme '${status}'?`)) {
                      handleMarkWeek(group.meta.id, sem, status);
                    }
                  }}
                />
                <div className="flex flex-col">
                  {group.items.map((unite, idx) => (
                    <GridRow
                      key={unite.id}
                      unite={unite}
                      rowIndex={idx + 1}
                      weeksCount={weeks.length}
                      onToggleCell={handleToggleCell}
                      onCreateCell={handleCreateCell}
                      highlightWeeks={[]}
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
