# FRONTEND SPEC — ESFPP Dashboard

> Read `LOGIGRAMME_SPEC.md` for the grid component in detail.  
> This file covers pages, routing, context, and the management UI.

---

## 1. New Pages

| Route | File | Role |
|-------|------|------|
| `/admin/logigrammes` | `pages/logigramme-view.jsx` | Main dashboard view |
| `/admin/filieres` | `pages/filieres-management.jsx` | Add/edit/delete filières |
| `/admin/formateurs` | `pages/formateurs-management.jsx` | Manage + replace formateurs |
| `/admin/academic-years` | `pages/academic-years.jsx` | Year management |

All pages are wrapped in the existing `DashboardShell` (sidebar + header).

---

## 2. Sidebar Navigation (extend `dashboard-shell.jsx`)

Add to admin navigation links:
```jsx
const adminNavLinks = [
  // existing:
  { href: '/admin/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/accounts',  label: 'Comptes',          icon: Users },
  // new:
  { href: '/admin/logigrammes',    label: 'Logigrammes',    icon: CalendarDays },
  { href: '/admin/filieres',       label: 'Filières',        icon: BookOpen },
  { href: '/admin/formateurs',     label: 'Formateurs',      icon: GraduationCap },
  { href: '/admin/academic-years', label: 'Années',          icon: Calendar },
];
```

---

## 3. LogigrammeContext: `contexts/logigramme-context.jsx`

```jsx
const defaultFilters = {
  year_id: null,       // set to current year on init
  filiere_id: null,
  classe_id: null,
  formateur_id: null,
  status: 'all',       // 'all' | 'incomplete' | 'complete'
};

export function LogigrammeProvider({ children }) {
  const [filters, setFiltersState] = useState(defaultFilters);
  const [years, setYears] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [formateurs, setFormateurs] = useState([]);
  const [classes, setClasses] = useState([]);

  // Load lookup data on mount
  useEffect(() => {
    Promise.all([
      api.get('/years'),
      api.get('/filieres'),
      api.get('/formateurs'),
      api.get('/classes'),  // all classes
    ]).then(([y, f, fmt, cl]) => {
      setYears(y);
      setFilieres(f);
      setFormateurs(fmt);
      setClasses(cl);
      // Set default year to current
      const current = y.find(yr => yr.is_current);
      if (current) setFiltersState(prev => ({ ...prev, year_id: current.id }));
    });
  }, []);

  const setFilter = (key, value) => {
    setFiltersState(prev => {
      const next = { ...prev, [key]: value };
      // Reset classe when filière changes
      if (key === 'filiere_id') next.classe_id = null;
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
      years, filieres, formateurs, classes,
    }}>
      {children}
    </LogigrammeContext.Provider>
  );
}
```

Wrap the provider around admin routes in `App.jsx`.

---

## 4. Logigramme View Page: `pages/logigramme-view.jsx`

```
┌──────────────────────────────────────────────────────┐
│ Logigrammes 2025-2026             [Exporter PDF]      │
├──────────────────────────────────────────────────────┤
│ [Filière ▼] [Classe ▼] [Formateur ▼] [Statut ▼]      │
├──────────────────────────────────────────────────────┤
│ Progression globale: 387h / 504h  ████████░░  77%    │
├──────────────────────────────────────────────────────┤
│ [AS – 1ère année] [Réa 1] [Réa 2] ...  ← tab bar    │
├──────────────────────────────────────────────────────┤
│                                                      │
│           < LogigrammeGrid />                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**State:**
- `logigrammeList`: from `GET /api/logigramme/list` (filtered)
- `activeLogigrammeId`: currently selected tab

**Behavior:**
- On filter change → refetch list
- Tab click → set `activeLogigrammeId` → `LogigrammeGrid` reloads
- "Exporter PDF" → `window.print()` with the grid in print mode

---

## 5. Filières Management: `pages/filieres-management.jsx`

```
┌─────────────────────────────────────────────────────┐
│ Filières                         [+ Nouvelle filière]│
├──────────┬─────────────────────┬────────┬───────────┤
│ Code     │ Nom                 │ Niveau │ Actions   │
├──────────┼─────────────────────┼────────┼───────────┤
│ AS       │ Aide-Soignant       │ QUALI  │ [✏] [🗑] │
│ REA      │ Infirmier Réanimat. │ TS     │ [✏] [🗑] │
└──────────┴─────────────────────┴────────┴───────────┘
```

**"Nouvelle filière" form fields:**
- Nom (text, required)
- Code (text, required, uppercase, auto-suggested from name)
- Niveau (select: "QUALIFICATION" | "Technicien Spécialisé")
- Nombre d'années (number 1–4, required) → creates N classe rows

**Delete confirmation modal:**
> "Supprimer Aide-Soignant supprimera 1 logigramme et toutes ses données. Cette action est irréversible."
> [Annuler] [Supprimer]

---

## 6. Formateurs Management: `pages/formateurs-management.jsx`

```
┌──────────────────────────────────────────────────────┐
│ Formateurs                      [+ Nouveau formateur] │
├─────────────────────┬────────────┬────────────────────┤
│ Nom                 │ Statut     │ Actions            │
├─────────────────────┼────────────┼────────────────────┤
│ ZOURARAH CHAFIA     │ Permanent  │ [✏] [Remplacer]   │
│ Aimouche            │ Vacataire  │ [✏] [Remplacer]   │
└─────────────────────┴────────────┴────────────────────┘
```

**"Remplacer" modal:**
```
Remplacer ZOURARAH CHAFIA par :
  Nouveau formateur: [______ ▼]  (searchable select from formateurs list)
  Portée:
    ○ Tous les logigrammes
    ○ Logigramme spécifique: [______ ▼]
  [Annuler]  [Confirmer le remplacement]
