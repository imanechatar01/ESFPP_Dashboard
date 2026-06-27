// frontend/src/components/logigramme/FilterBar.jsx
import { useLogigrammeContext } from '@/contexts/logigramme-context';
import { Filter, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';

const selectClass = "h-7 rounded-lg border border-border bg-background px-1.5 pr-5 text-[11px] font-medium focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer";

export function FilterBar({ className }) {
  const { filters, setFilter, resetFilters, years, filieres, classes, niveaux, formateurs } = useLogigrammeContext();

  // Filter classes by selected filiere
  const activeFilieresClasses = classes.filter(c => !filters.filiere_id || c.filiere_id === filters.filiere_id);
  // Filter filieres by selected niveau
  const activeFilieres = filieres.filter(f => !filters.niveau_id || f.niveau === filters.niveau_id);

  return (
    <div className={cn("flex flex-wrap items-center gap-2 py-1.5 px-2.5 bg-card/80 rounded-xl border border-border shadow-sm backdrop-blur-sm w-full", className)}>
      <div className="flex items-center gap-1 px-1 flex-shrink-0">
        <Filter className="size-3.5 text-primary" />
      </div>

      {/* Year */}
      <select
        value={filters.year_id || ''}
        onChange={(e) => setFilter('year_id', e.target.value)}
        className={cn(selectClass, "min-w-[100px] flex-1 sm:flex-initial")}
      >
        {years.length === 0 && <option value="">Chargement...</option>}
        {years.map(y => (
          <option key={y.id} value={y.id}>
            {y.label} {y.is_current ? '(en cours)' : ''}
          </option>
        ))}
      </select>

      <div className="hidden sm:block w-px h-4 bg-border/60 flex-shrink-0" />

      {/* Niveau */}
      <select
        value={filters.niveau_id || ''}
        onChange={(e) => setFilter('niveau_id', e.target.value)}
        className={cn(selectClass, "min-w-[100px] flex-1 sm:flex-initial")}
      >
        <option value="">Tous niveaux</option>
        {niveaux.map(n => (
          <option key={n.id} value={n.id}>{n.label}</option>
        ))}
      </select>

      {/* Filière */}
      <select
        value={filters.filiere_id || ''}
        onChange={(e) => setFilter('filiere_id', e.target.value)}
        className={cn(selectClass, "min-w-[120px] max-w-full sm:max-w-[180px] flex-1 sm:flex-initial")}
      >
        <option value="">Toutes filières</option>
        {activeFilieres.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      {/* Classe */}
      <select
        value={filters.classe_id || ''}
        onChange={(e) => setFilter('classe_id', e.target.value)}
        className={cn(selectClass, "min-w-[100px] flex-1 sm:flex-initial")}
        disabled={!filters.filiere_id && activeFilieresClasses.length === 0}
      >
        <option value="">Toutes classes</option>
        {activeFilieresClasses.map(c => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>

      {/* Formateur */}
      <select
        value={filters.formateur_id || ''}
        onChange={(e) => setFilter('formateur_id', e.target.value)}
        className={cn(selectClass, "min-w-[110px] max-w-full sm:max-w-[160px] flex-1 sm:flex-initial")}
      >
        <option value="">Tous formateurs</option>
        {formateurs.map(f => (
          <option key={f.id} value={f.id}>{f.nom}</option>
        ))}
      </select>

      <button
        onClick={resetFilters}
        className="flex items-center gap-1 h-7 px-2 rounded-lg text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors flex-shrink-0 ml-auto sm:ml-0"
        title="Réinitialiser les filtres"
      >
        <RotateCcw className="size-3" />
      </button>
    </div>
  );
}
