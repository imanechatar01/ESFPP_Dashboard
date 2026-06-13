# AGENT TASKS — ESFPP Dashboard Implementation

> **For AI agents (Gemini CLI, Cursor, Claude Code):**  
> Execute tasks **in order**. Do not skip. Each task has an acceptance test.  
> If a task depends on another, that dependency is listed.  
> Always re-read `MASTER.md` at the start of a new session.

---

## PHASE 1 — Database

### Task 1.1 — Apply Logigramme Migrations
**Files:** `supabase/migrations/20260611_logigramme_schema.sql`, `supabase/migrations/20260611_logigramme_rls.sql`  
**Action:** Copy the SQL from `DATABASE.md` into these two files. Apply them to Supabase in order.  
**Acceptance:**
- `supabase db push` succeeds with no errors
- In Supabase dashboard, verify tables exist: `academic_years`, `filieres`, `classes`, `formateurs`, `logigrammes`, `unites_formation`, `week_cells`, `completions`, `year_weeks`
- RLS is enabled on all 9 tables (check in Supabase → Table Editor → RLS badge)

---

### Task 1.2 — Seed Academic Year
**Depends on:** Task 1.1  
**Action:** Run this SQL in Supabase SQL editor:
```sql
INSERT INTO public.academic_years (label, start_date, end_date, is_current)
VALUES ('2025-2026', '2025-09-01', '2026-08-31', true);
```
**Acceptance:** `SELECT * FROM academic_years` returns one row.

---

## PHASE 2 — XLS Import

### Task 2.1 — Create Python XLS Parser
**File:** `backend/scripts/parse_xls.py`  
**Action:** Write a Python script that:
1. Takes `--file path/to/file.xls` and `--sheet "Sheet Name"` as args
2. Uses `xlrd` with `formatting_info=True`
3. Reads metadata from rows 2–6 (filière, niveau, classe, year)
4. Reads week dates from row 10 (Excel serial → Python date via `xlrd.xldate_as_datetime`)
5. Reads data rows from row 11 onwards (stop at row with 'Total' in col 2)
6. For each data row: extracts ordre, nom, formateur, vhg, and all non-empty cells
7. Maps cell background colors to cell types:
   - `(255,255,204)` or `(255,255,0)` with numeric value → `normal` (bright yellow marks TIFF)
   - `(255,153,204)` → `vacation`
   - `(192,192,192)` → `exam`
   - `(255,255,0)` with no numeric → `tiff`
8. Outputs valid JSON to stdout (structure from `API.md` → Import Script section)

**Acceptance:**
```bash
python3 backend/scripts/parse_xls.py \
  --file xls-files/OK_Nidal_Etat_logigramme_-aide_soignant_classeur_de_jury_2025-2026.xls \
  --sheet "Aide-soignant" | python3 -m json.tool
```
Output is valid JSON with 29 unités, correct formateur names, and cells with proper types.

---

### Task 2.2 — Create Node.js Import Orchestrator
**File:** `backend/scripts/import-xls.js`  
**Depends on:** Tasks 1.1, 1.2, 2.1  
**Action:** Node.js script that:
1. Accepts `--year "2025-2026"` and `--dir ./xls-files` args
2. For each `.xls` file, lists its sheets (skip `Feuil1`)
3. Calls `parse_xls.py` for each sheet via `child_process.execSync`
4. Parses the JSON output
5. Inserts into Supabase (using service role key from `.env`) in this order:
   a. Upsert filière by code (derive code from name: "Aide-Soignant" → "AS", etc.)
   b. Upsert classe (filiere_id + annee)
   c. Upsert formateur by nom
   d. Upsert logigramme (filiere_id + classe_id + academic_year_id)
   e. Insert unites_formation
   f. Insert week_cells
   g. Insert year_weeks (from parsed week dates, computed mois + semestre)

**Map of filière names to codes:**
```js
const FILIERE_CODES = {
  'Aide-Soignant': 'AS',
  'Infirmier en Réanimation': 'REA',
  'Infirmier Anesthésiste': 'IA',
  'Infirmier Polyvalent': 'IP',
  'Radiologie': 'RADIO',
};
```

**Semestre logic:** weeks 1–26 = semestre 1, weeks 27–52 = semestre 2.

