import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { supabase } from '../supabaseClient';
import { useLogigrammeContext } from '../contexts/logigramme-context';

// ---------------------------------------------------------------------------
// Local helper: derive computed metrics for a single unite from its cells.
// This is used ONLY for the grid display (unit-level taux, vh_realise, etc.)
// and NOT for the global KPI bar — those are handled by the server.
// ---------------------------------------------------------------------------
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

export function useLogigramme(logigrammeId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  // refreshKpis triggers one clean server-side fetch of the aggregated KPIs.
  // It is the ONLY way KPI values are written — no manual delta arithmetic.
  const { refreshKpis } = useLogigrammeContext();

  const fetchLogigramme = useCallback(async () => {
    if (!logigrammeId) return;
    console.log(`[useLogigramme] Fetching logigramme id=${logigrammeId}`);
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/api/logigramme/${logigrammeId}`);
      const totalCells = (res.unites || []).reduce((sum, u) => sum + (u.cells?.length || 0), 0);
      console.log(`[useLogigramme] Response for id=${logigrammeId}:`, {
        filiere: res.filiere?.name,
        classe: res.classe?.label,
        weeksCount: res.weeks?.length ?? 0,
        unitesCount: res.unites?.length ?? 0,
        totalCells,
      });
      if ((res.unites?.length ?? 0) === 0) {
        console.warn('[useLogigramme] ⚠ This logigramme has ZERO unités — grid will be empty!');
      }
      if (totalCells === 0 && (res.unites?.length ?? 0) > 0) {
        console.warn('[useLogigramme] ⚠ Unités exist but ALL have ZERO cells — import may have failed silently!');
      }
      setData({
        ...res,
        unites: (res.unites || []).map(calculateUnitMetrics),
      });
    } catch (err) {
      console.error(`[useLogigramme] Error fetching id=${logigrammeId}:`, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [logigrammeId]);

  // Set up real-time subscriptions for changes
  useEffect(() => {
    if (!logigrammeId) return;

    // Initial fetch
    fetchLogigramme();

    // Subscribe to changes on week_cells table for this logigramme
    const channel = supabase
      .channel(`logigramme:${logigrammeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'week_cells',
          filter: `logigramme_id=eq.${logigrammeId}`,
        },
        (payload) => {
          console.log('[useLogigramme] Real-time update received:', payload);
          // Update the grid state with the new/modified cell
          setData(prev => {
            if (!prev) return prev;

            const affectedUniteId = payload.new?.unite_id || payload.old?.unite_id;
            const nextUnites = prev.unites.map(u => {
              if (u.id !== affectedUniteId) return u;

              let nextCells;
              if (payload.eventType === 'DELETE') {
                nextCells = u.cells.filter(c => c.id !== payload.old.id);
              } else {
                const existingIndex = u.cells.findIndex(c => c.id === payload.new.id);
                if (existingIndex >= 0) {
                  nextCells = [...u.cells];
                  nextCells[existingIndex] = payload.new;
                } else {
                  nextCells = [...u.cells, payload.new];
                }
              }

              return calculateUnitMetrics({ ...u, cells: nextCells });
            });

            return { ...prev, unites: nextUnites };
          });

          // Refresh KPIs from the server after a real-time DB change
          refreshKpis();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    // Cleanup: unsubscribe on unmount or when logigrammeId changes
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [logigrammeId]);

  // ---------------------------------------------------------------------------
  // toggleCell — left-click to mark a cell done/pending
  // Grid: optimistic update immediately.
  // KPIs: refreshed from server once the API call succeeds.
  // ---------------------------------------------------------------------------
  const toggleCell = async (cellId, currentStatus) => {
    const isDone = currentStatus === 'done' || currentStatus === 'auto_done';
    const nextStatus = isDone ? 'pending' : 'done';

    // Optimistic UI update for the grid
    setData(prev => {
      if (!prev) return prev;
      const nextUnites = prev.unites.map(u => {
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
      // After a successful server write, refresh KPIs with the accurate aggregated values
      refreshKpis();
    } catch (err) {
      console.error('[useLogigramme] toggleCell failed, reverting:', err.message);
      fetchLogigramme();
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // actionCell — context menu: set cell type + hours
  // Grid: optimistic update immediately.
  // KPIs: refreshed from server once the API call succeeds.
  // ---------------------------------------------------------------------------
  const actionCell = async (uniteId, semaine, cell_type, heures = null) => {
    const today = new Date().toISOString().split('T')[0];
    const week = data?.weeks?.find(w => w.semaine === semaine);
    const isPast = week?.week_start_date && week.week_start_date < today;
    const completionStatus = isPast ? 'auto_done' : 'pending';

    const tempId = `temp-${Date.now()}`;
    let isUpdate = false;
    let oldCell = null;

    const isDelete = cell_type === 'empty' || (cell_type === 'normal' && (heures === null || heures === undefined || heures === ''));

    // Optimistic UI update for the grid
    setData(prev => {
      if (!prev) return prev;
      const nextUnites = prev.unites.map(u => {
        if (u.id !== uniteId) return u;

        const existingCellIndex = u.cells.findIndex(c => c.semaine === semaine);
        let nextCells;

        if (existingCellIndex >= 0) {
          isUpdate = true;
          oldCell = u.cells[existingCellIndex];
          if (isDelete) {
            nextCells = u.cells.filter(c => c.semaine !== semaine);
          } else {
            nextCells = [...u.cells];
            nextCells[existingCellIndex] = {
              ...oldCell,
              cell_type,
              heures,
            };
          }
        } else {
          if (isDelete) {
            return u;
          }
          const optimisticCell = {
            id: tempId,
            semaine,
            cell_type,
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
      const savedCell = await apiRequest('/api/logigramme/cell', {
        method: 'POST',
        body: JSON.stringify({
          unite_id: uniteId,
          semaine,
          cell_type,
          heures,
        })
      });

      // Replace temp id with real DB id for new cells
      if (!isUpdate && !isDelete && savedCell && savedCell.id) {
        setData(prev => {
          if (!prev) return prev;
          const nextUnites = prev.unites.map(u => {
            if (u.id !== uniteId) return u;
            const nextCells = u.cells.map(c =>
              c.id === tempId
                ? { ...c, id: savedCell.id, week_start_date: savedCell.week_start_date }
                : c
            );
            return { ...u, cells: nextCells };
          });
          return { ...prev, unites: nextUnites };
        });
      }

      // Refresh KPIs from the server with the accurate aggregated values
      refreshKpis();
    } catch (err) {
      // Rollback optimistic update
      console.error('[useLogigramme] actionCell failed, reverting:', err.message);
      setData(prev => {
        if (!prev) return prev;
        const nextUnites = prev.unites.map(u => {
          if (u.id !== uniteId) return u;
          let nextCells;
          if (isUpdate) {
            if (isDelete) {
              nextCells = [...u.cells, oldCell];
            } else {
              nextCells = u.cells.map(c => c.semaine === semaine ? oldCell : c);
            }
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

  // ---------------------------------------------------------------------------
  // actionWeek — week-level context menu: clear week / mark all done
  // Grid: optimistic update immediately.
  // KPIs: refreshed from server once the API call succeeds.
  // ---------------------------------------------------------------------------
  const actionWeek = async (semaine, action) => {
    // Optimistic UI update for the grid
    setData(prev => {
      if (!prev) return prev;
      const nextUnites = prev.unites.map(u => {
        let nextCells = u.cells;
        if (action === 'clear') {
          nextCells = u.cells.filter(c => c.semaine !== semaine);
        } else if (action === 'mark_done') {
          nextCells = u.cells.map(c =>
            (c.semaine === semaine && c.cell_type === 'normal')
              ? { ...c, completion_status: 'done' }
              : c
          );
        }
        return calculateUnitMetrics({ ...u, cells: nextCells });
      });
      return { ...prev, unites: nextUnites };
    });

    try {
      await apiRequest(`/api/logigramme/week/action`, {
        method: 'POST',
        body: JSON.stringify({ logigramme_id: logigrammeId, semaine, action })
      });
      // actionWeek already calls fetchLogigramme() to resync the full grid;
      // also refresh KPIs from the server.
      fetchLogigramme();
      refreshKpis();
    } catch (err) {
      console.error('[useLogigramme] actionWeek failed, reverting:', err.message);
      fetchLogigramme();
      throw err;
    }
  };

  return { data, loading, error, toggleCell, actionCell, actionWeek, refresh: fetchLogigramme };
}
