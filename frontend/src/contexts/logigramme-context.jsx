
// @refresh reset
// frontend/src/contexts/logigramme-context.jsx
import { createContext, useContext, useState, useEffect } from 'react';
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

  const resetFilters = () => {
    const current = years.find(yr => yr.is_current);
    setFiltersState({ ...defaultFilters, year_id: current?.id ?? null });
  };

  return (
    <LogigrammeContext.Provider value={{
      filters, setFilter, resetFilters,
      years, filieres, formateurs, classes, niveaux,
      loading, refreshLookups: loadLookups
    }}>
    {children}
    </LogigrammeContext.Provider>
  );
}

export const useLogigrammeContext = () => useContext(LogigrammeContext);
