import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';

export function useLogigramme(logigrammeId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogigramme = useCallback(async () => {
    if (!logigrammeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/api/logigramme/${logigrammeId}`);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [logigrammeId]);

  useEffect(() => {
    fetchLogigramme();
  }, [fetchLogigramme]);

  const toggleCell = async (cellId, currentStatus) => {
    const nextStatus = currentStatus === 'pending' ? 'done' : 'pending';
    
    // Optimistic UI update
    setData(prev => {
      if (!prev) return prev;
      const nextUnites = prev.unites.map(u => ({
        ...u,
        cells: u.cells.map(c => c.id === cellId ? { ...c, completion_status: nextStatus } : c)
      }));
      return { ...prev, unites: nextUnites };
    });

    try {
      await apiRequest(`/api/completion/cell/${cellId}`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus })
      });
      // Optionally re-fetch to ensure sync (VH counts etc)
      fetchLogigramme();
    } catch (err) {
      // Revert on error
      fetchLogigramme();
      throw err;
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

  return { data, loading, error, toggleCell, markWeek, refresh: fetchLogigramme };
}
