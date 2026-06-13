# LOGIGRAMME GRID — Component Spec

> This is the most complex component in the project. Read this in full before writing any code.  
> The goal: render a grid that looks **exactly** like the Excel original.

---

## 1. Visual Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ FILTER BAR: [Filière ▼] [Classe ▼] [Formateur ▼] [Année ▼] [Status ▼] [Auto ⬛] │
├────┬──────────────────────────────┬────────┬──Semestre 1──────────┬──Semestre 2──┤
│ N° │ Unité de Formation           │Formtr  │VHG│ Sep │ Oct │ Nov … │ … Juin │Réal│
│    │                              │        │   │1 2 3│4 5 6│ 7 8 9 │  …     │ %  │
├────┼──────────────────────────────┼────────┼───┼─────┼─────┼───────┼────────┼────┤
│  1 │ Introduction aux soins …     │ZOURARAH│ 20│  ·  │2·2·2│ · · · │  …     │100%│
│  2 │ Hygiène individuelle …       │ZOURARAH│ 27│  ·  │2·2·2│ 2·2·3 │  …     │100%│
│ … │                              │        │   │     │     │       │        │    │
└────┴──────────────────────────────┴────────┴───┴─────┴─────┴───────┴────────┴────┘
```

**Left panel (sticky/frozen, never scrolls):**
- N° column: 40px
- Unité de Formation: 260px, text truncated with tooltip
- Formateur: 120px
- VHG: 50px

**Week area (horizontally scrollable):**
- Each week column: 32px wide
- Grouped visually by month (light separator line between months)
- Semester divider: bold border at week 26/27 boundary

**Right column (sticky right):**
- Réalisation: 80px — "X h / Y h" + mini progress bar

---

## 2. Header Structure (4 header rows)

```jsx
// Row 1: Semester spans
<tr>
  <th colSpan={4} /> {/* sticky left */}
  <th colSpan={semestre1WeekCount}>Semestre 1</th>
  <th colSpan={semestre2WeekCount}>Semestre 2</th>
  <th /> {/* progress col */}
</tr>

// Row 2: Month spans
<tr>
  <th colSpan={4} />
  {months.map(m => <th colSpan={m.weekCount}>{m.name}</th>)}
  <th />
</tr>

// Row 3: Week numbers
<tr>
  <th>N°</th><th>Unité</th><th>Formateur</th><th>VHG</th>
  {weeks.map(w => <th>{w.semaine}</th>)}
  <th>Réal.</th>
</tr>

// Row 4: Week start dates (DD/MM format)
<tr>
  <th colSpan={4} />
  {weeks.map(w => <th>{formatDate(w.week_start_date)}</th>)}
  <th />