```
On confirm: `POST /api/formateurs/replace` → refresh page.

---

## 7. Academic Years: `pages/academic-years.jsx`

```
┌──────────────────────────────────────────────────────┐
│ Années académiques                 [+ Nouvelle année] │
├─────────────┬────────────┬──────────┬────────────────┤
│ Année       │ Début      │ Fin      │ Actions        │
├─────────────┼────────────┼──────────┼────────────────┤
│ 2025-2026 ✓ │ 01/09/2025 │ 31/08/26 │ [Actuelle]     │
│ 2024-2025   │ 02/09/2024 │ 31/08/25 │ [Définir actuelle]│
└─────────────┴────────────┴──────────┴────────────────┘
```

**"Nouvelle année" form:**
```
Label: [2026-2027]
Date de début (premier lundi de septembre): [07/09/2026]
Cloner la structure de: [2025-2026 ▼] (optional)
  ℹ️ Les données de complétion ne seront pas copiées.
[Annuler]  [Créer]
```

---

## 8. Component Tree Summary

```
App.jsx
└── LogigrammeProvider
    ├── /admin/logigrammes → LogigrammeView
    │   ├── FilterBar
    │   ├── GlobalProgressSummary
    │   ├── TabBar (one tab per filtered logigramme)
    │   └── LogigrammeGrid
    │       ├── GridHeader (4 header rows)
    │       ├── GridRow × N
    │       │   └── GridCell × 52
    │       ├── Legend
    │       └── CompletionToggle (auto/manual switch)
    │
    ├── /admin/filieres → FilieresManagement
    │   └── FiliereForm (modal)
    │
    ├── /admin/formateurs → FormateursManagement
    │   ├── FormateurForm (modal)
    │   └── ReplaceFormateurModal
    │
    └── /admin/academic-years → AcademicYears
        └── NewYearForm (modal)
```

---

## 9. Print / PDF Export

Add to `LogigrammeGrid.jsx`:
```css
/* In a <style> tag or global CSS */
@media print {
  .no-print { display: none !important; }   /* sidebar, filter bar, header */
  .logigramme-grid { overflow: visible !important; }
  th.sticky, td.sticky { position: static !important; } /* unfreeze for print */
  table { font-size: 8px; }
}
```

The "Exporter PDF" button:
```jsx
<button onClick={() => window.print()} className="no-print ...">
  Exporter PDF
</button>
```

---

## 10. Key UX Rules

1. **Optimistic updates** on cell toggle — do not wait for API response to update the UI.
2. **Error toast** if API call fails — revert cell state.
3. **Loading skeleton** for the grid (show 10 gray rows while data loads).
4. **Truncate long unit names** with `title` tooltip on hover.
5. **Confirm before bulk operations** (bulk week mark, formateur replace, filière delete).
6. **Auto-complete indicator** — show a small badge "Auto" on classes that have `auto_complete = true`.
