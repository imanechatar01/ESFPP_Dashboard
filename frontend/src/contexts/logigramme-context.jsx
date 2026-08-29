
// @refresh reset
// frontend/src/contexts/logigramme-context.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';

const LogigrammeContext = createContext();

const defaultFilters = {
  year_id: null,
  filiere_id: null,
  classe_id: null,
  niveau_id: null,      // new
  formateur_id: null,
    status: 'all',
};

export function LogigrammeProvider({ children }) {
  const [filters, setFiltersState] = useState(defaultFilters);
  const [years, setYears] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [formateurs, setFormateurs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [niveaux, setNiveaux] = useState([]); // new
  const [loading, setLoading] = useState(true);

  // Global KPIs State
  const [kpis, setKpis] = useState(null);
  const [loadingKpis, setLoadingKpis] = useState(false);

  async function loadLookups() {
    setLoading(true);
    try {
      const [y, f, fmt] = await Promise.all([
        apiRequest('/api/years'),
                                            apiRequest('/api/filieres'),
                                            apiRequest('/api/formateurs'),
      ]);
      setYears(y);
      setFilieres(f);
      setFormateurs(fmt);

      // Extract unique niveaux from filieres
      const uniqueNiveaux = [...new Map(f.map(filiere => [filiere.niveau, { id: filiere.niveau, label: filiere.niveau }])).values()];
      setNiveaux(uniqueNiveaux);

      const allCl = f.reduce((acc, curr) => [...acc, ...(curr.classes || [])], []);
      setClasses(allCl);

      const current = y.find(yr => yr.is_current);
      if (current) setFiltersState(prev => ({ ...prev, year_id: current.id }));
    } catch (err) {
      console.error('Failed to load logigramme lookups:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  const fetchKpis = useCallback(async () => {
    setLoadingKpis(true);
    try {
      const query = new URLSearchParams();
      if (filters.year_id) query.append('year_id', filters.year_id);
      if (filters.filiere_id) query.append('filiere_id', filters.filiere_id);
      if (filters.formateur_id) query.append('formateur_id', filters.formateur_id);
      if (filters.classe_id) query.append('classe_id', filters.classe_id);
      if (filters.niveau_id) query.append('niveau_id', filters.niveau_id);

      const data = await apiRequest(`/api/logigramme/kpis?${query.toString()}`);
      setKpis(data);
    } catch (err) {
      console.error('Failed to fetch KPIs:', err);
    } finally {
      setLoadingKpis(false);
    }
  }, [filters.year_id, filters.filiere_id, filters.formateur_id, filters.classe_id, filters.niveau_id]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const setFilter = (key, value) => {
    setFiltersState(prev => {
      const next = { ...prev, [key]: value };
      // Reset dependent filters
      if (key === 'filiere_id') {
        next.classe_id = null;
        // Optionally reset niveau if you want niveau to be derived from filiere
        // next.niveau_id = null;
      }
      if (key === 'niveau_id') {
        // When niveau changes, reset filiere and classe to avoid mismatch
        next.filiere_id = null;
        next.classe_id = null;
      }
      return next;
    });
  };

  const setMultipleFilters = (updates) => {
    setFiltersState(prev => ({ ...prev, ...updates }));
  };

  const resetFilters = () => {
    const current = years.find(yr => yr.is_current);
    setFiltersState({ ...defaultFilters, year_id: current?.id ?? null });
  };

  const [highlightUniteId, setHighlightUniteId] = useState(null);
  const [highlightWeek, setHighlightWeek] = useState(null);
  const [highlightCellId, setHighlightCellId] = useState(null);
  const [highlightLogigrammeId, setHighlightLogigrammeId] = useState(null);

  return (
    <LogigrammeContext.Provider value={{
      filters, setFilter, setMultipleFilters, resetFilters,
      years, filieres, formateurs, classes, niveaux,
      loading, refreshLookups: loadLookups,
      kpis, loadingKpis, refreshKpis: fetchKpis,
      highlightUniteId, setHighlightUniteId,
      highlightWeek, setHighlightWeek,
      highlightCellId, setHighlightCellId,
      highlightLogigrammeId, setHighlightLogigrammeId
    }}>
    {children}
    </LogigrammeContext.Provider>
  );
}

export const useLogigrammeContext = () => useContext(LogigrammeContext);