</tr>
```

---

## 3. Cell Component: `GridCell.jsx`

### Props
```typescript
interface GridCellProps {
  cellType: 'normal' | 'vacation' | 'exam' | 'tiff' | 'empty';
  heures: number | null;
  completionStatus: 'pending' | 'done' | 'auto_done' | null;
  isEditable: boolean;        // false for vacation/exam/tiff cells
  onToggle: () => void;       // called when admin clicks
}
```

### Color Logic
```js
const CELL_COLORS = {
  vacation: { bg: '#FF99CC', text: '#7a3344', label: 'V' },
  exam:     { bg: '#C0C0C0', text: '#333',    label: 'E' },
  tiff:     { bg: '#FFFF00', text: '#7a6d00', label: 'T' },
  empty:    { bg: 'transparent', text: '', label: '' },
  normal:   {
    pending:   { bg: '#FFFFC C', text: '#5a5a00' },  // light yellow
    done:      { bg: '#86efac', text: '#166534' },    // green
    auto_done: { bg: '#bbf7d0', text: '#166534' },    // lighter green
  }
};
```

### Render
```jsx
function GridCell({ cellType, heures, completionStatus, isEditable, onToggle }) {
  if (cellType === 'empty') return <td className="border border-gray-100" />;

  if (cellType === 'vacation') {
    return (
      <td style={{ backgroundColor: '#FF99CC' }}
          className="text-center text-xs font-medium border border-gray-200"
          title="Vacances">
        V
      </td>
    );
  }

  if (cellType === 'exam') {
    return (
      <td style={{ backgroundColor: '#C0C0C0' }}
          className="text-center text-xs font-medium border border-gray-200"
          title="Semaine d'examens">
        E
      </td>
    );
  }

  if (cellType === 'tiff') {
    return (
      <td style={{ backgroundColor: '#FFFF00' }}
          className="text-center text-xs font-medium border border-gray-200"
          title="Travaux Individuels de Fin de Formation">
        T
      </td>
    );
  }

  // normal cell
  const isDone = completionStatus === 'done' || completionStatus === 'auto_done';
  const bgColor = isDone ? '#86efac' : '#FFFFCC';

  return (
    <td
      style={{ backgroundColor: bgColor }}
      className="text-center text-xs border border-gray-200 cursor-pointer select-none relative group"
      onClick={isEditable ? onToggle : undefined}
      title={isDone ? 'Cliquer pour annuler' : 'Cliquer pour marquer comme réalisé'}
    >
      {isDone && (
        <span className="absolute inset-0 flex items-center justify-center opacity-40 text-green-800">✓</span>
      )}
      <span className={isDone ? 'opacity-60' : ''}>{heures}</span>
    </td>
  );
}
```

---

## 4. Row Component: `GridRow.jsx`

```jsx
function GridRow({ unite, weeks, logigrammeId, onCellToggle }) {
  // Build a lookup: semaine → cell
  const cellMap = Object.fromEntries(
    unite.cells.map(c => [c.semaine, c])
  );

  const vhRealise = unite.cells
    .filter(c => c.cell_type === 'normal' && ['done','auto_done'].includes(c.completion_status))
    .reduce((sum, c) => sum + (c.heures || 0), 0);

  const progress = unite.vhg > 0 ? (vhRealise / unite.vhg) * 100 : 0;

  return (
    <tr className="hover:bg-gray-50">
      <td className="sticky left-0 bg-white text-center text-xs text-gray-500 border px-1">
        {unite.ordre}
      </td>
      <td className="sticky left-10 bg-white text-xs border px-2 max-w-[260px] truncate"
          title={unite.nom}>
        {unite.nom}
      </td>
      <td className="sticky left-[290px] bg-white text-xs border px-2 whitespace-nowrap">
        {unite.formateur?.nom ?? '—'}
      </td>
      <td className="sticky left-[410px] bg-white text-center text-xs font-semibold border">
        {unite.vhg}
      </td>

      {weeks.map(w => {
        const cell = cellMap[w.semaine];
        if (!cell) return <td key={w.semaine} className="border border-gray-100 w-8" />;
        return (
          <GridCell
            key={w.semaine}
            cellType={cell.cell_type}
            heures={cell.heures}
            completionStatus={cell.completion_status}
            isEditable={cell.cell_type === 'normal'}
            onToggle={() => onCellToggle(cell.id, cell.completion_status)}
          />
        );
      })}

      {/* Progress column */}
      <td className="sticky right-0 bg-white border px-2 min-w-[80px]">
        <div className="text-xs text-center mb-1">{vhRealise}/{unite.vhg}h</div>
        <div className="w-full bg-gray-200 rounded h-1.5">
          <div
            className="h-1.5 rounded"
            style={{ width: `${progress}%`, backgroundColor: progress >= 100 ? '#16a34a' : '#3b82f6' }}
          />
        </div>
        <div className="text-xs text-center mt-0.5 text-gray-500">
          {Math.round(progress)}%
        </div>
      </td>
    </tr>
  );
}
```

---

## 5. Main Grid: `LogigrammeGrid.jsx`

```jsx
function LogigrammeGrid({ logigrammeId }) {
  const { data, loading, error } = useLogigramme(logigrammeId);
  const { toggleCell, bulkToggleWeek } = useCompletion(logigrammeId);

  if (loading) return <GridSkeleton />;
  if (error)   return <ErrorBanner message={error.message} />;

  const { weeks, unites } = data;

  // Group weeks by month for header
  const monthGroups = groupWeeksByMonth(weeks);
  const semesterGroups = groupWeeksBySemester(weeks);

  return (
    <div className="relative overflow-auto border rounded-lg shadow-sm">
      <table className="border-collapse text-sm" style={{ minWidth: `${4 * 60 + 52 * 32 + 80}px` }}>
        <thead className="sticky top-0 z-20 bg-white">
          {/* Row 1: Semesters */}
          <tr className="bg-blue-50">
            <th colSpan={4} className="sticky left-0 z-30 bg-blue-50 border" />
            {semesterGroups.map(s => (
              <th key={s.semestre} colSpan={s.count}
                  className="text-center text-xs font-bold border border-blue-200 py-1">
                Semestre {s.semestre}
              </th>
            ))}
            <th className="sticky right-0 bg-blue-50 border" />
          </tr>

          {/* Row 2: Months */}
          <tr className="bg-gray-50">
            <th colSpan={4} className="sticky left-0 z-30 bg-gray-50 border" />
            {monthGroups.map(m => (
              <th key={m.mois} colSpan={m.count}
                  className="text-center text-xs font-semibold border py-1">
                {m.mois}
              </th>
            ))}
            <th className="sticky right-0 bg-gray-50 border" />
          </tr>

          {/* Row 3: Week numbers + column headers */}
          <tr className="bg-white">
            <th className="sticky left-0 z-30 bg-white border text-xs px-1 w-10">N°</th>
            <th className="sticky left-10 z-30 bg-white border text-xs px-2 w-[260px]">Unité de Formation</th>
            <th className="sticky left-[290px] z-30 bg-white border text-xs px-2 w-[120px]">Formateur</th>
            <th className="sticky left-[410px] z-30 bg-white border text-xs text-center w-[50px]">VHG</th>
            {weeks.map(w => (
              <th key={w.semaine}
                  className="border text-xs text-center w-8 cursor-pointer hover:bg-blue-50"
                  title={`Semaine ${w.semaine} — cliquer pour marquer toute la colonne`}
                  onClick={() => bulkToggleWeek(w.semaine)}>
                {w.semaine}
              </th>
            ))}
            <th className="sticky right-0 bg-white border text-xs text-center w-20">Réalisation</th>
          </tr>

          {/* Row 4: Dates */}
          <tr className="bg-white">
            <th colSpan={4} className="sticky left-0 z-30 bg-white border" />
            {weeks.map(w => (
              <th key={w.semaine} className="border text-[10px] text-center text-gray-400 w-8">
                {formatShortDate(w.week_start_date)}
              </th>
            ))}
            <th className="sticky right-0 bg-white border" />
          </tr>
        </thead>

        <tbody>
          {unites.map(unite => (
            <GridRow
              key={unite.id}
              unite={unite}
              weeks={weeks}
              logigrammeId={logigrammeId}
              onCellToggle={(cellId, currentStatus) => toggleCell(cellId, currentStatus)}
            />
          ))}
        </tbody>
      </table>

      <Legend />
    </div>
  );
}
```

---

## 6. Helper Functions: `lib/logigramme-helpers.js`

```js
// Group weeks by month name for header colspan
export function groupWeeksByMonth(weeks) {
  const groups = [];
  let current = null;
  for (const w of weeks) {
    if (!current || current.mois !== w.mois) {
      current = { mois: w.mois, count: 1 };
      groups.push(current);
    } else {
      current.count++;
    }
  }
  return groups;
}

