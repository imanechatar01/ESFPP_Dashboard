import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';

export function useLogigramme(logigrammeId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setData(res);
    } catch (err) {
      console.error(`[useLogigramme] Error fetching id=${logigrammeId}:`, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [logigrammeId]);

  useEffect(() => {
    fetchLogigramme();
  }, [fetchLogigramme]);

  const toggleCell = async (cellId, currentStatus) => {
    // 'done' and 'auto_done' both show the checkmark — toggling either sets to 'pending'
    const isDone = currentStatus === 'done' || currentStatus === 'auto_done';
    const nextStatus = isDone ? 'pending' : 'done';

    // Optimistic UI update — apply immediately, no waiting for server
    setData(prev => {
      if (!prev) return prev;
      const nextUnites = prev.unites.map(u => {
        const nextCells = u.cells.map(c =>
          c.id === cellId ? { ...c, completion_status: nextStatus } : c
        );
        // Recalculate vh_realise for this unite so progress bar updates instantly
        const vh_realise = nextCells
          .filter(c => c.cell_type === 'normal' && (c.completion_status === 'done' || c.completion_status === 'auto_done'))
          .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);
        return {
          ...u,
          cells: nextCells,
          vh_realise,
          vh_restant: u.vhg - vh_realise,
          taux: u.vhg > 0 ? vh_realise / u.vhg : 0,
        };
      });
      return { ...prev, unites: nextUnites };
    });

    try {
      await apiRequest(`/api/completion/cell/${cellId}`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus })
      });
      // ✅ Do NOT call fetchLogigramme() here — it would overwrite the optimistic update
      // and cause the 3-second revert. The DB write is the source of truth;
      // the next full page load will reflect the saved state.
    } catch (err) {
      // On failure, revert by re-fetching real state from DB
      console.error('[useLogigramme] toggleCell failed, reverting:', err.message);
      fetchLogigramme();
      throw err;
    }
  };

  const createCell = async (uniteId, semaine, heures) => {
    // Determine completion_status based on auto_done logic (same as backend)
    const today = new Date().toISOString().split('T')[0];
    const week = data?.weeks?.find(w => w.semaine === semaine);
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
          nextCells = [...u.cells];
          nextCells[existingCellIndex] = {
            ...oldCell,
            heures,
            // Keep existing ID so toggle still works while saving
          };
        } else {
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

        // Recalculate vh_realise
        const vh_realise = nextCells
          .filter(c => c.cell_type === 'normal' && (c.completion_status === 'done' || c.completion_status === 'auto_done'))
          .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);
        
        return {
          ...u,
          cells: nextCells,
          vh_realise,
          vh_restant: u.vhg - vh_realise,
          taux: u.vhg > 0 ? vh_realise / u.vhg : 0,
        };
      });
      return { ...prev, unites: nextUnites };
    });

    try {
      const savedCell = await apiRequest('/api/logigramme/cell', {
        method: 'POST',
        body: JSON.stringify({
          unite_id: uniteId,
          semaine,
          cell_type: 'normal',
          heures,
        })
      });

      // If it was a new cell, replace temporary cell with real DB cell (update the id)
      if (!isUpdate) {
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
    } catch (err) {
      // Rollback
      console.error('[useLogigramme] createCell failed, reverting:', err.message);
      setData(prev => {
        if (!prev) return prev;
        const nextUnites = prev.unites.map(u => {
          if (u.id !== uniteId) return u;
          let nextCells;
          if (isUpdate) {
            // Restore old cell
            nextCells = u.cells.map(c => c.semaine === semaine ? oldCell : c);
          } else {
            // Remove optimistic cell
            nextCells = u.cells.filter(c => c.id !== tempId);
          }
          
          const vh_realise = nextCells
            .filter(c => c.cell_type === 'normal' && (c.completion_status === 'done' || c.completion_status === 'auto_done'))
            .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);
          return {
            ...u,
            cells: nextCells,
            vh_realise,
            vh_restant: u.vhg - vh_realise,
            taux: u.vhg > 0 ? vh_realise / u.vhg : 0,
          };
        });
        return { ...prev, unites: nextUnites };
      });
      throw err; // Re-throw so GridCell can show error flash
    }
  };

  const markWeek = async (semaine, status) => {
    try {
      await apiRequest(`/api/completion/week`, {
        method: 'POST',
        body: JSON.stringify({ logigramme_id: logigrammeId, semaine, status })
      });
      fetchLogigramme();
    } catch (err) {
      throw err;
    }
  };

  return { data, loading, error, toggleCell, createCell, markWeek, refresh: fetchLogigramme };
}