**Acceptance:**
```bash
node backend/scripts/import-xls.js --year "2025-2026" --dir ./xls-files
```
After running:
- `SELECT COUNT(*) FROM unites_formation` → 100+ rows
- `SELECT COUNT(*) FROM week_cells` → 1000+ rows
- `SELECT DISTINCT formateur_id FROM unites_formation` → multiple unique formateurs
- No duplicate rows (script is idempotent — safe to run twice)

---

## PHASE 3 — Backend Routes

### Task 3.1 — Logigramme Routes
**File:** `backend/routes/logigrammes.js`  
**Action:** Implement all routes from `API.md` → "Routes: logigrammes.js"  
**Acceptance:**
```bash
# With a valid admin JWT:
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/logigramme/list
# Returns array with at least 5 logigrammes

curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/logigramme/$LOGID
# Returns object with weeks (52 items) and unites (29+ items for AS)
```

---

### Task 3.2 — Completion Routes
**File:** `backend/routes/completion.js`  
**Action:** Implement all routes from `API.md` → "Routes: completion.js"  
**Acceptance:**
```bash
# Mark a cell as done
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}' \
  http://localhost:3001/api/completion/cell/$CELL_ID

# Re-fetch the logigramme — that cell's completion_status should be "done"
```

---

### Task 3.3 — Filières + Formateurs Routes
**Files:** `backend/routes/filieres.js`, `backend/routes/formateurs.js`  
**Action:** Implement CRUD routes from `API.md`  
**Acceptance:** All CRUD endpoints return correct HTTP codes (201 created, 200 updated, 204 deleted). The `replace` endpoint updates `formateur_id` on matching `unites_formation` rows.

---

### Task 3.4 — Academic Year Routes
**File:** `backend/routes/academic-years.js`  
**Action:** Implement from `API.md` → "Routes: academic-years.js"  
**Acceptance:** `POST /api/years` with `clone_from_year_id` creates all logigrammes/unites/cells for the new year with recomputed dates.

---

## PHASE 4 — Frontend

### Task 4.1 — Logigramme Context + Hooks
**Files:**
- `frontend/src/contexts/logigramme-context.jsx`
- `frontend/src/hooks/useLogigramme.js`
- `frontend/src/hooks/useCompletion.js`
- `frontend/src/lib/logigramme-helpers.js`

**Action:** Implement as specified in `LOGIGRAMME_SPEC.md` sections 6, 7, and 9.  
**Acceptance:** No UI yet — unit-test the helpers:
- `groupWeeksByMonth` on 52 weeks → returns 12 groups (Sep–Aug)
- `formatShortDate('2025-09-01')` → `"01/09"`
- `computeProgress` on a unite with 10/20 hours done → `{ taux: 0.5, vh_realise: 10, vh_restant: 10 }`

---

### Task 4.2 — GridCell + GridRow Components
**Files:**
- `frontend/src/components/logigramme/GridCell.jsx`
- `frontend/src/components/logigramme/GridRow.jsx`

**Action:** Implement exactly as specified in `LOGIGRAMME_SPEC.md` sections 3 and 4.  
**Acceptance:**
- A `normal`+`pending` cell is light yellow, shows hours number
- A `normal`+`done` cell is green, shows checkmark + hours (faded)
- A `vacation` cell is pink, shows "V"
- A `exam` cell is gray, shows "E"
- A `tiff` cell is yellow, shows "T"
- Clicking a `normal` cell calls `onToggle`
- Clicking a non-normal cell does nothing

---

### Task 4.3 — LogigrammeGrid + Header
**Files:**
- `frontend/src/components/logigramme/LogigrammeGrid.jsx`
- `frontend/src/components/logigramme/GridHeader.jsx`
- `frontend/src/components/logigramme/Legend.jsx`

**Action:** Implement as in `LOGIGRAMME_SPEC.md` sections 2, 5, and 7.  
**Critical:** Left columns must be `sticky left-0` with increasing `left` values. Right column must be `sticky right-0`. The table container must be `overflow-x-auto`.  
**Acceptance:**
- Grid renders without horizontal overflow clipping the left panel
- Scrolling right keeps N°, Unité, Formateur, VHG columns visible
- Scrolling down keeps header rows visible
- Month headers span the correct number of week columns
- Semester 1 and Semester 2 headers span correct weeks

---

