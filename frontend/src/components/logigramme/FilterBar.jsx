// frontend/src/components/logigramme/FilterBar.jsx
import { useLogigrammeContext } from '@/contexts/logigramme-context';
import { Filter, RotateCcw, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

export function FilterBar({ className }) {
  const { filters, setFilter, resetFilters, years, filieres, classes, niveaux, formateurs } = useLogigrammeContext();

  // Filter classes by selected filiere
  const activeFilieresClasses = classes.filter(c => !filters.filiere_id || c.filiere_id === filters.filiere_id);
  // Filter filieres by selected niveau
  const activeFilieres = filieres.filter(f => !filters.niveau_id || f.niveau === filters.niveau_id);

  return (
    <div className={cn("flex flex-wrap items-center gap-3 p-3 bg-card/80 rounded-xl border border-border shadow-sm mb-4 backdrop-blur-sm", className)}>
    <div className="flex items-center gap-1.5 px-2">
    <Filter className="size-3.5 text-primary" />
    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filtres</span>
    </div>

    {/* Year */}
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Année</span>
      <select
        value={filters.year_id || ''}
        onChange={(e) => setFilter('year_id', e.target.value)}
        className="h-8 rounded-lg border border-border bg-background px-2 pr-6 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
      >
        {years.length === 0 && <option value="">Chargement...</option>}
        {years.map(y => (
          <option key={y.id} value={y.id}>
            {y.label} {y.is_current ? '(en cours)' : ''}
          </option>
        ))}
      </select>
    </div>

    {/* Niveau */}
    <select
    value={filters.niveau_id || ''}
    onChange={(e) => setFilter('niveau_id', e.target.value)}
    className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none min-w-[140px]"
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
    className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none min-w-[180px]"
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
    className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none min-w-[120px]"
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
    className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none min-w-[150px]"
    >
    <option value="">Tous formateurs</option>
    {formateurs.map(f => (
      <option key={f.id} value={f.id}>{f.nom}</option>
    ))}
    </select>

    <Button
    variant="ghost"
    size="sm"
    onClick={resetFilters}
    className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary"
    >
    <RotateCcw className="size-3 mr-1" />
    Réinitialiser
    </Button>
    </div>
  );
}