// Group weeks by semester
export function groupWeeksBySemester(weeks) {
  const groups = [];
  let current = null;
  for (const w of weeks) {
    if (!current || current.semestre !== w.semestre) {
      current = { semestre: w.semestre, count: 1 };
      groups.push(current);
    } else {
      current.count++;
    }
  }
  return groups;
}

// Format date as "01/09"
export function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

// Compute progress for a unite
export function computeProgress(unite) {
  const done = unite.cells
    .filter(c => c.cell_type === 'normal' && ['done','auto_done'].includes(c.completion_status))
    .reduce((s, c) => s + (c.heures || 0), 0);
  return { vh_realise: done, vh_restant: unite.vhg - done, taux: unite.vhg > 0 ? done / unite.vhg : 0 };
}
```

---

## 7. Legend Component: `Legend.jsx`

```jsx
const LEGEND_ITEMS = [
  { color: '#FFFFCC', label: 'Session planifiée' },
  { color: '#86efac', label: 'Session réalisée' },
  { color: '#FF99CC', label: 'Vacances' },
  { color: '#C0C0C0', label: "Semaine d'examens" },
  { color: '#FFFF00', label: 'Travaux Individuels (TIFF)' },
];

export function Legend() {
  return (
    <div className="flex gap-4 p-3 border-t bg-gray-50 flex-wrap">
      {LEGEND_ITEMS.map(item => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
```

---

## 8. Filter Bar: `FilterBar.jsx`

```jsx
// State lives in LogigrammeContext
// Filters: { filiere_id, classe_id, formateur_id, year_id, status }

export function FilterBar() {
  const { filters, setFilter, filieres, formateurs, years, classes } = useLogigrammeContext();

  return (
    <div className="flex gap-3 p-4 border-b bg-white flex-wrap items-center">
      <Select label="Filière" value={filters.filiere_id}
              onChange={v => setFilter('filiere_id', v)}
              options={filieres} />

      <Select label="Classe" value={filters.classe_id}
              onChange={v => setFilter('classe_id', v)}
              options={classes.filter(c => !filters.filiere_id || c.filiere_id === filters.filiere_id)} />

      <Select label="Formateur" value={filters.formateur_id}
              onChange={v => setFilter('formateur_id', v)}
              options={formateurs} />

      <Select label="Année" value={filters.year_id}
              onChange={v => setFilter('year_id', v)}
              options={years} />

      <Select label="Statut" value={filters.status}
              onChange={v => setFilter('status', v)}
              options={[
                { id: 'all', label: 'Tout afficher' },
                { id: 'incomplete', label: 'Incomplet uniquement' },
                { id: 'complete', label: 'Terminé uniquement' },
              ]} />

      <button className="ml-auto text-xs text-gray-500 underline"
              onClick={() => resetFilters()}>
        Réinitialiser
      </button>
    </div>
  );
}
```

---

## 9. Hooks

### `hooks/useLogigramme.js`
```js
export function useLogigramme(logigrammeId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!logigrammeId) return;
    setLoading(true);
    api.get(`/logigramme/${logigrammeId}`)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [logigrammeId]);

  return { data, loading, error };
}
```

### `hooks/useCompletion.js`
```js
export function useCompletion(logigrammeId) {
  // Optimistic updates: update local state immediately, revert on error
  const toggleCell = async (cellId, currentStatus) => {
    const newStatus = ['done','auto_done'].includes(currentStatus) ? 'pending' : 'done';
    // 1. Optimistically update local state via context
    // 2. Call API: POST /api/completion/cell/:cellId { status: newStatus }
    // 3. On error: revert
  };

  const bulkToggleWeek = async (semaine) => {
    // POST /api/completion/week { logigramme_id, semaine, status: 'done' }
  };

  return { toggleCell, bulkToggleWeek };
}
```