### Task 4.4 — FilterBar
**File:** `frontend/src/components/logigramme/FilterBar.jsx`  
**Action:** Implement as in `LOGIGRAMME_SPEC.md` section 8. FilterBar reads from and writes to `LogigrammeContext`.  
**Acceptance:**
- Selecting a filière updates the classe dropdown to show only that filière's classes
- Selecting a formateur re-fetches the logigramme list filtered by that formateur
- Resetting filters restores defaults

---

### Task 4.5 — Logigramme View Page
**File:** `frontend/src/pages/logigramme-view.jsx`  
**Action:**
1. Renders `FilterBar` at top
2. Fetches list of logigrammes matching current filters via `GET /api/logigramme/list`
3. If multiple logigrammes match: shows a tab bar (one tab per filière/classe)
4. Renders `LogigrammeGrid` for the selected tab
5. Shows total progress summary at top: "X h réalisées / Y h total (Z%)"

**Acceptance:**
- Page loads and shows all logigrammes for 2025-2026
- Selecting "Aide-Soignant" in the filière filter shows only the AS logigramme
- Clicking a cell marks it done (cell turns green, progress bar updates)
- Clicking a week header prompts confirmation then bulk-marks the column

---

### Task 4.6 — Management Pages
**Files:**
- `frontend/src/pages/filieres-management.jsx`
- `frontend/src/pages/formateurs-management.jsx`
- `frontend/src/pages/academic-years.jsx`

**Acceptance for each:**
- `filieres-management.jsx`: List of filières with edit/delete. "Nouvelle filière" button opens a form. Deleting a filière shows a confirmation warning ("Cela supprimera X logigrammes").
- `formateurs-management.jsx`: List with statut badge. "Remplacer" action opens a form to pick old → new formateur with scope selector (all / specific logigramme).
- `academic-years.jsx`: List of years with "current" badge. "Nouvelle année" button asks for start date + whether to clone from existing year.

---

### Task 4.7 — Routing
**File:** `frontend/src/App.jsx`  
**Action:** Add routes:
```jsx
// In the admin section of the route switch:
case '/admin/logigrammes':        return <LogigrammeView />;
case '/admin/filieres':           return <FilieresManagement />;
case '/admin/formateurs':         return <FormateursManagement />;
case '/admin/academic-years':     return <AcademicYears />;
```
Add navigation links to the existing `DashboardShell` sidebar.

---

## PHASE 5 — Polish

### Task 5.1 — Auto-complete Sync
**Action:** Add a button on the logigramme view: "Synchroniser (auto)". When clicked, calls `POST /api/completion/auto-sync/:logigramme_id`. All past-week sessions are marked `auto_done`. The grid refreshes.  
Add an `auto_complete` toggle per logigramme (switch in the logigramme header). When on, sync runs automatically on page load.

### Task 5.2 — Export to PDF
**Action:** Add an "Exporter PDF" button that calls `libreoffice --headless` on a server-generated HTML version of the grid and returns the PDF.  
**Simpler alternative (recommended):** Use `window.print()` with a print-specific CSS that hides the filter bar and sidebar. Add `@media print` styles to `LogigrammeGrid`.

### Task 5.3 — Responsive & Empty States
- If no logigrammes exist for the selected filter: show an empty state with a CTA to add a filière.
- If the logigramme has no unités: show "Aucune unité de formation. Importez un fichier XLS ou ajoutez manuellement."
- Mobile: the grid scrolls horizontally. The sticky columns still work. The filter bar collapses into a "Filtres" dropdown.

---

## Completion Checklist

- [x] Task 1.1 — Schema migrations applied
- [x] Task 1.2 — Academic year seeded
- [x] Task 2.1 — Python XLS parser
- [x] Task 2.2 — Node.js import orchestrator
- [x] Task 3.1 — Logigramme API routes
- [x] Task 3.2 — Completion API routes
- [x] Task 3.3 — Filières + formateurs CRUD routes
- [x] Task 3.4 — Academic year routes
- [x] Task 4.1 — Context + hooks + helpers
- [x] Task 4.2 — GridCell + GridRow
- [x] Task 4.3 — LogigrammeGrid + headers
- [x] Task 4.4 — FilterBar
- [x] Task 4.5 — Logigramme view page
- [x] Task 4.6 — Management pages
- [x] Task 4.7 — Routing
- [x] Task 5.1 — Auto-complete
- [x] Task 5.2 — PDF export
- [x] Task 5.3 — Polish + empty states
