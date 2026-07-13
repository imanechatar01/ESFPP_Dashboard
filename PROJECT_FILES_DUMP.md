# Project Files Dump

This file inlines the repository's text-based project files, excluding `.env*` files.
Binary assets and generated artifacts that cannot be represented cleanly as plain text are listed at the end.

## Text Files

path of the file : `.files/API.md`

````
# BACKEND API SPEC — ESFPP Logigramme

> All routes go in `backend/routes/`. Register them in `backend/server.js`.  
> All `/api/logigramme/*`, `/api/filieres/*`, `/api/formateurs/*`, `/api/years/*` routes  
> require `requireAuth` + `requireRole('admin')` middleware (already implemented).  
> Students get a separate read-only namespace: `/api/student/logigramme/*`.

---

## Registration in server.js

```js
// Add these after existing route registrations
const logigrammesRouter  = require('./routes/logigrammes');
const filieresRouter     = require('./routes/filieres');
const formateursRouter   = require('./routes/formateurs');
const yearsRouter        = require('./routes/academic-years');
const completionRouter   = require('./routes/completion');

app.use('/api/logigramme',  requireAuth, requireRole('admin'), logigrammesRouter);
app.use('/api/filieres',    requireAuth, requireRole('admin'), filieresRouter);
app.use('/api/formateurs',  requireAuth, requireRole('admin'), formateursRouter);
app.use('/api/years',       requireAuth, requireRole('admin'), yearsRouter);
app.use('/api/completion',  requireAuth, requireRole('admin'), completionRouter);

// Student read-only (no write, no management)
app.use('/api/student/logigramme', requireAuth, studentLogigrammeRouter);
```

---

## Routes: `backend/routes/logigrammes.js`

### GET `/api/logigramme/list`
Returns all logigrammes (summary, no cells) for the current academic year.

**Query params:**
- `year_id` (optional) — default: current academic year
- `filiere_id` (optional) — filter by filière
- `formateur_id` (optional) — filter by formateur

**Response:**
```json
[
  {
    "id": "uuid",
    "filiere": { "id": "uuid", "code": "AS", "name": "Aide-Soignant" },
    "classe": { "id": "uuid", "label": "1ère année", "annee": 1 },
    "academic_year": "2025-2026",
    "auto_complete": false,
    "total_unites": 29,
    "vhg_total": 504,
    "vh_realise": 320,
    "taux": 0.63
  }
]
```

---

### GET `/api/logigramme/:id`
Returns the full logigramme grid data for one logigramme.

**Response:**
```json
{
  "id": "uuid",
  "filiere": { "id": "uuid", "code": "AS", "name": "Aide-Soignant", "niveau": "QUALIFICATION" },
  "classe": { "id": "uuid", "label": "1ère année", "annee": 1 },
  "academic_year": {
    "id": "uuid",
    "label": "2025-2026",
    "start_date": "2025-09-01"
  },
  "auto_complete": false,
  "weeks": [
    {
      "semaine": 1,
      "week_start_date": "2025-09-01",
      "mois": "Septembre",
      "semestre": 1
    }
    // ... 52 entries
  ],
  "unites": [
    {
      "id": "uuid",
      "ordre": 1,
      "nom": "Introduction aux soins d'hygiène et du confort du malade",
      "formateur": { "id": "uuid", "nom": "ZOURARAH CHAFIA", "statut": "permanent" },
      "vhg": 20,
      "cells": [
        {
          "id": "uuid",
          "semaine": 3,
          "cell_type": "normal",
          "heures": 2,
          "completion_status": "done"
        }
        // ... only non-empty cells (sparse)
      ],
      "vh_realise": 20,
      "vh_restant": 0,
      "taux": 1.0
    }
  ]
}
```

---

### PUT `/api/logigramme/:id/auto-complete`
Toggle auto-complete mode for a logigramme.

**Body:** `{ "auto_complete": true }`  
**Response:** `{ "id": "uuid", "auto_complete": true }`

---

### POST `/api/logigramme`
Create a new empty logigramme (when adding a new filière or class).

**Body:**
```json
{
  "filiere_id": "uuid",
  "classe_id": "uuid",
  "academic_year_id": "uuid"
}
```

---

## Routes: `backend/routes/completion.js`

### POST `/api/completion/cell/:cell_id`
Mark a single cell as done or pending.

**Body:** `{ "status": "done" | "pending" }`  
**Response:** `{ "cell_id": "uuid", "status": "done", "updated_at": "..." }`

**Logic:**
1. Look up cell. If no completion row exists, create one.
2. Set `status` and `updated_by = req.user.id`.
3. If `status = "done"` but the logigramme has `auto_complete = false`, store as `"done"`.

---

### POST `/api/completion/week`
Bulk-mark all normal cells in a week column for one logigramme.

**Body:**
```json
{
  "logigramme_id": "uuid",
  "semaine": 12,
  "status": "done"
}
```
**Response:** `{ "updated": 14 }` — number of cells updated.

---

### POST `/api/completion/auto-sync/:logigramme_id`
Trigger auto-sync: mark all past-week cells as `auto_done` for logigrammes where `auto_complete = true`.

Can be called by a cron job or manually by admin.

---

## Routes: `backend/routes/filieres.js`

### GET `/api/filieres` — list all  
### POST `/api/filieres` — create filière + classes  
**Body:**
```json
{
  "code": "KINE",
  "name": "Kinésithérapie",
  "niveau": "Technicien Spécialisé",
  "nb_annees": 3
}
```
Creates the filière + N classe rows (1ère année … Nème année).

### PUT `/api/filieres/:id` — update name/niveau  
### DELETE `/api/filieres/:id` — deletes filière + all associated data (cascade)

---

## Routes: `backend/routes/formateurs.js`

### GET `/api/formateurs` — list all  
### POST `/api/formateurs` — create  
### PUT `/api/formateurs/:id` — update  
### DELETE `/api/formateurs/:id` — soft-delete (set a `deleted_at`, do not cascade)

### POST `/api/formateurs/replace`
Replace a formateur across units of formation.

**Body:**
```json
{
  "old_formateur_id": "uuid",
  "new_formateur_id": "uuid",
  "scope": "all" | "logigramme",
  "logigramme_id": "uuid"   // only required if scope = "logigramme"
}
```
**Response:** `{ "updated_units": 7 }`

---

## Routes: `backend/routes/academic-years.js`

### GET `/api/years` — list all  
### POST `/api/years` — create new year  
**Body:**
```json
{
  "label": "2026-2027",
  "start_date": "2026-09-07",
  "clone_from_year_id": "uuid"  // optional: clone logigramme structure (no completions)
}
```

**Logic when `clone_from_year_id` is provided:**
1. Copy all logigrammes, unites_formation, week_cells from source year.
2. Recompute `week_start_date` for each cell based on new `start_date`.
3. Do NOT copy completions.
4. Generate new `year_weeks` rows with correct dates.

### PUT `/api/years/:id/set-current` — set as current academic year  
(Unsets the previous current year.)

---

## Import Script: `backend/scripts/import-xls.js`

One-time script. Run with:
```bash
node backend/scripts/import-xls.js --year "2025-2026" --dir ./xls-files
```

**Logic:**
1. For each `.xls` file in `--dir`:
   a. Read all sheets with `xlrd` (via Python subprocess or `node-xlrd` npm package).
   b. Parse metadata rows (filière name, niveau, classe).
   c. Parse week header row (week numbers + dates).
   d. Parse each data row → create `unites_formation` + `week_cells`.
   e. Color-to-type mapping:
      - `(255,255,204)` → `normal`
      - `(255,255,0)` → `tiff`
      - `(255,153,204)` → `vacation`
      - `(192,192,192)` → `exam`
      - empty/`0` → skip (do not insert)
2. Upsert formateurs by name.
3. Insert logigramme record linking filière + classe + academic_year.

**Note:** Use Python with `xlrd` for reading `.xls` files (Node.js has no reliable `.xls` parser).  
Call the Python script from Node.js via `child_process.execSync`.

The Python portion (`backend/scripts/parse_xls.py`) outputs JSON:
```json
{
  "filiere": "Aide-Soignant",
  "niveau": "QUALIFICATION",
  "classe": "1ère année",
  "weeks": [
    { "semaine": 1, "date": "2025-09-01", "mois": "Septembre", "semestre": 1 }
  ],
  "unites": [
    {
      "ordre": 1,
      "nom": "Introduction aux soins d'hygiène",
      "formateur": "ZOURARAH CHAFIA",
      "vhg": 20,
      "cells": [
        { "semaine": 3, "heures": 2, "type": "normal" },
        { "semaine": 18, "heures": null, "type": "vacation" }
      ]
    }
  ]
}
```
````

path of the file : `.files/DASHBOARD_ENHANCEMENTS.md`

````
# DASHBOARD ENHANCEMENTS — Agent Tasks

> Read MASTER.md, DATABASE.md, API.md, LOGIGRAMME_SPEC.md, and FRONTEND.md 
> before starting. These tasks build on top of the existing logigramme 
> system — they do NOT replace anything already specified there.
>
> Execute in order. Each task has acceptance criteria. Do not mark a task 
> done until criteria pass (see Verification Policy in GEMINI.md).

---

## TASK A — KPI Summary Bar

**Goal:** Add a row of stat cards at the top of `/admin/logigrammes`, above the filter bar.

**Backend:**
- New route `GET /api/logigramme/kpis`
- Query params: same filters as `/api/logigramme/list` (year_id, filiere_id, formateur_id)
- Response:
```json
{
  "total_programmes": 12,
  "total_heures": 5996,
  "total_formateurs": 18,
  "taux_global": 0.73
}
```
- `taux_global` = SUM(vh_realise across all units) / SUM(vhg across all units), for the filtered set.

**Frontend:**
- New component `frontend/src/components/logigramme/KpiBar.jsx`
- 4 cards in a horizontal flex row, each with: big number, small label below
- Cards: "Programmes", "Heures totales", "Formateurs", "Taux de réalisation global"
- Place above `<FilterBar />` in `logigramme-view.jsx`
- Cards re-fetch when filters change (use the same filter state from `LogigrammeContext`)

**Acceptance:**
- With no filters, "Programmes" shows 12, "Heures totales" shows 5996
- Selecting filière = "Aide-Soignant" updates cards to that filière's totals only (1 programme, 504h)
- `npm run build` passes with no errors

---

## TASK B — Sidebar Tree Grouping (Filière → Classe)

**Goal:** Replace the flat list of 12 programme cards with a grouped tree: each filière is a collapsible section header, classes are rows underneath.

**Backend:**
- Extend `GET /api/logigramme/list` response to include a `filiere` object on each item (already specified in API.md) — confirm this is implemented.

**Frontend:**
- New component `frontend/src/components/logigramme/ProgrammeTree.jsx` replacing the current card list
- Group `logigrammeList` by `filiere.id`
- Each filière group:
  - Header row: filière name + a small aggregate progress ring (avg taux across its classes) + chevron to collapse/expand
  - Default state: expanded
  - Children: one compact row per classe (label + mini progress bar + %)
- Clicking a classe row sets `activeLogigrammeId` and scrolls the grid into view
- Collapse state stored in local component state (NOT localStorage — per project constraints)

**Acceptance:**
- 5 filière groups visible: Aide-Soignant, Infirmier en Réanimation, Infirmier Auxiliaire, Infirmier Polyvalent, Radiologie
- Aide-Soignant group has 1 child row; Infirmier en Réanimation has 3; etc. (totals: 1+3+2+3+3 = 12)
- Collapsing a group hides its children without affecting others
- No "NaN%" anywhere (reuse the guarded percentage calc from the earlier bug fix)

---

## TASK C — Cross-Filière Formateur Filter

**Goal:** Selecting a formateur in the filter bar shows that formateur's rows from ALL logigrammes, not just one filtered logigramme.

**Backend:**
- New route `GET /api/formateurs/:id/unites`
- Returns all `unites_formation` rows for this formateur, each annotated with its parent logigramme/filiere/classe:
```json
[
  {
    "unite_id": "uuid",
    "ordre": 1,
    "nom": "Système national de santé...",
    "vhg": 20,
    "logigramme_id": "uuid",
    "filiere": { "code": "AS", "name": "Aide-Soignant" },
    "classe": { "label": "1ère année" },
    "cells": [ /* same shape as in /api/logigramme/:id */ ]
  }
]
```

**Frontend:**
- When `filters.formateur_id` is set (and no specific logigramme tab is forced), `logigramme-view.jsx` switches to a **"Vue formateur"** mode:
  - Instead of the normal tabbed single-grid view, render one mini-grid section per filière/classe this formateur appears in, each with a small header showing "Aide-Soignant — 1ère année"
  - Each mini-grid reuses `LogigrammeGrid`'s row rendering (just the unit rows for this formateur, not all units) — consider extracting a `GridRow`-only rendering path that doesn't require the full unites array
- Add a banner above: "Zourarah Chafia enseigne dans X programmes — Y heures au total"

**Acceptance:**
- Selecting formateur "Zourarah Chafia" shows sections for Aide-Soignant 1ère année, IA1, IP1, IP2/3 (wherever she appears — verify against the source XLS data)
- Banner shows correct total hours (sum of vhg across all her units)
- Clearing the formateur filter returns to normal tabbed view

---

## TASK D — Heatmap Overview Toggle

**Goal:** A zoomed-out view: rows = logigrammes, columns = 52 weeks, cell color = completion % for that logigramme/week.

**Backend:**
- New route `GET /api/logigramme/heatmap`
- Query params: year_id, filiere_id (optional)
- Response:
```json
{
  "weeks": [ /* same 52-week array as elsewhere: semaine, week_start_date, mois, semestre */ ],
  "rows": [
    {
      "logigramme_id": "uuid",
      "label": "Aide-Soignant — 1ère année",
      "weekly_completion": [
        { "semaine": 1, "taux": 0.0, "total_cells": 0 },
        { "semaine": 5, "taux": 0.6, "total_cells": 5 }
        // sparse — only weeks with normal cells
      ]
    }
  ]
}
```
- `taux` per week = (cells with status done/auto_done) / (total normal cells that week) for that logigramme.

**Frontend:**
- New component `frontend/src/components/logigramme/HeatmapView.jsx`
- Toggle button in `logigramme-view.jsx` header: "Vue grille" / "Vue d'ensemble" (icon toggle, e.g. Grid vs LayoutGrid from lucide-react)
- Heatmap table: sticky left column = logigramme label, 52 columns = weeks, each cell colored on a gradient:
  - 0% → light gray
  - 1-49% → light orange
  - 50-99% → light blue
  - 100% → green
  - No normal cells that week (vacation/exam) → diagonal hatch pattern or `#f3f4f6`
- Clicking a row label switches to that logigramme's detail grid (Vue grille mode)
- Reuse `groupWeeksByMonth`/`groupWeeksBySemester` from `logigramme-helpers.js` for the header

**Acceptance:**
- Heatmap shows 12 rows × 52 columns
- Cells correctly show gray for 0% and green for 100% based on real completion data
- Clicking a row switches to detail view for that logigramme
- Toggle persists only for the session (component state, not storage)

---

## TASK E — Formateur Conflict Detection

**Goal:** In the formateur detail view (Task C), highlight weeks where a formateur is scheduled in TWO different classes simultaneously.

**Depends on:** Task C

**Backend:**
- In `GET /api/formateurs/:id/unites`, add a top-level `conflicts` array:
```json
{
  "unites": [ /* as in Task C */ ],
  "conflicts": [
    {
      "semaine": 12,
      "week_start_date": "2025-11-17",
      "programmes": [
        { "logigramme_id": "uuid", "label": "Aide-Soignant 1ère année", "unite_nom": "..." },
        { "logigramme_id": "uuid", "label": "Infirmier Polyvalent 1ère année", "unite_nom": "..." }
      ]
    }
  ]
}
```
- A conflict = same formateur has a `normal` cell with `heures > 0` in the same `semaine` across 2+ different logigrammes.

**Frontend:**
- In "Vue formateur" mode, if `conflicts.length > 0`, show a warning banner:
  > "⚠ 3 conflits d'horaire détectés pour Zourarah Chafia"
- In each mini-grid, cells belonging to a conflicted week get a red outline/border (in addition to their normal color)
- Clicking the warning banner scrolls to the first conflicted week

**Acceptance:**
- Run the conflict query against real imported data (after Task 2.2's import) and confirm at least the known overlaps for formateurs teaching multiple filières are detected
- If a formateur has zero conflicts, no banner is shown
- Conflicted cells are visually distinguishable (red border) without losing their cell_type color (vacation/exam/normal/etc.)

---

## Suggested Implementation Order

1. Task A (KPI bar) — standalone, low risk, good warm-up
2. Task B (sidebar tree) — standalone UI restructure
3. Task D (heatmap) — standalone, reuses existing helpers
4. Task C (formateur cross-filter) — needs new backend aggregation
5. Task E (conflict detection) — builds directly on Task C

---

## Verification Reminders for Agents

- After each task, run `npm run build` in `frontend/`
- For backend tasks, `curl` the new endpoint with a real admin JWT and confirm the JSON shape matches the spec exactly
- Cross-check at least one number (e.g. total heures, formateur hour totals) against the source XLS/PDF files provided — these are the ground truth
- Do not modify `LogigrammeGrid.jsx`'s core row/cell rendering without checking it doesn't break Task 4.2/4.3 from the original TASKS.md
````

path of the file : `.files/DATABASE.md`

````
# DATABASE SCHEMA — ESFPP Logigramme

> Apply migrations in order after the existing three migrations in `supabase/migrations/`.

---

## Migration: `20260611_logigramme_schema.sql`

```sql
-- ============================================================
-- LOOKUP TABLES
-- ============================================================

-- Academic years (e.g. "2025-2026")
CREATE TABLE public.academic_years (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL UNIQUE,          -- "2025-2026"
  start_date  date NOT NULL,                 -- First Monday of September
  end_date    date NOT NULL,                 -- Last Friday of August next year
  is_current  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one current year at a time
CREATE UNIQUE INDEX academic_years_one_current
  ON public.academic_years (is_current)
  WHERE is_current = true;

-- Filières (training programs)
CREATE TABLE public.filieres (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,          -- "AS", "REA", "IA", "IP", "RADIO"
  name        text NOT NULL,                 -- "Aide-Soignant"
  niveau      text NOT NULL,                 -- "QUALIFICATION" | "Technicien Spécialisé"
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Classes within a filière (one row per year of training)
CREATE TABLE public.classes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiere_id   uuid NOT NULL REFERENCES public.filieres(id) ON DELETE CASCADE,
  label        text NOT NULL,                -- "1ère année", "2ème année"
  annee        integer NOT NULL,             -- 1, 2, 3
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (filiere_id, annee)
);

-- Formateurs (teachers)
CREATE TABLE public.formateurs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         text NOT NULL,                 -- "ZOURARAH CHAFIA"
  statut      text NOT NULL DEFAULT 'vacataire'
                CHECK (statut IN ('permanent', 'vacataire')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PLANNING TABLES
-- ============================================================

-- One logigramme per (filiere × classe × academic_year)
CREATE TABLE public.logigrammes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiere_id       uuid NOT NULL REFERENCES public.filieres(id) ON DELETE CASCADE,
  classe_id        uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  auto_complete    boolean NOT NULL DEFAULT false, -- auto-mark past weeks as done
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (filiere_id, classe_id, academic_year_id)
);

-- Training units (one per row in the Excel grid)
CREATE TABLE public.unites_formation (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logigramme_id  uuid NOT NULL REFERENCES public.logigrammes(id) ON DELETE CASCADE,
  ordre          integer NOT NULL,            -- row order (1, 2, 3…)
  nom            text NOT NULL,               -- unit name
  formateur_id   uuid REFERENCES public.formateurs(id) ON DELETE SET NULL,
  vhg            integer NOT NULL,            -- Volume Horaire Global (total hours)
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (logigramme_id, ordre)
);

-- Weekly schedule cells (one row per unit × week)
-- Only non-empty cells are stored (sparse storage)
CREATE TABLE public.week_cells (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unite_id        uuid NOT NULL REFERENCES public.unites_formation(id) ON DELETE CASCADE,
  semaine         integer NOT NULL CHECK (semaine BETWEEN 1 AND 52), -- week number
  week_start_date date NOT NULL,              -- actual calendar date of that Monday
  cell_type       text NOT NULL DEFAULT 'normal'
                    CHECK (cell_type IN ('normal', 'vacation', 'exam', 'tiff', 'empty')),
  heures          numeric(4,1),               -- scheduled hours (null for vacation/exam/tiff)
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unite_id, semaine)
);

-- Completion tracking (one row per cell that has been interacted with)
CREATE TABLE public.completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id      uuid NOT NULL REFERENCES public.week_cells(id) ON DELETE CASCADE UNIQUE,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'done', 'auto_done')),
  -- 'auto_done' = set by the system because week_start_date < today and auto_complete = true
  -- 'done'      = set manually by admin
  -- 'pending'   = not yet done
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- WEEK CALENDAR TABLE
-- A pre-computed lookup of week_number → date for each academic year
-- Generated once when an academic_year is created
-- ============================================================
CREATE TABLE public.year_weeks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  semaine          integer NOT NULL CHECK (semaine BETWEEN 1 AND 52),
  week_start_date  date NOT NULL,
  mois             text NOT NULL,             -- "Septembre", "Octobre", etc.
  semestre         integer NOT NULL CHECK (semestre IN (1, 2)),
  UNIQUE (academic_year_id, semaine)
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER filieres_updated_at
  BEFORE UPDATE ON public.filieres
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER formateurs_updated_at
  BEFORE UPDATE ON public.formateurs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER logigrammes_updated_at
  BEFORE UPDATE ON public.logigrammes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER unites_formation_updated_at
  BEFORE UPDATE ON public.unites_formation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## Migration: `20260611_logigramme_rls.sql`

```sql
-- ============================================================
-- Enable RLS on all logigramme tables
-- ============================================================
ALTER TABLE public.academic_years     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filieres           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formateurs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logigrammes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unites_formation   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.week_cells         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.year_weeks         ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
-- (reuses the auth_role() function from the existing auth migration)

-- ============================================================
-- READ policies: admins see all, students see all (read-only)
-- ============================================================
CREATE POLICY "anyone_authenticated_can_read_academic_years"
  ON public.academic_years FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_filieres"
  ON public.filieres FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_classes"
  ON public.classes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_formateurs"
  ON public.formateurs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_logigrammes"
  ON public.logigrammes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_unites"
  ON public.unites_formation FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_week_cells"
  ON public.week_cells FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_completions"
  ON public.completions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_year_weeks"
  ON public.year_weeks FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- WRITE policies: admins only
-- ============================================================
CREATE POLICY "admins_can_insert_filieres"
  ON public.filieres FOR INSERT TO authenticated
  WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_update_filieres"
  ON public.filieres FOR UPDATE TO authenticated
  USING (auth_role() = 'admin');

CREATE POLICY "admins_can_delete_filieres"
  ON public.filieres FOR DELETE TO authenticated
  USING (auth_role() = 'admin');

-- Repeat pattern for: academic_years, classes, formateurs,
-- logigrammes, unites_formation, week_cells, year_weeks
-- (same structure — just change the table name)

CREATE POLICY "admins_can_write_academic_years"
  ON public.academic_years FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_classes"
  ON public.classes FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_formateurs"
  ON public.formateurs FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_logigrammes"
  ON public.logigrammes FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_unites"
  ON public.unites_formation FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_week_cells"
  ON public.week_cells FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_completions"
  ON public.completions FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_year_weeks"
  ON public.year_weeks FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');
```

---

## Key Queries (for backend reference)

### Full logigramme for one classe

```sql
SELECT
  uf.ordre,
  uf.nom AS unite_nom,
  f.nom  AS formateur_nom,
  uf.vhg,
  wc.semaine,
  wc.week_start_date,
  wc.cell_type,
  wc.heures,
  co.status AS completion_status,
  yw.mois,
  yw.semestre
FROM public.unites_formation uf
JOIN public.logigrammes lg ON uf.logigramme_id = lg.id
JOIN public.filieres fi    ON lg.filiere_id = fi.id
JOIN public.classes cl     ON lg.classe_id = cl.id
LEFT JOIN public.formateurs f ON uf.formateur_id = f.id
LEFT JOIN public.week_cells wc ON wc.unite_id = uf.id
LEFT JOIN public.completions co ON co.cell_id = wc.id
LEFT JOIN public.year_weeks yw
  ON yw.academic_year_id = lg.academic_year_id
  AND yw.semaine = wc.semaine
WHERE lg.id = $1
ORDER BY uf.ordre, wc.semaine;
```

### Progress summary per formateur

```sql
SELECT
  f.nom AS formateur,
  COUNT(wc.id) FILTER (WHERE wc.cell_type = 'normal') AS total_sessions,
  COUNT(co.id) FILTER (WHERE co.status IN ('done','auto_done')) AS done_sessions,
  SUM(wc.heures) FILTER (WHERE wc.cell_type = 'normal') AS total_heures,
  SUM(wc.heures) FILTER (WHERE co.status IN ('done','auto_done') AND wc.cell_type = 'normal') AS heures_realisees
FROM public.unites_formation uf
JOIN public.logigrammes lg ON uf.logigramme_id = lg.id
LEFT JOIN public.formateurs f ON uf.formateur_id = f.id
LEFT JOIN public.week_cells wc ON wc.unite_id = uf.id
LEFT JOIN public.completions co ON co.cell_id = wc.id
WHERE lg.academic_year_id = $1
GROUP BY f.id, f.nom
ORDER BY f.nom;
```

---

## Seed Data — Academic Year 2025-2026

```sql
INSERT INTO public.academic_years (label, start_date, end_date, is_current)
VALUES ('2025-2026', '2025-09-01', '2026-08-31', true);
```

The `import-xls.js` script (see `TASKS.md` Task 2) populates all other tables from the XLS files.
````

path of the file : `.files/FRONTEND.md`

````
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
````

path of the file : `.files/LOGIGRAMME_SPEC.md`

````
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
````

path of the file : `.files/MASTER.md`

````
# ESFPP Dashboard — Master Architecture

> **For AI agents (Gemini CLI, Cursor, Claude Code, etc.):**  
> Read this file first. It is the single source of truth for the project's goals, constraints, and file map. Always re-read it before starting a new task.

---

## 1. Project Goal

Build an **admin dashboard** for ESFPP Mohammedia that:
1. Displays training schedule **logigrammes** (Gantt-style grids) **visually identical to the Excel originals**.
2. Lets admins **track completion** of each weekly session (manual click or auto-detection based on current date).
3. Provides **filters**: by filière, classe, academic year, and formateur.
4. Lets admins **manage data**: add/remove filières, replace a formateur on a unit, adjust schedules.
5. Supports **multiple academic years** — the calendar auto-adapts when a new year is created.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Icons | Lucide React |
| Backend | Node.js, Express |
| Database / Auth | Supabase (PostgreSQL + GoTrue Auth) |
| State | React Context (existing `auth-context.jsx`) |
| API layer | `lib/api.js` bearer-token wrapper (existing) |

**Do not change the tech stack.** The auth/RBAC system is already built — see `HANDOFF.md` and `GEMINI.md`.

---

## 3. Data Sources — XLS File Analysis

Five `.xls` files were provided. Each file = one **filière**. Each sheet = one **classe** (year).

### Filières and Classes

| File | Filière | Classes (sheets) |
|------|---------|-----------------|
| `aide_soignant.xls` | Aide-Soignant | 1ère année |
| `Réanimation.xls` | Infirmier en Réanimation | Réa 1, Réa 2, Réa 3 |
| `IA.xls` | Infirmier Anesthésiste | IA1, IA2 |
| `IP.xls` | Infirmier Polyvalent | IP1, IP2, IP3 |
| `Radiologie.xls` | Radiologie | Radio 1, Radio 2, Radio 3 |

### XLS Sheet Structure (59 columns)

```
Col 0       → unit_number (integer)
Col 1       → unit_name (string)
Col 2       → formateur_name (string)
Col 3       → vhg (float) — Volume Horaire Global (total scheduled hours)
Cols 4–55   → 52 weekly cells (week 1 = col 4, week 52 = col 55)
Col 56      → vh_realise (float) — hours completed
Col 57      → vh_restant (float) — hours remaining
Col 58      → taux_realisation (float 0–1) — completion rate
```

**Row layout:**
- Rows 0–6: Metadata (filière, niveau, classe, academic year)
- Row 7: Semester labels ("Semestre 1", "Semestre 2")
- Row 8: Month names (colspan per month)
- Row 9: Week numbers (1–52)
- Row 10: Week start dates (Excel serial dates)
- Rows 11+: One data row per training unit
- Last rows: Legend (Vacance, Semaine d'examens, Travaux TIFF)

### Weekly Cell Encoding

| Cell value | Background RGB | Meaning | DB type |
|-----------|---------------|---------|---------|
| `2.0`, `3.0`, etc. | `(255,255,204)` light yellow | Normal session — N hours scheduled | `normal` |
| `2.0`, `3.0` etc. | `(255,255,0)` bright yellow | Last session / TIFF week marker | `tiff` |
| `"Vacance"` | `(255,153,204)` pink | Holiday/vacation week | `vacation` |
| `"Semaine d'examens..."` | `(192,192,192)` gray | Exam week | `exam` |
| `0.0` or `""` | any | No session scheduled | `empty` |

---

## 4. Feature Specs

### 4.1 Logigramme Grid (core visual)

The grid **must** match the Excel layout:
- **Frozen left panel**: unit #, unit name, formateur, VHG (4 columns, sticky)
- **Scrollable week area**: 52 columns, one per week
- **Layered headers**: Semester → Month → Week number → Date
- **Color-coded cells** matching the encoding table above
- **Completion overlay**: when admin marks a session as done, the cell gets a ✓ and a green tint
- **Progress column** on the far right: VH Réalisé / VHG as a progress bar + percentage

### 4.2 Completion Tracking

**Manual mode:**
- Admin clicks any `normal` cell → toggles between `pending` and `done`
- Admin clicks a week-column header → bulk-mark entire week for that filière/classe

**Auto mode (toggle per class):**
- If `auto_complete` is enabled for a classe, any session whose week end date < today is automatically marked `done` unless manually overridden

### 4.3 Filters

The filter bar at the top of the dashboard must support:
- Filière (multiselect)
- Classe (dependent on selected filières)
- Formateur (multiselect, shows formateurs present in current view)
- Academic year (single select, default = current year)
- Show: All / Only incomplete / Only complete

### 4.4 Admin Management

- **Add filière**: name + niveau + list of classes → creates empty logigramme shells
- **Replace formateur**: change the formateur on one or more unités de formation (by filière/classe or globally)
- **Edit unit**: rename, change VHG, reassign weeks
- **New academic year**: cloning a previous year's structure as a template, with new start date (auto-computes 52 week dates)

---

## 5. File Map (full project)

```
backend/
  server.js                     ← existing; extend with new routes
  routes/
    logigrammes.js               ← NEW: GET/POST/PUT for logigramme data
    formateurs.js                ← NEW: formateur management
    filieres.js                  ← NEW: filière CRUD
    academic-years.js            ← NEW: year management
    completion.js                ← NEW: mark sessions done/undone
  scripts/
    create-admin.js              ← existing
    import-xls.js                ← NEW: one-time XLS import script
  .env

frontend/src/
  App.jsx                        ← extend routing
  pages/
    admin-dashboard.jsx          ← existing; add logigramme entry points
    logigramme-view.jsx          ← NEW: main logigramme page
    filieres-management.jsx      ← NEW: add/edit filières
    formateurs-management.jsx    ← NEW: manage formateurs
    academic-years.jsx           ← NEW: year management
  components/
    logigramme/
      LogigrammeGrid.jsx         ← NEW: the 52-week grid
      GridHeader.jsx             ← NEW: semester/month/week header rows
      GridRow.jsx                ← NEW: one training unit row
      GridCell.jsx               ← NEW: single week cell
      FilterBar.jsx              ← NEW: top filter controls
      ProgressBar.jsx            ← NEW: VH Réalisé progress
      Legend.jsx                 ← NEW: color legend
      CompletionToggle.jsx       ← NEW: auto/manual mode switch
    management/
      FiliereForm.jsx            ← NEW
      FormateurForm.jsx          ← NEW
      UniteForm.jsx              ← NEW
    auth/ (existing)
    layout/ (existing)
    ui/ (existing)
  contexts/
    auth-context.jsx             ← existing
    logigramme-context.jsx       ← NEW: filter state, view state
  lib/
    api.js                       ← existing
    logigramme-helpers.js        ← NEW: date math, color mapping, progress calc
  hooks/
    useLogigramme.js             ← NEW: data fetching + filter logic
    useCompletion.js             ← NEW: mark done/undone with optimistic UI

supabase/migrations/
  20260609_auth_rbac_profiles.sql           ← existing
  20260609_auth_rbac_profiles_allow_pending.sql ← existing
  20260610_fix_profiles_updated_at.sql      ← existing
  20260611_logigramme_schema.sql            ← NEW: full logigramme schema
  20260611_logigramme_rls.sql               ← NEW: RLS policies
```

---

## 6. Agent Reading Order

When implementing, read files in this order:

1. `MASTER.md` (this file) — goals + constraints
2. `GEMINI.md` — existing tech stack + conventions
3. `HANDOFF.md` — existing auth/RBAC system
4. `DATABASE.md` — schema to apply first
5. `API.md` — backend routes to implement
6. `FRONTEND.md` — React components to build
7. `LOGIGRAMME_SPEC.md` — detailed grid component spec
8. `TASKS.md` — ordered task list with acceptance criteria

---

## 7. Key Constraints

- **Service role key**: backend-only, never in `VITE_*` vars.
- **RLS**: all logigramme tables must have RLS enabled. Admins can CRUD everything. Students read-only (their own filière only).
- **No react-router-dom**: use the existing internal router in `App.jsx`.
- **No form tags**: use `onClick`/`onChange` event handlers only.
- **Tailwind v4**: use `@theme` directives and core utilities only.
- **Import XLS once**: the `import-xls.js` script runs once to seed the DB. After that, all data is managed through the dashboard.
````

path of the file : `.files/TASKS.md`

````
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
````

path of the file : `.gitignore`

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*


/backend/scripts1
/backend/node_modules
/backend/import-reports/
__pycache__/
*.pyc
node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

.env
```

path of the file : `GEMINI.md`

```
# ESFPP Dashboard Project Context

This file contains the foundational mandates, architecture, and workflows for the ESFPP Dashboard project.

## Tech Stack
- **Frontend:** React 19, Tailwind CSS v4, Vite.
- **Backend:** Node.js, Express.
- **Database/Auth:** Supabase (PostgreSQL, GoTrue for Auth).
- **Icons:** Lucide React.
- **Styling:** Vanilla CSS + Tailwind v4 `@theme` directives.

## Architecture
- **Monorepo-ish:** `frontend/` and `backend/` are in the same repository but managed as separate npm projects.
- **RBAC (Role Based Access Control):** 
  - Roles are `admin` or `student`.
  - Roles are stored in `auth.users.user_metadata.role` for session-based access.
  - Roles are also mirrored in `public.profiles.role`.
- **Invitation Flow:**
  - Custom backend flow using Supabase Admin API.
  - Bypasses email delivery issues in dev by generating links manually.
  - Status tracking: `invited`, `pending`, `active`, `blocked`.
- **Routing:** 
  - Custom internal router in `frontend/src/App.jsx` (no `react-router-dom`).
  - Route guards: `RequireAuth` and `RequireRole` in `frontend/src/components/auth/route-guards.jsx`.

## Security Mandates
- **Service Role Key:** The `SUPABASE_SERVICE_ROLE_KEY` is **STRICTLY BACKEND-ONLY**. Never expose it to the frontend.
- **Data Access:** Enforced via Supabase Row Level Security (RLS) on the database level and role-checks on the backend.

## Conventions
- **Routing:** Add new pages to the `pages/` directory and register them in `App.jsx`.
- **Components:** UI primitives in `components/ui/`, logic-specific components in their respective subfolders.
- **State Management:** React Context (`auth-context.jsx`) for global auth state.
- **API Calls:** Use the wrapper in `lib/api.js` for authenticated requests to the backend.

## Workspace Workflows
- **Database:** Apply migrations in `supabase/migrations/` sequentially.
- **Bootstrap:** Use `backend/scripts/create-admin.js` to create the initial admin user.
- **Development:** 
  - Backend: `npm start` in `backend/` (runs on port 3001).
  - Frontend: `npm run dev` in `frontend/` (runs on port 5173).

## Key Files
- `backend/server.js`: Core API and middleware.
- `frontend/src/App.jsx`: Main routing logic.
- `frontend/src/contexts/auth-context.jsx`: Auth provider.
- `supabase/migrations/`: Database schema and policies.

## Frontend Conventions (Critical)

### 1. Tailwind v4 Theme Tokens
Always use these theme variables (via `@theme inline` in `globals.css`) instead of arbitrary values:
- **Fonts:** 
  - `font-sans`: 'Figtree' (Default for UI)
  - `font-heading`: 'Figtree'
  - `font-mono`: 'Geist Mono'
- **Colors:**
  - `primary`: Professional Medical Blue (`oklch(0.42 0.12 245)`)
  - `secondary`: Calming Cyan (`oklch(0.85 0.08 195)`)
  - `accent`: Medical Vitality Green (`oklch(0.6 0.15 160)`)
  - `background`: Soft blue-gray (`oklch(0.98 0.005 195)`)
  - `foreground`: Dark medical blue text (`oklch(0.25 0.06 230)`)
- **UI Components:**
  - `.medical-glass`: Custom class for frosted-glass effects with medical styling.
- **Border Radius:** Use `radius-sm`, `radius-md`, `radius-lg` (default 0.625rem), `radius-xl`, etc.

### 2. Custom Routing System
This project **does not use react-router-dom**. It uses a lightweight internal router in `App.jsx`:
- **State Management:** The `usePath` hook tracks the current `window.location.pathname`.
- **Navigation:** Use the `navigate(path, options)` function provided by `usePath` (passed down as props). 
  - `navigate('/path')` for push.
  - `navigate('/path', { replace: true })` for redirect/replace.
- **Route Switch:** The `AppRoutes` component performs direct string matching or `.startsWith()` checks on the `path` variable to render the appropriate page component.

### 3. Engineering Rules
- **Never import `react-router-dom`**: Use the internal `navigate` and `usePath` logic.
- **Never use `localStorage` or `sessionStorage`**: Authentication state is managed by Supabase and the `AuthContext`. All persistent settings should be handled via the backend or Supabase user metadata.
```

path of the file : `HANDOFF.md`

````
# ESFPP Auth + RBAC Handoff

## Architecture Overview

Frontend is a Vite React app in `frontend/src` using JSX, Tailwind CSS v4, Base UI/shadcn-style primitives, lucide icons, and a small internal route switch in `App.jsx`.

Backend is an Express API in `backend/server.js`. It validates Supabase bearer tokens for protected APIs and uses a server-only Supabase service role client for all admin operations including invitation link generation, account completion, and user management.

Supabase Auth is the identity source. RBAC is read from `auth.users.user_metadata.role` with either:

```json
{ "role": "admin" }
```

or:

```json
{ "role": "student" }
```

## Route Protection

Frontend:

- `RequireAuth` redirects unauthenticated users to `/login`.
- `RequireRole` redirects authenticated users to their own dashboard when they attempt to access another role's route.
- Admin routes: `/admin/dashboard`, `/admin/accounts`.
- Student route: `/student/dashboard`.
- Invitation completion route: `/complete-account`.

Backend RBAC:

- `/api/admin/*` endpoints require a valid Supabase access token and `role=admin`.
- `/api/complete-account` requires any valid access token (used by invited users completing their account).
- Students cannot access admin APIs even if they manually call the backend.

## Invitation Flow (Development-Friendly)

Invitations do **not** rely on Supabase email delivery. Instead, invitation links are generated server-side using the Supabase Admin API and returned directly to the admin.

### How It Works

1. **Admin creates an invitation** via the Accounts page (`/admin/accounts`).
2. **Backend** calls `supabaseAdmin.auth.admin.generateLink({ type: "invite", email, ... })`.
3. **Backend** creates a `profiles` row with `status = 'invited'` and the assigned `role`.
4. **Backend** returns the `action_link` (invitation URL) to the admin.
5. **Admin** copies the link and shares it with the user (email, chat, etc.).
6. **User** opens the link in their browser.
7. **Supabase** processes the invitation token and redirects to `/complete-account` with session tokens in the URL fragment.
8. **Frontend** Supabase client (`detectSessionInUrl: true`) picks up the session automatically.
9. **User** fills in their name and password.
10. **Frontend** calls `POST /api/complete-account` with `{ firstName, lastName, password }`.
11. **Backend** updates the auth user (password + metadata) via admin API and sets `profiles.status = 'active'`.
12. **User** is redirected to their role-appropriate dashboard.

### Link Regeneration

- Admins can regenerate a fresh invitation link for any user whose `profiles.status` is not `active` or `blocked`.
- Each regeneration creates a **new link**. Previously generated links are invalidated by Supabase.
- Regeneration is done via `POST /api/admin/invitations/:userId/regenerate`.

### Link Expiration

- Supabase invitation links have a default expiration (typically 24 hours, configurable in Supabase Auth settings).
- If a user opens an expired link, Supabase will not establish a session.
- The `/complete-account` page detects this (no user in auth context after loading) and shows a friendly error: *"Ce lien d'invitation n'est plus valide. Veuillez contacter un administrateur pour obtenir une nouvelle invitation."*
- The admin can then regenerate a fresh link.

### Invitation State Rules

| Current Status | Admin Action | Result |
|---------------|-------------|--------|
| `invited` | Generate / Regenerate link | ✅ Fresh link returned |
| `pending` | Generate / Regenerate link | ✅ Fresh link returned |
| `active` | Generate / Regenerate link | ❌ 409 — Account already activated |
| `blocked` | Generate / Regenerate link | ❌ 403 — Must unblock first |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Health check |
| `GET` | `/api/me` | Bearer token | Current user info |
| `GET` | `/api/admin/users` | Admin only | List all users with profile status |
| `POST` | `/api/admin/invitations` | Admin only | Create invitation, return link |
| `POST` | `/api/admin/invitations/:userId/regenerate` | Admin only | Regenerate invitation link |
| `POST` | `/api/complete-account` | Any authenticated | Complete account setup |

### POST /api/admin/invitations

Request:
```json
{ "email": "user@school.edu", "role": "student" }
```

Response (201):
```json
{
  "userId": "uuid",
  "email": "user@school.edu",
  "role": "student",
  "inviteLink": "https://your-project.supabase.co/auth/v1/verify?token=...",
  "status": "invited"
}
```

### POST /api/admin/invitations/:userId/regenerate

Response (200):
```json
{ "inviteLink": "https://your-project.supabase.co/auth/v1/verify?token=..." }
```

### POST /api/complete-account

Request:
```json
{ "firstName": "Jane", "lastName": "Doe", "password": "securepassword" }
```

Response (200):
```json
{ "message": "Account activated", "role": "student" }
```

## Database

### profiles table

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  status text not null default 'invited'
    check (status in ('invited', 'pending', 'active', 'blocked')),
  role text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Trigger: `profiles_set_updated_at` — automatically sets `updated_at = now()` on every row update.

RLS policies:
- Users can select/insert/update their own `profiles` row.
- Admins can read and manage all `profiles` rows.

### Status Source of Truth

`profiles.status` is the **single source of truth** for user status. The backend reads this column directly when listing users and when validating account completion. Status is never derived from Supabase auth metadata fields.

## Security

- `SUPABASE_SERVICE_ROLE_KEY` is **backend-only**. Never exposed in any `VITE_*` variable.
- All invitation link generation and account activation use the service role client on the backend.
- The frontend **never** writes `profiles.status` directly. All status changes go through `POST /api/complete-account` on the backend, which validates the current status before making changes.
- The frontend **never** calls `supabase.auth.updateUser()` for password changes. Password updates go through the backend admin API.
- All `/api/admin/*` endpoints are protected by the middleware chain: `requireServiceRole → requireAuth → requireRole("admin")`.

## Environment Variables

Frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3001
```

Backend:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_URL=http://localhost:5173
PORT=3001
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code or any `VITE_*` variable.

## First Admin Bootstrap

After applying database migrations, create the first admin:

1. Set these values in `backend/.env`:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Admin
```

2. Run:

```bash
cd backend
npm run create-admin
```

The script creates a confirmed Supabase Auth user with `user_metadata.role = "admin"` and creates the matching active `public.profiles` row.

## Migrations

Apply in order:

1. `supabase/migrations/20260609_auth_rbac_profiles.sql` — Creates `profiles` table, RLS policies, `auth_role()` function.
2. `supabase/migrations/20260609_auth_rbac_profiles_allow_pending.sql` — Adds `pending` to status check constraint.
3. `supabase/migrations/20260610_fix_profiles_updated_at.sql` — Adds missing `updated_at` column, recreates trigger.

## Supabase Dashboard Configuration

1. Auth → URL Configuration:
   - Site URL: your deployed frontend URL.
   - Additional Redirect URLs:
     - `http://localhost:5173/complete-account`
     - Production `/complete-account` URL.
2. Auth → Providers:
   - Enable email auth.
3. Auth → Users:
   - Ensure manually created users have `user_metadata.role` set.
4. RLS:
   - Confirm RLS is enabled on `profiles`.
   - Confirm migration policies exist.

## File Map

```
backend/
  server.js              — Express API: auth middleware, invitation generation,
                           account completion, user listing
  scripts/create-admin.js — Bootstrap script for first admin
  .env                   — Backend env vars (service role key here)

frontend/src/
  App.jsx                — Route switch
  supabaseClient.js      — Anon Supabase client
  contexts/
    auth-context.jsx     — Session management, role extraction
  lib/
    api.js               — Bearer-token fetch wrapper
    auth.js              — getUserRole, getDashboardPath
    utils.js             — cn() helper
  pages/
    account-management.jsx — Admin: create invitations, list users, regenerate links
    admin-dashboard.jsx    — Admin dashboard
    student-dashboard.jsx  — Student dashboard
    complete-account.jsx   — Invited user sets password + profile
  components/
    auth/
      auth-layout.jsx    — Split-screen auth layout
      brand-panel.jsx    — Branded left panel
      password-input.jsx — Password field with toggle
      route-guards.jsx   — RequireAuth, RequireRole
      sign-in-form.jsx   — Login form
    layout/
      dashboard-shell.jsx — Sidebar + header shell
    ui/
      button.jsx, input.jsx, label.jsx, checkbox.jsx

supabase/migrations/
  20260609_auth_rbac_profiles.sql
  20260609_auth_rbac_profiles_allow_pending.sql
  20260610_fix_profiles_updated_at.sql
```

## Deployment Checklist

1. Apply all SQL migrations in order.
2. Configure backend env vars with service role key.
3. Configure frontend env vars with only URL, anon key, and API URL.
4. Configure Supabase Auth redirect URLs.
5. Deploy backend.
6. Deploy frontend.
7. Create first admin via `npm run create-admin`.
8. Log in as admin, create a test student invitation.
9. Open the invitation link, complete the account.
10. Verify student cannot open `/admin/dashboard` or call `/api/admin/users`.
11. Verify expired links show the friendly error screen.
````

path of the file : `README.md`

```
��#   E S F P P _ D a s h b o a r d 
 
 
```

path of the file : `TECHNOLOGY_GUIDE.md`

````
# ESFPP Dashboard - Technology Stack & Learning Guide

## Project Overview
The ESFPP Dashboard is a full-stack web application for managing educational logigrammes (structured training flowcharts), academic years, training programs (filières), and student completion tracking. It's designed to support multiple training programs with role-based access control.

---

## Technology Stack

### 1. **Frontend - React 19 + Vite**
**Purpose:** Interactive user interface and real-time UI updates

**Key Libraries:**
- **React 19** - Component-based UI framework
- **Vite 6** - Fast build tool and dev server (replaces Webpack)
- **Tailwind CSS 4** - Utility-first CSS framework for styling
- **React Router** (implied) - Page navigation and routing
- **@supabase/supabase-js** - Client library for database queries

**Supporting Libraries:**
- **shadcn/ui** - Pre-built accessible UI components
- **Lucide React** - Icon library
- **SweetAlert2** - User-friendly alert dialogs
- **class-variance-authority** - Component styling variants
- **clsx & tailwind-merge** - CSS class utilities

### 2. **Backend - Node.js + Express 5**
**Purpose:** API server, request routing, authentication, and data validation

**Key Libraries:**
- **Express.js 5** - Web framework for HTTP routing and middleware
- **@supabase/supabase-js** - Server-side Supabase SDK
- **CORS** - Cross-Origin Resource Sharing for secure frontend-backend communication
- **Multer** - File upload handling (for Excel imports)
- **WebSocket (ws)** - Real-time communication with frontend
- **dotenv** - Environment variable management

**Architecture:**
- Modular route organization (`routes/` folder)
- Middleware for authentication and authorization
- Admin, teacher, and student role-based access control

### 3. **Database - Supabase (PostgreSQL)**
**Purpose:** Data persistence with built-in authentication and real-time capabilities

**Key Features:**
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Database-level access control
- **Authentication** - Built-in user management with JWT tokens
- **Real-time Subscriptions** - WebSocket-based updates

**Schema Includes:**
- `academic_years` - School year periods (2025-2026)
- `filieres` - Training programs (AS, REA, IA, IP, RADIO)
- `classes` - Class sections within programs
- `logigrammes` - Training flowcharts/schedules
- `profiles` - User role management
- `completion_tracking` - Student progress tracking

### 4. **Styling - Tailwind CSS 4**
**Purpose:** Rapid UI development with consistent design system

**Tools:**
- **PostCSS** - CSS preprocessing
- **Autoprefixer** - Browser compatibility for CSS
- **Tailwind Oxide** - High-performance Tailwind compiler

### 5. **Data Processing - Python**
**Purpose:** Excel file parsing and data transformation

**Scripts:**
- `parse_xls.py` - Parse Excel workbooks
- `xls_stats.py` - Generate import statistics

---

## Essential Technologies to Master

### **For Frontend Developers** (Priority Order)

1. **React 19** ⭐⭐⭐⭐⭐ (CRITICAL)
   - **Learn:** Component lifecycle, hooks (useState, useContext, useEffect), context API
   - **Why:** All UI logic and state management depends on this
   - **Time:** 2-3 weeks
   - **Key files:** `src/components/`, `src/contexts/`

2. **Vite** ⭐⭐⭐⭐
   - **Learn:** Module bundling, hot module replacement (HMR), build optimization
   - **Why:** Understanding the dev environment is crucial for debugging and performance
   - **Time:** 1 week
   - **Key file:** `vite.config.js`

3. **Tailwind CSS 4** ⭐⭐⭐⭐
   - **Learn:** Utility-first CSS, responsive design, component composition
   - **Why:** All styling is Tailwind-based; understanding utilities saves development time
   - **Time:** 1 week
   - **Key file:** `tailwind.config.js`

4. **Supabase Client SDK** ⭐⭐⭐⭐
   - **Learn:** Database queries, real-time subscriptions, authentication
   - **Why:** Direct database communication from frontend
   - **Time:** 1-2 weeks
   - **Key files:** `src/lib/api.js`, `src/supabaseClient.js`

5. **shadcn/ui Component Library** ⭐⭐⭐
   - **Learn:** Pre-built component patterns and customization
   - **Why:** Accelerates UI development with accessible, tested components
   - **Time:** 3-5 days
   - **Key files:** `src/components/ui/`

---

### **For Backend Developers** (Priority Order)

1. **Express.js 5** ⭐⭐⭐⭐⭐ (CRITICAL)
   - **Learn:** Routing, middleware, error handling, request/response cycle
   - **Why:** Core framework for all API endpoints
   - **Time:** 2-3 weeks
   - **Key files:** `server.js`, `routes/`

2. **Supabase & PostgreSQL** ⭐⭐⭐⭐⭐ (CRITICAL)
   - **Learn:** SQL queries, transactions, Row Level Security (RLS), database schema
   - **Why:** All data persistence and business logic depends on this
   - **Time:** 3-4 weeks
   - **Key files:** `supabase/migrations/`, `lib/supabase.js`

3. **Authentication & Authorization** ⭐⭐⭐⭐⭐ (CRITICAL)
   - **Learn:** JWT tokens, role-based access control (RBAC), middleware
   - **Why:** The app has multiple roles (admin, teacher, student) with different permissions
   - **Time:** 2-3 weeks
   - **Key files:** `lib/auth.js`

4. **CORS & HTTP Headers** ⭐⭐⭐⭐
   - **Learn:** Cross-origin policies, credential handling, security headers
   - **Why:** Essential for frontend-backend communication
   - **Time:** 3-5 days
   - **Key file:** `server.js` (CORS configuration)

5. **File Upload Handling (Multer)** ⭐⭐⭐
   - **Learn:** Form data parsing, file validation, stream handling
   - **Why:** Excel file imports are core to the application
   - **Time:** 1 week
   - **Key files:** `routes/`, `scripts/import-xls.js`

6. **WebSockets (ws)** ⭐⭐⭐
   - **Learn:** Real-time bidirectional communication
   - **Why:** For real-time updates in the dashboard
   - **Time:** 1 week

---

### **For Full-Stack Developers** (Beyond Both Sides)

1. **SQL & Database Design** ⭐⭐⭐⭐⭐
   - **Learn:** Normalization, indexing, query optimization, migrations
   - **Why:** Critical for performance and data integrity
   - **Time:** 3-4 weeks
   - **Key files:** `supabase/migrations/`

2. **Environment Management (.env)** ⭐⭐⭐⭐
   - **Learn:** Configuration management, secrets handling, environment-specific setups
   - **Why:** Different configurations for dev, staging, production
   - **Time:** 3-5 days

3. **Git & Version Control** ⭐⭐⭐⭐
   - **Learn:** Branching strategies, collaborative workflows, conflict resolution
   - **Why:** Essential for team development
   - **Time:** 1-2 weeks

4. **Excel/XLS Processing** ⭐⭐⭐
   - **Learn:** Python data processing, file parsing libraries
   - **Why:** Import functionality uses Python scripts
   - **Time:** 1 week
   - **Key files:** `scripts/parse_xls.py`, `scripts/import-xls.js`

---

## Quick Start Learning Path

### Week 1-2: Foundation
- [ ] React basics and hooks
- [ ] Express.js routing and middleware
- [ ] Supabase setup and authentication

### Week 3-4: Core Features
- [ ] Database schema and RLS policies
- [ ] Frontend component architecture
- [ ] API endpoint development

### Week 5-6: Advanced Features
- [ ] Real-time updates (WebSockets)
- [ ] File uploads and processing
- [ ] Role-based access control implementation

---

## Key Project Patterns

### Frontend Patterns
- **Context API** for global state (auth, logigramme data)
- **Custom Hooks** for reusable logic (useLogigramme)
- **Component Composition** with shadcn/ui

### Backend Patterns
- **Middleware Stack** for authentication/authorization
- **Modular Routes** for feature organization
- **Service Layer** abstraction (supabase calls)

### Database Patterns
- **Row Level Security (RLS)** for multi-tenancy
- **Migrations** for schema versioning
- **Triggers** for audit trails (created_at, updated_at)

---

## Resources by Technology

| Technology | Official Docs | Time to Learn |
|------------|---------------|--------------|
| React 19 | https://react.dev | 2-3 weeks |
| Vite | https://vite.dev | 1 week |
| Express.js | https://expressjs.com | 2-3 weeks |
| Tailwind CSS | https://tailwindcss.com | 1 week |
| Supabase | https://supabase.io/docs | 2-3 weeks |
| PostgreSQL | https://www.postgresql.org/docs/ | 2-3 weeks |
| shadcn/ui | https://ui.shadcn.com | 3-5 days |

---

## Development Workflow

1. **Clone & Setup**
   ```bash
   npm install  # Frontend
   npm install  # Backend
   ```

2. **Start Development**
   ```bash
   # Terminal 1: Frontend (http://localhost:5173)
   npm run dev
   
   # Terminal 2: Backend (http://localhost:3000)
   npm start
   ```

3. **Database Migrations**
   - Run via Supabase Dashboard or CLI
   - Track in `supabase/migrations/`

---

## Critical Success Factors

1. **Understand Authentication Flow**
   - Frontend → Backend → Supabase JWT
   - Role-based access decisions at each level

2. **Master Async/Await**
   - All database and API calls are async
   - Proper error handling is crucial

3. **Learn SQL Basics**
   - RLS policies are SQL-based
   - Query optimization matters

4. **Understand CORS & Security**
   - Frontend and backend must be properly configured
   - Credentials and headers are important

5. **Version Your Migrations**
   - Never modify old migrations; create new ones
   - Track schema changes systematically
````

path of the file : `backend/lib/auth.js`

```
import { supabase } from './supabase.js';

export function getRole(user) {
  return user?.user_metadata?.role === 'admin' ? 'admin' : 'student';
}

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  req.user = data.user;
  req.role = getRole(data.user);
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export function requireServiceRole(req, res, next) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY' });
  }
  next();
}
```

path of the file : `backend/lib/supabase.js`

```
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import ws from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: { 'x-my-custom-header': 'my-app-name' },
  },
  realtime: {
    transport: ws,
  },
});

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: ws,
  },
});
```

path of the file : `backend/package-lock.json`

```
{
  "name": "backend",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "backend",
      "version": "1.0.0",
      "license": "ISC",
      "dependencies": {
        "@supabase/supabase-js": "^2.108.1",
        "cors": "^2.8.6",
        "dotenv": "^17.4.2",
        "express": "^5.2.1",
        "multer": "^2.1.1",
        "ws": "^8.21.0"
      }
    },
    "node_modules/@supabase/auth-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/auth-js/-/auth-js-2.108.1.tgz",
      "integrity": "sha512-Lle5rKU8f9LF3K5dDd8Or8mkkG+ptzRZZWKPVMm9B9UuovH65Ss2+iFnQqRsCqaGouvJEcTWyl0cj2riNrrDLQ==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/functions-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/functions-js/-/functions-js-2.108.1.tgz",
      "integrity": "sha512-fxBRW/A4IG7ADQztVt0NaEy5ysiO1WJ2pbldsnBchrkHuyepX0Krek9qA9T4gUQBVVTCE9Ea4pdsM5hfn3nc4A==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/phoenix": {
      "version": "0.4.2",
      "resolved": "https://registry.npmjs.org/@supabase/phoenix/-/phoenix-0.4.2.tgz",
      "integrity": "sha512-YSAGnmDAfuleFCVt3CeurQZAhxRfXWeZIIkwp7NhYzQ1UwW6ePSnzsFAiUm/mbCkfoCf70QQHKW/K6RKh52a4A==",
      "license": "MIT"
    },
    "node_modules/@supabase/postgrest-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/postgrest-js/-/postgrest-js-2.108.1.tgz",
      "integrity": "sha512-9lj2MCPPMgSTaJ5y+amnhb3TWPtMFVlbDn2hmX/VV91xQU4j0AauwfMaBErHBJ+zzsSwjc0jLU+zLIZFLQzfig==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/realtime-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/realtime-js/-/realtime-js-2.108.1.tgz",
      "integrity": "sha512-mHGGqOjwd1XTydcoffUqEMsbFQHUi6A3uhQ0EXr3iqzpLqItxKA9nbN6gIQxrZ7JRRnuUe/iOFPUkYV9Tdc5lg==",
      "license": "MIT",
      "dependencies": {
        "@supabase/phoenix": "^0.4.2",
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/storage-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/storage-js/-/storage-js-2.108.1.tgz",
      "integrity": "sha512-Er0SGGt85iT6ye+SSh98Az6L2CesoZJuyzEZYH2oBOAnIxa9Nn4CtwUC3veGxYggoT56X+3tVuuQeDBP8kR8sg==",
      "license": "MIT",
      "dependencies": {
        "iceberg-js": "^0.8.1",
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/supabase-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.108.1.tgz",
      "integrity": "sha512-V/1hRKLSCJ0zEL+9QFRBUtivvePfOsaAYQmC0HhFNSHC2F3xFs4jSF3YhkLmzex6E4V4FGvmBDOP72D/53NnZA==",
      "license": "MIT",
      "dependencies": {
        "@supabase/auth-js": "2.108.1",
        "@supabase/functions-js": "2.108.1",
        "@supabase/postgrest-js": "2.108.1",
        "@supabase/realtime-js": "2.108.1",
        "@supabase/storage-js": "2.108.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/accepts": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-2.0.0.tgz",
      "integrity": "sha512-5cvg6CtKwfgdmVqY1WIiXKc3Q1bkRqGLi+2W/6ao+6Y7gu/RCwRuAhGEzh5B4KlszSuTLgZYuqFqo5bImjNKng==",
      "license": "MIT",
      "dependencies": {
        "mime-types": "^3.0.0",
        "negotiator": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/append-field": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/append-field/-/append-field-1.0.0.tgz",
      "integrity": "sha512-klpgFSWLW1ZEs8svjfb7g4qWY0YS5imI82dTg+QahUvJ8YqAY0P10Uk8tTyh9ZGuYEZEMaeJYCF5BFuX552hsw==",
      "license": "MIT"
    },
    "node_modules/body-parser": {
      "version": "2.2.2",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-2.2.2.tgz",
      "integrity": "sha512-oP5VkATKlNwcgvxi0vM0p/D3n2C3EReYVX+DNYs5TjZFn/oQt2j+4sVJtSMr18pdRr8wjTcBl6LoV+FUwzPmNA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "^3.1.2",
        "content-type": "^1.0.5",
        "debug": "^4.4.3",
        "http-errors": "^2.0.0",
        "iconv-lite": "^0.7.0",
        "on-finished": "^2.4.1",
        "qs": "^6.14.1",
        "raw-body": "^3.0.1",
        "type-is": "^2.0.1"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/buffer-from": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/buffer-from/-/buffer-from-1.1.2.tgz",
      "integrity": "sha512-E+XQCRwSbaaiChtv6k6Dwgc+bx+Bs6vuKJHHl5kox/BaKbhiXzqQOwK4cO22yElGp2OCmjwVhT3HmxgyPGnJfQ==",
      "license": "MIT"
    },
    "node_modules/busboy": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/busboy/-/busboy-1.6.0.tgz",
      "integrity": "sha512-8SFQbg/0hQ9xy3UNTB0YEnsNBbWfhf7RtnzpL7TkBiTBRfrQ9Fxcnz7VJsleJpyp6rVLvXiuORqjlHi5q+PYuA==",
      "dependencies": {
        "streamsearch": "^1.1.0"
      },
      "engines": {
        "node": ">=10.16.0"
      }
    },
    "node_modules/bytes": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/bytes/-/bytes-3.1.2.tgz",
      "integrity": "sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/call-bound": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "get-intrinsic": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/concat-stream": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/concat-stream/-/concat-stream-2.0.0.tgz",
      "integrity": "sha512-MWufYdFw53ccGjCA+Ol7XJYpAlW6/prSMzuPOTRnJGcGzuhLn4Scrz7qf6o8bROZ514ltazcIFJZevcfbo0x7A==",
      "engines": [
        "node >= 6.0"
      ],
      "license": "MIT",
      "dependencies": {
        "buffer-from": "^1.0.0",
        "inherits": "^2.0.3",
        "readable-stream": "^3.0.2",
        "typedarray": "^0.0.6"
      }
    },
    "node_modules/content-disposition": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/content-disposition/-/content-disposition-1.1.0.tgz",
      "integrity": "sha512-5jRCH9Z/+DRP7rkvY83B+yGIGX96OYdJmzngqnw2SBSxqCFPd0w2km3s5iawpGX8krnwSGmF0FW5Nhr0Hfai3g==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/content-type": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/content-type/-/content-type-1.0.5.tgz",
      "integrity": "sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-0.7.2.tgz",
      "integrity": "sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie-signature": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/cookie-signature/-/cookie-signature-1.2.2.tgz",
      "integrity": "sha512-D76uU73ulSXrD1UXF4KE2TMxVVwhsnCgfAyTg9k8P6KGZjlXKrOLe4dJQKI3Bxi5wjesZoFXJWElNWBjPZMbhg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.6.0"
      }
    },
    "node_modules/cors": {
      "version": "2.8.6",
      "resolved": "https://registry.npmjs.org/cors/-/cors-2.8.6.tgz",
      "integrity": "sha512-tJtZBBHA6vjIAaF6EnIaq6laBBP9aq/Y3ouVJjEfoHbRBcHBAHYcMh/w8LDrk2PvIMMq8gmopa5D4V8RmbrxGw==",
      "license": "MIT",
      "dependencies": {
        "object-assign": "^4",
        "vary": "^1"
      },
      "engines": {
        "node": ">= 0.10"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/depd": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/depd/-/depd-2.0.0.tgz",
      "integrity": "sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/dotenv": {
      "version": "17.4.2",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-17.4.2.tgz",
      "integrity": "sha512-nI4U3TottKAcAD9LLud4Cb7b2QztQMUEfHbvhTH09bqXTxnSie8WnjPALV/WMCrJZ6UV/qHJ6L03OqO3LcdYZw==",
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/ee-first": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/ee-first/-/ee-first-1.1.1.tgz",
      "integrity": "sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==",
      "license": "MIT"
    },
    "node_modules/encodeurl": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-2.0.0.tgz",
      "integrity": "sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.2.tgz",
      "integrity": "sha512-HWcBoN6NileqtSydK2FqHbS/LoDd2pqrnQHLyJzBj4kOp/ky2MWMN694xOfkK8/SnUsW2DH7EfyVlydKCsm1Zw==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/escape-html": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/escape-html/-/escape-html-1.0.3.tgz",
      "integrity": "sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==",
      "license": "MIT"
    },
    "node_modules/etag": {
      "version": "1.8.1",
      "resolved": "https://registry.npmjs.org/etag/-/etag-1.8.1.tgz",
      "integrity": "sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/express": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/express/-/express-5.2.1.tgz",
      "integrity": "sha512-hIS4idWWai69NezIdRt2xFVofaF4j+6INOpJlVOLDO8zXGpUVEVzIYk12UUi2JzjEzWL3IOAxcTubgz9Po0yXw==",
      "license": "MIT",
      "dependencies": {
        "accepts": "^2.0.0",
        "body-parser": "^2.2.1",
        "content-disposition": "^1.0.0",
        "content-type": "^1.0.5",
        "cookie": "^0.7.1",
        "cookie-signature": "^1.2.1",
        "debug": "^4.4.0",
        "depd": "^2.0.0",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "etag": "^1.8.1",
        "finalhandler": "^2.1.0",
        "fresh": "^2.0.0",
        "http-errors": "^2.0.0",
        "merge-descriptors": "^2.0.0",
        "mime-types": "^3.0.0",
        "on-finished": "^2.4.1",
        "once": "^1.4.0",
        "parseurl": "^1.3.3",
        "proxy-addr": "^2.0.7",
        "qs": "^6.14.0",
        "range-parser": "^1.2.1",
        "router": "^2.2.0",
        "send": "^1.1.0",
        "serve-static": "^2.2.0",
        "statuses": "^2.0.1",
        "type-is": "^2.0.1",
        "vary": "^1.1.2"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/finalhandler": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/finalhandler/-/finalhandler-2.1.1.tgz",
      "integrity": "sha512-S8KoZgRZN+a5rNwqTxlZZePjT/4cnm0ROV70LedRHZ0p8u9fRID0hJUZQpkKLzro8LfmC8sx23bY6tVNxv8pQA==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.0",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "on-finished": "^2.4.1",
        "parseurl": "^1.3.3",
        "statuses": "^2.0.1"
      },
      "engines": {
        "node": ">= 18.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/forwarded": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/forwarded/-/forwarded-0.2.0.tgz",
      "integrity": "sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fresh": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/fresh/-/fresh-2.0.0.tgz",
      "integrity": "sha512-Rx/WycZ60HOaqLKAi6cHRKKI7zxWbJ31MhntmtwMoaTeF7XFH9hhBp8vITaMidfljRQ6eYWCKkaTK+ykVJHP2A==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.4.tgz",
      "integrity": "sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A==",
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/http-errors": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/http-errors/-/http-errors-2.0.1.tgz",
      "integrity": "sha512-4FbRdAX+bSdmo4AUFuS0WNiPz8NgFt+r8ThgNWmlrjQjt1Q7ZR9+zTlce2859x4KSXrwIsaeTqDoKQmtP8pLmQ==",
      "license": "MIT",
      "dependencies": {
        "depd": "~2.0.0",
        "inherits": "~2.0.4",
        "setprototypeof": "~1.2.0",
        "statuses": "~2.0.2",
        "toidentifier": "~1.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/iceberg-js": {
      "version": "0.8.1",
      "resolved": "https://registry.npmjs.org/iceberg-js/-/iceberg-js-0.8.1.tgz",
      "integrity": "sha512-1dhVQZXhcHje7798IVM+xoo/1ZdVfzOMIc8/rgVSijRK38EDqOJoGula9N/8ZI5RD8QTxNQtK/Gozpr+qUqRRA==",
      "license": "MIT",
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/iconv-lite": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/iconv-lite/-/iconv-lite-0.7.2.tgz",
      "integrity": "sha512-im9DjEDQ55s9fL4EYzOAv0yMqmMBSZp6G0VvFyTMPKWxiSBHUj9NW/qqLmXUwXrrM7AvqSlTCfvqRb0cM8yYqw==",
      "license": "MIT",
      "dependencies": {
        "safer-buffer": ">= 2.1.2 < 3.0.0"
      },
      "engines": {
        "node": ">=0.10.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==",
      "license": "ISC"
    },
    "node_modules/ipaddr.js": {
      "version": "1.9.1",
      "resolved": "https://registry.npmjs.org/ipaddr.js/-/ipaddr.js-1.9.1.tgz",
      "integrity": "sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/is-promise": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/is-promise/-/is-promise-4.0.0.tgz",
      "integrity": "sha512-hvpoI6korhJMnej285dSg6nu1+e6uxs7zG3BYAm5byqDsgJNWwxzM6z6iZiAgQR4TJ30JmBTOwqZUw3WlyH3AQ==",
      "license": "MIT"
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/media-typer": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/media-typer/-/media-typer-1.1.0.tgz",
      "integrity": "sha512-aisnrDP4GNe06UcKFnV5bfMNPBUw4jsLGaWwWfnH3v02GnBuXX2MCVn5RbrWo0j3pczUilYblq7fQ7Nw2t5XKw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/merge-descriptors": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/merge-descriptors/-/merge-descriptors-2.0.0.tgz",
      "integrity": "sha512-Snk314V5ayFLhp3fkUREub6WtjBfPdCPY1Ln8/8munuLuiYhsABgBVWsozAG+MWMbVEvcdcpbi9R7ww22l9Q3g==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/mime-db": {
      "version": "1.54.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.54.0.tgz",
      "integrity": "sha512-aU5EJuIN2WDemCcAp2vFBfp/m4EAhWJnUNSSw0ixs7/kXbd6Pg64EmwJkNdFhB8aWt1sH2CTXrLxo/iAGV3oPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime-types": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-3.0.2.tgz",
      "integrity": "sha512-Lbgzdk0h4juoQ9fCKXW4by0UJqj+nOOrI9MJ1sSj4nI8aI2eo1qmvQEie4VD1glsS250n15LsWsYtCugiStS5A==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "^1.54.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "license": "MIT"
    },
    "node_modules/multer": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/multer/-/multer-2.1.1.tgz",
      "integrity": "sha512-mo+QTzKlx8R7E5ylSXxWzGoXoZbOsRMpyitcht8By2KHvMbf3tjwosZ/Mu/XYU6UuJ3VZnODIrak5ZrPiPyB6A==",
      "license": "MIT",
      "dependencies": {
        "append-field": "^1.0.0",
        "busboy": "^1.6.0",
        "concat-stream": "^2.0.0",
        "type-is": "^1.6.18"
      },
      "engines": {
        "node": ">= 10.16.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/multer/node_modules/media-typer": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/media-typer/-/media-typer-0.3.0.tgz",
      "integrity": "sha512-dq+qelQ9akHpcOl/gUVRTxVIOkAJ1wR3QAvb4RsVjS8oVoFjDGTc679wJYmUmknUF5HwMLOgb5O+a3KxfWapPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/multer/node_modules/mime-db": {
      "version": "1.52.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.52.0.tgz",
      "integrity": "sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/multer/node_modules/mime-types": {
      "version": "2.1.35",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-2.1.35.tgz",
      "integrity": "sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "1.52.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/multer/node_modules/type-is": {
      "version": "1.6.18",
      "resolved": "https://registry.npmjs.org/type-is/-/type-is-1.6.18.tgz",
      "integrity": "sha512-TkRKr9sUTxEH8MdfuCSP7VizJyzRNMjj2J2do2Jr3Kym598JVdEksuzPQCnlFPW4ky9Q+iA+ma9BGm06XQBy8g==",
      "license": "MIT",
      "dependencies": {
        "media-typer": "0.3.0",
        "mime-types": "~2.1.24"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/negotiator": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-1.0.0.tgz",
      "integrity": "sha512-8Ofs/AUQh8MaEcrlq5xOX0CQ9ypTF5dl78mjlMNfOK08fzpgTHQRQPBxcPlEtIw0yRpws+Zo/3r+5WRby7u3Gg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-inspect": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/object-inspect/-/object-inspect-1.13.4.tgz",
      "integrity": "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/on-finished": {
      "version": "2.4.1",
      "resolved": "https://registry.npmjs.org/on-finished/-/on-finished-2.4.1.tgz",
      "integrity": "sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==",
      "license": "MIT",
      "dependencies": {
        "ee-first": "1.1.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/once": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/once/-/once-1.4.0.tgz",
      "integrity": "sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==",
      "license": "ISC",
      "dependencies": {
        "wrappy": "1"
      }
    },
    "node_modules/parseurl": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/parseurl/-/parseurl-1.3.3.tgz",
      "integrity": "sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/path-to-regexp": {
      "version": "8.4.2",
      "resolved": "https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-8.4.2.tgz",
      "integrity": "sha512-qRcuIdP69NPm4qbACK+aDogI5CBDMi1jKe0ry5rSQJz8JVLsC7jV8XpiJjGRLLol3N+R5ihGYcrPLTno6pAdBA==",
      "license": "MIT",
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/proxy-addr": {
      "version": "2.0.7",
      "resolved": "https://registry.npmjs.org/proxy-addr/-/proxy-addr-2.0.7.tgz",
      "integrity": "sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==",
      "license": "MIT",
      "dependencies": {
        "forwarded": "0.2.0",
        "ipaddr.js": "1.9.1"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/qs": {
      "version": "6.15.2",
      "resolved": "https://registry.npmjs.org/qs/-/qs-6.15.2.tgz",
      "integrity": "sha512-Rzq0KEyX/w/tEybncDgdkZrJgVUsUMk3xjh3t5bv3S1HTAtg+uOYt72+ZfwiQwKdysThkTBdL/rTi6HDmX9Ddw==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">=0.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/range-parser": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/range-parser/-/range-parser-1.2.1.tgz",
      "integrity": "sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/raw-body": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/raw-body/-/raw-body-3.0.2.tgz",
      "integrity": "sha512-K5zQjDllxWkf7Z5xJdV0/B0WTNqx6vxG70zJE4N0kBs4LovmEYWJzQGxC9bS9RAKu3bgM40lrd5zoLJ12MQ5BA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "~3.1.2",
        "http-errors": "~2.0.1",
        "iconv-lite": "~0.7.0",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/readable-stream": {
      "version": "3.6.2",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-3.6.2.tgz",
      "integrity": "sha512-9u/sniCrY3D5WdsERHzHE4G2YCXqoG5FTHUiCC4SIbr6XcLZBY05ya9EKjYek9O5xOAwjGq+1JdGBAS7Q9ScoA==",
      "license": "MIT",
      "dependencies": {
        "inherits": "^2.0.3",
        "string_decoder": "^1.1.1",
        "util-deprecate": "^1.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/router": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/router/-/router-2.2.0.tgz",
      "integrity": "sha512-nLTrUKm2UyiL7rlhapu/Zl45FwNgkZGaCpZbIHajDYgwlJCOzLSk+cIPAnsEqV955GjILJnKbdQC1nVPz+gAYQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.0",
        "depd": "^2.0.0",
        "is-promise": "^4.0.0",
        "parseurl": "^1.3.3",
        "path-to-regexp": "^8.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/safer-buffer": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/safer-buffer/-/safer-buffer-2.1.2.tgz",
      "integrity": "sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==",
      "license": "MIT"
    },
    "node_modules/send": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/send/-/send-1.2.1.tgz",
      "integrity": "sha512-1gnZf7DFcoIcajTjTwjwuDjzuz4PPcY2StKPlsGAQ1+YH20IRVrBaXSWmdjowTJ6u8Rc01PoYOGHXfP1mYcZNQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.3",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "etag": "^1.8.1",
        "fresh": "^2.0.0",
        "http-errors": "^2.0.1",
        "mime-types": "^3.0.2",
        "ms": "^2.1.3",
        "on-finished": "^2.4.1",
        "range-parser": "^1.2.1",
        "statuses": "^2.0.2"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/serve-static": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/serve-static/-/serve-static-2.2.1.tgz",
      "integrity": "sha512-xRXBn0pPqQTVQiC8wyQrKs2MOlX24zQ0POGaj0kultvoOCstBQM5yvOhAVSUwOMjQtTvsPWoNCHfPGwaaQJhTw==",
      "license": "MIT",
      "dependencies": {
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "parseurl": "^1.3.3",
        "send": "^1.2.0"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/setprototypeof": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/setprototypeof/-/setprototypeof-1.2.0.tgz",
      "integrity": "sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==",
      "license": "ISC"
    },
    "node_modules/side-channel": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/side-channel/-/side-channel-1.1.1.tgz",
      "integrity": "sha512-6x6dK6zJdpTzF4sQeNYxwtvBzf6Eg4GtlesS94HOvTudUeyK2WXAaIfmDgsyslYrRBeFIlsi54AYsFGUuhmvrQ==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.4",
        "side-channel-list": "^1.0.1",
        "side-channel-map": "^1.0.1",
        "side-channel-weakmap": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-list": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-list/-/side-channel-list-1.0.1.tgz",
      "integrity": "sha512-mjn/0bi/oUURjc5Xl7IaWi/OJJJumuoJFQJfDDyO46+hBWsfaVM65TBHq2eoZBhzl9EchxOijpkbRC8SVBQU0w==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-map": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-map/-/side-channel-map-1.0.1.tgz",
      "integrity": "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-weakmap": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/side-channel-weakmap/-/side-channel-weakmap-1.0.2.tgz",
      "integrity": "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3",
        "side-channel-map": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/statuses": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.2.tgz",
      "integrity": "sha512-DvEy55V3DB7uknRo+4iOGT5fP1slR8wQohVdknigZPMpMstaKJQWhwiYBACJE3Ul2pTnATihhBYnRhZQHGBiRw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/streamsearch": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/streamsearch/-/streamsearch-1.1.0.tgz",
      "integrity": "sha512-Mcc5wHehp9aXz1ax6bZUyY5afg9u2rv5cqQI3mRrYkGC8rW2hM02jWuwjtL++LS5qinSyhj2QfLyNsuc+VsExg==",
      "engines": {
        "node": ">=10.0.0"
      }
    },
    "node_modules/string_decoder": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.3.0.tgz",
      "integrity": "sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==",
      "license": "MIT",
      "dependencies": {
        "safe-buffer": "~5.2.0"
      }
    },
    "node_modules/toidentifier": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/toidentifier/-/toidentifier-1.0.1.tgz",
      "integrity": "sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "license": "0BSD"
    },
    "node_modules/type-is": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/type-is/-/type-is-2.1.0.tgz",
      "integrity": "sha512-faYHw0anBbc/kWF3zFTEnxSFOAGUX9GFbOBthvDdLsIlEoWOFOtS0zgCiQYwIskL9iGXZL3kAXD8OoZ4GmMATA==",
      "license": "MIT",
      "dependencies": {
        "content-type": "^2.0.0",
        "media-typer": "^1.1.0",
        "mime-types": "^3.0.0"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/type-is/node_modules/content-type": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/content-type/-/content-type-2.0.0.tgz",
      "integrity": "sha512-j/O/d7GcZCyNl7/hwZAb606rzqkyvaDctLmckbxLzHvFBzTJHuGEdodATcP3yIRoDrLHkIATJuvzbFlp/ki2cQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/typedarray": {
      "version": "0.0.6",
      "resolved": "https://registry.npmjs.org/typedarray/-/typedarray-0.0.6.tgz",
      "integrity": "sha512-/aCDEGatGvZ2BIk+HmLf4ifCJFwvKFNb9/JeZPMulfgFracn9QFcAf5GO8B/mweUjSoblS5In0cWhqpfs/5PQA==",
      "license": "MIT"
    },
    "node_modules/unpipe": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/unpipe/-/unpipe-1.0.0.tgz",
      "integrity": "sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "license": "MIT"
    },
    "node_modules/vary": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/vary/-/vary-1.1.2.tgz",
      "integrity": "sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/wrappy": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/wrappy/-/wrappy-1.0.2.tgz",
      "integrity": "sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ==",
      "license": "ISC"
    },
    "node_modules/ws": {
      "version": "8.21.0",
      "resolved": "https://registry.npmjs.org/ws/-/ws-8.21.0.tgz",
      "integrity": "sha512-Vsp28b7DRcimFQvrqu2Wek3z1iYxDCWqHYB8Qsnk/S4RfaCQzPGPyBNuVjJV3cd6UiKtUtp6sNM77gWvzcCH+g==",
      "license": "MIT",
      "engines": {
        "node": ">=10.0.0"
      },
      "peerDependencies": {
        "bufferutil": "^4.0.1",
        "utf-8-validate": ">=5.0.2"
      },
      "peerDependenciesMeta": {
        "bufferutil": {
          "optional": true
        },
        "utf-8-validate": {
          "optional": true
        }
      }
    }
  }
}
```

path of the file : `backend/package.json`

```
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "create-admin": "node scripts/create-admin.js",
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@supabase/supabase-js": "^2.108.1",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "multer": "^2.1.1",
    "ws": "^8.21.0"
  }
}
```

path of the file : `backend/routes/academic-years.js`

```
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// GET /api/years
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/years
router.post('/', async (req, res) => {
  const { label, start_date, clone_from_year_id } = req.body;

  try {
    // 1. Calculate end date (roughly 1 year minus 1 day)
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(startDateObj);
    endDateObj.setFullYear(endDateObj.getFullYear() + 1);
    endDateObj.setDate(endDateObj.getDate() - 1);
    const end_date = endDateObj.toISOString().split('T')[0];

    // 2. Create Academic Year
    const { data: newYear, error: yearError } = await supabaseAdmin
      .from('academic_years')
      .insert({ label, start_date, end_date })
      .select()
      .single();

    if (yearError) throw yearError;

    // 3. Generate year_weeks
    const weeks = [];
    let currentMonday = new Date(start_date);
    // Adjust to nearest Monday if not already
    const day = currentMonday.getDay();
    const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
    currentMonday.setDate(diff);

    for (let i = 1; i <= 52; i++) {
        const weekDate = currentMonday.toISOString().split('T')[0];
        const mois = currentMonday.toLocaleString('fr-FR', { month: 'long' });
        weeks.push({
            academic_year_id: newYear.id,
            semaine: i,
            week_start_date: weekDate,
            mois: mois.charAt(0).toUpperCase() + mois.slice(1),
            semestre: i <= 26 ? 1 : 2
        });
        currentMonday.setDate(currentMonday.getDate() + 7);
    }
    
    await supabaseAdmin.from('year_weeks').insert(weeks);
    const dateMap = Object.fromEntries(weeks.map(w => [w.semaine, w.week_start_date]));

    // 4. Clone from year if requested
    if (clone_from_year_id) {
        console.log(`Cloning from ${clone_from_year_id} to ${newYear.id}...`);
        
        // a. Fetch source logigrammes
        const { data: srcLogs } = await supabaseAdmin
            .from('logigrammes')
            .select('*')
            .eq('academic_year_id', clone_from_year_id);
        
        if (srcLogs && srcLogs.length > 0) {
            for (const sLog of srcLogs) {
                // i. Insert new logigramme
                const { data: nLog, error: nLogError } = await supabaseAdmin
                    .from('logigrammes')
                    .insert({
                        filiere_id: sLog.filiere_id,
                        classe_id: sLog.classe_id,
                        academic_year_id: newYear.id,
                        auto_complete: sLog.auto_complete
                    })
                    .select()
                    .single();
                
                if (nLogError) {
                    console.error(`Error cloning logigramme: ${nLogError.message}`);
                    continue;
                }

                // ii. Fetch and clone units
                const { data: srcUnites } = await supabaseAdmin
                    .from('unites_formation')
                    .select('*')
                    .eq('logigramme_id', sLog.id);
                
                if (srcUnites && srcUnites.length > 0) {
                    for (const sUnite of srcUnites) {
                        const { data: nUnite, error: nUniteError } = await supabaseAdmin
                            .from('unites_formation')
                            .insert({
                                logigramme_id: nLog.id,
                                ordre: sUnite.ordre,
                                nom: sUnite.nom,
                                formateur_id: sUnite.formateur_id,
                                vhg: sUnite.vhg
                            })
                            .select()
                            .single();
                        
                        if (nUniteError) {
                            console.error(`Error cloning unite: ${nUniteError.message}`);
                            continue;
                        }

                        // iii. Fetch and clone cells
                        const { data: srcCells } = await supabaseAdmin
                            .from('week_cells')
                            .select('*')
                            .eq('unite_id', sUnite.id);
                        
                        if (srcCells && srcCells.length > 0) {
                            const nCells = srcCells.map(c => ({
                                unite_id: nUnite.id,
                                semaine: c.semaine,
                                week_start_date: dateMap[c.semaine],
                                cell_type: c.cell_type,
                                heures: c.heures
                            })).filter(c => c.week_start_date); // Safety check

                            if (nCells.length > 0) {
                                const { error: nCellsError } = await supabaseAdmin
                                    .from('week_cells')
                                    .insert(nCells);
                                if (nCellsError) console.error(`Error cloning cells: ${nCellsError.message}`);
                            }
                        }
                    }
                }
            }
        }
        console.log(`Cloning completed for ${newYear.id}`);
    }

    res.status(201).json(newYear);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/years/:id/set-current
router.put('/:id/set-current', async (req, res) => {
    const { id } = req.params;
    try {
        // Supabase trigger or manual unsetting
        await supabaseAdmin.from('academic_years').update({ is_current: false }).neq('id', id);
        const { data, error } = await supabaseAdmin.from('academic_years').update({ is_current: true }).eq('id', id).select().single();
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/years/:id/weeks
router.get('/:id/weeks', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('year_weeks')
      .select('*')
      .eq('academic_year_id', id)
      .order('semaine');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

path of the file : `backend/routes/completion.js`

```
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// POST /api/completion/cell/:cell_id
router.post('/cell/:cell_id', async (req, res) => {
  const { cell_id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  try {
    const { data, error } = await supabaseAdmin
      .from('completions')
      .upsert({
        cell_id,
        status,
        updated_by: userId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'cell_id' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/completion/week
router.post('/week', async (req, res) => {
  const { logigramme_id, semaine, status } = req.body;
  const userId = req.user.id;

  try {
    // 1. Find all normal cells for this logigramme and week
    const { data: unites, error: unitesError } = await supabaseAdmin
      .from('unites_formation')
      .select('id')
      .eq('logigramme_id', logigramme_id);

    if (unitesError) throw unitesError;
    const uniteIds = (unites || []).map(u => u.id);

    if (uniteIds.length === 0) {
      return res.json({ updated: 0 });
    }

    const { data: cells, error: cellsError } = await supabaseAdmin
      .from('week_cells')
      .select('id')
      .eq('semaine', semaine)
      .eq('cell_type', 'normal')
      .in('unite_id', uniteIds);

    if (cellsError) throw cellsError;

    if (!cells || cells.length === 0) {
      return res.json({ updated: 0 });
    }

    const cellIds = cells.map(c => c.id);

    // 2. Upsert completions for these cells
    const completionInserts = cellIds.map(id => ({
      cell_id: id,
      status,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }));

    const { error: upsertError } = await supabaseAdmin
      .from('completions')
      .upsert(completionInserts, { onConflict: 'cell_id' });

    if (upsertError) throw upsertError;

    res.json({ updated: cellIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/completion/auto-sync/:logigramme_id
router.post('/auto-sync/:logigramme_id', async (req, res) => {
  const { logigramme_id } = req.params;
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Get cells that should be auto_done
    const { data: unites, error: unitesError } = await supabaseAdmin
      .from('unites_formation')
      .select('id')
      .eq('logigramme_id', logigramme_id);

    if (unitesError) throw unitesError;
    const uniteIds = (unites || []).map(u => u.id);

    if (uniteIds.length === 0) {
      return res.json({ updated: 0 });
    }

    const { data: cells, error: cellsError } = await supabaseAdmin
      .from('week_cells')
      .select('id')
      .lt('week_start_date', today)
      .eq('cell_type', 'normal')
      .in('unite_id', uniteIds);

    if (cellsError) throw cellsError;

    if (!cells || cells.length === 0) {
      return res.json({ updated: 0 });
    }

    const cellIds = cells.map(c => c.id);

    // 2. Filter out already 'done' manually (optional, but let's keep manual overrides)
    // For simplicity, let's just upsert 'auto_done'
    const completionInserts = cellIds.map(id => ({
      cell_id: id,
      status: 'auto_done',
      updated_at: new Date().toISOString()
    }));

    const { error: upsertError } = await supabaseAdmin
      .from('completions')
      .upsert(completionInserts, { onConflict: 'cell_id' });

    if (upsertError) throw upsertError;

    res.json({ updated: cellIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

path of the file : `backend/routes/filieres.js`

```
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// GET /api/filieres
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('filieres')
      .select('*, classes (*)')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/filieres
router.post('/', async (req, res) => {
  const { code, name, niveau, nb_annees } = req.body;

  try {
    // 1. Create Filière
    const { data: filiere, error: filError } = await supabaseAdmin
      .from('filieres')
      .insert({ code, name, niveau })
      .select()
      .single();

    if (filError) throw filError;

    // 2. Create Classes
    const classes = [];
    for (let i = 1; i <= nb_annees; i++) {
      classes.push({
        filiere_id: filiere.id,
        label: i === 1 ? '1ère année' : `${i}ème année`,
        annee: i
      });
    }

    const { error: clError } = await supabaseAdmin
      .from('classes')
      .insert(classes);

    if (clError) throw clError;

    res.status(201).json(filiere);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/filieres/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, niveau, code } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('filieres')
      .update({ name, niveau, code })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/filieres/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('filieres')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

path of the file : `backend/routes/formateurs.js`

```
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// GET /api/formateurs
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('formateurs')
      .select('*')
      .is('deleted_at', null)
      .order('nom');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/formateurs
router.post('/', async (req, res) => {
  const { nom, statut } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('formateurs')
      .insert({ nom, statut })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/formateurs/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, statut } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('formateurs')
      .update({ nom, statut })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/formateurs/:id (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('formateurs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/formateurs/replace
router.post('/replace', async (req, res) => {
  const { old_formateur_id, new_formateur_id, scope, logigramme_id } = req.body;

  try {
    let query = supabaseAdmin
      .from('unites_formation')
      .update({ formateur_id: new_formateur_id })
      .eq('formateur_id', old_formateur_id);

    if (scope === 'logigramme') {
      query = query.eq('logigramme_id', logigramme_id);
    }

    const { data, error, count } = await query.select();

    if (error) throw error;
    res.json({ updated_units: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/formateurs/:id/unites
router.get('/:id/unites', async (req, res) => {
  const { id } = req.params;
  const { filiere_id, classe_id, niveau_id } = req.query;

  try {
    // 1. Get all units for this formateur
    const { data: units, error: unitsError } = await supabaseAdmin
      .from('unites_formation')
      .select(`
        id,
        ordre,
        nom,
        vhg,
        formateur_id,
        formateur:formateurs (*),
        logigramme_id,
        logigramme:logigrammes (
          id,
          filiere_id,
          classe_id,
          filiere:filieres (code, name, niveau),
          classe:classes (label, annee)
        ),
        cells:week_cells (
          id,
          semaine,
          cell_type,
          heures,
          week_start_date,
          completion:completions (status)
        )
      `)
      .eq('formateur_id', id)
      .order('logigramme_id');

    if (unitsError) throw unitsError;

    // Debug: Log what we actually got
    if (units.length > 0) {
      console.log('[FormateursAPI] First unit structure:', JSON.stringify(units[0], null, 2));
    }

    // Apply client-side filtering based on query parameters
    let filteredUnits = units;
    
    console.log('[FormateursAPI] Filtering with params:', { filiere_id, classe_id, niveau_id });
    console.log('[FormateursAPI] Total units before filter:', units.length);

    if (niveau_id) {
      filteredUnits = filteredUnits.filter(u => {
        const match = u.logigramme?.filiere?.niveau === niveau_id;
        if (!match && units.length > 0) {
          console.log('[FormateursAPI] Unit niveau check:', {
            niveau_value: u.logigramme?.filiere?.niveau,
            niveau_id_param: niveau_id,
            match
          });
        }
        return match;
      });
      console.log('[FormateursAPI] After niveau filter:', filteredUnits.length);
    }
    if (filiere_id) {
      filteredUnits = filteredUnits.filter(u => {
        const match = String(u.logigramme?.filiere_id) === String(filiere_id);
        return match;
      });
      console.log('[FormateursAPI] After filiere filter:', filteredUnits.length);
    }
    if (classe_id) {
      filteredUnits = filteredUnits.filter(u => {
        const match = String(u.logigramme?.classe_id) === String(classe_id);
        return match;
      });
      console.log('[FormateursAPI] After classe filter:', filteredUnits.length);
    }

    console.log('[FormateursAPI] Final filtered units:', filteredUnits.length);

    // 2. Process units: flatten completion, compute vh_realise (same logic as logigrammes.js)
    const today = new Date().toISOString().split('T')[0];
    const processedUnits = filteredUnits.map(u => {
      const processedCells = u.cells.map(c => {
        let status = c.completion?.status || 'pending';
        if (status === 'pending') {
          if (c.week_start_date && c.week_start_date < today) {
            status = 'auto_done';
          }
        }
        return {
          ...c,
          completion_status: status
        };
      });
      const vh_realise = processedCells
        .filter(c => c.cell_type === 'normal' && (c.completion_status === 'done' || c.completion_status === 'auto_done'))
        .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);
      return {
        ...u,
        cells: processedCells,
        vh_realise,
        vh_restant: u.vhg - vh_realise,
        taux: u.vhg > 0 ? vh_realise / u.vhg : 0
      };
    });

    // Conflict Detection (Task E)
    // A conflict = same formateur has a normal cell with heures > 0 in the same semaine across 2+ logigrammes
    const conflictsMap = {}; // semaine -> [programmes]
    
    processedUnits.forEach(unit => {
      unit.cells.forEach(cell => {
        if (cell.cell_type === 'normal' && (parseFloat(cell.heures) || 0) > 0) {
          if (!conflictsMap[cell.semaine]) {
            conflictsMap[cell.semaine] = {
              semaine: cell.semaine,
              week_start_date: cell.week_start_date,
              programmes: []
            };
          }
          conflictsMap[cell.semaine].programmes.push({
            logigramme_id: unit.logigramme_id,
            label: `${unit.logigramme.filiere.name} — ${unit.logigramme.classe.label}`,
            unite_nom: unit.nom
          });
        }
      });
    });

    const conflicts = Object.values(conflictsMap).filter(c => c.programmes.length > 1);

    res.json({
      unites: processedUnits,
      conflicts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

path of the file : `backend/routes/logigrammes.js`

```
// backend/routes/logigrammes.js
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

const router = express.Router();

async function getYearWeekDateMap(academicYearId) {
  const { data, error } = await supabaseAdmin
    .from('year_weeks')
    .select('semaine, week_start_date')
    .eq('academic_year_id', academicYearId);

  if (error) throw error;

  return Object.fromEntries((data || []).map(w => [w.semaine, w.week_start_date]));
}

// Helper to get the current academic year ID
async function getCurrentYearId() {
  const { data, error } = await supabaseAdmin
    .from('academic_years')
    .select('id')
    .eq('is_current', true)
    .single();
  if (error || !data) return null;
  return data.id;
}

// GET /api/logigramme/kpis
router.get('/kpis', async (req, res) => {
  let { year_id, filiere_id, formateur_id } = req.query;

  try {
    if (!year_id) {
      const currentYearId = await getCurrentYearId();
      if (currentYearId) year_id = currentYearId;
    }

    // 1. Get Logigramme IDs
    let logQuery = supabaseAdmin.from('logigrammes').select('id');
    if (year_id) logQuery = logQuery.eq('academic_year_id', year_id);
    if (filiere_id) logQuery = logQuery.eq('filiere_id', filiere_id);

    const { data: logs, error: logsError } = await logQuery;
    if (logsError) throw logsError;

    const logIds = logs.map(l => l.id);
    if (logIds.length === 0) {
      return res.json({
        total_programmes: 0,
        total_heures: 0,
        total_formateurs: 0,
        taux_global: 0
      });
    }

    // 2. Get Unites and Cells
    let unitQuery = supabaseAdmin
      .from('unites_formation')
      .select(`
        id,
        vhg,
        logigramme_id,
        formateur_id,
        cells:week_cells (
          cell_type,
          heures,
          week_start_date,
          completion:completions (status)
        )
      `)
      .in('logigramme_id', logIds);

    if (formateur_id) unitQuery = unitQuery.eq('formateur_id', formateur_id);

    const { data: units, error: unitsError } = await unitQuery;
    if (unitsError) throw unitsError;

    // 3. Aggregate
    const uniqueLogIds = new Set();
    const uniqueFormateurIds = new Set();
    let totalVhg = 0;
    let totalRealise = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const unit of units) {
      uniqueLogIds.add(unit.logigramme_id);
      if (unit.formateur_id) uniqueFormateurIds.add(unit.formateur_id);
      totalVhg += (parseFloat(unit.vhg) || 0);

      const cells = unit.cells || [];
      for (const cell of cells) {
        if (cell.cell_type === 'normal') {
          let status = cell.completion?.status;
          if (!status || status === 'pending') {
            if (cell.week_start_date && cell.week_start_date < today) {
              status = 'auto_done';
            }
          }
          if (status === 'done' || status === 'auto_done') {
            totalRealise += (parseFloat(cell.heures) || 0);
          }
        }
      }
    }

    res.json({
      total_programmes: uniqueLogIds.size,
      total_heures: Math.round(totalVhg),
      total_formateurs: uniqueFormateurIds.size,
      taux_global: totalVhg > 0 ? totalRealise / totalVhg : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logigramme/list
router.get('/list', async (req, res) => {
  let { year_id, filiere_id, classe_id, formateur_id } = req.query;

  try {
    // Determine year
    if (!year_id) {
      const currentYearId = await getCurrentYearId();
      if (currentYearId) year_id = currentYearId;
    }

    // Build base query for logigrammes
    let query = supabaseAdmin
      .from('logigrammes')
      .select(`
        id,
        auto_complete,
        filiere:filieres (id, code, name, niveau),
        classe:classes (id, label, annee),
        academic_year:academic_years (id, label)
      `);

    if (year_id) query = query.eq('academic_year_id', year_id);
    if (filiere_id) query = query.eq('filiere_id', filiere_id);
    if (classe_id) query = query.eq('classe_id', classe_id);

    const { data: logigrammes, error: listError } = await query;
    if (listError) throw listError;

    if (!logigrammes || logigrammes.length === 0) {
      return res.json([]);
    }

    // If formateur filter is applied, filter logigrammes that have at least one unit with that formateur
    let filteredLogigrammes = logigrammes;
    if (formateur_id) {
      const logIds = logigrammes.map(l => l.id);
      const { data: units, error: unitsError } = await supabaseAdmin
        .from('unites_formation')
        .select('logigramme_id')
        .eq('formateur_id', formateur_id)
        .in('logigramme_id', logIds);
      if (unitsError) throw unitsError;
      const matchingLogIds = new Set(units.map(u => u.logigramme_id));
      filteredLogigrammes = logigrammes.filter(l => matchingLogIds.has(l.id));
    }

    // For each logigramme, compute aggregations
    const today = new Date().toISOString().split('T')[0];
    const enrichedLogigrammes = await Promise.all(filteredLogigrammes.map(async (log) => {
      // Get units for this logigramme
      const { data: units, error: unitsError } = await supabaseAdmin
        .from('unites_formation')
        .select(`
          id,
          vhg,
          cells:week_cells (
            id,
            cell_type,
            heures,
            week_start_date,
            completion:completions (status)
          )
        `)
        .eq('logigramme_id', log.id);

      if (unitsError) {
        console.error(unitsError);
        return { ...log, total_unites: 0, vhg_total: 0, vh_realise: 0, taux: 0 };
      }

      const total_unites = units.length;
      const vhg_total = units.reduce((sum, u) => sum + (u.vhg || 0), 0);

      let vh_realise = 0;
      for (const unit of units) {
        const cells = unit.cells || [];
        for (const cell of cells) {
          if (cell.cell_type === 'normal') {
            let status = cell.completion?.status;
            if (!status || status === 'pending') {
              if (cell.week_start_date && cell.week_start_date < today) {
                status = 'auto_done';
              }
            }
            if (status === 'done' || status === 'auto_done') {
              vh_realise += parseFloat(cell.heures) || 0;
            }
          }
        }
      }

      const taux = vhg_total > 0 ? vh_realise / vhg_total : 0;

      return {
        ...log,
        total_unites,
        vhg_total,
        vh_realise,
        taux
      };
    }));

    res.json(enrichedLogigrammes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logigramme/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch Logigramme Meta
    const { data: logigramme, error: logError } = await supabaseAdmin
      .from('logigrammes')
      .select(`
        id,
        auto_complete,
        filiere:filieres (*),
        classe:classes (*),
        academic_year:academic_years (*)
      `)
      .eq('id', id)
      .single();

    if (logError) throw logError;

    // 2. Fetch Weeks for this year
    const { data: weeks, error: weeksError } = await supabaseAdmin
      .from('year_weeks')
      .select('*')
      .eq('academic_year_id', logigramme.academic_year.id)
      .order('semaine');

    if (weeksError) throw weeksError;

    // 3. Fetch Unites and Cells (Sparse)
    const { data: unites, error: unitesError } = await supabaseAdmin
      .from('unites_formation')
      .select(`
        *,
        formateur:formateurs (*),
        cells:week_cells (
          id,
          semaine,
          cell_type,
          heures,
          week_start_date,
          completion:completions (status)
        )
      `)
      .eq('logigramme_id', id)
      .order('ordre');

    if (unitesError) throw unitesError;

    // Flatten completion status and add calculations
    const today = new Date().toISOString().split('T')[0];
    const processedUnites = unites.map(u => {
      const processedCells = u.cells.map(c => {
        let status = c.completion?.status || 'pending';
        if (status === 'pending') {
          if (c.week_start_date && c.week_start_date < today) {
            status = 'auto_done';
          }
        }
        return {
          ...c,
          completion_status: status
        };
      });

      const vh_realise = processedCells
        .filter(c => c.cell_type === 'normal' && (c.completion_status === 'done' || c.completion_status === 'auto_done'))
        .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);

      return {
        ...u,
        cells: processedCells,
        vh_realise,
        vh_restant: u.vhg - vh_realise,
        taux: u.vhg > 0 ? vh_realise / u.vhg : 0
      };
    });

    res.json({
      ...logigramme,
      weeks,
      unites: processedUnites
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/logigramme/:id/auto-complete
router.put('/:id/auto-complete', async (req, res) => {
  const { id } = req.params;
  const { auto_complete } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('logigrammes')
      .update({ auto_complete })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logigramme/cell — Create or update a single week_cell
router.post('/cell', async (req, res) => {
  const { unite_id, semaine, cell_type, heures } = req.body;

  if (!unite_id || !semaine) {
    return res.status(400).json({ error: 'unite_id et semaine sont requis.' });
  }

  try {
    // 1. Resolve academic_year_id via the unite's logigramme
    const { data: unite, error: uniteError } = await supabaseAdmin
      .from('unites_formation')
      .select('logigramme_id, logigramme:logigrammes (academic_year_id)')
      .eq('id', unite_id)
      .single();

    if (uniteError || !unite) {
      return res.status(404).json({ error: 'Unité introuvable.' });
    }

    const academicYearId = unite.logigramme.academic_year_id;

    // 2. Resolve week_start_date from year_weeks
    const { data: weekRow, error: weekError } = await supabaseAdmin
      .from('year_weeks')
      .select('week_start_date')
      .eq('academic_year_id', academicYearId)
      .eq('semaine', semaine)
      .single();

    if (weekError || !weekRow) {
      return res.status(404).json({ error: `Semaine ${semaine} introuvable pour cette année académique.` });
    }

    // 3. Upsert into week_cells
    const { data: cell, error: cellError } = await supabaseAdmin
      .from('week_cells')
      .upsert({
        unite_id,
        semaine,
        cell_type: cell_type || 'normal',
        heures: (Number.isFinite(Number(heures)) && Number(heures) > 0) ? Number(heures) : null,
        week_start_date: weekRow.week_start_date
      }, { onConflict: 'unite_id, semaine' })
      .select()
      .single();

    if (cellError) throw cellError;

    console.log(`[logigramme] Upserted cell: unite=${unite_id}, semaine=${semaine}, heures=${heures}`);
    res.json(cell);
  } catch (err) {
    console.error('[logigramme] Cell upsert error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logigramme/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: existing, error: findError } = await supabaseAdmin
      .from('logigrammes')
      .select('id, filiere:filieres(name), classe:classes(label)')
      .eq('id', id)
      .single();

    if (findError) throw findError;
    if (!existing) return res.status(404).json({ error: 'Logigramme introuvable.' });

    // CASCADE handles unites_formation → week_cells → completions automatically
    const { error: deleteError } = await supabaseAdmin
      .from('logigrammes')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    console.log(`[logigramme] Deleted logigramme ${id} (${existing.filiere?.name} — ${existing.classe?.label})`);
    res.status(200).json({ success: true, deleted: existing });
  } catch (err) {
    console.error('[logigramme] Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/logigramme/:id/unites — Batch update unités (nom, vhg, formateur_id)
router.put('/:id/unites', async (req, res) => {
  const { id } = req.params;
  const { unites } = req.body;

  if (!Array.isArray(unites) || unites.length === 0) {
    return res.status(400).json({ error: 'Le champ "unites" est requis (tableau non vide).' });
  }

  try {
    const { data: existing, error: findError } = await supabaseAdmin
      .from('logigrammes')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({ error: 'Logigramme introuvable.' });
    }

    const results = [];
    for (const unit of unites) {
      if (!unit.id) continue;

      const updatePayload = {};
      if (unit.nom !== undefined) updatePayload.nom = unit.nom;
      if (unit.vhg !== undefined) updatePayload.vhg = parseFloat(unit.vhg) || 0;
      if (unit.formateur_id !== undefined) updatePayload.formateur_id = unit.formateur_id || null;

      if (Object.keys(updatePayload).length === 0) continue;

      const { data, error } = await supabaseAdmin
        .from('unites_formation')
        .update(updatePayload)
        .eq('id', unit.id)
        .eq('logigramme_id', id)
        .select()
        .single();

      if (error) {
        console.error(`[logigramme] Error updating unité ${unit.id}:`, error.message);
      } else {
        // --- REDISTRIBUTION AUTOMATIQUE DU VHG ---
        if (unit.vhg !== undefined) {
          const newVhg = parseFloat(unit.vhg) || 0;
          
          const { data: existingCells, error: cellsError } = await supabaseAdmin
            .from('week_cells')
            .select('id, semaine')
            .eq('unite_id', unit.id)
            .eq('cell_type', 'normal');

          if (!cellsError && existingCells && existingCells.length > 0) {
            const numCells = existingCells.length;
            const baseHeures = Math.floor(newVhg / numCells);
            const remainder = newVhg % numCells;

            existingCells.sort((a, b) => a.semaine - b.semaine);

            for (let i = 0; i < numCells; i++) {
              const allocated = baseHeures + (i < remainder ? 1 : 0);
              await supabaseAdmin
                .from('week_cells')
                .update({ heures: allocated })
                .eq('id', existingCells[i].id);
            }
            console.log(`[logigramme] Redistributed ${newVhg}h across ${numCells} cells for unité ${unit.id}`);
          }
        }
        
        results.push(data);
      }
    }

    console.log(`[logigramme] Updated ${results.length}/${unites.length} unités for logigramme ${id}`);
    res.json({ success: true, updated: results.length });
  } catch (err) {
    console.error('[logigramme] Update unités error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logigramme/import
router.post('/import', upload.single('file'), async (req, res) => {
  const { academic_year_id } = req.body;
  const replaceSchedule = req.body.replace_schedule === true || req.body.replace_schedule === 'true';
  const allowMerge = req.body.allow_merge === true || req.body.allow_merge === 'true';
  const file = req.file;

  if (!academic_year_id) {
    if (file) fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'academic_year_id est requis.' });
  }

  if (!file) {
    return res.status(400).json({ error: 'Aucun fichier téléchargé.' });
  }
  if (replaceSchedule && allowMerge) {
    if (file) fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'Utilisez soit replace_schedule=true soit allow_merge=true, pas les deux.' });
  }

  const filePath = file.path;

  try {
    // 1. Get sheet names from Python parser
    const pythonScriptPath = path.join(__dirname, '../scripts/parse_xls.py');
    const sheetsResult = spawnSync('python3', [
      pythonScriptPath,
      '--file', filePath,
      '--list-sheets'
    ]);

    if (sheetsResult.status !== 0 || !sheetsResult.stdout) {
      const errorMsg = sheetsResult.stderr ? sheetsResult.stderr.toString() : 'Impossible de lister les feuilles.';
      throw new Error(errorMsg);
    }

    const sheets = JSON.parse(sheetsResult.stdout.toString());
    const importedLogs = [];

    // 2. Fetch academic year details
    const { data: yearData, error: yearError } = await supabaseAdmin
      .from('academic_years')
      .select('*')
      .eq('id', academic_year_id)
      .single();

    if (yearError || !yearData) {
      throw new Error(`Année académique introuvable : ${yearError?.message || 'inconnue'}`);
    }

    const canonicalWeekDateMap = await getYearWeekDateMap(academic_year_id);

    // 3. Process each sheet (excluding Feuil1)
    for (const sheetName of sheets) {
      if (sheetName === 'Feuil1') continue;

      // Run Python parser for the sheet
      const dataResult = spawnSync('python3', [
        pythonScriptPath,
        '--file', filePath,
        '--sheet', sheetName
      ]);

      if (dataResult.status !== 0 || !dataResult.stdout) {
        const errorMsg = dataResult.stderr ? dataResult.stderr.toString() : 'Erreur inconnue du parseur.';
        throw new Error(`Erreur parsing feuille "${sheetName}": ${errorMsg}`);
      }

      // Log Python parser diagnostics (goes to stderr)
      const pyStderr = dataResult.stderr?.toString().trim();
      if (pyStderr) {
        console.log(`[import] Python parser diagnostics for '${sheetName}':\n${pyStderr}`);
      }

      const data = JSON.parse(dataResult.stdout.toString());
      const { metadata, unites, weeks } = data;

      if (!metadata.filiere || !metadata.classe) {
        throw new Error(`Feuille "${sheetName}": filière ou classe manquante.`);
      }

      if (unites.length === 0) {
        throw new Error(`Feuille "${sheetName}": 0 unité détectée. Import annulé pour éviter une perte de données.`);
      }

      // a. Upsert Filière
      const filiereName = metadata.filiere.trim();
      const FILIERE_CODES = {
        'aide-soignant': 'AS',
        'aide soignant': 'AS',
        'infirmier en réanimation': 'REA',
        'infirmier en reanimation': 'REA',
        'infirmier anesthésiste': 'IAN',
        'infirmier anesthesiste': 'IAN',
        'infirmier auxiliaire': 'IA',
        'infirmier polyvalent': 'IP',
        'radiologie': 'RADIO',
      };
      const filiereCode = FILIERE_CODES[filiereName.toLowerCase()] || filiereName.substring(0, 5).toUpperCase().trim();
      
      const { data: filData, error: filError } = await supabaseAdmin
        .from('filieres')
        .upsert({ 
          code: filiereCode, 
          name: filiereName, 
          niveau: metadata.niveau.trim() || 'QUALIFICATION'
        }, { onConflict: 'code' })
        .select()
        .single();

      if (filError) throw filError;
      const filiereId = filData.id;

      // b. Upsert Classe
      let annee = 1;
      if (metadata.classe.includes('2')) annee = 2;
      if (metadata.classe.includes('3')) annee = 3;

      const { data: clData, error: clError } = await supabaseAdmin
        .from('classes')
        .upsert({
          filiere_id: filiereId,
          label: metadata.classe,
          annee: annee
        }, { onConflict: 'filiere_id, annee' })
        .select()
        .single();

      if (clError) throw clError;
      const classeId = clData.id;

      // c. Upsert Logigramme
      const { data: logData, error: logError } = await supabaseAdmin
        .from('logigrammes')
        .upsert({
          filiere_id: filiereId,
          classe_id: classeId,
          academic_year_id: academic_year_id
        }, { onConflict: 'filiere_id, classe_id, academic_year_id' })
        .select()
        .single();

      if (logError) throw logError;
      const logigrammeId = logData.id;

      const { data: existingUnits, error: existingUnitsError } = await supabaseAdmin
        .from('unites_formation')
        .select('id')
        .eq('logigramme_id', logigrammeId);

      if (existingUnitsError) throw existingUnitsError;
      if ((existingUnits || []).length > 0 && !replaceSchedule && !allowMerge) {
        throw new Error(
          `Des données existent déjà pour "${filiereName} / ${metadata.classe}". ` +
          'Envoyez replace_schedule=true pour remplacer le planning, ou allow_merge=true pour fusionner explicitement.'
        );
      }

      if ((existingUnits || []).length > 0 && replaceSchedule) {
        const { error: deleteUnitsError } = await supabaseAdmin
          .from('unites_formation')
          .delete()
          .eq('logigramme_id', logigrammeId);
        if (deleteUnitsError) throw deleteUnitsError;
      }

      // d. Insert year_weeks (once per year/week)
      const weekDateMap = { ...canonicalWeekDateMap };
      for (let i = 0; i < weeks.length; i++) {
        const weekDate = weeks[i];
        if (!weekDate) continue;
        
        const dateObj = new Date(weekDate);
        const mois = dateObj.toLocaleString('fr-FR', { month: 'long' });
        const semestre = (i + 1) <= 26 ? 1 : 2;

        const { data: ywData, error: ywError } = await supabaseAdmin
          .from('year_weeks')
          .upsert({
            academic_year_id: academic_year_id,
            semaine: i + 1,
            week_start_date: weekDate,
            mois: mois.charAt(0).toUpperCase() + mois.slice(1),
            semestre: semestre
          }, { onConflict: 'academic_year_id, semaine' })
          .select()
          .single();
        
        if (ywError) throw ywError;
        weekDateMap[i + 1] = weekDate;
        canonicalWeekDateMap[i + 1] = weekDate;
      }

      // e. Process Unités and Cells
      for (const unit of unites) {
        let formateurId = null;
        if (unit.formateur) {
          // Find or create formateur
          const { data: existingF, error: sError } = await supabaseAdmin
            .from('formateurs')
            .select('id')
            .eq('nom', unit.formateur)
            .maybeSingle();
          
          if (existingF) {
            formateurId = existingF.id;
          } else {
            const { data: newF, error: iError } = await supabaseAdmin
              .from('formateurs')
              .insert({ nom: unit.formateur })
              .select()
              .single();
            
            if (iError) {
              throw new Error(`Erreur insertion formateur "${unit.formateur}": ${iError.message}`);
            }
            formateurId = newF.id;
          }
        }

        // Upsert Unit
        const { data: uData, error: uError } = await supabaseAdmin
          .from('unites_formation')
          .upsert({
            logigramme_id: logigrammeId,
            ordre: unit.ordre,
            nom: unit.nom,
            formateur_id: formateurId,
            vhg: unit.vhg
          }, { onConflict: 'logigramme_id, ordre' })
          .select()
          .single();

        if (uError) throw uError;
        const uniteId = uData.id;

        // Insert Cells
        if (unit.cells && unit.cells.length > 0) {
          const cellInserts = unit.cells.map(c => ({
            unite_id: uniteId,
            semaine: c.week,
            week_start_date: weekDateMap[c.week],
            cell_type: c.type,
            heures: (Number.isFinite(Number(c.value)) && Number(c.value) > 0) ? Number(c.value) : null
          })).filter(c => c.week_start_date); // Safety check

          if (cellInserts.length < unit.cells.length) {
            throw new Error(
              `Unité "${unit.nom}" / feuille "${sheetName}": ` +
              `${unit.cells.length - cellInserts.length}/${unit.cells.length} cellule(s) sans date semaine. Import annulé.`
            );
          }

          if (cellInserts.length > 0) {
            const { error: cellError } = await supabaseAdmin
              .from('week_cells')
              .upsert(cellInserts, { onConflict: 'unite_id, semaine' });
            if (cellError) throw cellError;
          }
        }
      }

      importedLogs.push({
        sheetName,
        filiere: filiereName,
        classe: metadata.classe,
        unitsCount: unites.length
      });
    }

    res.json({
      success: true,
      message: `Importation réussie de ${importedLogs.length} programmes.`,
      importedLogs
    });

  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    // Always clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

export default router;
```

path of the file : `backend/scripts/create-admin.js`

```
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_FIRST_NAME = "System",
  ADMIN_LAST_NAME = "Admin",
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env")
  process.exit(1)
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in backend/.env")
  process.exit(1)
}

if (ADMIN_PASSWORD.length < 8) {
  console.error("ADMIN_PASSWORD must contain at least 8 characters")
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase()
async function findUserByEmail(email) {
  const perPage = 1000

  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })

    if (error) {
      return { error }
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email)

    if (match) {
      return { user: match }
    }

    if (data.users.length < perPage) {
      return { user: null }
    }
  }

  return { user: null }
}

const existingLookup = await findUserByEmail(normalizedEmail)

if (existingLookup.error) {
  console.error(`Could not inspect existing users: ${existingLookup.error.message}`)
  process.exit(1)
}

const existingUser = existingLookup.user

const adminUserPayload = {
  email: normalizedEmail,
  password: ADMIN_PASSWORD,
}

let creationResult

if (existingUser) {
  creationResult = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, adminUserPayload)
} else {
  creationResult = await supabaseAdmin.auth.admin.createUser(adminUserPayload)

  if (creationResult.error) {
    const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        role: "admin",
      },
    })

    if (inviteResult.error) {
      console.error("Could not create admin")
      console.error(`Message: ${creationResult.error.message}`)
      if (creationResult.error.code) console.error(`Code: ${creationResult.error.code}`)
      if (creationResult.error.status) console.error(`Status: ${creationResult.error.status}`)
      if (creationResult.error.details) console.error(`Details: ${creationResult.error.details}`)
      if (creationResult.error.hint) console.error(`Hint: ${creationResult.error.hint}`)
      console.error("Fallback invite also failed")
      console.error(`Message: ${inviteResult.error.message}`)
      if (inviteResult.error.code) console.error(`Code: ${inviteResult.error.code}`)
      if (inviteResult.error.status) console.error(`Status: ${inviteResult.error.status}`)
      if (inviteResult.error.details) console.error(`Details: ${inviteResult.error.details}`)
      if (inviteResult.error.hint) console.error(`Hint: ${inviteResult.error.hint}`)
      process.exit(1)
    }

    creationResult = inviteResult
  }
}

const { data, error } = creationResult

if (error) {
  console.error("Could not create admin")
  console.error(`Message: ${error.message}`)
  if (error.code) console.error(`Code: ${error.code}`)
  if (error.status) console.error(`Status: ${error.status}`)
  if (error.details) console.error(`Details: ${error.details}`)
  if (error.hint) console.error(`Hint: ${error.hint}`)
  process.exit(1)
}

const userId = data.user?.id || existingUser?.id

if (!userId) {
  console.error("Admin user record was not returned by Supabase")
  process.exit(1)
}

const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
  email_confirm: true,
  user_metadata: {
    role: "admin",
    first_name: ADMIN_FIRST_NAME,
    last_name: ADMIN_LAST_NAME,
    prenom: ADMIN_FIRST_NAME,
    nom: ADMIN_LAST_NAME,
  },
})

if (metadataError) {
  console.error(`Admin auth user created, but metadata update failed: ${metadataError.message}`)
  if (metadataError.code) console.error(`Code: ${metadataError.code}`)
  if (metadataError.status) console.error(`Status: ${metadataError.status}`)
  if (metadataError.details) console.error(`Details: ${metadataError.details}`)
  if (metadataError.hint) console.error(`Hint: ${metadataError.hint}`)
  process.exit(1)
}

const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
  id: userId,
  first_name: ADMIN_FIRST_NAME,
  last_name: ADMIN_LAST_NAME,
  status: "active",
  role: "admin",
})

if (profileError) {
  console.error(`Admin auth user created, but profile upsert failed: ${profileError.message}`)
  process.exit(1)
}

console.log(`Admin account ready: ${normalizedEmail}`)
```

path of the file : `backend/scripts/db_check.js`

```
import { supabaseAdmin } from '../lib/supabase.js';

async function check() {
  const { data: logigrammes, error: logError } = await supabaseAdmin
    .from('logigrammes')
    .select(`
      id,
      filiere:filieres (id, code, name),
      classe:classes (id, label, annee),
      academic_year:academic_years (id, label),
      unites:unites_formation (id, nom, vhg)
    `);

  if (logError) {
    console.error(logError);
    return;
  }

  console.log(`Total logigrammes in DB: ${logigrammes.length}`);
  logigrammes.forEach(l => {
    console.log(`Logigramme ID: ${l.id}`);
    console.log(`  Filiere: ${l.filiere.name} (${l.filiere.code})`);
    console.log(`  Classe: ${l.classe.label} (Annee: ${l.classe.annee})`);
    console.log(`  Year: ${l.academic_year.label}`);
    console.log(`  Units count: ${l.unites.length}`);
    const vhgSum = l.unites.reduce((sum, u) => sum + u.vhg, 0);
    console.log(`  Units VHG sum: ${vhgSum}`);
  });
}

check();
```

path of the file : `backend/scripts/import-xls.js`

```
import { supabaseAdmin as supabase } from '../lib/supabase.js';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const FILIERE_CODES = {
  'aide-soignant': 'AS',
  'aide soignant': 'AS',
  'aide soignante': 'AS',
  'infirmier en réanimation': 'REA',
  'infirmier en reanimation': 'REA',
  'infirmier anesthésiste': 'IAN',
  'infirmier anesthesiste': 'IAN',
  'infirmier auxiliaire': 'IA',
  'infirmier polyvalent': 'IP',
  'radiologie': 'RADIO',
};

const CELL_TYPES = new Set(['normal', 'vacation', 'exam', 'tiff', 'empty']);

function getArg(args, name, fallback = null) {
  const idx = args.indexOf(name);
  return idx === -1 ? fallback : args[idx + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage:',
    '  node scripts/import-xls.js --year "2025-2026" --dir "../../excels" --dry-run',
    '  node scripts/import-xls.js --year "2025-2026" --dir "../../excels" --commit --replace-schedule',
    '',
    'Safety defaults:',
    '  --dry-run           parse and validate only, no database writes',
    '  --commit            write to Supabase',
    '  --replace-schedule  delete existing units/cells for each imported logigramme before inserting source data',
    '  --allow-merge       allow upsert into an existing logigramme without deleting old rows',
  ].join('\n'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runPython(args, context) {
  const result = spawnSync('python3', [path.join(__dirname, 'parse_xls.py'), ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50,
  });

  if (result.status !== 0 || !result.stdout) {
    throw new Error(`${context}: ${result.stderr || result.error?.message || 'unknown parser error'}`);
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function parseJson(text, context) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${context}: invalid JSON from parser (${err.message})`);
  }
}

function listXlsFiles(xlsDir) {
  const files = fs.readdirSync(xlsDir)
    .filter(file => file.toLowerCase().endsWith('.xls'))
    .sort((a, b) => a.localeCompare(b, 'fr'));

  assert(files.length > 0, `No .xls files found in ${xlsDir}`);
  return files.map(file => path.join(xlsDir, file));
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function filiereCodeFor(name) {
  const key = normalizeName(name).toLowerCase();
  return FILIERE_CODES[key] || key.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 12)
    .toUpperCase();
}

function classYearFor(label) {
  const text = String(label || '');
  if (text.includes('3')) return 3;
  if (text.includes('2')) return 2;
  return 1;
}

function monthName(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  const mois = date.toLocaleString('fr-FR', { month: 'long', timeZone: 'UTC' });
  return mois.charAt(0).toUpperCase() + mois.slice(1);
}

function cellCounts(unites) {
  const counts = { normal: 0, vacation: 0, exam: 0, tiff: 0, empty: 0 };
  for (const unit of unites) {
    for (const cell of unit.cells || []) {
      counts[cell.type] = (counts[cell.type] || 0) + 1;
    }
  }
  return counts;
}

function validateSheet(filePath, sheetName, payload) {
  const errors = [];
  const warnings = [];
  const { metadata = {}, unites = [], weeks = [] } = payload;

  if (!normalizeName(metadata.filiere)) errors.push('Missing metadata.filiere');
  if (!normalizeName(metadata.classe)) errors.push('Missing metadata.classe');
  if (!normalizeName(metadata.niveau)) warnings.push('Missing metadata.niveau; importer will use QUALIFICATION');
  if (weeks.length !== 52) errors.push(`Expected 52 week slots, found ${weeks.length}`);

  const missingWeekDates = weeks
    .map((week, index) => ({ semaine: index + 1, week }))
    .filter(item => !item.week);
  if (missingWeekDates.length > 0) {
    errors.push(`Missing ${missingWeekDates.length} week date(s): ${missingWeekDates.map(w => w.semaine).join(', ')}`);
  }

  if (unites.length === 0) errors.push('Parsed 0 unités');

  const seenOrdres = new Set();
  for (const unit of unites) {
    if (seenOrdres.has(unit.ordre)) errors.push(`Duplicate unité ordre ${unit.ordre}`);
    seenOrdres.add(unit.ordre);

    if (!normalizeName(unit.nom)) errors.push(`Unité ordre ${unit.ordre}: missing name`);
    if (!Number.isFinite(Number(unit.vhg))) errors.push(`Unité "${unit.nom}": invalid VHG "${unit.vhg}"`);

    const sourceHours = (unit.cells || [])
      .filter(cell => Number.isFinite(Number(cell.value)))
      .reduce((sum, cell) => sum + Number(cell.value), 0);
    const delta = Math.abs(sourceHours - Number(unit.vhg || 0));
    if (delta > 0.01) {
      warnings.push(`Unité "${unit.nom}": VHG=${unit.vhg}, numeric source cells sum=${sourceHours}`);
    }

    const seenWeeks = new Set();
    for (const cell of unit.cells || []) {
      if (!Number.isInteger(cell.week) || cell.week < 1 || cell.week > 52) {
        errors.push(`Unité "${unit.nom}": invalid week ${cell.week}`);
      }
      if (seenWeeks.has(cell.week)) errors.push(`Unité "${unit.nom}": duplicate week ${cell.week}`);
      seenWeeks.add(cell.week);
      if (!CELL_TYPES.has(cell.type)) errors.push(`Unité "${unit.nom}": invalid cell type "${cell.type}"`);
      if (!cell.date) errors.push(`Unité "${unit.nom}": week ${cell.week} has no source date`);
      if (cell.date && weeks[cell.week - 1] && cell.date !== weeks[cell.week - 1]) {
        errors.push(`Unité "${unit.nom}": week ${cell.week} date mismatch cell=${cell.date}, header=${weeks[cell.week - 1]}`);
      }
    }
  }

  return {
    file: path.basename(filePath),
    sheet: sheetName,
    metadata,
    unit_count: unites.length,
    vhg_total: unites.reduce((sum, unit) => sum + Number(unit.vhg || 0), 0),
    cell_count: unites.reduce((sum, unit) => sum + (unit.cells || []).length, 0),
    cell_counts: cellCounts(unites),
    parser_warnings: payload.warnings || [],
    warnings,
    errors,
    debug: payload.debug || {},
  };
}

function parseWorkbook(filePath) {
  const listResult = runPython(['--file', filePath, '--list-sheets'], `listing sheets for ${filePath}`);
  const sheets = parseJson(listResult.stdout, `listing sheets for ${filePath}`);
  assert(sheets.length > 0, `No valid logigramme sheets found in ${filePath}`);

  return sheets.map(sheetName => {
    const parsed = runPython(['--file', filePath, '--sheet', sheetName], `parsing ${path.basename(filePath)}:${sheetName}`);
    const payload = parseJson(parsed.stdout, `parsing ${path.basename(filePath)}:${sheetName}`);
    const audit = validateSheet(filePath, sheetName, payload);
    if (parsed.stderr.trim()) audit.parser_diagnostics = parsed.stderr.trim();
    return { filePath, sheetName, payload, audit };
  });
}

function writeReport(report, reportDir) {
  fs.mkdirSync(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `xls-import-audit-${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return reportPath;
}

async function requireAcademicYear(label) {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, label')
    .eq('label', label)
    .single();

  if (error || !data) throw new Error(`Academic year "${label}" not found. Create it before importing.`);
  return data;
}

async function loadWeekDateMap(academicYearId) {
  const { data, error } = await supabase
    .from('year_weeks')
    .select('semaine, week_start_date')
    .eq('academic_year_id', academicYearId);

  if (error) throw error;
  return Object.fromEntries((data || []).map(row => [row.semaine, row.week_start_date]));
}

async function upsertYearWeeks(academicYearId, weeks) {
  const rows = weeks.map((weekDate, index) => ({
    academic_year_id: academicYearId,
    semaine: index + 1,
    week_start_date: weekDate,
    mois: monthName(weekDate),
    semestre: index + 1 <= 26 ? 1 : 2,
  }));

  const { error } = await supabase
    .from('year_weeks')
    .upsert(rows, { onConflict: 'academic_year_id, semaine' });
  if (error) throw error;

  return Object.fromEntries(rows.map(row => [row.semaine, row.week_start_date]));
}

async function getOrCreateFormateur(nom) {
  const cleanName = normalizeName(nom);
  if (!cleanName) return null;

  const { data: existing, error: findError } = await supabase
    .from('formateurs')
    .select('id')
    .eq('nom', cleanName)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from('formateurs')
    .insert({ nom: cleanName })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return created.id;
}

async function importSheet(item, academicYearId, options) {
  const { metadata, unites, weeks } = item.payload;
  const filiereName = normalizeName(metadata.filiere);
  const filiereCode = filiereCodeFor(filiereName);

  const { data: filiere, error: filiereError } = await supabase
    .from('filieres')
    .upsert({
      code: filiereCode,
      name: filiereName,
      niveau: normalizeName(metadata.niveau) || 'QUALIFICATION',
    }, { onConflict: 'code' })
    .select('id')
    .single();
  if (filiereError) throw filiereError;

  const { data: classe, error: classeError } = await supabase
    .from('classes')
    .upsert({
      filiere_id: filiere.id,
      label: normalizeName(metadata.classe),
      annee: classYearFor(metadata.classe),
    }, { onConflict: 'filiere_id, annee' })
    .select('id')
    .single();
  if (classeError) throw classeError;

  const { data: logigramme, error: logigrammeError } = await supabase
    .from('logigrammes')
    .upsert({
      filiere_id: filiere.id,
      classe_id: classe.id,
      academic_year_id: academicYearId,
    }, { onConflict: 'filiere_id, classe_id, academic_year_id' })
    .select('id')
    .single();
  if (logigrammeError) throw logigrammeError;

  const { data: existingUnits, error: existingError } = await supabase
    .from('unites_formation')
    .select('id')
    .eq('logigramme_id', logigramme.id);
  if (existingError) throw existingError;

  if ((existingUnits || []).length > 0 && !options.replaceSchedule && !options.allowMerge) {
    throw new Error(
      `Existing data found for ${filiereName} / ${metadata.classe}. ` +
      'Use --replace-schedule to replace it or --allow-merge to upsert into it.'
    );
  }

  if ((existingUnits || []).length > 0 && options.replaceSchedule) {
    const { error: deleteError } = await supabase
      .from('unites_formation')
      .delete()
      .eq('logigramme_id', logigramme.id);
    if (deleteError) throw deleteError;
  }

  const weekDateMap = await upsertYearWeeks(academicYearId, weeks);

  // 1. Batch Formateurs
  const uniqueFormateurs = [...new Set(unites.map(u => normalizeName(u.formateur)).filter(Boolean))];
  const formateurMap = {};

  if (uniqueFormateurs.length > 0) {
    const { data: existingFormateurs, error: findError } = await supabase
      .from('formateurs')
      .select('id, nom')
      .in('nom', uniqueFormateurs);
    if (findError) throw findError;

    (existingFormateurs || []).forEach(f => {
      formateurMap[f.nom] = f.id;
    });

    const missingFormateurs = uniqueFormateurs.filter(name => !formateurMap[name]);
    if (missingFormateurs.length > 0) {
      const { data: createdFormateurs, error: insertError } = await supabase
        .from('formateurs')
        .insert(missingFormateurs.map(name => ({ nom: name })))
        .select('id, nom');
      if (insertError) throw insertError;
      
      (createdFormateurs || []).forEach(f => {
        formateurMap[f.nom] = f.id;
      });
    }
  }

  // 2. Batch Units
  const unitsToUpsert = unites.map(unit => ({
    logigramme_id: logigramme.id,
    ordre: unit.ordre,
    nom: normalizeName(unit.nom),
    formateur_id: formateurMap[normalizeName(unit.formateur)] || null,
    vhg: Number(unit.vhg || 0),
  }));

  const { data: savedUnits, error: unitsError } = await supabase
    .from('unites_formation')
    .upsert(unitsToUpsert, { onConflict: 'logigramme_id, ordre' })
    .select('id, ordre');
  if (unitsError) throw unitsError;

  const unitIdByOrdre = Object.fromEntries((savedUnits || []).map(u => [u.ordre, u.id]));

  // 3. Batch Cells
  const cellsToUpsert = [];
  for (const unit of unites) {
    const unitId = unitIdByOrdre[unit.ordre];
    if (!unitId) {
      throw new Error(`Failed to associate unit ID for order ${unit.ordre} ("${unit.nom}")`);
    }

    const cells = (unit.cells || []).map(cell => ({
      unite_id: unitId,
      semaine: cell.week,
      week_start_date: weekDateMap[cell.week],
      cell_type: cell.type,
      heures: Number.isFinite(Number(cell.value)) ? Number(cell.value) : null,
    }));

    const missingDates = cells.filter(cell => !cell.week_start_date);
    if (missingDates.length > 0) {
      throw new Error(`Refusing to drop ${missingDates.length} cells for unité "${unit.nom}" due to missing week dates`);
    }

    cellsToUpsert.push(...cells);
  }

  if (cellsToUpsert.length > 0) {
    const { error: cellsError } = await supabase
      .from('week_cells')
      .upsert(cellsToUpsert, { onConflict: 'unite_id, semaine' });
    if (cellsError) throw cellsError;
  }

  return {
    logigramme_id: logigramme.id,
    filiere: filiereName,
    classe: normalizeName(metadata.classe),
    units: unites.length,
  };
}

async function run() {
  const args = process.argv.slice(2);
  const academicYearLabel = getArg(args, '--year');
  const xlsDir = getArg(args, '--dir', path.resolve(__dirname, '../../../excels'));
  const reportDir = getArg(args, '--report-dir', path.resolve(__dirname, '../import-reports'));
  const dryRun = hasFlag(args, '--dry-run') || !hasFlag(args, '--commit');
  const commit = hasFlag(args, '--commit');
  const replaceSchedule = hasFlag(args, '--replace-schedule');
  const allowMerge = hasFlag(args, '--allow-merge');

  if (!academicYearLabel || hasFlag(args, '--help')) {
    usage();
    process.exit(1);
  }
  if (replaceSchedule && allowMerge) {
    throw new Error('Use only one of --replace-schedule or --allow-merge.');
  }

  const files = listXlsFiles(path.resolve(xlsDir));
  const parsedSheets = files.flatMap(file => parseWorkbook(file));
  const sheets = parsedSheets.map(item => item.audit);
  const errors = sheets.flatMap(sheet => sheet.errors.map(error => `${sheet.file}:${sheet.sheet}: ${error}`));
  const warnings = sheets.flatMap(sheet => [
    ...sheet.warnings.map(warning => `${sheet.file}:${sheet.sheet}: ${warning}`),
    ...sheet.parser_warnings.map(warning => `${sheet.file}:${sheet.sheet}: ${warning.message || warning}`),
  ]);

  const report = {
    generated_at: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'commit',
    source_dir: path.resolve(xlsDir),
    academic_year: academicYearLabel,
    files: files.map(file => path.basename(file)),
    totals: {
      files: files.length,
      sheets: sheets.length,
      units: sheets.reduce((sum, sheet) => sum + sheet.unit_count, 0),
      cells: sheets.reduce((sum, sheet) => sum + sheet.cell_count, 0),
      vhg: sheets.reduce((sum, sheet) => sum + sheet.vhg_total, 0),
      warnings: warnings.length,
      errors: errors.length,
    },
    sheets,
    errors,
    warnings,
  };

  const reportPath = writeReport(report, path.resolve(reportDir));
  console.log(`Audit report: ${reportPath}`);
  console.log(`Parsed ${report.totals.files} file(s), ${report.totals.sheets} sheet(s), ${report.totals.units} unité(s), ${report.totals.cells} cell(s).`);

  if (warnings.length > 0) {
    console.warn(`Warnings: ${warnings.length}. See report before importing.`);
  }
  if (errors.length > 0) {
    errors.slice(0, 20).forEach(error => console.error(`ERROR: ${error}`));
    throw new Error(`Validation failed with ${errors.length} error(s). No database writes were made.`);
  }
  if (dryRun) {
    console.log('Dry-run complete. No database writes were made. Add --commit to import.');
    return;
  }
  assert(commit, 'Internal safety check failed: commit mode not enabled');

  const year = await requireAcademicYear(academicYearLabel);
  await loadWeekDateMap(year.id);

  const imported = [];
  for (const item of parsedSheets) {
    imported.push(await importSheet(item, year.id, { replaceSchedule, allowMerge }));
  }

  console.log(`Imported ${imported.length} logigramme(s).`);
  for (const item of imported) {
    console.log(`  ${item.filiere} / ${item.classe}: ${item.units} unité(s), logigramme=${item.logigramme_id}`);
  }
}

run().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});
```

path of the file : `backend/scripts/parse_xls.py`

```
"""
parse_xls.py  –  ESFPP Dashboard XLS parser (xlrd, .xls only)
==============================================================
Single-pass parser with:
  • Dynamic anchor detection for the header row (scans first 15 rows for
    "Unités de formation" + "Formateur" / "VHG" — no hard-coded row numbers).
  • Perceptual colour clustering: Euclidean distance in RGB space maps
    the raw colour palette to 5 semantic types (normal / vacation / exam /
    tiff / empty), tolerating "human noise" (multiple near-identical shades
    mapped to the same bucket).
  • Priority hierarchy: column-override → cell text → numeric value → colour.
  • Merged-cell forward-fill for Formateur/VHG columns (never overwrites
    an explicitly non-empty cell).
  • is_valid_logigramme_sheet preserved (excludes Feuil1 etc.).
  • --dry-run prints colour stats (raw distinct + post-clustering) per sheet.
  • Total parse time logged.

Colour reference anchors (derived from frontend logigramme-helpers.js):
  normal   #FEF9C3  → RGB(254, 249, 195)
  vacation #F472B6  → RGB(244, 114, 182)
  exam     slate-200 → RGB(192, 192, 192)  (also darker grays)
  tiff     yellow-400 → RGB(250, 204, 21)  (and bright yellows)
  empty    white / no-fill
"""

import xlrd
import json
import argparse
import sys
import re
import unicodedata
import time
import math
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# ---------------------------------------------------------------------------
# COLOUR CLUSTERING
# ---------------------------------------------------------------------------
# Semantic anchor colours (RGB) derived from frontend logigramme-helpers.js.
# Each entry is (R, G, B, max_distance_threshold).
# A raw colour is assigned to the first bucket whose Euclidean distance is ≤
# the threshold.  Order matters: more specific anchors first.
COLOUR_ANCHORS = [
    # type       R    G    B   threshold
    ("vacation", 244, 114, 182, 60),   # #F472B6 pink / hot-pink family
    ("vacation", 255, 153, 204, 55),   # legacy pink used in existing files
    ("exam",     192, 192, 192, 50),   # slate-200 / standard gray
    ("exam",     150, 150, 150, 45),   # darker gray variant
    ("tiff",     250, 204,  21, 60),   # yellow-400  (bright yellow family)
    ("tiff",     255, 255,   0, 50),   # pure bright yellow
    ("normal",   254, 249, 195, 55),   # #FEF9C3 pale yellow (normal session)
    ("normal",   255, 255, 204, 50),   # #FFFFCC near-white yellow variant
    ("normal",   255, 255, 153, 55),   # #FFFF99 slightly deeper yellow
    ("normal",   204, 255, 204, 60),   # #CCFFCC pale green (also used for normal in some files)
    ("normal",   187, 247, 208, 55),   # #BBF7D0 green-done state (treat as normal at parse time)
]

# Colours considered "no fill" — classified as empty without warning.
EMPTY_RGB_EXACT = {
    (255, 255, 255),  # white
    (0,   0,   0),    # black (rare border artefact)
}
EMPTY_INDEX = 64  # xlrd pattern_colour_index for "automatic / no fill"


def _rgb_distance(rgb, r2, g2, b2):
    """Euclidean distance in RGB space between two colours."""
    return math.sqrt(
        (rgb[0] - r2) ** 2 +
        (rgb[1] - g2) ** 2 +
        (rgb[2] - b2) ** 2
    )


def classify_colour(rgb, bg_index):
    """
    Map an RGB tuple to a semantic cell type string or None (meaning 'empty').

    Returns:
        (str | None, bool recognised)
        type: 'normal' | 'vacation' | 'exam' | 'tiff' | None
        recognised: True if matched a known anchor; False → caller should warn.
    """
    if rgb is None or bg_index == EMPTY_INDEX or rgb in EMPTY_RGB_EXACT:
        return None, True   # empty, no warning needed

    # Try perceptual match against anchors
    best_type = None
    best_dist = float("inf")
    for anchor in COLOUR_ANCHORS:
        atype, ar, ag, ab, thresh = anchor
        d = _rgb_distance(rgb, ar, ag, ab)
        if d <= thresh and d < best_dist:
            best_dist = d
            best_type = atype

    if best_type is not None:
        return best_type, True

    return None, False  # unrecognised — caller emits warning


# ---------------------------------------------------------------------------
# NORMALISATION HELPERS
# ---------------------------------------------------------------------------
def normalize_label(value):
    value = str(value).strip().lower()
    value = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in value if not unicodedata.combining(ch))


def check_keyword(val_str, keywords):
    normalized = normalize_label(val_str)
    return any(k in normalized for k in keywords)


# ---------------------------------------------------------------------------
# SHEET VALIDATION (preserved from original)
# ---------------------------------------------------------------------------
def is_valid_logigramme_sheet(sheet):
    if sheet.ncols < 50:
        return False, f"ncols={sheet.ncols} < 50"

    found_header = False
    for r in range(min(10, sheet.nrows)):
        for c in range(min(10, sheet.ncols)):
            try:
                val = str(sheet.cell(r, c).value)
                normalized = normalize_label(val)
                if "filiere" in normalized or "unites de formation" in normalized:
                    found_header = True
                    break
            except Exception:
                pass
        if found_header:
            break

    if not found_header:
        return False, "Filière: or Unités de formation not found in first 10 rows/cols"

    return True, ""


# ---------------------------------------------------------------------------
# DYNAMIC ANCHOR DETECTION
# ---------------------------------------------------------------------------
def find_header_anchor(sheet):
    """
    Scan the first 15 rows and locate:
      1. header_row  – row that contains 'Unités de formation' AND ('Formateur' OR 'VHG')
      2. week_date_row – row with the most XL_CELL_DATE cells in cols 4-55
      3. data_start_row = max(header_row, week_date_row) + 1

    Returns (header_row, week_date_row, data_start_row, dates_found).
    Falls back to week_date_row-only logic if header row cannot be pinpointed.
    """
    scan_limit = min(15, sheet.nrows)

    # --- find header row (column label row) ---
    header_row = -1
    for r in range(scan_limit):
        row_text = " ".join(
            normalize_label(sheet.cell(r, c).value)
            for c in range(min(8, sheet.ncols))
        )
        has_unite = "unite" in row_text or "formation" in row_text
        has_formateur = "formateur" in row_text or "formtr" in row_text
        has_vhg = "vhg" in row_text or "volume" in row_text
        if has_unite and (has_formateur or has_vhg):
            header_row = r
            break

    # --- find week-date row ---
    best_row = max(header_row, 0)
    best_count = 0
    for row_idx in range(scan_limit):
        date_count = sum(
            1 for col_idx in range(4, min(56, sheet.ncols))
            if sheet.cell(row_idx, col_idx).ctype == xlrd.XL_CELL_DATE
        )
        if date_count > best_count:
            best_row = row_idx
            best_count = date_count

    week_date_row = best_row
    dates_found = best_count

    # data starts the row after the last of the two anchor rows
    data_start_row = max(header_row, week_date_row) + 1

    return header_row, week_date_row, data_start_row, dates_found


# ---------------------------------------------------------------------------
# MERGED-CELL FORWARD-FILL HELPER
# ---------------------------------------------------------------------------
def build_merged_map(sheet):
    """
    Return a dict {(row, col): (row_lo, col_lo)} mapping every cell inside a
    merged range back to the top-left (origin) cell of that range.
    Only relevant for sheets that expose merged_cells (xlrd ≥ 0.7).
    """
    merged = {}
    try:
        for (rlo, rhi, clo, chi) in sheet.merged_cells:
            for r in range(rlo, rhi):
                for c in range(clo, chi):
                    merged[(r, c)] = (rlo, clo)
    except AttributeError:
        pass  # older xlrd or no merges
    return merged


def get_cell_value_with_fill(sheet, merged_map, row, col, fill_state: dict):
    """
    Return cell value, honouring:
      1. Explicit non-empty value in the cell itself.
      2. If cell is inside a merged region, use the origin cell's value.
      3. If cell is empty, fall back to fill_state[col] (forward-fill from above).
    Never overwrites an explicitly non-empty cell.
    """
    origin = merged_map.get((row, col), (row, col))
    cell = sheet.cell(origin[0], origin[1])
    val = cell.value
    if cell.ctype not in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK):
        fill_state[col] = val
        return val
    # fall through to forward-fill
    return fill_state.get(col, "")


# ---------------------------------------------------------------------------
# MAIN PARSE FUNCTION
# ---------------------------------------------------------------------------
def parse_xls(file_path, sheet_name, book=None):
    """
    Parse a single sheet from an already-opened workbook (book) or open it.
    Returns the payload dict or None on hard failure.
    """
    t0 = time.perf_counter()

    try:
        if book is None:
            book = xlrd.open_workbook(file_path, formatting_info=True)
    except Exception as e:
        print(f"Error opening workbook: {e}", file=sys.stderr)
        return None

    try:
        sheet = book.sheet_by_name(sheet_name)
    except Exception as e:
        print(f"Error finding sheet '{sheet_name}': {e}", file=sys.stderr)
        return None

    is_valid, reason = is_valid_logigramme_sheet(sheet)
    if not is_valid:
        print(f"Skipping invalid logigramme sheet '{sheet_name}': {reason}", file=sys.stderr)
        return None

    # --- dynamic anchor detection ---
    header_row, week_date_row, data_start_row, dates_found = find_header_anchor(sheet)

    print(
        f"[parse_xls] Sheet '{sheet_name}': header_row={header_row}, "
        f"week_date_row={week_date_row}, dates_found={dates_found}, "
        f"data_start_row={data_start_row}, total_rows={sheet.nrows}",
        file=sys.stderr,
    )

    # --- extract week dates ---
    week_dates = []
    for col in range(4, 56):
        if col < sheet.ncols:
            cell = sheet.cell(week_date_row, col)
            if cell.ctype == xlrd.XL_CELL_DATE:
                dt = xlrd.xldate_as_datetime(cell.value, book.datemode)
                week_dates.append(dt.strftime("%Y-%m-%d"))
            else:
                week_dates.append(None)
        else:
            week_dates.append(None)

    # --- merged-cell map for formateur/VHG forward-fill ---
    merged_map = build_merged_map(sheet)
    formateur_fill: dict = {}
    vhg_fill: dict = {}

    # --- pre-scan columns for column-level overrides (Exam/Vacation) ---
    # Colour inventory for dry-run reporting
    raw_colours_seen: set = set()

    column_overrides: dict = {}
    for col_idx in range(4, min(56, sheet.ncols)):
        has_vacation_text = False
        has_exam_text = False
        has_tiff_text = False
        pink_count = 0
        gray_count = 0
        valid_rows_count = 0

        for r in range(data_start_row, sheet.nrows):
            unit_num_cell = sheet.cell(r, 0)
            unit_name_cell = sheet.cell(r, 1)
            if (unit_num_cell.ctype == xlrd.XL_CELL_EMPTY and
                    unit_name_cell.ctype == xlrd.XL_CELL_EMPTY):
                continue
            if "total" in normalize_label(str(sheet.cell(r, 2).value)):
                break

            valid_rows_count += 1
            cell = sheet.cell(r, col_idx)
            val_str = str(cell.value).strip()

            if check_keyword(val_str, ["vacance"]):
                has_vacation_text = True
            elif check_keyword(val_str, ["examen", "semaine d'examen", "semaine exam"]):
                has_exam_text = True
            elif check_keyword(val_str, ["tif", "travaux individ"]):
                has_tiff_text = True

            xf = book.xf_list[cell.xf_index]
            bg_idx = xf.background.pattern_colour_index
            rgb = book.colour_map.get(bg_idx)
            if rgb is not None and bg_idx != EMPTY_INDEX and rgb not in EMPTY_RGB_EXACT:
                raw_colours_seen.add(rgb)
                sem_type, _ = classify_colour(rgb, bg_idx)
                if sem_type == "vacation":
                    pink_count += 1
                elif sem_type == "exam":
                    gray_count += 1

        if has_vacation_text:
            column_overrides[col_idx] = "vacation"
        elif has_exam_text:
            column_overrides[col_idx] = "exam"
        elif has_tiff_text:
            column_overrides[col_idx] = "tiff"
        elif valid_rows_count > 0:
            if pink_count > (valid_rows_count / 2):
                column_overrides[col_idx] = "vacation"
            elif gray_count > (valid_rows_count / 2):
                column_overrides[col_idx] = "exam"

    # --- parse data rows ---
    unites = []
    warnings = []

    for row_idx in range(data_start_row, sheet.nrows):
        unit_num_cell = sheet.cell(row_idx, 0)
        unit_name_cell = sheet.cell(row_idx, 1)

        if (unit_num_cell.ctype == xlrd.XL_CELL_EMPTY and
                unit_name_cell.ctype == xlrd.XL_CELL_EMPTY):
            continue

        summary_val = normalize_label(str(sheet.cell(row_idx, 2).value))
        if "total" in summary_val:
            break

        try:
            unit_num = int(float(unit_num_cell.value))
        except Exception:
            unit_num = 0

        unit_name = str(unit_name_cell.value).strip()
        if not unit_name:
            continue

        unit_lower = unit_name.lower()
        if any(skip in unit_lower for skip in ["vacance", "examen", "travaux individuels"]):
            continue
        if re.search(r'\btiff?\b', unit_lower):
            continue

        # Formateur with merged-cell forward-fill (col 2)
        formateur = str(
            get_cell_value_with_fill(sheet, merged_map, row_idx, 2, formateur_fill)
        ).strip()

        # VHG with merged-cell forward-fill (col 3)
        raw_vhg = get_cell_value_with_fill(sheet, merged_map, row_idx, 3, vhg_fill)
        try:
            vhg = float(raw_vhg)
        except Exception:
            vhg = 0.0

        cells = []
        for col_idx in range(4, min(56, sheet.ncols)):
            cell = sheet.cell(row_idx, col_idx)
            xf = book.xf_list[cell.xf_index]
            bg_idx = xf.background.pattern_colour_index
            rgb = book.colour_map.get(bg_idx)

            val = cell.value
            val_str = str(val).strip()

            if rgb is not None and bg_idx != EMPTY_INDEX and rgb not in EMPTY_RGB_EXACT:
                raw_colours_seen.add(rgb)

            # ----------------------------------------------------------------
            # PRIORITY HIERARCHY
            # ----------------------------------------------------------------
            # 1. Column-level override
            if col_idx in column_overrides:
                cell_type = column_overrides[col_idx]

            # 2. Cell text — strongest per-cell signal
            elif check_keyword(val_str, ["vacance"]):
                cell_type = "vacation"
            elif check_keyword(val_str, ["examen", "semaine d'examen", "semaine exam"]):
                cell_type = "exam"
            elif check_keyword(val_str, ["tif", "travaux individ"]):
                cell_type = "tiff"

            # 3. Positive numeric → normal session (regardless of colour)
            # val == 0 falls through to colour-based classification below
            elif isinstance(val, (int, float)) and val > 0:
                cell_type = "normal"

            # 4. Colour-based classification
            else:
                sem_type, recognised = classify_colour(rgb, bg_idx)
                if sem_type is not None:
                    cell_type = sem_type
                elif not recognised:
                    # Unrecognised colour on an empty/zero cell → warn, don't crash
                    warning_msg = (
                        f"WARNING: [{sheet_name}] row {row_idx}, col {col_idx} "
                        f"({unit_name}): Unrecognized color {rgb} for empty/zero cell. "
                        f"Defaulting to 'empty'."
                    )
                    print(warning_msg, file=sys.stderr)
                    warnings.append({
                        "sheet": sheet_name,
                        "row": row_idx,
                        "col": col_idx,
                        "module": unit_name,
                        "rgb": list(rgb) if rgb else None,
                        "message": warning_msg,
                    })
                    cell_type = "empty"
                else:
                    cell_type = "empty"

            # Append non-empty cells.
            # For 'normal' type: only store if value is a positive number.
            # For other types (vacation/exam/tiff): always store.
            skip = False
            if cell_type == "empty":
                skip = True
            elif cell_type == "normal" and not (isinstance(val, (int, float)) and val > 0):
                # Colour-matched as 'normal' but has no positive numeric value — treat as empty
                skip = True

            if not skip:
                week_idx = col_idx - 4  # 0-based index into week_dates
                numeric_value = val if isinstance(val, (int, float)) and val > 0 else None
                cells.append({
                    "week": col_idx - 3,  # 1-based week number for API compat
                    "type": cell_type,
                    "value": numeric_value,
                    "date": week_dates[week_idx] if week_idx < len(week_dates) else None,
                })

        unites.append({
            "ordre": row_idx,
            "num": unit_num,
            "nom": unit_name,
            "formateur": formateur,
            "vhg": vhg,
            "cells": cells,
        })

    elapsed = time.perf_counter() - t0
    total_cells = sum(len(u["cells"]) for u in unites)
    print(
        f"[parse_xls] Sheet '{sheet_name}': parsed {len(unites)} unité(s), "
        f"{total_cells} total cells in {elapsed:.3f}s",
        file=sys.stderr,
    )

    # --- metadata extraction ---
    metadata = {"filiere": "", "niveau": "", "classe": "", "annee_acad": ""}
    for r in range(min(10, sheet.nrows)):
        for c in range(min(5, sheet.ncols)):
            try:
                val = str(sheet.cell(r, c).value).strip()
                if ":" not in val:
                    continue
                normalized_val = normalize_label(val)
                raw_value = val.split(":", 1)[1].strip()
                if "filiere:" in normalized_val:
                    metadata["filiere"] = raw_value
                elif "niveau:" in normalized_val:
                    metadata["niveau"] = raw_value
                elif "classe:" in normalized_val:
                    metadata["classe"] = raw_value
                elif "annee de formation:" in normalized_val or "annee academique:" in normalized_val:
                    metadata["annee_acad"] = raw_value
            except Exception:
                pass

    return {
        "metadata": metadata,
        "unites": unites,
        "weeks": week_dates,
        "warnings": warnings,
        "debug": {
            "header_row": header_row,
            "week_date_row": week_date_row,
            "week_date_count": dates_found,
            "data_start_row": data_start_row,
            "parse_seconds": round(elapsed, 4),
            "raw_colours_count": len(raw_colours_seen),
        },
    }


# ---------------------------------------------------------------------------
# COLOUR AUDIT HELPER (for --dry-run)
# ---------------------------------------------------------------------------
def audit_colours(raw_colours: set):
    """
    Group raw colours into semantic clusters.
    Returns: {type: [list_of_rgb]}, unrecognised_list
    """
    clusters: dict = {
        "normal": [], "vacation": [], "exam": [], "tiff": [], "unrecognised": []
    }
    for rgb in raw_colours:
        sem, recognised = classify_colour(rgb, -1)   # bg_index -1 → not EMPTY_INDEX
        if recognised and sem is not None:
            clusters[sem].append(rgb)
        else:
            clusters["unrecognised"].append(rgb)
    return clusters


# ---------------------------------------------------------------------------
# CLI ENTRY POINT
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ESFPP XLS logigramme parser")
    parser.add_argument("--file", required=True, help="Path to the .xls file")
    parser.add_argument("--sheet", help="Sheet name to parse (single sheet mode)")
    parser.add_argument("--list-sheets", action="store_true", help="List valid sheet names as JSON")
    parser.add_argument("--dry-run", action="store_true", help="Audit all sheets without persisting")
    args = parser.parse_args()

    if args.list_sheets:
        try:
            book = xlrd.open_workbook(args.file, on_demand=True)
            valid_sheets = []
            for sheet_name in book.sheet_names():
                sheet = book.sheet_by_name(sheet_name)
                is_valid, reason = is_valid_logigramme_sheet(sheet)
                if is_valid:
                    valid_sheets.append(sheet_name)
                else:
                    print(f"Skipping recap/utility sheet '{sheet_name}': {reason}", file=sys.stderr)
            print(json.dumps(valid_sheets))
        except Exception as e:
            print(f"Error listing sheets: {e}", file=sys.stderr)
            sys.exit(1)

    elif args.dry_run:
        t_total = time.perf_counter()
        try:
            # Single-pass: open once with formatting_info
            book = xlrd.open_workbook(args.file, formatting_info=True)
        except Exception as e:
            print(f"Dry-run error opening file: {e}", file=sys.stderr)
            sys.exit(1)

        all_raw_colours: set = set()

        for sheet_name in book.sheet_names():
            sheet = book.sheet_by_name(sheet_name)
            is_valid, reason = is_valid_logigramme_sheet(sheet)
            if not is_valid:
                print(f"\nSkipping sheet '{sheet_name}': {reason}", file=sys.stderr)
                continue

            print(f"\n{'='*60}")
            print(f"  Dry-run parsing sheet: {sheet_name}")
            print(f"{'='*60}")

            try:
                data = parse_xls(args.file, sheet_name, book=book)
            except Exception as ex:
                print(f"  !! ERROR parsing '{sheet_name}': {ex}", file=sys.stderr)
                continue

            if not data:
                print(f"  Failed to parse sheet: {sheet_name}")
                continue

            dbg = data.get("debug", {})
            print(f"  header_row      : {dbg.get('header_row')}")
            print(f"  week_date_row   : {dbg.get('week_date_row')}  (dates found: {dbg.get('week_date_count')})")
            print(f"  data_start_row  : {dbg.get('data_start_row')}")
            print(f"  total_rows sheet: —")
            print(f"  parse time      : {dbg.get('parse_seconds')}s")

            # Cell type counts
            counts = {"normal": 0, "vacation": 0, "exam": 0, "tiff": 0, "empty": 0, "unknown": 0}
            for u in data["unites"]:
                for c in u["cells"]:
                    t = c["type"]
                    if t in counts:
                        counts[t] += 1
                    else:
                        counts["unknown"] += 1

            print(f"\n  Summary for '{sheet_name}':")
            print(f"    Total Units   : {len(data['unites'])}")
            print(f"    Classified cells:")
            for k, v in counts.items():
                print(f"      {k:12s}: {v}")

            # Colour audit
            raw_count = dbg.get("raw_colours_count", 0)
            # Rebuild raw colours from debug (we stored count only); re-collect from data
            # (We can reconstruct a rough set from data warnings and normal cells)
            # For the audit, collect from raw_colours_seen via a local re-scan
            # Re-use the debug raw_colours_count; do a live audit via re-scan of sheet
            raw_colours_sheet: set = set()
            for r in range(min(15, sheet.nrows), sheet.nrows):
                for c in range(4, min(56, sheet.ncols)):
                    xf = book.xf_list[sheet.cell(r, c).xf_index]
                    bg_idx = xf.background.pattern_colour_index
                    rgb = book.colour_map.get(bg_idx)
                    if rgb is not None and bg_idx != EMPTY_INDEX and rgb not in EMPTY_RGB_EXACT:
                        raw_colours_sheet.add(rgb)
            all_raw_colours.update(raw_colours_sheet)

            clusters = audit_colours(raw_colours_sheet)
            print(f"\n  Colour audit:")
            print(f"    Raw distinct colours before clustering : {len(raw_colours_sheet)}")
            sem_total = sum(len(v) for v in clusters.values())
            print(f"    Semantic clusters after clustering     : {sum(1 for v in clusters.values() if v)} (of 5 types)")
            for ctype, clist in clusters.items():
                if clist:
                    print(f"      {ctype:14s}: {len(clist)} raw colours → {[c for c in clist[:5]]}{'...' if len(clist) > 5 else ''}")

            print(f"\n  Warnings: {len(data.get('warnings', []))}")
            for w in data.get("warnings", []):
                print(f"    - Row {w['row']}, Col {w['col']}: {w['message']}")

        elapsed_total = time.perf_counter() - t_total
        print(f"\n{'='*60}")
        print(f"  TOTAL parse time across all sheets: {elapsed_total:.3f}s")
        print(f"  Total distinct colours (all sheets): {len(all_raw_colours)}")
        print(f"{'='*60}")

    elif args.sheet:
        data = parse_xls(args.file, args.sheet)
        if data:
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            sys.exit(1)
    else:
        print("Either --sheet, --dry-run or --list-sheets is required", file=sys.stderr)
        sys.exit(1)
```

path of the file : `backend/scripts/query_db.js`

```
import { supabaseAdmin } from '../lib/supabase.js';

async function inspectUniteCells() {
  try {
    const logigrammeId = '89f0f4c9-dc3d-41f0-93e3-b605cdfc198c';
    const { data: unites, error } = await supabaseAdmin
      .from('unites_formation')
      .select(`
        id,
        nom,
        cells:week_cells (
          id,
          semaine,
          cell_type,
          heures,
          completion:completions (status)
        )
      `)
      .eq('logigramme_id', logigrammeId)
      .eq('id', '5729bd46-d8cf-4b95-bedf-d4e5b80af387'); // Let's inspect the specific unite

    if (error) {
      console.error(error);
      return;
    }

    console.log('Unite cells count:', unites?.[0]?.cells?.length);
    console.log('Sample cell with completion:', unites?.[0]?.cells?.find(c => c.id === 'c51ad1c2-413f-47cb-8970-eeffb980a93b'));
  } catch (err) {
    console.error(err);
  }
}

inspectUniteCells();
```

path of the file : `backend/scripts/seed-years.js`

```
import { supabaseAdmin } from '../lib/supabase.js';

async function seed() {
  console.log('Seeding academic year 2025-2026...');
  const { data, error } = await supabaseAdmin
    .from('academic_years')
    .upsert({ 
        label: '2025-2026', 
        start_date: '2025-09-01', 
        end_date: '2026-08-31', 
        is_current: true 
    }, { onConflict: 'label' })
    .select()
    .single();

  if (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
  console.log('Seed successful:', data.label);
}

seed();
```

path of the file : `backend/scripts/verify_migration.js`

```
import { supabaseAdmin } from '../lib/supabase.js';

async function verify() {
  const { data: logs, error } = await supabaseAdmin.from("logigrammes").select(`
    id,
    filiere:filieres(name),
    classe:classes(label),
    unites:unites_formation(id, nom, vhg)
  `);

  if (error) {
    console.error("Verification query error:", error.message);
    return;
  }

  const expected = [
    { name: "Radiologie", label: "Radio 1", units: 35, vhg: 975.0 },
    { name: "Radiologie", label: "Radio 2", units: 28, vhg: 660.0 },
    { name: "Radiologie", label: "Radio 3", units: 23, vhg: 450.0 },
    { name: "Infirmier auxiliaire", label: "IA1", units: 29, vhg: 515.0 },
    { name: "Infirmier auxiliaire", label: "IA2", units: 23, vhg: 245.0 },
    { name: "Infirmier Polyvalent", label: "IP1", units: 37, vhg: 957.0 },
    { name: "Infirmier Polyvalent", label: "IP2", units: 33, vhg: 940.0 },
    { name: "Infirmier Polyvalent", label: "IP3", units: 26, vhg: 320.0 },
    { name: "Infirmier en réanimation", label: "Réa 1", units: 35, vhg: 920.0 },
    { name: "Infirmier en réanimation", label: "Réa 2", units: 19, vhg: 440.0 },
    { name: "Infirmier en réanimation", label: "Réa 3", units: 17, vhg: 330.0 },
    { name: "AIDE SOIGNANT", label: "1ère année", units: 41, vhg: 504.0 }
  ];

  console.log("--- Verification Results ---");
  let totalLoss = false;

  logs.forEach(log => {
    const totalUnits = log.unites.length;
    const totalVHG = log.unites.reduce((sum, u) => sum + u.vhg, 0);
    
    // Find expected entry
    // Note: mapping might be slightly different in names due to metadata cleanup
    const match = expected.find(e => 
      (log.filiere.name.toLowerCase() === e.name.toLowerCase() || log.filiere.name.includes(e.name)) &&
      (log.classe.label.toLowerCase() === e.label.toLowerCase() || e.label === "1ère année" && log.classe.label === "1ère année")
    );

    if (match) {
      const unitsOk = totalUnits === match.units;
      const vhgOk = Math.abs(totalVHG - match.vhg) < 0.1;
      console.log(`${log.filiere.name} (${log.classe.label}): Units=${totalUnits} (Exp: ${match.units}) ${unitsOk ? '✅' : '❌'}, VHG=${totalVHG} (Exp: ${match.vhg}) ${vhgOk ? '✅' : '❌'}`);
      if (!unitsOk || !vhgOk) totalLoss = true;
    } else {
      console.log(`Unknown logigramme in DB: ${log.filiere.name} - ${log.classe.label} (Units=${totalUnits}, VHG=${totalVHG})`);
    }
  });

  if (!totalLoss) {
    console.log("\nMigration successful! No data loss detected in units/hours.");
  } else {
    console.log("\nDATA LOSS DETECTED! Check the discrepancies above.");
  }
}

verify();
```

path of the file : `backend/scripts/xls_stats.py`

```
import xlrd
import os

def get_stats(file_path):
    book = xlrd.open_workbook(file_path, formatting_info=True)
    results = []
    for sheet_name in book.sheet_names():
        if sheet_name == 'Feuil1': continue
        sheet = book.sheet_by_name(sheet_name)
        units_count = 0
        total_vhg = 0
        
        # Structure from parse_xls.py
        for row_idx in range(11, sheet.nrows):
            unit_num_cell = sheet.cell(row_idx, 0)
            unit_name_cell = sheet.cell(row_idx, 1)
            
            if unit_num_cell.ctype == xlrd.XL_CELL_EMPTY and unit_name_cell.ctype == xlrd.XL_CELL_EMPTY:
                continue
                
            if "total" in str(sheet.cell(row_idx, 2).value).lower():
                break
                
            units_count += 1
            try:
                total_vhg += float(sheet.cell(row_idx, 3).value)
            except:
                pass
        
        results.append({
            "sheet": sheet_name,
            "units": units_count,
            "vhg": total_vhg
        })
    return results

xls_dir = "backend/xls-files"
files = [f for f in os.listdir(xls_dir) if f.endswith('.xls')]

for file in files:
    print(f"File: {file}")
    stats = get_stats(os.path.join(xls_dir, file))
    for s in stats:
        print(f"  {s['sheet']}: Units={s['units']}, TotalVHG={s['vhg']}")
```

path of the file : `backend/scripts1/extract_workbooks.py`

```
#!/usr/bin/env python3
"""
Lossless workbook extractor for ESFPP legacy .xls files.

This script is intentionally separate from the DB importer:
- it preserves every raw cell in every sheet, including Feuil1/recap sheets;
- it records merged ranges and workbook dimensions;
- for valid logigramme sheets, it also embeds the structured parser output.

Use it before imports when you need an auditable, no-data-loss source snapshot.
"""

import argparse
import json
import os
import sys
from datetime import UTC, datetime, date
from pathlib import Path

import xlrd

SCRIPT_DIR = Path(__file__).resolve().parent
PARSER_DIR = SCRIPT_DIR.parent / "scripts"
sys.path.insert(0, str(PARSER_DIR))

from parse_xls import is_valid_logigramme_sheet, parse_xls  # noqa: E402


def json_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def read_raw_sheet(sheet):
    return [
        [json_value(sheet.cell_value(row_idx, col_idx)) for col_idx in range(sheet.ncols)]
        for row_idx in range(sheet.nrows)
    ]


def extract_file(file_path):
    book = xlrd.open_workbook(str(file_path), formatting_info=True)
    workbook = {
        "source_file": file_path.name,
        "source_path": str(file_path.resolve()),
        "datemode": book.datemode,
        "sheets": [],
    }

    for sheet_name in book.sheet_names():
        sheet = book.sheet_by_name(sheet_name)
        is_valid, reason = is_valid_logigramme_sheet(sheet)
        sheet_payload = {
            "name": sheet_name,
            "nrows": sheet.nrows,
            "ncols": sheet.ncols,
            "merged_cells": [
                {"row_start": rlo, "row_end": rhi, "col_start": clo, "col_end": chi}
                for (rlo, rhi, clo, chi) in getattr(sheet, "merged_cells", [])
            ],
            "is_logigramme_sheet": is_valid,
            "skip_reason": "" if is_valid else reason,
            "raw_grid": read_raw_sheet(sheet),
            "parsed": None,
            "parse_error": None,
        }

        if is_valid:
            try:
                sheet_payload["parsed"] = parse_xls(str(file_path), sheet_name, book=book)
            except Exception as exc:
                sheet_payload["parse_error"] = str(exc)

        workbook["sheets"].append(sheet_payload)

    return workbook


def main():
    parser = argparse.ArgumentParser(description="Extract full-fidelity JSON snapshots from ESFPP .xls files.")
    parser.add_argument("--dir", default=str(SCRIPT_DIR.parent.parent.parent / "excels"), help="Directory containing .xls files")
    parser.add_argument("--out", default=str(SCRIPT_DIR.parent / "import-reports" / "full-fidelity"), help="Output directory")
    args = parser.parse_args()

    src_dir = Path(args.dir).resolve()
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(src_dir.glob("*.xls"))
    if not files:
        raise SystemExit(f"No .xls files found in {src_dir}")

    manifest = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source_dir": str(src_dir),
        "output_dir": str(out_dir),
        "files": [],
    }

    for file_path in files:
        workbook = extract_file(file_path)
        safe_name = file_path.stem.replace("/", "_")
        out_path = out_dir / f"{safe_name}.full-fidelity.json"
        out_path.write_text(json.dumps(workbook, ensure_ascii=False, indent=2), encoding="utf-8")
        logigramme_sheets = [sheet for sheet in workbook["sheets"] if sheet["is_logigramme_sheet"]]
        manifest["files"].append({
            "source_file": file_path.name,
            "output_file": out_path.name,
            "sheet_count": len(workbook["sheets"]),
            "logigramme_sheet_count": len(logigramme_sheets),
            "unit_count": sum(len((sheet.get("parsed") or {}).get("unites", [])) for sheet in logigramme_sheets),
            "cell_count": sum(
                sum(len(unit.get("cells", [])) for unit in (sheet.get("parsed") or {}).get("unites", []))
                for sheet in logigramme_sheets
            ),
        })

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(files)} full-fidelity workbook snapshot(s) to {out_dir}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
```

path of the file : `backend/server.js`

```
import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { supabase, supabaseAdmin } from "./lib/supabase.js"
import { requireAuth, requireRole, requireServiceRole, getRole } from "./lib/auth.js"

// Routes
import logigrammesRouter from "./routes/logigrammes.js"
import completionRouter from "./routes/completion.js"
import filieresRouter from "./routes/filieres.js"
import formateursRouter from "./routes/formateurs.js"
import yearsRouter from "./routes/academic-years.js"

dotenv.config()

const app = express()

const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"

app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json())

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.role,
    },
  })
})

// ---------------------------------------------------------------------------
// Admin — Logigramme & Completion
// ---------------------------------------------------------------------------

app.use("/api/logigramme", requireAuth, requireRole("admin"), logigrammesRouter)
app.use("/api/completion", requireAuth, requireRole("admin"), completionRouter)
app.use("/api/filieres", requireAuth, requireRole("admin"), filieresRouter)
app.use("/api/formateurs", requireAuth, requireRole("admin"), formateursRouter)
app.use("/api/years", requireAuth, requireRole("admin"), yearsRouter)

// ---------------------------------------------------------------------------
// Student — Read-only Logigramme
// ---------------------------------------------------------------------------

app.get("/api/student/logigramme", requireAuth, async (req, res) => {
    // Students can see logigrammes for their own filiere
    // For now, let's just return what's available
    try {
        const { data, error } = await supabaseAdmin
            .from('logigrammes')
            .select(`
                id,
                filiere:filieres (id, code, name),
                classe:classes (id, label, annee),
                academic_year:academic_years (label)
            `)
            .eq('academic_years.is_current', true);
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// Admin — list users (with profile status from DB)
// ---------------------------------------------------------------------------

app.get("/api/admin/users", requireServiceRole, requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (error) {
      console.error("listUsers error:", error.message)
      return res.status(500).json({ error: error.message })
    }

    // Fetch all profiles in one query to get the real status from the DB
    const profileMap = {}
    const userIds = data.users.map((u) => u.id)

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, status, first_name, last_name")
        .in("id", userIds)

      if (profilesError) {
        console.error("profiles query error:", profilesError.message)
        // Continue without profiles — fall back to defaults
      }

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p
        }
      }
    }

    const users = data.users.map((user) => {
      const profile = profileMap[user.id]
      return {
        id: user.id,
        email: user.email,
        role: getRole(user),
        status: profile?.status || "invited",
        firstName: profile?.first_name || user.user_metadata?.first_name || "",
        lastName: profile?.last_name || user.user_metadata?.last_name || "",
      }
    })

    res.json({ users })
  } catch (err) {
    console.error("Unexpected error in /api/admin/users:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// ---------------------------------------------------------------------------
// Admin — create invitation (generates link, does NOT send email)
// ---------------------------------------------------------------------------

app.post("/api/admin/invitations", requireServiceRole, requireAuth, requireRole("admin"), async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase()
  const role = String(req.body.role || "student")

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" })
  }

  if (!["admin", "student"].includes(role)) {
    return res.status(400).json({ error: "Role must be admin or student" })
  }

  // Generate invitation link instead of sending email
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${FRONTEND_URL}/complete-account`,
      data: { role },
    },
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const userId = data.user?.id
  const inviteLink = data?.properties?.action_link

  if (!inviteLink) {
    return res.status(500).json({ error: "Supabase did not return an invitation link" })
  }

  // Create profile row with status and role
  if (userId) {
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      status: "invited",
      role,
    })
  }

  res.status(201).json({
    userId,
    email: data.user?.email || email,
    role,
    inviteLink,
    status: "invited",
  })
})

// ---------------------------------------------------------------------------
// Admin — regenerate invitation link
// ---------------------------------------------------------------------------

app.post("/api/admin/invitations/:userId/regenerate", requireServiceRole, requireAuth, requireRole("admin"), async (req, res) => {
  const { userId } = req.params

  // Look up the target user in Supabase Auth
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

  if (userError || !userData.user) {
    return res.status(404).json({ error: "User not found" })
  }

  const targetUser = userData.user

  // Look up profile status from DB (source of truth)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .single()

  if (profileError && profileError.code !== "PGRST116") {
    // PGRST116 = no rows returned — that's OK, means no profile yet
    return res.status(500).json({ error: "Could not look up profile" })
  }

  const status = profile?.status || "invited"

  // Rule 1: active users cannot get new invitations
  if (status === "active") {
    return res.status(409).json({ error: "Account already activated" })
  }

  // Rule 2: blocked users must be unblocked first
  if (status === "blocked") {
    return res.status(403).json({ error: "Account is blocked. Unblock the account before regenerating an invitation." })
  }

  // Generate a fresh invitation link (always fresh, never trust old links)
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: targetUser.email,
    options: {
      redirectTo: `${FRONTEND_URL}/complete-account`,
      data: { role: getRole(targetUser) },
    },
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const inviteLink = data?.properties?.action_link

  if (!inviteLink) {
    return res.status(500).json({ error: "Supabase did not return an invitation link" })
  }

  res.json({ inviteLink })
})

// ---------------------------------------------------------------------------
// Admin — complete account from backend (used by /complete-account page)
// This ensures status changes go through the backend, not directly from
// the frontend anon client.
// ---------------------------------------------------------------------------

app.post("/api/complete-account", requireAuth, async (req, res) => {
  const userId = req.user.id
  const firstName = String(req.body.firstName || "").trim()
  const lastName = String(req.body.lastName || "").trim()
  const password = String(req.body.password || "")

  if (!firstName || !lastName) {
    return res.status(400).json({ error: "First name and last name are required" })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" })
  }

  // Check current profile status — only invited/pending users may complete
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .single()

  if (profile?.status === "active") {
    return res.status(409).json({ error: "Account already activated" })
  }

  if (profile?.status === "blocked") {
    return res.status(403).json({ error: "Account is blocked" })
  }

  // Update auth user: set password + user_metadata
  const role = getRole(req.user)
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      nom: lastName,
      prenom: firstName,
      role,
    },
  })

  if (updateError) {
    return res.status(400).json({ error: updateError.message })
  }

  // Update profile to active
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    first_name: firstName,
    last_name: lastName,
    status: "active",
    role,
  })

  if (profileError) {
    return res.status(500).json({ error: profileError.message })
  }

  res.json({ message: "Account activated", role })
})

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({ error: "Internal server error" })
})

app.listen(PORT, () => {
  console.log(`Backend started on http://localhost:${PORT}`)
})
```

path of the file : `design-system/esfpp-dashboard/MASTER.md`

````
# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** ESFPP Dashboard
**Generated:** 2026-06-11 21:36:12
**Category:** Healthcare App

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#0891B2` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#22D3EE` | `--color-secondary` |
| Accent/CTA | `#059669` | `--color-accent` |
| Background | `#ECFEFF` | `--color-background` |
| Foreground | `#164E63` | `--color-foreground` |
| Muted | `#E8F1F6` | `--color-muted` |
| Border | `#A5F3FC` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| Ring | `#0891B2` | `--color-ring` |

**Color Notes:** Calm cyan + health green

### Typography

- **Heading Font:** Figtree
- **Body Font:** Noto Sans
- **Mood:** medical, clean, accessible, professional, healthcare, trustworthy
- **Google Fonts:** [Figtree + Noto Sans](https://fonts.google.com/share?selection.family=Figtree:wght@300;400;500;600;700|Noto+Sans:wght@300;400;500;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #059669;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #0891B2;
  border: 2px solid #0891B2;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #ECFEFF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #0891B2;
  outline: none;
  box-shadow: 0 0 0 3px #0891B220;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Accessible & Ethical

**Keywords:** High contrast, large text (16px+), keyboard navigation, screen reader friendly, WCAG compliant, focus state, semantic

**Best For:** Government, healthcare, education, inclusive products, large audience, legal compliance, public

**Key Effects:** Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets

### Page Pattern

**Pattern Name:** Comparison Table Focus

- **Conversion Strategy:** Show value vs competitors. 35% higher conversion. Be factual. Include pricing if favorable.
- **CTA Placement:** After comparison table (highlighted row) + Bottom
- **Section Order:** 1. Hero (problem statement), 2. Comparison matrix (you vs competitors), 3. Feature deep-dive, 4. Winner CTA

---

## Anti-Patterns (Do NOT Use)

- ❌ Bright neon colors
- ❌ Motion-heavy animations
- ❌ AI purple/pink gradients

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
````

path of the file : `design-system/esfpp-dashboard/pages/admin-dashboard.md`

```
# Admin Dashboard Page Overrides

> **PROJECT:** ESFPP Dashboard
> **Generated:** 2026-06-11 21:36:12
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** 1. Hero (product + live preview or status), 2. Key metrics/indicators, 3. How it works, 4. CTA (Start trial / Contact)

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Dark or neutral. Status colors (green/amber/red). Data-dense but scannable.

### Component Overrides

- Avoid: Static URLs for dynamic content

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Minimal glow (text-shadow: 0 0 10px), dark-to-light transitions, low white emission, high readability, visible focus
- Navigation: Update URL on state/view changes
- CTA Placement: Primary CTA in nav + After metrics
```

path of the file : `frontend/README.md`

```
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
```

path of the file : `frontend/eslint.config.js`

```
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
```

path of the file : `frontend/index.html`

```
<!doctype html>
<html lang="fr" class="bg-background">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>École des Sciences Infirmières — Connexion</title>
    <meta
      name="description"
      content="Connectez-vous pour accéder à vos cours, évaluations et plannings de stage de l'École des Sciences Infirmières."
    />
  </head>
  <body class="font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

path of the file : `frontend/package-lock.json`

```
{
  "name": "my-project",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "my-project",
      "version": "0.1.0",
      "dependencies": {
        "@base-ui/react": "^1.5.0",
        "@supabase/supabase-js": "^2.108.1",
        "@tailwindcss/oxide-linux-x64-gnu": "^4.3.0",
        "@tailwindcss/postcss": "^4.3.0",
        "@tailwindcss/vite": "^4.3.0",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "lightningcss-linux-x64-gnu": "^1.32.0",
        "lucide-react": "^1.16.0",
        "react": "^19",
        "react-dom": "^19",
        "shadcn": "^4.8.0",
        "sweetalert2": "^11.26.25",
        "tailwind-merge": "^3.3.1",
        "tw-animate-css": "^1.4.0"
      },
      "devDependencies": {
        "@tailwindcss/vite": "^4.2.0",
        "@vitejs/plugin-react": "^4.3.4",
        "autoprefixer": "^10.5.0",
        "postcss": "^8.5.15",
        "tailwindcss": "^4.2.0",
        "vite": "^6.0.7"
      }
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.2.0.tgz",
      "integrity": "sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@babel/code-frame": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.7.tgz",
      "integrity": "sha512-Aup7aUOfpbAUg2ROOJN6Iw5f9DMBlzu0mIkm/malLQFN/YQgO48wCj0Kxa3sEHJvPVFg7siR+qRInwXd2qhQKw==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.29.7",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.1.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.29.7.tgz",
      "integrity": "sha512-locTkQyKvwIEgBzVrn8693ebc97F2U8ZHjbXwDXJ5Fn2TCpNwTlKcaKLkdHop5c/icOFE7qt7Q9JC5hnKNa6Gg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.29.7.tgz",
      "integrity": "sha512-RgHBCvtjbOK2gXSNBNIkNoEc9qoVEtau3hj8gEqKQuL3HZAibKarWFEI3Lfm6EYKkLalOh8eSrj9b+ch9H/VBA==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/generator": "^7.29.7",
        "@babel/helper-compilation-targets": "^7.29.7",
        "@babel/helper-module-transforms": "^7.29.7",
        "@babel/helpers": "^7.29.7",
        "@babel/parser": "^7.29.7",
        "@babel/template": "^7.29.7",
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7",
        "@jridgewell/remapping": "^2.3.5",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.29.7.tgz",
      "integrity": "sha512-DkXD5OJQaAQIdZ1bt3UZdEnHAn9Imd3IVBdX03UFe+ony9Ojw5pzr9YVKGDY1jt+Gcn/FnGkNf8r+Vj5NOJWtQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.29.7",
        "@babel/types": "^7.29.7",
        "@jridgewell/gen-mapping": "^0.3.12",
        "@jridgewell/trace-mapping": "^0.3.28",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-annotate-as-pure": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-annotate-as-pure/-/helper-annotate-as-pure-7.29.7.tgz",
      "integrity": "sha512-OoK6239jHPuSQOoS0kfTVKn0b/rVTk0seKq4Gd2UMLtmOVLjDC0ki3e+c90Trqv2gMfvJFqkiljrr568+qddiw==",
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.29.7.tgz",
      "integrity": "sha512-wem6WaBj4NaVYVdNhLPPVacES6ZJ+KBBfSkTMD3YZxbP3rm3Di85tJU5ljaUNhaOynt+Aj0xruhYuzQBt8n71g==",
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.29.7",
        "@babel/helper-validator-option": "^7.29.7",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-create-class-features-plugin": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-create-class-features-plugin/-/helper-create-class-features-plugin-7.29.7.tgz",
      "integrity": "sha512-IY3ZD9Tmooqr3TUhc3DUWxiuo8xx1DWLhd5M7hQ+ZWJamqM2BbalrBJb2MisSLoYorOj75U03qULCxQTY9r3hg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-annotate-as-pure": "^7.29.7",
        "@babel/helper-member-expression-to-functions": "^7.29.7",
        "@babel/helper-optimise-call-expression": "^7.29.7",
        "@babel/helper-replace-supers": "^7.29.7",
        "@babel/helper-skip-transparent-expression-wrappers": "^7.29.7",
        "@babel/traverse": "^7.29.7",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-globals": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-globals/-/helper-globals-7.29.7.tgz",
      "integrity": "sha512-3nQVUAtvkKH9zahfWgw96Jc/uFOmjACE1kQz82E2lqWmHBgjzbNlsC22nuQTfahmWeQtTq5nQ/4Nnd2A1wj4zA==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-member-expression-to-functions": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-member-expression-to-functions/-/helper-member-expression-to-functions-7.29.7.tgz",
      "integrity": "sha512-j+7JYmk1JYDtACIGj0QJqqWZjoUpMoEikQGADMaHgCMCSDqd2+P32rfcibUNrGOMWrlzK1WJBdxrB3JJQZwWtg==",
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.29.7.tgz",
      "integrity": "sha512-ejHwrQQYcm9xnTivShn2IDOlIzInN34AXskvq9QicvCtEzq1Vzclu/tKF8Jq1Cg8JG2GL6/EmjgsCT7lXepE3g==",
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.29.7.tgz",
      "integrity": "sha512-UPUVSyXbOh627KiCIGQSgwWzGeBKLkaJ9PJEdrngIwMSzxLR4jS4+f1f1jb7VzBbg8nFLaYotvVPFCTqdrmTAg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.29.7",
        "@babel/helper-validator-identifier": "^7.29.7",
        "@babel/traverse": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-optimise-call-expression": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-optimise-call-expression/-/helper-optimise-call-expression-7.29.7.tgz",
      "integrity": "sha512-+kmGVjcT9RGYzoDwdwEqEvGgKe3BYq+O1iGzjFubaNgZHwYHP6lsF2Yghf4kEuv9BV7tYDZ913aBW9am6YKong==",
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-plugin-utils": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-plugin-utils/-/helper-plugin-utils-7.29.7.tgz",
      "integrity": "sha512-G7sHYigPY17oO5SYWnfD/0MTBwVR781S/JI643e/JhUYgVgWE/61SoW3NH9KWUKyKq5LVh3npif99Wkt6j86Jw==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-replace-supers": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-replace-supers/-/helper-replace-supers-7.29.7.tgz",
      "integrity": "sha512-atfGXWSeCiF4DnKZIfmJfQRkSw9b9gNNXR1kqKjbhG4pGYCOnkp8OcTB8E3NXjBu8NpheSnOeNKz8KT7UNFTmQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-member-expression-to-functions": "^7.29.7",
        "@babel/helper-optimise-call-expression": "^7.29.7",
        "@babel/traverse": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-skip-transparent-expression-wrappers": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-skip-transparent-expression-wrappers/-/helper-skip-transparent-expression-wrappers-7.29.7.tgz",
      "integrity": "sha512-brcMGQaVzIeUb+6/bs1Av0f8YuNNjKY2JyvfRCsFuFsdKccEQ5Ges2y74D74NZ1Rz8lKJ9ksJkfqwQFJ/iNEyQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.29.7.tgz",
      "integrity": "sha512-Pb5ijPrZ89GDH8223L4UP8i6QApWxs04RbPQJTeWDV0/keR2E36MeKnyr6LYmUUvqRRI+Iv87SuF1W6ErINzYw==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.29.7.tgz",
      "integrity": "sha512-qehxGkRj55h/ff8EMaJ+cYhyaKlHIxqYDn682wQD7RNp9UujOQsHog2uS0r2vzr4pW+sXf90NeeayjcNaX3fFg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.29.7.tgz",
      "integrity": "sha512-N9ZErrD+yW5geCDtBqnOoxmR8+tNKiGuxKlDpuJxfsqpa2dFcexaziGAE/qoHLiDDreVNMupxGmSoNlyvsA3gw==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helpers": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helpers/-/helpers-7.29.7.tgz",
      "integrity": "sha512-1k2lAGRMfHTcwuNYcCNUmaUffmQv8KWMfh2iJUUeRlwlwH4FdNG7mfPI10NPfLHJFThE4Tyr4mv7kTNZOiPuBg==",
      "license": "MIT",
      "dependencies": {
        "@babel/template": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.29.7.tgz",
      "integrity": "sha512-hnORnjP/1P/zFEndoeX+n+t1RwWRJiJpM/jO7FW32Kn9r5+sJB2JWOdYo4L6k78j15eCwY3Gm/7364B1EMwtNg==",
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.29.7"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/plugin-syntax-jsx": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-syntax-jsx/-/plugin-syntax-jsx-7.29.7.tgz",
      "integrity": "sha512-TSu8+mHCoEaaCDEZ0I3+6mvTBYR4PCxQwf2z9/r5Tbztv6NaLR3B9thGTTxX2WGuGHJqRiAbKPeGTJ5XWXVg6A==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-syntax-typescript": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-syntax-typescript/-/plugin-syntax-typescript-7.29.7.tgz",
      "integrity": "sha512-ngr+82Sh0xMz25TPCZi+nC2iTzjfCdWS2ONXTp/PtSCHCgaCNBpdMqgvJ2ccdLlClVZ7sisIgB914j/JFe+RZA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-modules-commonjs": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-modules-commonjs/-/plugin-transform-modules-commonjs-7.29.7.tgz",
      "integrity": "sha512-j0vCldybPC5b5dwCQOJ21uKtHzt7hxLygJTg9eF1ScfaikEDNfzn94XoW5Fi+seBR0nCyL23xaBFFkq7dTM8XQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-transforms": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-self": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-self/-/plugin-transform-react-jsx-self-7.29.7.tgz",
      "integrity": "sha512-TL0hMc9xzy86VD31nUiwzd5otRAcyEPcsegCxolO0PvcXuH1v0kECe/UIznYFihpkvU5wg/jk4v0TTEFfm53fw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-source": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-source/-/plugin-transform-react-jsx-source-7.29.7.tgz",
      "integrity": "sha512-06IyK09H3wi4cGbhDBwp5gUGo0IKtnYa8tyTiephirPCK6fbobVGiXMMI5zLQ4aKEYP3wZ3ArU44o+8KMrSG/Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-typescript": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-typescript/-/plugin-transform-typescript-7.29.7.tgz",
      "integrity": "sha512-jK52h8LaLc7JarhQV2ofeFMts4H7vnOXnqZNA6fYglBTZewRBE51KWt3BUltW1P+KoPsYkHoJeXePuz4zo2LMw==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-annotate-as-pure": "^7.29.7",
        "@babel/helper-create-class-features-plugin": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/helper-skip-transparent-expression-wrappers": "^7.29.7",
        "@babel/plugin-syntax-typescript": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/preset-typescript": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/preset-typescript/-/preset-typescript-7.29.7.tgz",
      "integrity": "sha512-/Foi8vKY2EVbed/1eZx0gJEEwHAIxogrySI7rULcRIvhZzbvoE/b5qG5Ghc0WKAFKOHA9SD1x7RsFlOYdutIiQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/helper-validator-option": "^7.29.7",
        "@babel/plugin-syntax-jsx": "^7.29.7",
        "@babel/plugin-transform-modules-commonjs": "^7.29.7",
        "@babel/plugin-transform-typescript": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/runtime": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/runtime/-/runtime-7.29.7.tgz",
      "integrity": "sha512-Nq8OhGWiZIZGV6hLHoyAKLLcJihP/xFeBMGJoUrxTX2psI8dCifzLhZISFb+VWS3wFMRDmCGw5R+dOySCqPLhw==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/template": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/template/-/template-7.29.7.tgz",
      "integrity": "sha512-puq+Gf35oI24FeN11LkoUQFqv9uwNeWpxXZi/Ji3rRIoKAzKnxRaZ+Gkj0vKS9ZCiTESfng1N9LyOyXvo+m+Gg==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/parser": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/traverse": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/traverse/-/traverse-7.29.7.tgz",
      "integrity": "sha512-EhlfNQtZ+NK22w5BM61ciuiq1m58ed33Wr1Xan//ZRTy6hgjnwyCffRYwzsGXdASJSUJ1guZILsErh1eQcl+zw==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/generator": "^7.29.7",
        "@babel/helper-globals": "^7.29.7",
        "@babel/parser": "^7.29.7",
        "@babel/template": "^7.29.7",
        "@babel/types": "^7.29.7",
        "debug": "^4.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/types": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/types/-/types-7.29.7.tgz",
      "integrity": "sha512-4zBIxpPzowiZpusoFkyGVwakdRJUyuH5PxQ/PrqghfdFWWasvnCdPfQXHrenDai+gyLARulZjZowCOj6fjT4pA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-string-parser": "^7.29.7",
        "@babel/helper-validator-identifier": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@base-ui/react": {
      "version": "1.5.0",
      "resolved": "https://registry.npmjs.org/@base-ui/react/-/react-1.5.0.tgz",
      "integrity": "sha512-z1gSAlced1yY+iM+mHDEtIkD8UI3Ebs52MuBPxvV6f5hRutk+xvCH/wuB7hDqDzK9JG5FoMz5nhrqtSs1wjt1A==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.29.2",
        "@base-ui/utils": "0.2.9",
        "@floating-ui/react-dom": "^2.1.8",
        "@floating-ui/utils": "^0.2.11",
        "use-sync-external-store": "^1.6.0"
      },
      "engines": {
        "node": ">=14.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/mui-org"
      },
      "peerDependencies": {
        "@date-fns/tz": "^1.2.0",
        "@types/react": "^17 || ^18 || ^19",
        "date-fns": "^4.0.0",
        "react": "^17 || ^18 || ^19",
        "react-dom": "^17 || ^18 || ^19"
      },
      "peerDependenciesMeta": {
        "@date-fns/tz": {
          "optional": true
        },
        "@types/react": {
          "optional": true
        },
        "date-fns": {
          "optional": true
        }
      }
    },
    "node_modules/@base-ui/utils": {
      "version": "0.2.9",
      "resolved": "https://registry.npmjs.org/@base-ui/utils/-/utils-0.2.9.tgz",
      "integrity": "sha512-x/PDDCYzoqPpjrdyb3VcyylTI2IjUXEtYDGi5foh7KsnmNJIIaVwA2GLgDH1dps1GgXiJbA60hM+AyuTfQzIvw==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.29.2",
        "@floating-ui/utils": "^0.2.11",
        "reselect": "^5.1.1",
        "use-sync-external-store": "^1.6.0"
      },
      "peerDependencies": {
        "@types/react": "^17 || ^18 || ^19",
        "react": "^17 || ^18 || ^19",
        "react-dom": "^17 || ^18 || ^19"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@dotenvx/dotenvx": {
      "version": "1.71.2",
      "resolved": "https://registry.npmjs.org/@dotenvx/dotenvx/-/dotenvx-1.71.2.tgz",
      "integrity": "sha512-Xj9T3Wr+Bo4ILKf9PZJBYJ4SJiZGC/pqIdzOMbX9jgAFb0oGuKkusLleYHN/N6zanZixNvmuMVWYR1T3YJuVTA==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "commander": "^11.1.0",
        "dotenv": "^17.2.1",
        "eciesjs": "^0.4.10",
        "enquirer": "^2.4.1",
        "execa": "^5.1.1",
        "fdir": "^6.2.0",
        "ignore": "^5.3.0",
        "object-treeify": "1.1.33",
        "picomatch": "^4.0.4",
        "which": "^4.0.0",
        "yocto-spinner": "^1.1.0"
      },
      "bin": {
        "dotenvx": "src/cli/dotenvx.js"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/@dotenvx/dotenvx/node_modules/commander": {
      "version": "11.1.0",
      "resolved": "https://registry.npmjs.org/commander/-/commander-11.1.0.tgz",
      "integrity": "sha512-yPVavfyCcRhmorC7rWlkHn15b4wDVgVmBA7kV4QVBsF7kv/9TKJAbAXVTxvTnwP8HHKjRCJDClKbciiYS7p0DQ==",
      "license": "MIT",
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/@dotenvx/dotenvx/node_modules/execa": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/execa/-/execa-5.1.1.tgz",
      "integrity": "sha512-8uSpZZocAZRBAPIEINJj3Lo9HyGitllczc27Eh5YYojjMFMn8yHMDMaUHE2Jqfq05D/wucwI4JGURyXt1vchyg==",
      "license": "MIT",
      "dependencies": {
        "cross-spawn": "^7.0.3",
        "get-stream": "^6.0.0",
        "human-signals": "^2.1.0",
        "is-stream": "^2.0.0",
        "merge-stream": "^2.0.0",
        "npm-run-path": "^4.0.1",
        "onetime": "^5.1.2",
        "signal-exit": "^3.0.3",
        "strip-final-newline": "^2.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sindresorhus/execa?sponsor=1"
      }
    },
    "node_modules/@dotenvx/dotenvx/node_modules/get-stream": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/get-stream/-/get-stream-6.0.1.tgz",
      "integrity": "sha512-ts6Wi+2j3jQjqi70w5AlN8DFnkSwC+MqmxEzdEALB2qXZYV3X/b1CTfgPLGJNMeAWxdPfU8FO1ms3NUfaHCPYg==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@dotenvx/dotenvx/node_modules/human-signals": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/human-signals/-/human-signals-2.1.0.tgz",
      "integrity": "sha512-B4FFZ6q/T2jhhksgkbEW3HBvWIfDW85snkQgawt07S7J5QXTk6BkNV+0yAeZrM5QpMAdYlocGoljn0sJ/WQkFw==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=10.17.0"
      }
    },
    "node_modules/@dotenvx/dotenvx/node_modules/is-stream": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/is-stream/-/is-stream-2.0.1.tgz",
      "integrity": "sha512-hFoiJiTl63nn+kstHGBtewWSKnQLpyb155KHheA1l39uvtO9nWIop1p3udqPcUd/xbF1VLMO4n7OI6p7RbngDg==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@dotenvx/dotenvx/node_modules/isexe": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-3.1.5.tgz",
      "integrity": "sha512-6B3tLtFqtQS4ekarvLVMZ+X+VlvQekbe4taUkf/rhVO3d/h0M2rfARm/pXLcPEsjjMsFgrFgSrhQIxcSVrBz8w==",
      "license": "BlueOak-1.0.0",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@dotenvx/dotenvx/node_modules/npm-run-path": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/npm-run-path/-/npm-run-path-4.0.1.tgz",
      "integrity": "sha512-S48WzZW777zhNIrn7gxOlISNAqi9ZC/uQFnRdbeIHhZhCA6UqpkOT8T1G7BvfdgP4Er8gF4sUbaS0i7QvIfCWw==",
      "license": "MIT",
      "dependencies": {
        "path-key": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/@dotenvx/dotenvx/node_modules/onetime": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/onetime/-/onetime-5.1.2.tgz",
      "integrity": "sha512-kbpaSSGJTWdAY5KPVeMOKXSrPtr8C8C7wodJbcsd51jRnmD+GZu8Y0VoU6Dm5Z4vWr0Ig/1NKuWRKf7j5aaYSg==",
      "license": "MIT",
      "dependencies": {
        "mimic-fn": "^2.1.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@dotenvx/dotenvx/node_modules/signal-exit": {
      "version": "3.0.7",
      "resolved": "https://registry.npmjs.org/signal-exit/-/signal-exit-3.0.7.tgz",
      "integrity": "sha512-wnD2ZE+l+SPC/uoS0vXeE9L1+0wuaMqKlfz9AMUo38JsyLSBWSFcHR1Rri62LZc12vLr1gb3jl7iwQhgwpAbGQ==",
      "license": "ISC"
    },
    "node_modules/@dotenvx/dotenvx/node_modules/strip-final-newline": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/strip-final-newline/-/strip-final-newline-2.0.0.tgz",
      "integrity": "sha512-BrpvfNAE3dcvq7ll3xVumzjKjZQ5tI1sEUIKr3Uoks0XUl45St3FlatVqef9prk4jRDzhW6WZg+3bk93y6pLjA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/@dotenvx/dotenvx/node_modules/which": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/which/-/which-4.0.0.tgz",
      "integrity": "sha512-GlaYyEb07DPxYCKhKzplCWBJtvxZcZMrL+4UkrTSJHHPyZU4mYYTv3qaOe77H7EODLSSopAUFAc6W8U4yqvscg==",
      "license": "ISC",
      "dependencies": {
        "isexe": "^3.1.1"
      },
      "bin": {
        "node-which": "bin/which.js"
      },
      "engines": {
        "node": "^16.13.0 || >=18.0.0"
      }
    },
    "node_modules/@ecies/ciphers": {
      "version": "0.2.6",
      "resolved": "https://registry.npmjs.org/@ecies/ciphers/-/ciphers-0.2.6.tgz",
      "integrity": "sha512-patgsRPKGkhhoBjETV4XxD0En4ui5fbX0hzayqI3M8tvNMGUoUvmyYAIWwlxBc1KX5cturfqByYdj5bYGRpN9g==",
      "license": "MIT",
      "engines": {
        "bun": ">=1",
        "deno": ">=2.7.10",
        "node": ">=16"
      },
      "peerDependencies": {
        "@noble/ciphers": "^1.0.0"
      }
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.25.12.tgz",
      "integrity": "sha512-Hhmwd6CInZ3dwpuGTF8fJG6yoWmsToE+vYgD4nytZVxcu1ulHpUQRAB1UJ8+N1Am3Mz4+xOByoQoSZf4D+CpkA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.25.12.tgz",
      "integrity": "sha512-VJ+sKvNA/GE7Ccacc9Cha7bpS8nyzVv0jdVgwNDaR4gDMC/2TTRc33Ip8qrNYUcpkOHUT5OZ0bUcNNVZQ9RLlg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.25.12.tgz",
      "integrity": "sha512-6AAmLG7zwD1Z159jCKPvAxZd4y/VTO0VkprYy+3N2FtJ8+BQWFXU+OxARIwA46c5tdD9SsKGZ/1ocqBS/gAKHg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.25.12.tgz",
      "integrity": "sha512-5jbb+2hhDHx5phYR2By8GTWEzn6I9UqR11Kwf22iKbNpYrsmRB18aX/9ivc5cabcUiAT/wM+YIZ6SG9QO6a8kg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.25.12.tgz",
      "integrity": "sha512-N3zl+lxHCifgIlcMUP5016ESkeQjLj/959RxxNYIthIg+CQHInujFuXeWbWMgnTo4cp5XVHqFPmpyu9J65C1Yg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.25.12.tgz",
      "integrity": "sha512-HQ9ka4Kx21qHXwtlTUVbKJOAnmG1ipXhdWTmNXiPzPfWKpXqASVcWdnf2bnL73wgjNrFXAa3yYvBSd9pzfEIpA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.25.12.tgz",
      "integrity": "sha512-gA0Bx759+7Jve03K1S0vkOu5Lg/85dou3EseOGUes8flVOGxbhDDh/iZaoek11Y8mtyKPGF3vP8XhnkDEAmzeg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.25.12.tgz",
      "integrity": "sha512-TGbO26Yw2xsHzxtbVFGEXBFH0FRAP7gtcPE7P5yP7wGy7cXK2oO7RyOhL5NLiqTlBh47XhmIUXuGciXEqYFfBQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.25.12.tgz",
      "integrity": "sha512-lPDGyC1JPDou8kGcywY0YILzWlhhnRjdof3UlcoqYmS9El818LLfJJc3PXXgZHrHCAKs/Z2SeZtDJr5MrkxtOw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.25.12.tgz",
      "integrity": "sha512-8bwX7a8FghIgrupcxb4aUmYDLp8pX06rGh5HqDT7bB+8Rdells6mHvrFHHW2JAOPZUbnjUpKTLg6ECyzvas2AQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.25.12.tgz",
      "integrity": "sha512-0y9KrdVnbMM2/vG8KfU0byhUN+EFCny9+8g202gYqSSVMonbsCfLjUO+rCci7pM0WBEtz+oK/PIwHkzxkyharA==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.25.12.tgz",
      "integrity": "sha512-h///Lr5a9rib/v1GGqXVGzjL4TMvVTv+s1DPoxQdz7l/AYv6LDSxdIwzxkrPW438oUXiDtwM10o9PmwS/6Z0Ng==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.25.12.tgz",
      "integrity": "sha512-iyRrM1Pzy9GFMDLsXn1iHUm18nhKnNMWscjmp4+hpafcZjrr2WbT//d20xaGljXDBYHqRcl8HnxbX6uaA/eGVw==",
      "cpu": [
        "mips64el"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.25.12.tgz",
      "integrity": "sha512-9meM/lRXxMi5PSUqEXRCtVjEZBGwB7P/D4yT8UG/mwIdze2aV4Vo6U5gD3+RsoHXKkHCfSxZKzmDssVlRj1QQA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.25.12.tgz",
      "integrity": "sha512-Zr7KR4hgKUpWAwb1f3o5ygT04MzqVrGEGXGLnj15YQDJErYu/BGg+wmFlIDOdJp0PmB0lLvxFIOXZgFRrdjR0w==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.25.12.tgz",
      "integrity": "sha512-MsKncOcgTNvdtiISc/jZs/Zf8d0cl/t3gYWX8J9ubBnVOwlk65UIEEvgBORTiljloIWnBzLs4qhzPkJcitIzIg==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.25.12.tgz",
      "integrity": "sha512-uqZMTLr/zR/ed4jIGnwSLkaHmPjOjJvnm6TVVitAa08SLS9Z0VM8wIRx7gWbJB5/J54YuIMInDquWyYvQLZkgw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.25.12.tgz",
      "integrity": "sha512-xXwcTq4GhRM7J9A8Gv5boanHhRa/Q9KLVmcyXHCTaM4wKfIpWkdXiMog/KsnxzJ0A1+nD+zoecuzqPmCRyBGjg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.25.12.tgz",
      "integrity": "sha512-Ld5pTlzPy3YwGec4OuHh1aCVCRvOXdH8DgRjfDy/oumVovmuSzWfnSJg+VtakB9Cm0gxNO9BzWkj6mtO1FMXkQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.25.12.tgz",
      "integrity": "sha512-fF96T6KsBo/pkQI950FARU9apGNTSlZGsv1jZBAlcLL1MLjLNIWPBkj5NlSz8aAzYKg+eNqknrUJ24QBybeR5A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.25.12.tgz",
      "integrity": "sha512-MZyXUkZHjQxUvzK7rN8DJ3SRmrVrke8ZyRusHlP+kuwqTcfWLyqMOE3sScPPyeIXN/mDJIfGXvcMqCgYKekoQw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openharmony-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.25.12.tgz",
      "integrity": "sha512-rm0YWsqUSRrjncSXGA7Zv78Nbnw4XL6/dzr20cyrQf7ZmRcsovpcRBdhD43Nuk3y7XIoW2OxMVvwuRvk9XdASg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.25.12.tgz",
      "integrity": "sha512-3wGSCDyuTHQUzt0nV7bocDy72r2lI33QL3gkDNGkod22EsYl04sMf0qLb8luNKTOmgF/eDEDP5BFNwoBKH441w==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.25.12.tgz",
      "integrity": "sha512-rMmLrur64A7+DKlnSuwqUdRKyd3UE7oPJZmnljqEptesKM8wx9J8gx5u0+9Pq0fQQW8vqeKebwNXdfOyP+8Bsg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.25.12.tgz",
      "integrity": "sha512-HkqnmmBoCbCwxUKKNPBixiWDGCpQGVsrQfJoVGYLPT41XWF8lHuE5N6WhVia2n4o5QK5M4tYr21827fNhi4byQ==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.25.12.tgz",
      "integrity": "sha512-alJC0uCZpTFrSL0CCDjcgleBXPnCrEAhTBILpeAp7M/OFgoqtAetfBzX0xM00MUsVVPpVjlPuMbREqnZCXaTnA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@floating-ui/core": {
      "version": "1.7.5",
      "resolved": "https://registry.npmjs.org/@floating-ui/core/-/core-1.7.5.tgz",
      "integrity": "sha512-1Ih4WTWyw0+lKyFMcBHGbb5U5FtuHJuujoyyr5zTaWS5EYMeT6Jb2AuDeftsCsEuchO+mM2ij5+q9crhydzLhQ==",
      "license": "MIT",
      "dependencies": {
        "@floating-ui/utils": "^0.2.11"
      }
    },
    "node_modules/@floating-ui/dom": {
      "version": "1.7.6",
      "resolved": "https://registry.npmjs.org/@floating-ui/dom/-/dom-1.7.6.tgz",
      "integrity": "sha512-9gZSAI5XM36880PPMm//9dfiEngYoC6Am2izES1FF406YFsjvyBMmeJ2g4SAju3xWwtuynNRFL2s9hgxpLI5SQ==",
      "license": "MIT",
      "dependencies": {
        "@floating-ui/core": "^1.7.5",
        "@floating-ui/utils": "^0.2.11"
      }
    },
    "node_modules/@floating-ui/react-dom": {
      "version": "2.1.8",
      "resolved": "https://registry.npmjs.org/@floating-ui/react-dom/-/react-dom-2.1.8.tgz",
      "integrity": "sha512-cC52bHwM/n/CxS87FH0yWdngEZrjdtLW/qVruo68qg+prK7ZQ4YGdut2GyDVpoGeAYe/h899rVeOVm6Oi40k2A==",
      "license": "MIT",
      "dependencies": {
        "@floating-ui/dom": "^1.7.6"
      },
      "peerDependencies": {
        "react": ">=16.8.0",
        "react-dom": ">=16.8.0"
      }
    },
    "node_modules/@floating-ui/utils": {
      "version": "0.2.11",
      "resolved": "https://registry.npmjs.org/@floating-ui/utils/-/utils-0.2.11.tgz",
      "integrity": "sha512-RiB/yIh78pcIxl6lLMG0CgBXAZ2Y0eVHqMPYugu+9U0AeT6YBeiJpf7lbdJNIugFP5SIjwNRgo4DhR1Qxi26Gg==",
      "license": "MIT"
    },
    "node_modules/@hono/node-server": {
      "version": "1.19.14",
      "resolved": "https://registry.npmjs.org/@hono/node-server/-/node-server-1.19.14.tgz",
      "integrity": "sha512-GwtvgtXxnWsucXvbQXkRgqksiH2Qed37H9xHZocE5sA3N8O8O8/8FA3uclQXxXVzc9XBZuEOMK7+r02FmSpHtw==",
      "license": "MIT",
      "engines": {
        "node": ">=18.14.1"
      },
      "peerDependencies": {
        "hono": "^4"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.13",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/remapping": {
      "version": "2.3.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/remapping/-/remapping-2.3.5.tgz",
      "integrity": "sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.5.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.5.tgz",
      "integrity": "sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==",
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.31",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.31.tgz",
      "integrity": "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@modelcontextprotocol/sdk": {
      "version": "1.29.0",
      "resolved": "https://registry.npmjs.org/@modelcontextprotocol/sdk/-/sdk-1.29.0.tgz",
      "integrity": "sha512-zo37mZA9hJWpULgkRpowewez1y6ML5GsXJPY8FI0tBBCd77HEvza4jDqRKOXgHNn867PVGCyTdzqpz0izu5ZjQ==",
      "license": "MIT",
      "dependencies": {
        "@hono/node-server": "^1.19.9",
        "ajv": "^8.17.1",
        "ajv-formats": "^3.0.1",
        "content-type": "^1.0.5",
        "cors": "^2.8.5",
        "cross-spawn": "^7.0.5",
        "eventsource": "^3.0.2",
        "eventsource-parser": "^3.0.0",
        "express": "^5.2.1",
        "express-rate-limit": "^8.2.1",
        "hono": "^4.11.4",
        "jose": "^6.1.3",
        "json-schema-typed": "^8.0.2",
        "pkce-challenge": "^5.0.0",
        "raw-body": "^3.0.0",
        "zod": "^3.25 || ^4.0",
        "zod-to-json-schema": "^3.25.1"
      },
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "@cfworker/json-schema": "^4.1.1",
        "zod": "^3.25 || ^4.0"
      },
      "peerDependenciesMeta": {
        "@cfworker/json-schema": {
          "optional": true
        },
        "zod": {
          "optional": false
        }
      }
    },
    "node_modules/@modelcontextprotocol/sdk/node_modules/ajv": {
      "version": "8.20.0",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-8.20.0.tgz",
      "integrity": "sha512-Thbli+OlOj+iMPYFBVBfJ3OmCAnaSyNn4M1vz9T6Gka5Jt9ba/HIR56joy65tY6kx/FCF5VXNB819Y7/GUrBGA==",
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.3",
        "fast-uri": "^3.0.1",
        "json-schema-traverse": "^1.0.0",
        "require-from-string": "^2.0.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/@modelcontextprotocol/sdk/node_modules/json-schema-traverse": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-1.0.0.tgz",
      "integrity": "sha512-NM8/P9n3XjXhIZn1lLhkFaACTOURQXjWhV4BA/RnOv8xvgqtqpAX9IO4mRQxSx1Rlo4tqzeqb0sOlruaOy3dug==",
      "license": "MIT"
    },
    "node_modules/@noble/ciphers": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/@noble/ciphers/-/ciphers-1.3.0.tgz",
      "integrity": "sha512-2I0gnIVPtfnMw9ee9h1dJG7tp81+8Ob3OJb3Mv37rx5L40/b0i7djjCVvGOVqc9AEIQyvyu1i6ypKdFw8R8gQw==",
      "license": "MIT",
      "engines": {
        "node": "^14.21.3 || >=16"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      }
    },
    "node_modules/@noble/curves": {
      "version": "1.9.7",
      "resolved": "https://registry.npmjs.org/@noble/curves/-/curves-1.9.7.tgz",
      "integrity": "sha512-gbKGcRUYIjA3/zCCNaWDciTMFI0dCkvou3TL8Zmy5Nc7sJ47a0jtOeZoTaMxkuqRo9cRhjOdZJXegxYE5FN/xw==",
      "license": "MIT",
      "dependencies": {
        "@noble/hashes": "1.8.0"
      },
      "engines": {
        "node": "^14.21.3 || >=16"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      }
    },
    "node_modules/@noble/hashes": {
      "version": "1.8.0",
      "resolved": "https://registry.npmjs.org/@noble/hashes/-/hashes-1.8.0.tgz",
      "integrity": "sha512-jCs9ldd7NwzpgXDIf6P3+NrHh9/sD6CQdxHyjQI+h/6rDNo88ypBxxz45UDuZHz9r3tNz7N/VInSVoVdtXEI4A==",
      "license": "MIT",
      "engines": {
        "node": "^14.21.3 || >=16"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      }
    },
    "node_modules/@nodelib/fs.scandir": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.scandir/-/fs.scandir-2.1.5.tgz",
      "integrity": "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==",
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "2.0.5",
        "run-parallel": "^1.1.9"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.stat": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.stat/-/fs.stat-2.0.5.tgz",
      "integrity": "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==",
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.walk": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.walk/-/fs.walk-1.2.8.tgz",
      "integrity": "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==",
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.scandir": "2.1.5",
        "fastq": "^1.6.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@rolldown/pluginutils": {
      "version": "1.0.0-beta.27",
      "resolved": "https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.0-beta.27.tgz",
      "integrity": "sha512-+d0F4MKMCbeVUJwG96uQ4SgAznZNSq93I3V+9NHA4OpvqG8mRCpGdKmK8l/dl02h2CCDHwW2FqilnTyDcAnqjA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@rollup/rollup-android-arm-eabi": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.61.1.tgz",
      "integrity": "sha512-JnBB8MdXj45cajvTuO5FmPlvFVJRQgvrz1uSEl3NwqFnReAPGwb8EanbGi4z2nRaqLzjJSv5/JmycoTKlRZxHA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-arm64": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.61.1.tgz",
      "integrity": "sha512-Jx2g7iSjw4AOT0HDPHM9RV3GNjRXwybWtSFZiZAYUTjUwjVrYIwq3kBf+LnhqJlzXFAqTAh2F7IGI+O568exPw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-darwin-arm64": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.61.1.tgz",
      "integrity": "sha512-0F1L/Z3Eqv8mT2n3dCpeO8GcTvHvVqkP5/t6DMsn0KzhYVcg+s7Ncl5DS8qjKYEeio6Az0Gt6nyBORay5qIlCA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-darwin-x64": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.61.1.tgz",
      "integrity": "sha512-qLttcH871ujY4YcVfUSShhOw+CsoTatYz8gRbHO7Bb92QH059/P0y5do1KMs41fY0BpD2x4AJH/gID0zFiqVKQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-arm64": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-arm64/-/rollup-freebsd-arm64-4.61.1.tgz",
      "integrity": "sha512-fUI4RapGE0Oh3mb8mgfvC1O2nU1RpDZUKnDQm3xB1Ipg7C2wTs5Kstz7G2uWK99a8S2yTMq8/P4uycwNa0nJyw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-x64": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-x64/-/rollup-freebsd-x64-4.61.1.tgz",
      "integrity": "sha512-H5YrdvJaDtI/U9/emrD4b++xkvp3y/JvOe4rizHbxvkyMfRS/CiRYdji+Pl8D0brEaNFWUh1drQxgAGIl6Xudw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-gnueabihf": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-gnueabihf/-/rollup-linux-arm-gnueabihf-4.61.1.tgz",
      "integrity": "sha512-Q8CBCCQtDFrYtXoeUXSrnFXKOnyUhx6bz+SkL6A0E7V8kAiCJ5pamq1WtbfpVGhR5TSpXY6ak3avmDc5fHTyJA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-musleabihf": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-musleabihf/-/rollup-linux-arm-musleabihf-4.61.1.tgz",
      "integrity": "sha512-nwnhk1581l0FBVellGcVCAT0Oi06onEA3WB53sf01VO3I0UPBkMH9sXONYME2K0ovXcNayJfNtHfm6mpJElatQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-gnu": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-gnu/-/rollup-linux-arm64-gnu-4.61.1.tgz",
      "integrity": "sha512-x5Xr49hwt3hdW75UOZm3395YwwzPyauktslv29KpWL/T+vVAzoT3azLcTWv0eMciBNrx+DYjH4paehHoLpPvpg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-musl": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-musl/-/rollup-linux-arm64-musl-4.61.1.tgz",
      "integrity": "sha512-unMS3H73DpaoPyyEVPjGKleM/s0mkmsauTENpw4INQY8y4+IuLNjkueQ5QCtC0D3N38Y38yhAU8OoZ20S2Tm6w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-gnu": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loong64-gnu/-/rollup-linux-loong64-gnu-4.61.1.tgz",
      "integrity": "sha512-zNZzGRnAhwjFEYmvphJRV5XaQGjs62cCmeYYHUT//NbvEnHauw+I85nGG+SiVg5ld4GX8D1IbKIX+ozITQnhMQ==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-musl": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loong64-musl/-/rollup-linux-loong64-musl-4.61.1.tgz",
      "integrity": "sha512-LdpWGL8X209B2SIvWjqlc8VZgM6PKfontSerGepuldQmHYrAOtnMCXeJkxXGbC+PPZVOuu5czJo7fNV6aeW8rQ==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-gnu": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-gnu/-/rollup-linux-ppc64-gnu-4.61.1.tgz",
      "integrity": "sha512-EC5kTtNaNGOmbMGqar8dvJy6y/hg99GAwjfBz++pxZhQATXGcRjd6c5en5wcbru0vkRmiMGsQKdMJOOf6sza4g==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-musl": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-musl/-/rollup-linux-ppc64-musl-4.61.1.tgz",
      "integrity": "sha512-8hiwp6D4acEcNK78I4rP0/XtS1sknWIAMJBPdR4l6zUtyTm5KiTDr5bXmWt4foY7nAN7AThDHgkLIEZOWKbzWw==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-gnu": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-gnu/-/rollup-linux-riscv64-gnu-4.61.1.tgz",
      "integrity": "sha512-10dh/h/BqA7DuMPWSxkR8uks18FRwnwOEqr5zOTEl+NOwP/OMzKX8OFR/Of9xxDA7D5qef1Nzar5WDD2kCCr1g==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-musl": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-musl/-/rollup-linux-riscv64-musl-4.61.1.tgz",
      "integrity": "sha512-YKJ5lg35DP17gcAOggnihe+APw9HLyj1Xn7gsmGumBJAUDa6NGXNixJzmkWLhcK9TOuuyQjdamzvJefkO7qHZQ==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-s390x-gnu": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-s390x-gnu/-/rollup-linux-s390x-gnu-4.61.1.tgz",
      "integrity": "sha512-Mlil5G2Jj6a7B3LWGctg+XPL9vdXYuzCtNXfxOQ0nPjc2m6ueUktocPGH9bnAM0bNRKb/bAWTujUU7IJQdQA+g==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-gnu": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.61.1.tgz",
      "integrity": "sha512-bVWIOIk6pV01p4CdUbPP7CJ/434z+OooYjDuFcR+44N35YvKUC66G8MGnvcWx5mWKW3g61J+t74l3Kj15Kwn2Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-musl": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-musl/-/rollup-linux-x64-musl-4.61.1.tgz",
      "integrity": "sha512-qy5pBvZbqNFheBz61R1rzsezjm0J7O2oNGoWtGoY89SZYLUfxAJTBAqDChqAIdB4rCiIbi9nF7yZ83GnNiLwSw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-openbsd-x64": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-openbsd-x64/-/rollup-openbsd-x64-4.61.1.tgz",
      "integrity": "sha512-E83TXjI4zm0+5f2qO+UOudaCYIhYwpJ5jq6YCZNIZ+6CbfhKrkAGezeiASBL9ElxAxFsRS9ZhESv8mfnj6TKeg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ]
    },
    "node_modules/@rollup/rollup-openharmony-arm64": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-openharmony-arm64/-/rollup-openharmony-arm64-4.61.1.tgz",
      "integrity": "sha512-fbWnKqVkjrJN38vNe3ahkbk6iejS/3b0Nt7EEtPpE6RBacZcGXNKbzfHN3GUUlXOPghUg0j6XUGrtjX9z1sIvA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ]
    },
    "node_modules/@rollup/rollup-win32-arm64-msvc": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-arm64-msvc/-/rollup-win32-arm64-msvc-4.61.1.tgz",
      "integrity": "sha512-ArMl38iVAbk0New1ogihQNY6iphLi4ZaRsa037gUzv5yeKPY8TD3Dmy4x2RNC1VztU/uqm+G+/RwFrSka3Oy2g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-ia32-msvc": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-ia32-msvc/-/rollup-win32-ia32-msvc-4.61.1.tgz",
      "integrity": "sha512-0mYtjHS9ucAbcATycCNK9IGBk/cCe/ma7EmSLGZdsxnOA8cjRIyU04wDpVAD9NiOfLUR9KTxdiO53uOkherqjQ==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-gnu": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-gnu/-/rollup-win32-x64-gnu-4.61.1.tgz",
      "integrity": "sha512-gK1iCEPfpoSG9wfBihXxvBMi8ZfcWffYkEsC/Eih+iFENTaewvNcrEQ69lIOWYO5pePHKLHHO7nq5AILGO/HQQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-msvc": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.61.1.tgz",
      "integrity": "sha512-X+zaP2x+j4RXGfbp/seSoRHWnPxzApilDszisZxbYH5C/jTxFhCtDNdPGZb9lJyYPs24wGxruPF7Y+sIXt9Gzw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@sec-ant/readable-stream": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/@sec-ant/readable-stream/-/readable-stream-0.4.1.tgz",
      "integrity": "sha512-831qok9r2t8AlxLko40y2ebgSDhenenCatLVeW/uBtnHPyhHOvG0C7TvfgecV+wHzIm5KUICgzmVpWS+IMEAeg==",
      "license": "MIT"
    },
    "node_modules/@sindresorhus/merge-streams": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/@sindresorhus/merge-streams/-/merge-streams-4.0.0.tgz",
      "integrity": "sha512-tlqY9xq5ukxTUZBmoOp+m61cqwQD5pHJtFY3Mn8CA8ps6yghLH/Hw8UPdqg4OLmFW3IFlcXnQNmo/dh8HzXYIQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@supabase/auth-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/auth-js/-/auth-js-2.108.1.tgz",
      "integrity": "sha512-Lle5rKU8f9LF3K5dDd8Or8mkkG+ptzRZZWKPVMm9B9UuovH65Ss2+iFnQqRsCqaGouvJEcTWyl0cj2riNrrDLQ==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/functions-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/functions-js/-/functions-js-2.108.1.tgz",
      "integrity": "sha512-fxBRW/A4IG7ADQztVt0NaEy5ysiO1WJ2pbldsnBchrkHuyepX0Krek9qA9T4gUQBVVTCE9Ea4pdsM5hfn3nc4A==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/phoenix": {
      "version": "0.4.2",
      "resolved": "https://registry.npmjs.org/@supabase/phoenix/-/phoenix-0.4.2.tgz",
      "integrity": "sha512-YSAGnmDAfuleFCVt3CeurQZAhxRfXWeZIIkwp7NhYzQ1UwW6ePSnzsFAiUm/mbCkfoCf70QQHKW/K6RKh52a4A==",
      "license": "MIT"
    },
    "node_modules/@supabase/postgrest-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/postgrest-js/-/postgrest-js-2.108.1.tgz",
      "integrity": "sha512-9lj2MCPPMgSTaJ5y+amnhb3TWPtMFVlbDn2hmX/VV91xQU4j0AauwfMaBErHBJ+zzsSwjc0jLU+zLIZFLQzfig==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/realtime-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/realtime-js/-/realtime-js-2.108.1.tgz",
      "integrity": "sha512-mHGGqOjwd1XTydcoffUqEMsbFQHUi6A3uhQ0EXr3iqzpLqItxKA9nbN6gIQxrZ7JRRnuUe/iOFPUkYV9Tdc5lg==",
      "license": "MIT",
      "dependencies": {
        "@supabase/phoenix": "^0.4.2",
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/storage-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/storage-js/-/storage-js-2.108.1.tgz",
      "integrity": "sha512-Er0SGGt85iT6ye+SSh98Az6L2CesoZJuyzEZYH2oBOAnIxa9Nn4CtwUC3veGxYggoT56X+3tVuuQeDBP8kR8sg==",
      "license": "MIT",
      "dependencies": {
        "iceberg-js": "^0.8.1",
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@supabase/supabase-js": {
      "version": "2.108.1",
      "resolved": "https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.108.1.tgz",
      "integrity": "sha512-V/1hRKLSCJ0zEL+9QFRBUtivvePfOsaAYQmC0HhFNSHC2F3xFs4jSF3YhkLmzex6E4V4FGvmBDOP72D/53NnZA==",
      "license": "MIT",
      "dependencies": {
        "@supabase/auth-js": "2.108.1",
        "@supabase/functions-js": "2.108.1",
        "@supabase/postgrest-js": "2.108.1",
        "@supabase/realtime-js": "2.108.1",
        "@supabase/storage-js": "2.108.1"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@tailwindcss/node": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/@tailwindcss/node/-/node-4.3.0.tgz",
      "integrity": "sha512-aFb4gUhFOgdh9AXo4IzBEOzBkkAxm9VigwDJnMIYv3lcfXCJVesNfbEaBl4BNgVRyid92AmdviqwBUBRKSeY3g==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/remapping": "^2.3.5",
        "enhanced-resolve": "^5.21.0",
        "jiti": "^2.6.1",
        "lightningcss": "1.32.0",
        "magic-string": "^0.30.21",
        "source-map-js": "^1.2.1",
        "tailwindcss": "4.3.0"
      }
    },
    "node_modules/@tailwindcss/oxide": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide/-/oxide-4.3.0.tgz",
      "integrity": "sha512-F7HZGBeN9I0/AuuJS5PwcD8xayx5ri5GhjYUDBEVYUkexyA/giwbDNjRVrxSezE3T250OU2K/wp/ltWx3UOefg==",
      "license": "MIT",
      "engines": {
        "node": ">= 20"
      },
      "optionalDependencies": {
        "@tailwindcss/oxide-android-arm64": "4.3.0",
        "@tailwindcss/oxide-darwin-arm64": "4.3.0",
        "@tailwindcss/oxide-darwin-x64": "4.3.0",
        "@tailwindcss/oxide-freebsd-x64": "4.3.0",
        "@tailwindcss/oxide-linux-arm-gnueabihf": "4.3.0",
        "@tailwindcss/oxide-linux-arm64-gnu": "4.3.0",
        "@tailwindcss/oxide-linux-arm64-musl": "4.3.0",
        "@tailwindcss/oxide-linux-x64-gnu": "4.3.0",
        "@tailwindcss/oxide-linux-x64-musl": "4.3.0",
        "@tailwindcss/oxide-wasm32-wasi": "4.3.0",
        "@tailwindcss/oxide-win32-arm64-msvc": "4.3.0",
        "@tailwindcss/oxide-win32-x64-msvc": "4.3.0"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-x64-gnu": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-gnu/-/oxide-linux-x64-gnu-4.3.0.tgz",
      "integrity": "sha512-DRNdQRpSGzRGfARVuVkxvM8Q12nh19l4BF/G7zGA1oe+9wcC6saFBHTISrpIcKzhiXtSrlSrluCfvMuledoCTQ==",
      "cpu": [
        "x64"
      ],
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-win32-x64-msvc": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-x64-msvc/-/oxide-win32-x64-msvc-4.3.0.tgz",
      "integrity": "sha512-Mvrf2kXW/yeW/OTezZlCGOirXRcUuLIBx/5Y12BaPM7wJoryG6dfS/NJL8aBPqtTEx/Vm4T4vKzFUcKDT+TKUA==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/postcss": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/@tailwindcss/postcss/-/postcss-4.3.0.tgz",
      "integrity": "sha512-Jm05Tjx+9yCLGv5qw1c+84Psds8MnyrEQYCB+FFk2lgGiUjlRqdxke4mVTuYrj2xnVZqKim2Apr5ySuQRYAw/w==",
      "license": "MIT",
      "dependencies": {
        "@alloc/quick-lru": "^5.2.0",
        "@tailwindcss/node": "4.3.0",
        "@tailwindcss/oxide": "4.3.0",
        "postcss": "^8.5.10",
        "tailwindcss": "4.3.0"
      }
    },
    "node_modules/@tailwindcss/vite": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/@tailwindcss/vite/-/vite-4.3.0.tgz",
      "integrity": "sha512-t6J3OrB5Fc0ExuhohouH0fWUGMYL6PTLhW+E7zIk/pdbnJARZDCwjBznFnkh5ynRnIRSI4YjtTH0t6USjJISrw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@tailwindcss/node": "4.3.0",
        "@tailwindcss/oxide": "4.3.0",
        "tailwindcss": "4.3.0"
      },
      "peerDependencies": {
        "vite": "^5.2.0 || ^6 || ^7 || ^8"
      }
    },
    "node_modules/@ts-morph/common": {
      "version": "0.27.0",
      "resolved": "https://registry.npmjs.org/@ts-morph/common/-/common-0.27.0.tgz",
      "integrity": "sha512-Wf29UqxWDpc+i61k3oIOzcUfQt79PIT9y/MWfAGlrkjg6lBC1hwDECLXPVJAhWjiGbfBCxZd65F/LIZF3+jeJQ==",
      "license": "MIT",
      "dependencies": {
        "fast-glob": "^3.3.3",
        "minimatch": "^10.0.1",
        "path-browserify": "^1.0.1"
      }
    },
    "node_modules/@types/babel__core": {
      "version": "7.20.5",
      "resolved": "https://registry.npmjs.org/@types/babel__core/-/babel__core-7.20.5.tgz",
      "integrity": "sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.20.7",
        "@babel/types": "^7.20.7",
        "@types/babel__generator": "*",
        "@types/babel__template": "*",
        "@types/babel__traverse": "*"
      }
    },
    "node_modules/@types/babel__generator": {
      "version": "7.27.0",
      "resolved": "https://registry.npmjs.org/@types/babel__generator/-/babel__generator-7.27.0.tgz",
      "integrity": "sha512-ufFd2Xi92OAVPYsy+P4n7/U7e68fex0+Ee8gSG9KX7eo084CWiQ4sdxktvdl0bOPupXtVJPY19zk6EwWqUQ8lg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__template": {
      "version": "7.4.4",
      "resolved": "https://registry.npmjs.org/@types/babel__template/-/babel__template-7.4.4.tgz",
      "integrity": "sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.1.0",
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__traverse": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@types/babel__traverse/-/babel__traverse-7.28.0.tgz",
      "integrity": "sha512-8PvcXf70gTDZBgt9ptxJ8elBeBjcLOAcOtoO/mPJjtji1+CdGbHgm77om1GrsPxsiE+uXIpNSK64UYaIwQXd4Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.28.2"
      }
    },
    "node_modules/@types/estree": {
      "version": "1.0.9",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.9.tgz",
      "integrity": "sha512-GhdPgy1el4/ImP05X05Uw4cw2/M93BCUmnEvWZNStlCzEKME4Fkk+YpoA5OiHNQmoS7Cafb8Xa3Pya8m1Qrzeg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/react": {
      "version": "19.2.17",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.2.17.tgz",
      "integrity": "sha512-MXfmqaVPEVgkBT/aY0aGCkRWWtByiYQXo3xdQ8r5RzuFrPiRn8Gar2tQdXSUQ2GKV3bkXckek89V8wQBY2Q/Aw==",
      "license": "MIT",
      "optional": true,
      "peer": true,
      "dependencies": {
        "csstype": "^3.2.2"
      }
    },
    "node_modules/@types/validate-npm-package-name": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/@types/validate-npm-package-name/-/validate-npm-package-name-4.0.2.tgz",
      "integrity": "sha512-lrpDziQipxCEeK5kWxvljWYhUvOiB2A9izZd9B2AFarYAkqZshb4lPbRs7zKEic6eGtH8V/2qJW+dPp9OtF6bw==",
      "license": "MIT"
    },
    "node_modules/@vitejs/plugin-react": {
      "version": "4.7.0",
      "resolved": "https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-4.7.0.tgz",
      "integrity": "sha512-gUu9hwfWvvEDBBmgtAowQCojwZmJ5mcLn3aufeCsitijs3+f2NsrPtlAWIR6OPiqljl96GVCUbLe0HyqIpVaoA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.28.0",
        "@babel/plugin-transform-react-jsx-self": "^7.27.1",
        "@babel/plugin-transform-react-jsx-source": "^7.27.1",
        "@rolldown/pluginutils": "1.0.0-beta.27",
        "@types/babel__core": "^7.20.5",
        "react-refresh": "^0.17.0"
      },
      "engines": {
        "node": "^14.18.0 || >=16.0.0"
      },
      "peerDependencies": {
        "vite": "^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0"
      }
    },
    "node_modules/accepts": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-2.0.0.tgz",
      "integrity": "sha512-5cvg6CtKwfgdmVqY1WIiXKc3Q1bkRqGLi+2W/6ao+6Y7gu/RCwRuAhGEzh5B4KlszSuTLgZYuqFqo5bImjNKng==",
      "license": "MIT",
      "dependencies": {
        "mime-types": "^3.0.0",
        "negotiator": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/agent-base": {
      "version": "7.1.4",
      "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-7.1.4.tgz",
      "integrity": "sha512-MnA+YT8fwfJPgBx3m60MNqakm30XOkyIoH1y6huTQvC0PwZG7ki8NacLBcrPbNoo8vEZy7Jpuk7+jMO+CUovTQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/ajv-formats": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/ajv-formats/-/ajv-formats-3.0.1.tgz",
      "integrity": "sha512-8iUql50EUR+uUcdRQ3HDqa6EVyo3docL8g5WJ3FNcWmu62IbkGUue/pEyLBW8VGKKucTPgqeks4fIU1DA4yowQ==",
      "license": "MIT",
      "dependencies": {
        "ajv": "^8.0.0"
      },
      "peerDependencies": {
        "ajv": "^8.0.0"
      },
      "peerDependenciesMeta": {
        "ajv": {
          "optional": true
        }
      }
    },
    "node_modules/ajv-formats/node_modules/ajv": {
      "version": "8.20.0",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-8.20.0.tgz",
      "integrity": "sha512-Thbli+OlOj+iMPYFBVBfJ3OmCAnaSyNn4M1vz9T6Gka5Jt9ba/HIR56joy65tY6kx/FCF5VXNB819Y7/GUrBGA==",
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.3",
        "fast-uri": "^3.0.1",
        "json-schema-traverse": "^1.0.0",
        "require-from-string": "^2.0.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ajv-formats/node_modules/json-schema-traverse": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-1.0.0.tgz",
      "integrity": "sha512-NM8/P9n3XjXhIZn1lLhkFaACTOURQXjWhV4BA/RnOv8xvgqtqpAX9IO4mRQxSx1Rlo4tqzeqb0sOlruaOy3dug==",
      "license": "MIT"
    },
    "node_modules/ansi-colors": {
      "version": "4.1.3",
      "resolved": "https://registry.npmjs.org/ansi-colors/-/ansi-colors-4.1.3.tgz",
      "integrity": "sha512-/6w/C21Pm1A7aZitlI5Ni/2J6FFQN8i1Cvz3kHABAAbw93v/NlvKdVOqz7CCWz/3iv/JplRSEEZ83XION15ovw==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "license": "Python-2.0"
    },
    "node_modules/ast-types": {
      "version": "0.16.1",
      "resolved": "https://registry.npmjs.org/ast-types/-/ast-types-0.16.1.tgz",
      "integrity": "sha512-6t10qk83GOG8p0vKmaCr8eiilZwO171AvbROMtvvNiwrTly62t+7XkA8RdIIVbpMhCASAsxgAzdRSwh6nw/5Dg==",
      "license": "MIT",
      "dependencies": {
        "tslib": "^2.0.1"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/autoprefixer": {
      "version": "10.5.0",
      "resolved": "https://registry.npmjs.org/autoprefixer/-/autoprefixer-10.5.0.tgz",
      "integrity": "sha512-FMhOoZV4+qR6aTUALKX2rEqGG+oyATvwBt9IIzVR5rMa2HRWPkxf+P+PAJLD1I/H5/II+HuZcBJYEFBpq39ong==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/autoprefixer"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "dependencies": {
        "browserslist": "^4.28.2",
        "caniuse-lite": "^1.0.30001787",
        "fraction.js": "^5.3.4",
        "picocolors": "^1.1.1",
        "postcss-value-parser": "^4.2.0"
      },
      "bin": {
        "autoprefixer": "bin/autoprefixer"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      },
      "peerDependencies": {
        "postcss": "^8.1.0"
      }
    },
    "node_modules/balanced-match": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz",
      "integrity": "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==",
      "license": "MIT",
      "engines": {
        "node": "18 || 20 || >=22"
      }
    },
    "node_modules/baseline-browser-mapping": {
      "version": "2.10.35",
      "resolved": "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.10.35.tgz",
      "integrity": "sha512-honAfLBde0HAFLdNyBEfuuENkF6zR+ozxqxa/2zJKHBe1qzLqyTSeRKpdPEHAP03rlDGyQOPnCSxnVpVqQo9Mg==",
      "license": "Apache-2.0",
      "bin": {
        "baseline-browser-mapping": "dist/cli.cjs"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/body-parser": {
      "version": "2.2.2",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-2.2.2.tgz",
      "integrity": "sha512-oP5VkATKlNwcgvxi0vM0p/D3n2C3EReYVX+DNYs5TjZFn/oQt2j+4sVJtSMr18pdRr8wjTcBl6LoV+FUwzPmNA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "^3.1.2",
        "content-type": "^1.0.5",
        "debug": "^4.4.3",
        "http-errors": "^2.0.0",
        "iconv-lite": "^0.7.0",
        "on-finished": "^2.4.1",
        "qs": "^6.14.1",
        "raw-body": "^3.0.1",
        "type-is": "^2.0.1"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/brace-expansion": {
      "version": "5.0.6",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.6.tgz",
      "integrity": "sha512-kLpxurY4Z4r9sgMsyG0Z9uzsBlgiU/EFKhj/h91/8yHu0edo7XuixOIH3VcJ8kkxs6/jPzoI6U9Vj3WqbMQ94g==",
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^4.0.2"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      }
    },
    "node_modules/braces": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/braces/-/braces-3.0.3.tgz",
      "integrity": "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==",
      "license": "MIT",
      "dependencies": {
        "fill-range": "^7.1.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/browserslist": {
      "version": "4.28.2",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.28.2.tgz",
      "integrity": "sha512-48xSriZYYg+8qXna9kwqjIVzuQxi+KYWp2+5nCYnYKPTr0LvD89Jqk2Or5ogxz0NUMfIjhh2lIUX/LyX9B4oIg==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "baseline-browser-mapping": "^2.10.12",
        "caniuse-lite": "^1.0.30001782",
        "electron-to-chromium": "^1.5.328",
        "node-releases": "^2.0.36",
        "update-browserslist-db": "^1.2.3"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/bundle-name": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/bundle-name/-/bundle-name-4.1.0.tgz",
      "integrity": "sha512-tjwM5exMg6BGRI+kNmTntNsvdZS1X8BFYS6tnJ2hdH0kVxM6/eVZ2xy+FqStSWvYmtfFMDLIxurorHwDKfDz5Q==",
      "license": "MIT",
      "dependencies": {
        "run-applescript": "^7.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/bytes": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/bytes/-/bytes-3.1.2.tgz",
      "integrity": "sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/call-bound": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "get-intrinsic": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/callsites": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/callsites/-/callsites-3.1.0.tgz",
      "integrity": "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001797",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001797.tgz",
      "integrity": "sha512-l8xKG+gwAIExZGl9FrF7KUwuOmk6wbEPC9Xoy/RtnWv1XG0Q4LFlagaLpUv3Kiza3W/wm27zy0yWJEieYKAP6w==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chalk": {
      "version": "5.6.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-5.6.2.tgz",
      "integrity": "sha512-7NzBL0rN6fMUW+f7A6Io4h40qQlG+xGmtMxfbnH/K7TAtt8JQWVQK+6g0UXKMeVJoyV5EkkNsErQ8pVD3bLHbA==",
      "license": "MIT",
      "engines": {
        "node": "^12.17.0 || ^14.13 || >=16.0.0"
      },
      "funding": {
        "url": "https://github.com/chalk/chalk?sponsor=1"
      }
    },
    "node_modules/class-variance-authority": {
      "version": "0.7.1",
      "resolved": "https://registry.npmjs.org/class-variance-authority/-/class-variance-authority-0.7.1.tgz",
      "integrity": "sha512-Ka+9Trutv7G8M6WT6SeiRWz792K5qEqIGEGzXKhAE6xOWAY6pPH8U+9IY3oCMv6kqTmLsv7Xh/2w2RigkePMsg==",
      "license": "Apache-2.0",
      "dependencies": {
        "clsx": "^2.1.1"
      },
      "funding": {
        "url": "https://polar.sh/cva"
      }
    },
    "node_modules/cli-cursor": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/cli-cursor/-/cli-cursor-5.0.0.tgz",
      "integrity": "sha512-aCj4O5wKyszjMmDT4tZj93kxyydN/K5zPWSCe6/0AV/AA1pqe5ZBIw0a2ZfPQV7lL5/yb5HsUreJ6UFAF1tEQw==",
      "license": "MIT",
      "dependencies": {
        "restore-cursor": "^5.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/cli-spinners": {
      "version": "2.9.2",
      "resolved": "https://registry.npmjs.org/cli-spinners/-/cli-spinners-2.9.2.tgz",
      "integrity": "sha512-ywqV+5MmyL4E7ybXgKys4DugZbX0FC6LnwrhjuykIjnK9k8OQacQ7axGKnjDXWNhns0xot3bZI5h55H8yo9cJg==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/clsx": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/clsx/-/clsx-2.1.1.tgz",
      "integrity": "sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/code-block-writer": {
      "version": "13.0.3",
      "resolved": "https://registry.npmjs.org/code-block-writer/-/code-block-writer-13.0.3.tgz",
      "integrity": "sha512-Oofo0pq3IKnsFtuHqSF7TqBfr71aeyZDVJ0HpmqB7FBM2qEigL0iPONSCZSO9pE9dZTAxANe5XHG9Uy0YMv8cg==",
      "license": "MIT"
    },
    "node_modules/commander": {
      "version": "14.0.3",
      "resolved": "https://registry.npmjs.org/commander/-/commander-14.0.3.tgz",
      "integrity": "sha512-H+y0Jo/T1RZ9qPP4Eh1pkcQcLRglraJaSLoyOtHxu6AapkjWVCy2Sit1QQ4x3Dng8qDlSsZEet7g5Pq06MvTgw==",
      "license": "MIT",
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/content-disposition": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/content-disposition/-/content-disposition-1.1.0.tgz",
      "integrity": "sha512-5jRCH9Z/+DRP7rkvY83B+yGIGX96OYdJmzngqnw2SBSxqCFPd0w2km3s5iawpGX8krnwSGmF0FW5Nhr0Hfai3g==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/content-type": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/content-type/-/content-type-1.0.5.tgz",
      "integrity": "sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/convert-source-map": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/convert-source-map/-/convert-source-map-2.0.0.tgz",
      "integrity": "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==",
      "license": "MIT"
    },
    "node_modules/cookie-signature": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/cookie-signature/-/cookie-signature-1.2.2.tgz",
      "integrity": "sha512-D76uU73ulSXrD1UXF4KE2TMxVVwhsnCgfAyTg9k8P6KGZjlXKrOLe4dJQKI3Bxi5wjesZoFXJWElNWBjPZMbhg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.6.0"
      }
    },
    "node_modules/cors": {
      "version": "2.8.6",
      "resolved": "https://registry.npmjs.org/cors/-/cors-2.8.6.tgz",
      "integrity": "sha512-tJtZBBHA6vjIAaF6EnIaq6laBBP9aq/Y3ouVJjEfoHbRBcHBAHYcMh/w8LDrk2PvIMMq8gmopa5D4V8RmbrxGw==",
      "license": "MIT",
      "dependencies": {
        "object-assign": "^4",
        "vary": "^1"
      },
      "engines": {
        "node": ">= 0.10"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/cosmiconfig": {
      "version": "9.0.2",
      "resolved": "https://registry.npmjs.org/cosmiconfig/-/cosmiconfig-9.0.2.tgz",
      "integrity": "sha512-gtTZxTDau1wL7Y7zifc2dd8jHSK/k6BTx/2Xp/BpdlAdnlYWFVt7qhJqgwi7637yRwRQ3qL4ZidbB4I8tA5VOg==",
      "license": "MIT",
      "dependencies": {
        "env-paths": "^2.2.1",
        "import-fresh": "^3.3.0",
        "js-yaml": "^4.1.0",
        "parse-json": "^5.2.0"
      },
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/d-fischer"
      },
      "peerDependencies": {
        "typescript": ">=4.9.5"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz",
      "integrity": "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==",
      "license": "MIT",
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/cssesc": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/cssesc/-/cssesc-3.0.0.tgz",
      "integrity": "sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg==",
      "license": "MIT",
      "bin": {
        "cssesc": "bin/cssesc"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/csstype": {
      "version": "3.2.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz",
      "integrity": "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==",
      "license": "MIT",
      "optional": true,
      "peer": true
    },
    "node_modules/data-uri-to-buffer": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/data-uri-to-buffer/-/data-uri-to-buffer-4.0.1.tgz",
      "integrity": "sha512-0R9ikRb668HB7QDxT1vkpuUBtqc53YyAwMwGeUFKRojY/NWKvdZ+9UYtRfGmhqNbRkTSVpMbmyhXipFFv2cb/A==",
      "license": "MIT",
      "engines": {
        "node": ">= 12"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/dedent": {
      "version": "1.7.2",
      "resolved": "https://registry.npmjs.org/dedent/-/dedent-1.7.2.tgz",
      "integrity": "sha512-WzMx3mW98SN+zn3hgemf4OzdmyNhhhKz5Ay0pUfQiMQ3e1g+xmTJWp/pKdwKVXhdSkAEGIIzqeuWrL3mV/AXbA==",
      "license": "MIT",
      "peerDependencies": {
        "babel-plugin-macros": "^3.1.0"
      },
      "peerDependenciesMeta": {
        "babel-plugin-macros": {
          "optional": true
        }
      }
    },
    "node_modules/deepmerge": {
      "version": "4.3.1",
      "resolved": "https://registry.npmjs.org/deepmerge/-/deepmerge-4.3.1.tgz",
      "integrity": "sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/default-browser": {
      "version": "5.5.0",
      "resolved": "https://registry.npmjs.org/default-browser/-/default-browser-5.5.0.tgz",
      "integrity": "sha512-H9LMLr5zwIbSxrmvikGuI/5KGhZ8E2zH3stkMgM5LpOWDutGM2JZaj460Udnf1a+946zc7YBgrqEWwbk7zHvGw==",
      "license": "MIT",
      "dependencies": {
        "bundle-name": "^4.1.0",
        "default-browser-id": "^5.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/default-browser-id": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/default-browser-id/-/default-browser-id-5.0.1.tgz",
      "integrity": "sha512-x1VCxdX4t+8wVfd1so/9w+vQ4vx7lKd2Qp5tDRutErwmR85OgmfX7RlLRMWafRMY7hbEiXIbudNrjOAPa/hL8Q==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/define-lazy-prop": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/define-lazy-prop/-/define-lazy-prop-3.0.0.tgz",
      "integrity": "sha512-N+MeXYoqr3pOgn8xfyRPREN7gHakLYjhsHhWGT3fWAiL4IkAt0iDw14QiiEm2bE30c5XX5q0FtAA3CK5f9/BUg==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/depd": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/depd/-/depd-2.0.0.tgz",
      "integrity": "sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/diff": {
      "version": "8.0.4",
      "resolved": "https://registry.npmjs.org/diff/-/diff-8.0.4.tgz",
      "integrity": "sha512-DPi0FmjiSU5EvQV0++GFDOJ9ASQUVFh5kD+OzOnYdi7n3Wpm9hWWGfB/O2blfHcMVTL5WkQXSnRiK9makhrcnw==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.3.1"
      }
    },
    "node_modules/dotenv": {
      "version": "17.4.2",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-17.4.2.tgz",
      "integrity": "sha512-nI4U3TottKAcAD9LLud4Cb7b2QztQMUEfHbvhTH09bqXTxnSie8WnjPALV/WMCrJZ6UV/qHJ6L03OqO3LcdYZw==",
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/eciesjs": {
      "version": "0.4.18",
      "resolved": "https://registry.npmjs.org/eciesjs/-/eciesjs-0.4.18.tgz",
      "integrity": "sha512-wG99Zcfcys9fZux7Cft8BAX/YrOJLJSZ3jyYPfhZHqN2E+Ffx+QXBDsv3gubEgPtV6dTzJMSQUwk1H98/t/0wQ==",
      "license": "MIT",
      "dependencies": {
        "@ecies/ciphers": "^0.2.5",
        "@noble/ciphers": "^1.3.0",
        "@noble/curves": "^1.9.7",
        "@noble/hashes": "^1.8.0"
      },
      "engines": {
        "bun": ">=1",
        "deno": ">=2",
        "node": ">=16"
      }
    },
    "node_modules/ee-first": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/ee-first/-/ee-first-1.1.1.tgz",
      "integrity": "sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==",
      "license": "MIT"
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.370",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.370.tgz",
      "integrity": "sha512-D5tSHJReAb/Kf3Hu9F/GO4lJuSWzEWHwvQ/kKSUP7pimNgvxkSKj+gUQhHpKKACwrin7rS3byU7IxreF56rl5g==",
      "license": "ISC"
    },
    "node_modules/emoji-regex": {
      "version": "10.6.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-10.6.0.tgz",
      "integrity": "sha512-toUI84YS5YmxW219erniWD0CIVOo46xGKColeNQRgOzDorgBi1v4D71/OFzgD9GO2UGKIv1C3Sp8DAn0+j5w7A==",
      "license": "MIT"
    },
    "node_modules/encodeurl": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-2.0.0.tgz",
      "integrity": "sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/enhanced-resolve": {
      "version": "5.23.0",
      "resolved": "https://registry.npmjs.org/enhanced-resolve/-/enhanced-resolve-5.23.0.tgz",
      "integrity": "sha512-yJN/BOOLxcOW2aQgeif9mSnaUB8KtvmMMp56oA1kx1CRfBKbhZm2pJ+NBY+3eOboHxix8lfjWpHE0Ei5U8RbSA==",
      "license": "MIT",
      "dependencies": {
        "graceful-fs": "^4.2.4",
        "tapable": "^2.3.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/enquirer": {
      "version": "2.4.1",
      "resolved": "https://registry.npmjs.org/enquirer/-/enquirer-2.4.1.tgz",
      "integrity": "sha512-rRqJg/6gd538VHvR3PSrdRBb/1Vy2YfzHqzvbhGIQpDRKIa4FgV/54b5Q1xYSxOOwKvjXweS26E0Q+nAMwp2pQ==",
      "license": "MIT",
      "dependencies": {
        "ansi-colors": "^4.1.1",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8.6"
      }
    },
    "node_modules/env-paths": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/env-paths/-/env-paths-2.2.1.tgz",
      "integrity": "sha512-+h1lkLKhZMTYjog1VEpJNG7NZJWcuc2DDk/qsqSTRRCOXiLjeQ1d1/udrUGhqMxUgAlwKNZ0cf2uqan5GLuS2A==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/error-ex": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/error-ex/-/error-ex-1.3.4.tgz",
      "integrity": "sha512-sqQamAnR14VgCr1A618A3sGrygcpK+HEbenA/HiEAkkUwcZIIB/tgWqHFxWgOyDh4nB4JCRimh79dR5Ywc9MDQ==",
      "license": "MIT",
      "dependencies": {
        "is-arrayish": "^0.2.1"
      }
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.2.tgz",
      "integrity": "sha512-HWcBoN6NileqtSydK2FqHbS/LoDd2pqrnQHLyJzBj4kOp/ky2MWMN694xOfkK8/SnUsW2DH7EfyVlydKCsm1Zw==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/esbuild": {
      "version": "0.25.12",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.25.12.tgz",
      "integrity": "sha512-bbPBYYrtZbkt6Os6FiTLCTFxvq4tt3JKall1vRwshA3fdVztsLAatFaZobhkBC8/BrPetoa0oksYoKXoG4ryJg==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.25.12",
        "@esbuild/android-arm": "0.25.12",
        "@esbuild/android-arm64": "0.25.12",
        "@esbuild/android-x64": "0.25.12",
        "@esbuild/darwin-arm64": "0.25.12",
        "@esbuild/darwin-x64": "0.25.12",
        "@esbuild/freebsd-arm64": "0.25.12",
        "@esbuild/freebsd-x64": "0.25.12",
        "@esbuild/linux-arm": "0.25.12",
        "@esbuild/linux-arm64": "0.25.12",
        "@esbuild/linux-ia32": "0.25.12",
        "@esbuild/linux-loong64": "0.25.12",
        "@esbuild/linux-mips64el": "0.25.12",
        "@esbuild/linux-ppc64": "0.25.12",
        "@esbuild/linux-riscv64": "0.25.12",
        "@esbuild/linux-s390x": "0.25.12",
        "@esbuild/linux-x64": "0.25.12",
        "@esbuild/netbsd-arm64": "0.25.12",
        "@esbuild/netbsd-x64": "0.25.12",
        "@esbuild/openbsd-arm64": "0.25.12",
        "@esbuild/openbsd-x64": "0.25.12",
        "@esbuild/openharmony-arm64": "0.25.12",
        "@esbuild/sunos-x64": "0.25.12",
        "@esbuild/win32-arm64": "0.25.12",
        "@esbuild/win32-ia32": "0.25.12",
        "@esbuild/win32-x64": "0.25.12"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-html": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/escape-html/-/escape-html-1.0.3.tgz",
      "integrity": "sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==",
      "license": "MIT"
    },
    "node_modules/esprima": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/esprima/-/esprima-4.0.1.tgz",
      "integrity": "sha512-eGuFFw7Upda+g4p+QHvnW0RyTX/SVeJBDM/gCtMARO0cLuT2HcEKnTPvhjV6aGeqrCB/sbNop0Kszm0jsaWU4A==",
      "license": "BSD-2-Clause",
      "bin": {
        "esparse": "bin/esparse.js",
        "esvalidate": "bin/esvalidate.js"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/etag": {
      "version": "1.8.1",
      "resolved": "https://registry.npmjs.org/etag/-/etag-1.8.1.tgz",
      "integrity": "sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/eventsource": {
      "version": "3.0.7",
      "resolved": "https://registry.npmjs.org/eventsource/-/eventsource-3.0.7.tgz",
      "integrity": "sha512-CRT1WTyuQoD771GW56XEZFQ/ZoSfWid1alKGDYMmkt2yl8UXrVR4pspqWNEcqKvVIzg6PAltWjxcSSPrboA4iA==",
      "license": "MIT",
      "dependencies": {
        "eventsource-parser": "^3.0.1"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/eventsource-parser": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/eventsource-parser/-/eventsource-parser-3.1.0.tgz",
      "integrity": "sha512-kJezFj9YFAMLeORyi7aCLxLbD5/qWMQnoMVlVPyHIll7lgRJCc3JVln9Vgl9nwQi0YkMnhdGTMNn7CkRRAptMg==",
      "license": "MIT",
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/execa": {
      "version": "9.6.1",
      "resolved": "https://registry.npmjs.org/execa/-/execa-9.6.1.tgz",
      "integrity": "sha512-9Be3ZoN4LmYR90tUoVu2te2BsbzHfhJyfEiAVfz7N5/zv+jduIfLrV2xdQXOHbaD6KgpGdO9PRPM1Y4Q9QkPkA==",
      "license": "MIT",
      "dependencies": {
        "@sindresorhus/merge-streams": "^4.0.0",
        "cross-spawn": "^7.0.6",
        "figures": "^6.1.0",
        "get-stream": "^9.0.0",
        "human-signals": "^8.0.1",
        "is-plain-obj": "^4.1.0",
        "is-stream": "^4.0.1",
        "npm-run-path": "^6.0.0",
        "pretty-ms": "^9.2.0",
        "signal-exit": "^4.1.0",
        "strip-final-newline": "^4.0.0",
        "yoctocolors": "^2.1.1"
      },
      "engines": {
        "node": "^18.19.0 || >=20.5.0"
      },
      "funding": {
        "url": "https://github.com/sindresorhus/execa?sponsor=1"
      }
    },
    "node_modules/express": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/express/-/express-5.2.1.tgz",
      "integrity": "sha512-hIS4idWWai69NezIdRt2xFVofaF4j+6INOpJlVOLDO8zXGpUVEVzIYk12UUi2JzjEzWL3IOAxcTubgz9Po0yXw==",
      "license": "MIT",
      "dependencies": {
        "accepts": "^2.0.0",
        "body-parser": "^2.2.1",
        "content-disposition": "^1.0.0",
        "content-type": "^1.0.5",
        "cookie": "^0.7.1",
        "cookie-signature": "^1.2.1",
        "debug": "^4.4.0",
        "depd": "^2.0.0",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "etag": "^1.8.1",
        "finalhandler": "^2.1.0",
        "fresh": "^2.0.0",
        "http-errors": "^2.0.0",
        "merge-descriptors": "^2.0.0",
        "mime-types": "^3.0.0",
        "on-finished": "^2.4.1",
        "once": "^1.4.0",
        "parseurl": "^1.3.3",
        "proxy-addr": "^2.0.7",
        "qs": "^6.14.0",
        "range-parser": "^1.2.1",
        "router": "^2.2.0",
        "send": "^1.1.0",
        "serve-static": "^2.2.0",
        "statuses": "^2.0.1",
        "type-is": "^2.0.1",
        "vary": "^1.1.2"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/express-rate-limit": {
      "version": "8.5.2",
      "resolved": "https://registry.npmjs.org/express-rate-limit/-/express-rate-limit-8.5.2.tgz",
      "integrity": "sha512-5Kb34ipNX694DH48vN9irak1Qx30nb0PLYHXfJgw4YEjiC3ZEmZJhwOp+VfiCYwFzvFTdB9QkArYS5kXa2cx2A==",
      "license": "MIT",
      "dependencies": {
        "ip-address": "^10.2.0"
      },
      "engines": {
        "node": ">= 16"
      },
      "funding": {
        "url": "https://github.com/sponsors/express-rate-limit"
      },
      "peerDependencies": {
        "express": ">= 4.11"
      }
    },
    "node_modules/express/node_modules/cookie": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-0.7.2.tgz",
      "integrity": "sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "license": "MIT"
    },
    "node_modules/fast-glob": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/fast-glob/-/fast-glob-3.3.3.tgz",
      "integrity": "sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg==",
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "^2.0.2",
        "@nodelib/fs.walk": "^1.2.3",
        "glob-parent": "^5.1.2",
        "merge2": "^1.3.0",
        "micromatch": "^4.0.8"
      },
      "engines": {
        "node": ">=8.6.0"
      }
    },
    "node_modules/fast-glob/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/fast-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/fast-uri/-/fast-uri-3.1.2.tgz",
      "integrity": "sha512-rVjf7ArG3LTk+FS6Yw81V1DLuZl1bRbNrev6Tmd/9RaroeeRRJhAt7jg/6YFxbvAQXUCavSoZhPPj6oOx+5KjQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/fastify"
        },
        {
          "type": "opencollective",
          "url": "https://opencollective.com/fastify"
        }
      ],
      "license": "BSD-3-Clause"
    },
    "node_modules/fastq": {
      "version": "1.20.1",
      "resolved": "https://registry.npmjs.org/fastq/-/fastq-1.20.1.tgz",
      "integrity": "sha512-GGToxJ/w1x32s/D2EKND7kTil4n8OVk/9mycTc4VDza13lOvpUZTGX3mFSCtV9ksdGBVzvsyAVLM6mHFThxXxw==",
      "license": "ISC",
      "dependencies": {
        "reusify": "^1.0.4"
      }
    },
    "node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/fetch-blob": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/fetch-blob/-/fetch-blob-3.2.0.tgz",
      "integrity": "sha512-7yAQpD2UMJzLi1Dqv7qFYnPbaPx7ZfFK6PiIxQ4PfkGPyNyl2Ugx+a/umUonmKqjhM4DnfbMvdX6otXq83soQQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/jimmywarting"
        },
        {
          "type": "paypal",
          "url": "https://paypal.me/jimmywarting"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "node-domexception": "^1.0.0",
        "web-streams-polyfill": "^3.0.3"
      },
      "engines": {
        "node": "^12.20 || >= 14.13"
      }
    },
    "node_modules/figures": {
      "version": "6.1.0",
      "resolved": "https://registry.npmjs.org/figures/-/figures-6.1.0.tgz",
      "integrity": "sha512-d+l3qxjSesT4V7v2fh+QnmFnUWv9lSpjarhShNTgBOfA0ttejbQUAlHLitbjkoRiDulW0OPoQPYIGhIC8ohejg==",
      "license": "MIT",
      "dependencies": {
        "is-unicode-supported": "^2.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/fill-range": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/fill-range/-/fill-range-7.1.1.tgz",
      "integrity": "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==",
      "license": "MIT",
      "dependencies": {
        "to-regex-range": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/finalhandler": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/finalhandler/-/finalhandler-2.1.1.tgz",
      "integrity": "sha512-S8KoZgRZN+a5rNwqTxlZZePjT/4cnm0ROV70LedRHZ0p8u9fRID0hJUZQpkKLzro8LfmC8sx23bY6tVNxv8pQA==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.0",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "on-finished": "^2.4.1",
        "parseurl": "^1.3.3",
        "statuses": "^2.0.1"
      },
      "engines": {
        "node": ">= 18.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/formdata-polyfill": {
      "version": "4.0.10",
      "resolved": "https://registry.npmjs.org/formdata-polyfill/-/formdata-polyfill-4.0.10.tgz",
      "integrity": "sha512-buewHzMvYL29jdeQTVILecSaZKnt/RJWjoZCF5OW60Z67/GmSLBkOFM7qh1PI3zFNtJbaZL5eQu1vLfazOwj4g==",
      "license": "MIT",
      "dependencies": {
        "fetch-blob": "^3.1.2"
      },
      "engines": {
        "node": ">=12.20.0"
      }
    },
    "node_modules/forwarded": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/forwarded/-/forwarded-0.2.0.tgz",
      "integrity": "sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fraction.js": {
      "version": "5.3.4",
      "resolved": "https://registry.npmjs.org/fraction.js/-/fraction.js-5.3.4.tgz",
      "integrity": "sha512-1X1NTtiJphryn/uLQz3whtY6jK3fTqoE3ohKs0tT+Ujr1W59oopxmoEh7Lu5p6vBaPbgoM0bzveAW4Qi5RyWDQ==",
      "dev": true,
      "engines": {
        "node": "*"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/rawify"
      }
    },
    "node_modules/fresh": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/fresh/-/fresh-2.0.0.tgz",
      "integrity": "sha512-Rx/WycZ60HOaqLKAi6cHRKKI7zxWbJ31MhntmtwMoaTeF7XFH9hhBp8vITaMidfljRQ6eYWCKkaTK+ykVJHP2A==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/fs-extra": {
      "version": "11.3.5",
      "resolved": "https://registry.npmjs.org/fs-extra/-/fs-extra-11.3.5.tgz",
      "integrity": "sha512-eKpRKAovdpZtR1WopLHxlBWvAgPny3c4gX1G5Jhwmmw4XJj0ifSD5qB5TOo8hmA0wlRKDAOAhEE1yVPgs6Fgcg==",
      "license": "MIT",
      "dependencies": {
        "graceful-fs": "^4.2.0",
        "jsonfile": "^6.0.1",
        "universalify": "^2.0.0"
      },
      "engines": {
        "node": ">=14.14"
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/fuzzysort": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/fuzzysort/-/fuzzysort-3.1.0.tgz",
      "integrity": "sha512-sR9BNCjBg6LNgwvxlBd0sBABvQitkLzoVY9MYYROQVX/FvfJ4Mai9LsGhDgd8qYdds0bY77VzYd5iuB+v5rwQQ==",
      "license": "MIT"
    },
    "node_modules/gensync": {
      "version": "1.0.0-beta.2",
      "resolved": "https://registry.npmjs.org/gensync/-/gensync-1.0.0-beta.2.tgz",
      "integrity": "sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/get-east-asian-width": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/get-east-asian-width/-/get-east-asian-width-1.6.0.tgz",
      "integrity": "sha512-QRbvDIbx6YklUe6RxeTeleMR0yv3cYH6PsPZHcnVn7xv7zO1BHN8r0XETu8n6Ye3Q+ahtSarc3WgtNWmehIBfA==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-own-enumerable-keys": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/get-own-enumerable-keys/-/get-own-enumerable-keys-1.0.0.tgz",
      "integrity": "sha512-PKsK2FSrQCyxcGHsGrLDcK0lx+0Ke+6e8KFFozA9/fIQLhQzPaRvJFdcz7+Axg3jUH/Mq+NI4xa5u/UT2tQskA==",
      "license": "MIT",
      "engines": {
        "node": ">=14.16"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/get-stream": {
      "version": "9.0.1",
      "resolved": "https://registry.npmjs.org/get-stream/-/get-stream-9.0.1.tgz",
      "integrity": "sha512-kVCxPF3vQM/N0B1PmoqVUqgHP+EeVjmZSQn+1oCRPxd2P21P2F19lIgbR3HBosbB1PUhOAoctJnfEn2GbN2eZA==",
      "license": "MIT",
      "dependencies": {
        "@sec-ant/readable-stream": "^0.4.1",
        "is-stream": "^4.0.1"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "license": "ISC"
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.4.tgz",
      "integrity": "sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A==",
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/hono": {
      "version": "4.12.25",
      "resolved": "https://registry.npmjs.org/hono/-/hono-4.12.25.tgz",
      "integrity": "sha512-2NFaIyNVgJmBs/ecmtGzlmluTFs5cHEWGTdu0t1HBwYzoGXOL5nUQBRMXsXWla5i4KkG//QMzVP88m1+I3fdAQ==",
      "license": "MIT",
      "engines": {
        "node": ">=16.9.0"
      }
    },
    "node_modules/http-errors": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/http-errors/-/http-errors-2.0.1.tgz",
      "integrity": "sha512-4FbRdAX+bSdmo4AUFuS0WNiPz8NgFt+r8ThgNWmlrjQjt1Q7ZR9+zTlce2859x4KSXrwIsaeTqDoKQmtP8pLmQ==",
      "license": "MIT",
      "dependencies": {
        "depd": "~2.0.0",
        "inherits": "~2.0.4",
        "setprototypeof": "~1.2.0",
        "statuses": "~2.0.2",
        "toidentifier": "~1.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/https-proxy-agent": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-7.0.6.tgz",
      "integrity": "sha512-vK9P5/iUfdl95AI+JVyUuIcVtd4ofvtrOr3HNtM2yxC9bnMbEdp3x01OhQNnjb8IJYi38VlTE3mBXwcfvywuSw==",
      "license": "MIT",
      "dependencies": {
        "agent-base": "^7.1.2",
        "debug": "4"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/human-signals": {
      "version": "8.0.1",
      "resolved": "https://registry.npmjs.org/human-signals/-/human-signals-8.0.1.tgz",
      "integrity": "sha512-eKCa6bwnJhvxj14kZk5NCPc6Hb6BdsU9DZcOnmQKSnO1VKrfV0zCvtttPZUsBvjmNDn8rpcJfpwSYnHBjc95MQ==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/iceberg-js": {
      "version": "0.8.1",
      "resolved": "https://registry.npmjs.org/iceberg-js/-/iceberg-js-0.8.1.tgz",
      "integrity": "sha512-1dhVQZXhcHje7798IVM+xoo/1ZdVfzOMIc8/rgVSijRK38EDqOJoGula9N/8ZI5RD8QTxNQtK/Gozpr+qUqRRA==",
      "license": "MIT",
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/iconv-lite": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/iconv-lite/-/iconv-lite-0.7.2.tgz",
      "integrity": "sha512-im9DjEDQ55s9fL4EYzOAv0yMqmMBSZp6G0VvFyTMPKWxiSBHUj9NW/qqLmXUwXrrM7AvqSlTCfvqRb0cM8yYqw==",
      "license": "MIT",
      "dependencies": {
        "safer-buffer": ">= 2.1.2 < 3.0.0"
      },
      "engines": {
        "node": ">=0.10.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/import-fresh": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/import-fresh/-/import-fresh-3.3.1.tgz",
      "integrity": "sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==",
      "license": "MIT",
      "dependencies": {
        "parent-module": "^1.0.0",
        "resolve-from": "^4.0.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==",
      "license": "ISC"
    },
    "node_modules/ip-address": {
      "version": "10.2.0",
      "resolved": "https://registry.npmjs.org/ip-address/-/ip-address-10.2.0.tgz",
      "integrity": "sha512-/+S6j4E9AHvW9SWMSEY9Xfy66O5PWvVEJ08O0y5JGyEKQpojb0K0GKpz/v5HJ/G0vi3D2sjGK78119oXZeE0qA==",
      "license": "MIT",
      "engines": {
        "node": ">= 12"
      }
    },
    "node_modules/ipaddr.js": {
      "version": "1.9.1",
      "resolved": "https://registry.npmjs.org/ipaddr.js/-/ipaddr.js-1.9.1.tgz",
      "integrity": "sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/is-arrayish": {
      "version": "0.2.1",
      "resolved": "https://registry.npmjs.org/is-arrayish/-/is-arrayish-0.2.1.tgz",
      "integrity": "sha512-zz06S8t0ozoDXMG+ube26zeCTNXcKIPJZJi8hBrF4idCLms4CG9QtK7qBl1boi5ODzFpjswb5JPmHCbMpjaYzg==",
      "license": "MIT"
    },
    "node_modules/is-docker": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-docker/-/is-docker-3.0.0.tgz",
      "integrity": "sha512-eljcgEDlEns/7AXFosB5K/2nCM4P7FQPkGc/DWLy5rmFEWvZayGrik1d9/QIY5nJ4f9YsVvBkA6kJpHn9rISdQ==",
      "license": "MIT",
      "bin": {
        "is-docker": "cli.js"
      },
      "engines": {
        "node": "^12.20.0 || ^14.13.1 || >=16.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "license": "MIT",
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-in-ssh": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/is-in-ssh/-/is-in-ssh-1.0.0.tgz",
      "integrity": "sha512-jYa6Q9rH90kR1vKB6NM7qqd1mge3Fx4Dhw5TVlK1MUBqhEOuCagrEHMevNuCcbECmXZ0ThXkRm+Ymr51HwEPAw==",
      "license": "MIT",
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-inside-container": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/is-inside-container/-/is-inside-container-1.0.0.tgz",
      "integrity": "sha512-KIYLCCJghfHZxqjYBE7rEy0OBuTd5xCHS7tHVgvCLkx7StIoaxwNW3hCALgEUjFfeRk+MG/Qxmp/vtETEF3tRA==",
      "license": "MIT",
      "dependencies": {
        "is-docker": "^3.0.0"
      },
      "bin": {
        "is-inside-container": "cli.js"
      },
      "engines": {
        "node": ">=14.16"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-interactive": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/is-interactive/-/is-interactive-2.0.0.tgz",
      "integrity": "sha512-qP1vozQRI+BMOPcjFzrjXuQvdak2pHNUMZoeG2eRbiSqyvbEf/wQtEOTOX1guk6E3t36RkaqiSt8A/6YElNxLQ==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-number": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
      "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==",
      "license": "MIT",
      "engines": {
        "node": ">=0.12.0"
      }
    },
    "node_modules/is-obj": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-obj/-/is-obj-3.0.0.tgz",
      "integrity": "sha512-IlsXEHOjtKhpN8r/tRFj2nDyTmHvcfNeu/nrRIcXE17ROeatXchkojffa1SpdqW4cr/Fj6QkEf/Gn4zf6KKvEQ==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-plain-obj": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/is-plain-obj/-/is-plain-obj-4.1.0.tgz",
      "integrity": "sha512-+Pgi+vMuUNkJyExiMBt5IlFoMyKnr5zhJ4Uspz58WOhBF5QoIZkFyNHIbBAtHwzVAgk5RtndVNsDRN61/mmDqg==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-promise": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/is-promise/-/is-promise-4.0.0.tgz",
      "integrity": "sha512-hvpoI6korhJMnej285dSg6nu1+e6uxs7zG3BYAm5byqDsgJNWwxzM6z6iZiAgQR4TJ30JmBTOwqZUw3WlyH3AQ==",
      "license": "MIT"
    },
    "node_modules/is-regexp": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/is-regexp/-/is-regexp-3.1.0.tgz",
      "integrity": "sha512-rbku49cWloU5bSMI+zaRaXdQHXnthP6DZ/vLnfdSKyL4zUzuWnomtOEiZZOd+ioQ+avFo/qau3KPTc7Fjy1uPA==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-stream": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/is-stream/-/is-stream-4.0.1.tgz",
      "integrity": "sha512-Dnz92NInDqYckGEUJv689RbRiTSEHCQ7wOVeALbkOz999YpqT46yMRIGtSNl2iCL1waAZSx40+h59NV/EwzV/A==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-unicode-supported": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/is-unicode-supported/-/is-unicode-supported-2.1.0.tgz",
      "integrity": "sha512-mE00Gnza5EEB3Ds0HfMyllZzbBrmLOX3vfWoj9A9PEnTfratQ/BcaJOuMhnkhjXvb2+FkY3VuHqtAGpTPmglFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-wsl": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/is-wsl/-/is-wsl-3.1.1.tgz",
      "integrity": "sha512-e6rvdUCiQCAuumZslxRJWR/Doq4VpPR82kqclvcS0efgt430SlGIk05vdCN58+VrzgtIcfNODjozVielycD4Sw==",
      "license": "MIT",
      "dependencies": {
        "is-inside-container": "^1.0.0"
      },
      "engines": {
        "node": ">=16"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "license": "ISC"
    },
    "node_modules/jiti": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-2.7.0.tgz",
      "integrity": "sha512-AC/7JofJvZGrrneWNaEnJeOLUx+JlGt7tNa0wZiRPT4MY1wmfKjt2+6O2p2uz2+skll8OZZmJMNqeke7kKbNgQ==",
      "license": "MIT",
      "bin": {
        "jiti": "lib/jiti-cli.mjs"
      }
    },
    "node_modules/jose": {
      "version": "6.2.3",
      "resolved": "https://registry.npmjs.org/jose/-/jose-6.2.3.tgz",
      "integrity": "sha512-YYVDInQKFJfR/xa3ojUTl8c2KoTwiL1R5Wg9YCydwH0x0B9grbzlg5HC7mMjCtUJjbQ/YnGEZIhI5tCgfTb4Hw==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/panva"
      }
    },
    "node_modules/js-tokens": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
      "integrity": "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==",
      "license": "MIT"
    },
    "node_modules/js-yaml": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.2.0.tgz",
      "integrity": "sha512-ePWsvanv0DWuDRsW8dnt+R4jQ31SCRCQ7hhNcPXZPsoBZiemuZNYGf7adZdqX2D86j6rvKp3RpCxVTSb8WQlOw==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/puzrin"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/nodeca"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/jsesc": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/jsesc/-/jsesc-3.1.0.tgz",
      "integrity": "sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==",
      "license": "MIT",
      "bin": {
        "jsesc": "bin/jsesc"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/json-parse-even-better-errors": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/json-parse-even-better-errors/-/json-parse-even-better-errors-2.3.1.tgz",
      "integrity": "sha512-xyFwyhro/JEof6Ghe2iz2NcXoj2sloNsWr/XsERDK/oiPCfaNhl5ONfp+jQdAZRQQ0IJWNzH9zIZF7li91kh2w==",
      "license": "MIT"
    },
    "node_modules/json-schema-typed": {
      "version": "8.0.2",
      "resolved": "https://registry.npmjs.org/json-schema-typed/-/json-schema-typed-8.0.2.tgz",
      "integrity": "sha512-fQhoXdcvc3V28x7C7BMs4P5+kNlgUURe2jmUT1T//oBRMDrqy1QPelJimwZGo7Hg9VPV3EQV5Bnq4hbFy2vetA==",
      "license": "BSD-2-Clause"
    },
    "node_modules/json5": {
      "version": "2.2.3",
      "resolved": "https://registry.npmjs.org/json5/-/json5-2.2.3.tgz",
      "integrity": "sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==",
      "license": "MIT",
      "bin": {
        "json5": "lib/cli.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/jsonfile": {
      "version": "6.2.1",
      "resolved": "https://registry.npmjs.org/jsonfile/-/jsonfile-6.2.1.tgz",
      "integrity": "sha512-zwOTdL3rFQ/lRdBnntKVOX6k5cKJwEc1HdilT71BWEu7J41gXIB2MRp+vxduPSwZJPWBxEzv4yH1wYLJGUHX4Q==",
      "license": "MIT",
      "dependencies": {
        "universalify": "^2.0.0"
      },
      "optionalDependencies": {
        "graceful-fs": "^4.1.6"
      }
    },
    "node_modules/kleur": {
      "version": "4.1.5",
      "resolved": "https://registry.npmjs.org/kleur/-/kleur-4.1.5.tgz",
      "integrity": "sha512-o+NO+8WrRiQEE4/7nwRJhN1HWpVmJm511pBHUxPLtp0BUISzlBplORYSmTclCnJvQq2tKu/sgl3xVpkc7ZWuQQ==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/lightningcss": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.32.0.tgz",
      "integrity": "sha512-NXYBzinNrblfraPGyrbPoD19C1h9lfI/1mzgWYvXUTe414Gz/X1FD2XBZSZM7rRTrMA8JL3OtAaGifrIKhQ5yQ==",
      "license": "MPL-2.0",
      "dependencies": {
        "detect-libc": "^2.0.3"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      },
      "optionalDependencies": {
        "lightningcss-android-arm64": "1.32.0",
        "lightningcss-darwin-arm64": "1.32.0",
        "lightningcss-darwin-x64": "1.32.0",
        "lightningcss-freebsd-x64": "1.32.0",
        "lightningcss-linux-arm-gnueabihf": "1.32.0",
        "lightningcss-linux-arm64-gnu": "1.32.0",
        "lightningcss-linux-arm64-musl": "1.32.0",
        "lightningcss-linux-x64-gnu": "1.32.0",
        "lightningcss-linux-x64-musl": "1.32.0",
        "lightningcss-win32-arm64-msvc": "1.32.0",
        "lightningcss-win32-x64-msvc": "1.32.0"
      }
    },
    "node_modules/lightningcss-linux-x64-gnu": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.32.0.tgz",
      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
      "cpu": [
        "x64"
      ],
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-x64-msvc": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.32.0.tgz",
      "integrity": "sha512-Amq9B/SoZYdDi1kFrojnoqPLxYhQ4Wo5XiL8EVJrVsB8ARoC1PWW6VGtT0WKCemjy8aC+louJnjS7U18x3b06Q==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lines-and-columns": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/lines-and-columns/-/lines-and-columns-1.2.4.tgz",
      "integrity": "sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==",
      "license": "MIT"
    },
    "node_modules/log-symbols": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/log-symbols/-/log-symbols-6.0.0.tgz",
      "integrity": "sha512-i24m8rpwhmPIS4zscNzK6MSEhk0DUWa/8iYQWxhffV8jkI4Phvs3F+quL5xvS0gdQR0FyTCMMH33Y78dDTzzIw==",
      "license": "MIT",
      "dependencies": {
        "chalk": "^5.3.0",
        "is-unicode-supported": "^1.3.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/log-symbols/node_modules/is-unicode-supported": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/is-unicode-supported/-/is-unicode-supported-1.3.0.tgz",
      "integrity": "sha512-43r2mRvz+8JRIKnWJ+3j8JtjRKZ6GmjzfaE/qiBJnikNnYv/6bagRJ1kUhNk8R5EX/GkobD+r+sfxCPJsiKBLQ==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/lru-cache": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-5.1.1.tgz",
      "integrity": "sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==",
      "license": "ISC",
      "dependencies": {
        "yallist": "^3.0.2"
      }
    },
    "node_modules/lucide-react": {
      "version": "1.17.0",
      "resolved": "https://registry.npmjs.org/lucide-react/-/lucide-react-1.17.0.tgz",
      "integrity": "sha512-9FA9evdox/JQL5PT57fdA1x/yg8T7knJ98+zjTL3UfKza6pflQUUh3XtaQIHKvnsJw1lmsEyHVlt5jchYxOQ5w==",
      "license": "ISC",
      "peerDependencies": {
        "react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/magic-string": {
      "version": "0.30.21",
      "resolved": "https://registry.npmjs.org/magic-string/-/magic-string-0.30.21.tgz",
      "integrity": "sha512-vd2F4YUyEXKGcLHoq+TEyCjxueSeHnFxyyjNp80yg0XV4vUhnDer/lvvlqM/arB5bXQN5K2/3oinyCRyx8T2CQ==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.5"
      }
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/media-typer": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/media-typer/-/media-typer-1.1.0.tgz",
      "integrity": "sha512-aisnrDP4GNe06UcKFnV5bfMNPBUw4jsLGaWwWfnH3v02GnBuXX2MCVn5RbrWo0j3pczUilYblq7fQ7Nw2t5XKw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/merge-descriptors": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/merge-descriptors/-/merge-descriptors-2.0.0.tgz",
      "integrity": "sha512-Snk314V5ayFLhp3fkUREub6WtjBfPdCPY1Ln8/8munuLuiYhsABgBVWsozAG+MWMbVEvcdcpbi9R7ww22l9Q3g==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/merge-stream": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/merge-stream/-/merge-stream-2.0.0.tgz",
      "integrity": "sha512-abv/qOcuPfk3URPfDzmZU1LKmuw8kT+0nIHvKrKgFrwifol/doWcdA4ZqsWQ8ENrFKkd67Mfpo/LovbIUsbt3w==",
      "license": "MIT"
    },
    "node_modules/merge2": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/merge2/-/merge2-1.4.1.tgz",
      "integrity": "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==",
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/micromatch": {
      "version": "4.0.8",
      "resolved": "https://registry.npmjs.org/micromatch/-/micromatch-4.0.8.tgz",
      "integrity": "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==",
      "license": "MIT",
      "dependencies": {
        "braces": "^3.0.3",
        "picomatch": "^2.3.1"
      },
      "engines": {
        "node": ">=8.6"
      }
    },
    "node_modules/micromatch/node_modules/picomatch": {
      "version": "2.3.2",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.2.tgz",
      "integrity": "sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA==",
      "license": "MIT",
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/mime-db": {
      "version": "1.54.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.54.0.tgz",
      "integrity": "sha512-aU5EJuIN2WDemCcAp2vFBfp/m4EAhWJnUNSSw0ixs7/kXbd6Pg64EmwJkNdFhB8aWt1sH2CTXrLxo/iAGV3oPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime-types": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-3.0.2.tgz",
      "integrity": "sha512-Lbgzdk0h4juoQ9fCKXW4by0UJqj+nOOrI9MJ1sSj4nI8aI2eo1qmvQEie4VD1glsS250n15LsWsYtCugiStS5A==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "^1.54.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/mimic-fn": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/mimic-fn/-/mimic-fn-2.1.0.tgz",
      "integrity": "sha512-OqbOk5oEQeAZ8WXWydlu9HJjz9WVdEIvamMCcXmuqUYjTknH/sqsWvhQ3vgwKFRR1HpjvNBKQ37nbJgYzGqGcg==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/mimic-function": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/mimic-function/-/mimic-function-5.0.1.tgz",
      "integrity": "sha512-VP79XUPxV2CigYP3jWwAUFSku2aKqBH7uTAapFWCBqutsbmDo96KY5o8uh6U+/YSIn5OxJnXp73beVkpqMIGhA==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/minimatch": {
      "version": "10.2.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-10.2.5.tgz",
      "integrity": "sha512-MULkVLfKGYDFYejP07QOurDLLQpcjk7Fw+7jXS2R2czRQzR56yHRveU5NDJEOviH+hETZKSkIk5c+T23GjFUMg==",
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "brace-expansion": "^5.0.5"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/minimist": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/minimist/-/minimist-1.2.8.tgz",
      "integrity": "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "license": "MIT"
    },
    "node_modules/nanoid": {
      "version": "3.3.12",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.12.tgz",
      "integrity": "sha512-ZB9RH/39qpq5Vu6Y+NmUaFhQR6pp+M2Xt76XBnEwDaGcVAqhlvxrl3B2bKS5D3NH3QR76v3aSrKaF/Kiy7lEtQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/negotiator": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-1.0.0.tgz",
      "integrity": "sha512-8Ofs/AUQh8MaEcrlq5xOX0CQ9ypTF5dl78mjlMNfOK08fzpgTHQRQPBxcPlEtIw0yRpws+Zo/3r+5WRby7u3Gg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/node-domexception": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/node-domexception/-/node-domexception-1.0.0.tgz",
      "integrity": "sha512-/jKZoMpw0F8GRwl4/eLROPA3cfcXtLApP0QzLmUT/HuPCZWyB7IY9ZrMeKw2O/nFIqPQB3PVM9aYm0F312AXDQ==",
      "deprecated": "Use your platform's native DOMException instead",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/jimmywarting"
        },
        {
          "type": "github",
          "url": "https://paypal.me/jimmywarting"
        }
      ],
      "license": "MIT",
      "engines": {
        "node": ">=10.5.0"
      }
    },
    "node_modules/node-fetch": {
      "version": "3.3.2",
      "resolved": "https://registry.npmjs.org/node-fetch/-/node-fetch-3.3.2.tgz",
      "integrity": "sha512-dRB78srN/l6gqWulah9SrxeYnxeddIG30+GOqK/9OlLVyLg3HPnr6SqOWTWOXKRwC2eGYCkZ59NNuSgvSrpgOA==",
      "license": "MIT",
      "dependencies": {
        "data-uri-to-buffer": "^4.0.0",
        "fetch-blob": "^3.1.4",
        "formdata-polyfill": "^4.0.10"
      },
      "engines": {
        "node": "^12.20.0 || ^14.13.1 || >=16.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/node-fetch"
      }
    },
    "node_modules/node-releases": {
      "version": "2.0.47",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.47.tgz",
      "integrity": "sha512-Uzmd6LXpouKo8EUK68IjH4+E01w/hXyV3R3g/geCJo+rXLNfh1xucB+LOzYEOQPSiUK3h/xZf0cQGcSsmyL2Og==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/npm-run-path": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/npm-run-path/-/npm-run-path-6.0.0.tgz",
      "integrity": "sha512-9qny7Z9DsQU8Ou39ERsPU4OZQlSTP47ShQzuKZ6PRXpYLtIFgl/DEBYEXKlvcEa+9tHVcK8CF81Y2V72qaZhWA==",
      "license": "MIT",
      "dependencies": {
        "path-key": "^4.0.0",
        "unicorn-magic": "^0.3.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/npm-run-path/node_modules/path-key": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-4.0.0.tgz",
      "integrity": "sha512-haREypq7xkM7ErfgIyA0z+Bj4AGKlMSdlQE2jvJo6huWD1EdkKYV+G/T4nq0YEF2vgTT8kqMFKo1uHn950r4SQ==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-inspect": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/object-inspect/-/object-inspect-1.13.4.tgz",
      "integrity": "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/object-treeify": {
      "version": "1.1.33",
      "resolved": "https://registry.npmjs.org/object-treeify/-/object-treeify-1.1.33.tgz",
      "integrity": "sha512-EFVjAYfzWqWsBMRHPMAXLCDIJnpMhdWAqR7xG6M6a2cs6PMFpl/+Z20w9zDW4vkxOFfddegBKq9Rehd0bxWE7A==",
      "license": "MIT",
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/on-finished": {
      "version": "2.4.1",
      "resolved": "https://registry.npmjs.org/on-finished/-/on-finished-2.4.1.tgz",
      "integrity": "sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==",
      "license": "MIT",
      "dependencies": {
        "ee-first": "1.1.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/once": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/once/-/once-1.4.0.tgz",
      "integrity": "sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==",
      "license": "ISC",
      "dependencies": {
        "wrappy": "1"
      }
    },
    "node_modules/onetime": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/onetime/-/onetime-7.0.0.tgz",
      "integrity": "sha512-VXJjc87FScF88uafS3JllDgvAm+c/Slfz06lorj2uAY34rlUu0Nt+v8wreiImcrgAjjIHp1rXpTDlLOGw29WwQ==",
      "license": "MIT",
      "dependencies": {
        "mimic-function": "^5.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/open": {
      "version": "11.0.0",
      "resolved": "https://registry.npmjs.org/open/-/open-11.0.0.tgz",
      "integrity": "sha512-smsWv2LzFjP03xmvFoJ331ss6h+jixfA4UUV/Bsiyuu4YJPfN+FIQGOIiv4w9/+MoHkfkJ22UIaQWRVFRfH6Vw==",
      "license": "MIT",
      "dependencies": {
        "default-browser": "^5.4.0",
        "define-lazy-prop": "^3.0.0",
        "is-in-ssh": "^1.0.0",
        "is-inside-container": "^1.0.0",
        "powershell-utils": "^0.1.0",
        "wsl-utils": "^0.3.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/ora": {
      "version": "8.2.0",
      "resolved": "https://registry.npmjs.org/ora/-/ora-8.2.0.tgz",
      "integrity": "sha512-weP+BZ8MVNnlCm8c0Qdc1WSWq4Qn7I+9CJGm7Qali6g44e/PUzbjNqJX5NJ9ljlNMosfJvg1fKEGILklK9cwnw==",
      "license": "MIT",
      "dependencies": {
        "chalk": "^5.3.0",
        "cli-cursor": "^5.0.0",
        "cli-spinners": "^2.9.2",
        "is-interactive": "^2.0.0",
        "is-unicode-supported": "^2.0.0",
        "log-symbols": "^6.0.0",
        "stdin-discarder": "^0.2.2",
        "string-width": "^7.2.0",
        "strip-ansi": "^7.1.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/ora/node_modules/ansi-regex": {
      "version": "6.2.2",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.2.2.tgz",
      "integrity": "sha512-Bq3SmSpyFHaWjPk8If9yc6svM8c56dB5BAtW4Qbw5jHTwwXXcTLoRMkpDJp6VL0XzlWaCHTXrkFURMYmD0sLqg==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/ora/node_modules/strip-ansi": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-7.2.0.tgz",
      "integrity": "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^6.2.2"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/strip-ansi?sponsor=1"
      }
    },
    "node_modules/parent-module": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/parent-module/-/parent-module-1.0.1.tgz",
      "integrity": "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==",
      "license": "MIT",
      "dependencies": {
        "callsites": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/parse-json": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/parse-json/-/parse-json-5.2.0.tgz",
      "integrity": "sha512-ayCKvm/phCGxOkYRSCM82iDwct8/EonSEgCSxWxD7ve6jHggsFl4fZVQBPRNgQoKiuV/odhFrGzQXZwbifC8Rg==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.0.0",
        "error-ex": "^1.3.1",
        "json-parse-even-better-errors": "^2.3.0",
        "lines-and-columns": "^1.1.6"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/parse-ms": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/parse-ms/-/parse-ms-4.0.0.tgz",
      "integrity": "sha512-TXfryirbmq34y8QBwgqCVLi+8oA3oWx2eAnSn62ITyEhEYaWRlVZ2DvMM9eZbMs/RfxPu/PK/aBLyGj4IrqMHw==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/parseurl": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/parseurl/-/parseurl-1.3.3.tgz",
      "integrity": "sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/path-browserify": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/path-browserify/-/path-browserify-1.0.1.tgz",
      "integrity": "sha512-b7uo2UCUOYZcnF/3ID0lulOJi/bafxa1xPe7ZPsammBSpjSWQkjNxlt635YGS2MiR9GjvuXCtz2emr3jbsz98g==",
      "license": "MIT"
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-to-regexp": {
      "version": "8.4.2",
      "resolved": "https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-8.4.2.tgz",
      "integrity": "sha512-qRcuIdP69NPm4qbACK+aDogI5CBDMi1jKe0ry5rSQJz8JVLsC7jV8XpiJjGRLLol3N+R5ihGYcrPLTno6pAdBA==",
      "license": "MIT",
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.4.tgz",
      "integrity": "sha512-QP88BAKvMam/3NxH6vj2o21R6MjxZUAd6nlwAS/pnGvN9IVLocLHxGYIzFhg6fUQ+5th6P4dv4eW9jX3DSIj7A==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/pkce-challenge": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/pkce-challenge/-/pkce-challenge-5.0.1.tgz",
      "integrity": "sha512-wQ0b/W4Fr01qtpHlqSqspcj3EhBvimsdh0KlHhH8HRZnMsEa0ea2fTULOXOS9ccQr3om+GcGRk4e+isrZWV8qQ==",
      "license": "MIT",
      "engines": {
        "node": ">=16.20.0"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.15",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.15.tgz",
      "integrity": "sha512-FfR8sjd4em2T6fb3I2MwAJU7HWVMr9zba+enmQeeWFfCbm+UOC/0X4DS8XtpUTMwWMGbjKYP7xjfNekzyGmB3A==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "dependencies": {
        "nanoid": "^3.3.12",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/postcss-selector-parser": {
      "version": "7.1.2",
      "resolved": "https://registry.npmjs.org/postcss-selector-parser/-/postcss-selector-parser-7.1.2.tgz",
      "integrity": "sha512-Wjvt4scRFouioIInHf51IFNP4ltJ2EngJM+cZPGiqbKetBfmP3vpdPV8ID2S6JS6/jdo74N8+aEYH9lQr2C6sA==",
      "license": "MIT",
      "dependencies": {
        "cssesc": "^3.0.0",
        "util-deprecate": "^1.0.2"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/postcss-value-parser": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/postcss-value-parser/-/postcss-value-parser-4.2.0.tgz",
      "integrity": "sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==",
      "dev": true
    },
    "node_modules/powershell-utils": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/powershell-utils/-/powershell-utils-0.1.0.tgz",
      "integrity": "sha512-dM0jVuXJPsDN6DvRpea484tCUaMiXWjuCn++HGTqUWzGDjv5tZkEZldAJ/UMlqRYGFrD/etByo4/xOuC/snX2A==",
      "license": "MIT",
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/pretty-ms": {
      "version": "9.3.0",
      "resolved": "https://registry.npmjs.org/pretty-ms/-/pretty-ms-9.3.0.tgz",
      "integrity": "sha512-gjVS5hOP+M3wMm5nmNOucbIrqudzs9v/57bWRHQWLYklXqoXKrVfYW2W9+glfGsqtPgpiz5WwyEEB+ksXIx3gQ==",
      "license": "MIT",
      "dependencies": {
        "parse-ms": "^4.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/prompts": {
      "version": "2.4.2",
      "resolved": "https://registry.npmjs.org/prompts/-/prompts-2.4.2.tgz",
      "integrity": "sha512-NxNv/kLguCA7p3jE8oL2aEBsrJWgAakBpgmgK6lpPWV+WuOmY6r2/zbAVnP+T8bQlA0nzHXSJSJW0Hq7ylaD2Q==",
      "license": "MIT",
      "dependencies": {
        "kleur": "^3.0.3",
        "sisteransi": "^1.0.5"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/prompts/node_modules/kleur": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/kleur/-/kleur-3.0.3.tgz",
      "integrity": "sha512-eTIzlVOSUR+JxdDFepEYcBMtZ9Qqdef+rnzWdRZuMbOywu5tO2w2N7rqjoANZ5k9vywhL6Br1VRjUIgTQx4E8w==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/proxy-addr": {
      "version": "2.0.7",
      "resolved": "https://registry.npmjs.org/proxy-addr/-/proxy-addr-2.0.7.tgz",
      "integrity": "sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==",
      "license": "MIT",
      "dependencies": {
        "forwarded": "0.2.0",
        "ipaddr.js": "1.9.1"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/qs": {
      "version": "6.15.2",
      "resolved": "https://registry.npmjs.org/qs/-/qs-6.15.2.tgz",
      "integrity": "sha512-Rzq0KEyX/w/tEybncDgdkZrJgVUsUMk3xjh3t5bv3S1HTAtg+uOYt72+ZfwiQwKdysThkTBdL/rTi6HDmX9Ddw==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">=0.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/queue-microtask": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/queue-microtask/-/queue-microtask-1.2.3.tgz",
      "integrity": "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/range-parser": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/range-parser/-/range-parser-1.2.1.tgz",
      "integrity": "sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/raw-body": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/raw-body/-/raw-body-3.0.2.tgz",
      "integrity": "sha512-K5zQjDllxWkf7Z5xJdV0/B0WTNqx6vxG70zJE4N0kBs4LovmEYWJzQGxC9bS9RAKu3bgM40lrd5zoLJ12MQ5BA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "~3.1.2",
        "http-errors": "~2.0.1",
        "iconv-lite": "~0.7.0",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/react": {
      "version": "19.2.7",
      "resolved": "https://registry.npmjs.org/react/-/react-19.2.7.tgz",
      "integrity": "sha512-HNe9WslTbXmFK8o8cmwgAeJFSBvt1bPdHCVKtaaV+WlAN36mpT4hcRpwbf3fY56ar2oIXzsBpOAiIRHAdY0OlQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.2.7",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.2.7.tgz",
      "integrity": "sha512-t0BRVXvbiE/o20Hfw669rLbMCDWtYZLvmJigy2f0MxsXF+71pxhR3xOkspmsO8h3ZlNzyibAmtCa3l4lYKk6gQ==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.27.0"
      },
      "peerDependencies": {
        "react": "^19.2.7"
      }
    },
    "node_modules/react-refresh": {
      "version": "0.17.0",
      "resolved": "https://registry.npmjs.org/react-refresh/-/react-refresh-0.17.0.tgz",
      "integrity": "sha512-z6F7K9bV85EfseRCp2bzrpyQ0Gkw1uLoCel9XBVWPg/TjRj94SkJzUTGfOa4bs7iJvBWtQG0Wq7wnI0syw3EBQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/recast": {
      "version": "0.23.11",
      "resolved": "https://registry.npmjs.org/recast/-/recast-0.23.11.tgz",
      "integrity": "sha512-YTUo+Flmw4ZXiWfQKGcwwc11KnoRAYgzAE2E7mXKCjSviTKShtxBsN6YUUBB2gtaBzKzeKunxhUwNHQuRryhWA==",
      "license": "MIT",
      "dependencies": {
        "ast-types": "^0.16.1",
        "esprima": "~4.0.0",
        "source-map": "~0.6.1",
        "tiny-invariant": "^1.3.3",
        "tslib": "^2.0.1"
      },
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/require-from-string": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/require-from-string/-/require-from-string-2.0.2.tgz",
      "integrity": "sha512-Xf0nWe6RseziFMu+Ap9biiUbmplq6S9/p+7w7YXP/JBHhrUDDUhwa+vANyubuqfZWTveU//DYVGsDG7RKL/vEw==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/reselect": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/reselect/-/reselect-5.2.0.tgz",
      "integrity": "sha512-AgZ3UOZm3YndfrJ4OYjgrT7bmCm/1iqkjvEfH/oYjzh6PD2qw4QuT3jjnXIrpdt4MTpMXclMT3lXbmRY+XRakw==",
      "license": "MIT"
    },
    "node_modules/resolve-from": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-4.0.0.tgz",
      "integrity": "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/restore-cursor": {
      "version": "5.1.0",
      "resolved": "https://registry.npmjs.org/restore-cursor/-/restore-cursor-5.1.0.tgz",
      "integrity": "sha512-oMA2dcrw6u0YfxJQXm342bFKX/E4sG9rbTzO9ptUcR/e8A33cHuvStiYOwH7fszkZlZ1z/ta9AAoPk2F4qIOHA==",
      "license": "MIT",
      "dependencies": {
        "onetime": "^7.0.0",
        "signal-exit": "^4.1.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/reusify": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/reusify/-/reusify-1.1.0.tgz",
      "integrity": "sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw==",
      "license": "MIT",
      "engines": {
        "iojs": ">=1.0.0",
        "node": ">=0.10.0"
      }
    },
    "node_modules/rollup": {
      "version": "4.61.1",
      "resolved": "https://registry.npmjs.org/rollup/-/rollup-4.61.1.tgz",
      "integrity": "sha512-I4KW6iuRpuu2uHBLraZ1wNZe0DP7lnRha+VJ9tNaYVaVgKhW0aI3h4RYnoRPeql0flHm/Co55b7snEDcOfOJrA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/estree": "1.0.9"
      },
      "bin": {
        "rollup": "dist/bin/rollup"
      },
      "engines": {
        "node": ">=18.0.0",
        "npm": ">=8.0.0"
      },
      "optionalDependencies": {
        "@rollup/rollup-android-arm-eabi": "4.61.1",
        "@rollup/rollup-android-arm64": "4.61.1",
        "@rollup/rollup-darwin-arm64": "4.61.1",
        "@rollup/rollup-darwin-x64": "4.61.1",
        "@rollup/rollup-freebsd-arm64": "4.61.1",
        "@rollup/rollup-freebsd-x64": "4.61.1",
        "@rollup/rollup-linux-arm-gnueabihf": "4.61.1",
        "@rollup/rollup-linux-arm-musleabihf": "4.61.1",
        "@rollup/rollup-linux-arm64-gnu": "4.61.1",
        "@rollup/rollup-linux-arm64-musl": "4.61.1",
        "@rollup/rollup-linux-loong64-gnu": "4.61.1",
        "@rollup/rollup-linux-loong64-musl": "4.61.1",
        "@rollup/rollup-linux-ppc64-gnu": "4.61.1",
        "@rollup/rollup-linux-ppc64-musl": "4.61.1",
        "@rollup/rollup-linux-riscv64-gnu": "4.61.1",
        "@rollup/rollup-linux-riscv64-musl": "4.61.1",
        "@rollup/rollup-linux-s390x-gnu": "4.61.1",
        "@rollup/rollup-linux-x64-gnu": "4.61.1",
        "@rollup/rollup-linux-x64-musl": "4.61.1",
        "@rollup/rollup-openbsd-x64": "4.61.1",
        "@rollup/rollup-openharmony-arm64": "4.61.1",
        "@rollup/rollup-win32-arm64-msvc": "4.61.1",
        "@rollup/rollup-win32-ia32-msvc": "4.61.1",
        "@rollup/rollup-win32-x64-gnu": "4.61.1",
        "@rollup/rollup-win32-x64-msvc": "4.61.1",
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/router": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/router/-/router-2.2.0.tgz",
      "integrity": "sha512-nLTrUKm2UyiL7rlhapu/Zl45FwNgkZGaCpZbIHajDYgwlJCOzLSk+cIPAnsEqV955GjILJnKbdQC1nVPz+gAYQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.0",
        "depd": "^2.0.0",
        "is-promise": "^4.0.0",
        "parseurl": "^1.3.3",
        "path-to-regexp": "^8.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/run-applescript": {
      "version": "7.1.0",
      "resolved": "https://registry.npmjs.org/run-applescript/-/run-applescript-7.1.0.tgz",
      "integrity": "sha512-DPe5pVFaAsinSaV6QjQ6gdiedWDcRCbUuiQfQa2wmWV7+xC9bGulGI8+TdRmoFkAPaBXk8CrAbnlY2ISniJ47Q==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/run-parallel": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/run-parallel/-/run-parallel-1.2.0.tgz",
      "integrity": "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "queue-microtask": "^1.2.2"
      }
    },
    "node_modules/safer-buffer": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/safer-buffer/-/safer-buffer-2.1.2.tgz",
      "integrity": "sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==",
      "license": "MIT"
    },
    "node_modules/scheduler": {
      "version": "0.27.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.27.0.tgz",
      "integrity": "sha512-eNv+WrVbKu1f3vbYJT/xtiF5syA5HPIMtf9IgY/nKg0sWqzAUEvqY/xm7OcZc/qafLx/iO9FgOmeSAp4v5ti/Q==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/send": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/send/-/send-1.2.1.tgz",
      "integrity": "sha512-1gnZf7DFcoIcajTjTwjwuDjzuz4PPcY2StKPlsGAQ1+YH20IRVrBaXSWmdjowTJ6u8Rc01PoYOGHXfP1mYcZNQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.3",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "etag": "^1.8.1",
        "fresh": "^2.0.0",
        "http-errors": "^2.0.1",
        "mime-types": "^3.0.2",
        "ms": "^2.1.3",
        "on-finished": "^2.4.1",
        "range-parser": "^1.2.1",
        "statuses": "^2.0.2"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/serve-static": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/serve-static/-/serve-static-2.2.1.tgz",
      "integrity": "sha512-xRXBn0pPqQTVQiC8wyQrKs2MOlX24zQ0POGaj0kultvoOCstBQM5yvOhAVSUwOMjQtTvsPWoNCHfPGwaaQJhTw==",
      "license": "MIT",
      "dependencies": {
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "parseurl": "^1.3.3",
        "send": "^1.2.0"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/setprototypeof": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/setprototypeof/-/setprototypeof-1.2.0.tgz",
      "integrity": "sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==",
      "license": "ISC"
    },
    "node_modules/shadcn": {
      "version": "4.11.0",
      "resolved": "https://registry.npmjs.org/shadcn/-/shadcn-4.11.0.tgz",
      "integrity": "sha512-UV0cchFea9hO7poV1CuEP0wvmYjpAqcxCKdy23bndl2Du2ARtDs8A4xdzfhUjDBeOW1nNpJ6lXmsEpsply2SfQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.28.0",
        "@babel/parser": "^7.28.0",
        "@babel/plugin-transform-typescript": "^7.28.0",
        "@babel/preset-typescript": "^7.27.1",
        "@dotenvx/dotenvx": "^1.48.4",
        "@modelcontextprotocol/sdk": "^1.26.0",
        "@types/validate-npm-package-name": "^4.0.2",
        "browserslist": "^4.26.2",
        "commander": "^14.0.0",
        "cosmiconfig": "^9.0.0",
        "dedent": "^1.6.0",
        "deepmerge": "^4.3.1",
        "diff": "^8.0.2",
        "execa": "^9.6.0",
        "fast-glob": "^3.3.3",
        "fs-extra": "^11.3.1",
        "fuzzysort": "^3.1.0",
        "https-proxy-agent": "^7.0.6",
        "kleur": "^4.1.5",
        "node-fetch": "^3.3.2",
        "open": "^11.0.0",
        "ora": "^8.2.0",
        "postcss": "^8.5.6",
        "postcss-selector-parser": "^7.1.0",
        "prompts": "^2.4.2",
        "recast": "^0.23.11",
        "stringify-object": "^5.0.0",
        "tailwind-merge": "^3.0.1",
        "ts-morph": "^26.0.0",
        "tsconfig-paths": "^4.2.0",
        "validate-npm-package-name": "^7.0.1",
        "zod": "^3.24.1",
        "zod-to-json-schema": "^3.24.6"
      },
      "bin": {
        "shadcn": "dist/index.js"
      }
    },
    "node_modules/shadcn/node_modules/zod": {
      "version": "3.25.76",
      "resolved": "https://registry.npmjs.org/zod/-/zod-3.25.76.tgz",
      "integrity": "sha512-gzUt/qt81nXsFGKIFcC3YnfEAx5NkunCfnDlvuBSSFS02bcXu4Lmea0AFIUwbLWxWPx3d9p8S5QoaujKcNQxcQ==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "license": "MIT",
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/side-channel": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/side-channel/-/side-channel-1.1.1.tgz",
      "integrity": "sha512-6x6dK6zJdpTzF4sQeNYxwtvBzf6Eg4GtlesS94HOvTudUeyK2WXAaIfmDgsyslYrRBeFIlsi54AYsFGUuhmvrQ==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.4",
        "side-channel-list": "^1.0.1",
        "side-channel-map": "^1.0.1",
        "side-channel-weakmap": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-list": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-list/-/side-channel-list-1.0.1.tgz",
      "integrity": "sha512-mjn/0bi/oUURjc5Xl7IaWi/OJJJumuoJFQJfDDyO46+hBWsfaVM65TBHq2eoZBhzl9EchxOijpkbRC8SVBQU0w==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-map": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-map/-/side-channel-map-1.0.1.tgz",
      "integrity": "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-weakmap": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/side-channel-weakmap/-/side-channel-weakmap-1.0.2.tgz",
      "integrity": "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3",
        "side-channel-map": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/signal-exit": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/signal-exit/-/signal-exit-4.1.0.tgz",
      "integrity": "sha512-bzyZ1e88w9O1iNJbKnOlvYTrWPDl46O1bG0D3XInv+9tkPrxrN8jUUTiFlDkkmKWgn1M6CfIA13SuGqOa9Korw==",
      "license": "ISC",
      "engines": {
        "node": ">=14"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/sisteransi": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/sisteransi/-/sisteransi-1.0.5.tgz",
      "integrity": "sha512-bLGGlR1QxBcynn2d5YmDX4MGjlZvy2MRBDRNHLJ8VI6l6+9FUiyTFNJ0IveOSP0bcXgVDPRcfGqA0pjaqUpfVg==",
      "license": "MIT"
    },
    "node_modules/source-map": {
      "version": "0.6.1",
      "resolved": "https://registry.npmjs.org/source-map/-/source-map-0.6.1.tgz",
      "integrity": "sha512-UjgapumWlbMhkBgzT7Ykc5YXUT46F0iKu8SGXq0bcwP5dz/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/statuses": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.2.tgz",
      "integrity": "sha512-DvEy55V3DB7uknRo+4iOGT5fP1slR8wQohVdknigZPMpMstaKJQWhwiYBACJE3Ul2pTnATihhBYnRhZQHGBiRw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/stdin-discarder": {
      "version": "0.2.2",
      "resolved": "https://registry.npmjs.org/stdin-discarder/-/stdin-discarder-0.2.2.tgz",
      "integrity": "sha512-UhDfHmA92YAlNnCfhmq0VeNL5bDbiZGg7sZ2IvPsXubGkiNa9EC+tUTsjBRsYUAz87btI6/1wf4XoVvQ3uRnmQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/string-width": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-7.2.0.tgz",
      "integrity": "sha512-tsaTIkKW9b4N+AEj+SVA+WhJzV7/zMhcSu78mLKWSk7cXMOSHsBKFWUs0fWwq8QyK3MgJBQRX6Gbi4kYbdvGkQ==",
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^10.3.0",
        "get-east-asian-width": "^1.0.0",
        "strip-ansi": "^7.1.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/string-width/node_modules/ansi-regex": {
      "version": "6.2.2",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.2.2.tgz",
      "integrity": "sha512-Bq3SmSpyFHaWjPk8If9yc6svM8c56dB5BAtW4Qbw5jHTwwXXcTLoRMkpDJp6VL0XzlWaCHTXrkFURMYmD0sLqg==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/string-width/node_modules/strip-ansi": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-7.2.0.tgz",
      "integrity": "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^6.2.2"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/strip-ansi?sponsor=1"
      }
    },
    "node_modules/stringify-object": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/stringify-object/-/stringify-object-5.0.0.tgz",
      "integrity": "sha512-zaJYxz2FtcMb4f+g60KsRNFOpVMUyuJgA51Zi5Z1DOTC3S59+OQiVOzE9GZt0x72uBGWKsQIuBKeF9iusmKFsg==",
      "license": "BSD-2-Clause",
      "dependencies": {
        "get-own-enumerable-keys": "^1.0.0",
        "is-obj": "^3.0.0",
        "is-regexp": "^3.1.0"
      },
      "engines": {
        "node": ">=14.16"
      },
      "funding": {
        "url": "https://github.com/yeoman/stringify-object?sponsor=1"
      }
    },
    "node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-bom": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/strip-bom/-/strip-bom-3.0.0.tgz",
      "integrity": "sha512-vavAMRXOgBVNF6nyEEmL3DBK19iRpDcoIwW+swQ+CbGiu7lju6t+JklA1MHweoWtadgt4ISVUsXLyDq34ddcwA==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/strip-final-newline": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/strip-final-newline/-/strip-final-newline-4.0.0.tgz",
      "integrity": "sha512-aulFJcD6YK8V1G7iRB5tigAP4TsHBZZrOV8pjV++zdUwmeV8uzbY7yn6h9MswN62adStNZFuCIx4haBnRuMDaw==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/sweetalert2": {
      "version": "11.26.25",
      "resolved": "https://registry.npmjs.org/sweetalert2/-/sweetalert2-11.26.25.tgz",
      "integrity": "sha512-+hunCOJdJ6FLj04T9YSLvvZXRjsvIkTeTKP2e4VF8CaBias961BTnWiSFAy7F/CM5eq3QK2Rraoc5Gzftslvkg==",
      "license": "MIT",
      "funding": {
        "type": "individual",
        "url": "https://github.com/sponsors/limonte"
      }
    },
    "node_modules/tailwind-merge": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/tailwind-merge/-/tailwind-merge-3.6.0.tgz",
      "integrity": "sha512-uxL7qAVQriqRQPAyK3pj66VqskWqoZ37PW94jwOTwNfq/z9oyu1V+eqrZqtR2+fCiXdYOZe/Modt8GtvqNzu+w==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/dcastil"
      }
    },
    "node_modules/tailwindcss": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-4.3.0.tgz",
      "integrity": "sha512-y6nxMGB1nMW9R6k96e5gdIFzcfL/gTJRNaqGes1YvkLnPVXzWgbqFF2yLC0T8G774n24cx3Pe8XrKoniCOAH+Q==",
      "license": "MIT"
    },
    "node_modules/tapable": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/tapable/-/tapable-2.3.3.tgz",
      "integrity": "sha512-uxc/zpqFg6x7C8vOE7lh6Lbda8eEL9zmVm/PLeTPBRhh1xCgdWaQ+J1CUieGpIfm2HdtsUpRv+HshiasBMcc6A==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/webpack"
      }
    },
    "node_modules/tiny-invariant": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/tiny-invariant/-/tiny-invariant-1.3.3.tgz",
      "integrity": "sha512-+FbBPE1o9QAYvviau/qC5SE3caw21q3xkvWKBtja5vgqOWIHHJ3ioaq1VPfn/Szqctz2bU/oYeKd9/z5BL+PVg==",
      "license": "MIT"
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/to-regex-range": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/to-regex-range/-/to-regex-range-5.0.1.tgz",
      "integrity": "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==",
      "license": "MIT",
      "dependencies": {
        "is-number": "^7.0.0"
      },
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/toidentifier": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/toidentifier/-/toidentifier-1.0.1.tgz",
      "integrity": "sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/ts-morph": {
      "version": "26.0.0",
      "resolved": "https://registry.npmjs.org/ts-morph/-/ts-morph-26.0.0.tgz",
      "integrity": "sha512-ztMO++owQnz8c/gIENcM9XfCEzgoGphTv+nKpYNM1bgsdOVC/jRZuEBf6N+mLLDNg68Kl+GgUZfOySaRiG1/Ug==",
      "license": "MIT",
      "dependencies": {
        "@ts-morph/common": "~0.27.0",
        "code-block-writer": "^13.0.3"
      }
    },
    "node_modules/tsconfig-paths": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/tsconfig-paths/-/tsconfig-paths-4.2.0.tgz",
      "integrity": "sha512-NoZ4roiN7LnbKn9QqE1amc9DJfzvZXxF4xDavcOWt1BPkdx+m+0gJuPM+S0vCe7zTJMYUP0R8pO2XMr+Y8oLIg==",
      "license": "MIT",
      "dependencies": {
        "json5": "^2.2.2",
        "minimist": "^1.2.6",
        "strip-bom": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "license": "0BSD"
    },
    "node_modules/tw-animate-css": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/tw-animate-css/-/tw-animate-css-1.4.0.tgz",
      "integrity": "sha512-7bziOlRqH0hJx80h/3mbicLW7o8qLsH5+RaLR2t+OHM3D0JlWGODQKQ4cxbK7WlvmUxpcj6Kgu6EKqjrGFe3QQ==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/Wombosvideo"
      }
    },
    "node_modules/type-is": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/type-is/-/type-is-2.1.0.tgz",
      "integrity": "sha512-faYHw0anBbc/kWF3zFTEnxSFOAGUX9GFbOBthvDdLsIlEoWOFOtS0zgCiQYwIskL9iGXZL3kAXD8OoZ4GmMATA==",
      "license": "MIT",
      "dependencies": {
        "content-type": "^2.0.0",
        "media-typer": "^1.1.0",
        "mime-types": "^3.0.0"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/type-is/node_modules/content-type": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/content-type/-/content-type-2.0.0.tgz",
      "integrity": "sha512-j/O/d7GcZCyNl7/hwZAb606rzqkyvaDctLmckbxLzHvFBzTJHuGEdodATcP3yIRoDrLHkIATJuvzbFlp/ki2cQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/unicorn-magic": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/unicorn-magic/-/unicorn-magic-0.3.0.tgz",
      "integrity": "sha512-+QBBXBCvifc56fsbuxZQ6Sic3wqqc3WWaqxs58gvJrcOuN83HGTCwz3oS5phzU9LthRNE9VrJCFCLUgHeeFnfA==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/universalify": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/universalify/-/universalify-2.0.1.tgz",
      "integrity": "sha512-gptHNQghINnc/vTGIk0SOFGFNXw7JVrlRUtConJRlvaw6DuX0wO5Jeko9sWrMBhh+PsYAZ7oXAiOnf/UKogyiw==",
      "license": "MIT",
      "engines": {
        "node": ">= 10.0.0"
      }
    },
    "node_modules/unpipe": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/unpipe/-/unpipe-1.0.0.tgz",
      "integrity": "sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/update-browserslist-db": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.2.3.tgz",
      "integrity": "sha512-Js0m9cx+qOgDxo0eMiFGEueWztz+d4+M3rGlmKPT+T4IS/jP4ylw3Nwpu6cpTTP8R1MAC1kF4VbdLt3ARf209w==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.1"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/use-sync-external-store": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/use-sync-external-store/-/use-sync-external-store-1.6.0.tgz",
      "integrity": "sha512-Pp6GSwGP/NrPIrxVFAIkOQeyw8lFenOHijQWkUTrDvrF4ALqylP2C/KCkeS9dpUM3KvYRQhna5vt7IL95+ZQ9w==",
      "license": "MIT",
      "peerDependencies": {
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==",
      "license": "MIT"
    },
    "node_modules/validate-npm-package-name": {
      "version": "7.0.2",
      "resolved": "https://registry.npmjs.org/validate-npm-package-name/-/validate-npm-package-name-7.0.2.tgz",
      "integrity": "sha512-hVDIBwsRruT73PbK7uP5ebUt+ezEtCmzZz3F59BSr2F6OVFnJ/6h8liuvdLrQ88Xmnk6/+xGGuq+pG9WwTuy3A==",
      "license": "ISC",
      "engines": {
        "node": "^20.17.0 || >=22.9.0"
      }
    },
    "node_modules/vary": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/vary/-/vary-1.1.2.tgz",
      "integrity": "sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/vite": {
      "version": "6.4.3",
      "resolved": "https://registry.npmjs.org/vite/-/vite-6.4.3.tgz",
      "integrity": "sha512-NTKlcQjlAK7MlQoyb6LgaqHc8sso/pVyUJYWMws3jg21uTJw/LddqIFPcPqP6PzpgbIcZyKI85sFE4HBrQDA8A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "esbuild": "^0.25.0",
        "fdir": "^6.4.4",
        "picomatch": "^4.0.2",
        "postcss": "^8.5.3",
        "rollup": "^4.34.9",
        "tinyglobby": "^0.2.13"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^18.0.0 || ^20.0.0 || >=22.0.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^18.0.0 || ^20.0.0 || >=22.0.0",
        "jiti": ">=1.21.0",
        "less": "*",
        "lightningcss": "^1.21.0",
        "sass": "*",
        "sass-embedded": "*",
        "stylus": "*",
        "sugarss": "*",
        "terser": "^5.16.0",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "jiti": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "lightningcss": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    },
    "node_modules/web-streams-polyfill": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/web-streams-polyfill/-/web-streams-polyfill-3.3.3.tgz",
      "integrity": "sha512-d2JWLCivmZYTSIoge9MsgFCZrt571BikcWGYkjC1khllbTeDlGqZ2D8vD8E/lJa8WGWbb7Plm8/XJYV7IJHZZw==",
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "license": "ISC",
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/wrappy": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/wrappy/-/wrappy-1.0.2.tgz",
      "integrity": "sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ==",
      "license": "ISC"
    },
    "node_modules/wsl-utils": {
      "version": "0.3.1",
      "resolved": "https://registry.npmjs.org/wsl-utils/-/wsl-utils-0.3.1.tgz",
      "integrity": "sha512-g/eziiSUNBSsdDJtCLB8bdYEUMj4jR7AGeUo96p/3dTafgjHhpF4RiCFPiRILwjQoDXx5MqkBr4fwWtR3Ky4Wg==",
      "license": "MIT",
      "dependencies": {
        "is-wsl": "^3.1.0",
        "powershell-utils": "^0.1.0"
      },
      "engines": {
        "node": ">=20"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/yallist": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-3.1.1.tgz",
      "integrity": "sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==",
      "license": "ISC"
    },
    "node_modules/yocto-spinner": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/yocto-spinner/-/yocto-spinner-1.2.0.tgz",
      "integrity": "sha512-Yw0hUB6UA3o4YUgKy3oSe9a4cxoaZ9sBfYDw+JSxo6Id0KoJGoxzPA24qqUXYKBWABs/zDSGTz9kww7t3F0XGw==",
      "license": "MIT",
      "dependencies": {
        "yoctocolors": "^2.1.1"
      },
      "engines": {
        "node": ">=18.19"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/yoctocolors": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/yoctocolors/-/yoctocolors-2.1.2.tgz",
      "integrity": "sha512-CzhO+pFNo8ajLM2d2IW/R93ipy99LWjtwblvC1RsoSUMZgyLbYFr221TnSNT7GjGdYui6P459mw9JH/g/zW2ug==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/zod": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/zod/-/zod-4.4.3.tgz",
      "integrity": "sha512-ytENFjIJFl2UwYglde2jchW2Hwm4GJFLDiSXWdTrJQBIN9Fcyp7n4DhxJEiWNAJMV1/BqWfW/kkg71UDcHJyTQ==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    },
    "node_modules/zod-to-json-schema": {
      "version": "3.25.2",
      "resolved": "https://registry.npmjs.org/zod-to-json-schema/-/zod-to-json-schema-3.25.2.tgz",
      "integrity": "sha512-O/PgfnpT1xKSDeQYSCfRI5Gy3hPf91mKVDuYLUHZJMiDFptvP41MSnWofm8dnCm0256ZNfZIM7DSzuSMAFnjHA==",
      "license": "ISC",
      "peerDependencies": {
        "zod": "^3.25.28 || ^4"
      }
    }
  }
}
```

path of the file : `frontend/package.json`

```
{
  "name": "my-project",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@base-ui/react": "^1.5.0",
    "@supabase/supabase-js": "^2.108.1",
    "@tailwindcss/oxide-linux-x64-gnu": "^4.3.0",
    "@tailwindcss/postcss": "^4.3.0",
    "@tailwindcss/vite": "^4.3.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lightningcss-linux-x64-gnu": "^1.32.0",
    "lucide-react": "^1.16.0",
    "react": "^19",
    "react-dom": "^19",
    "shadcn": "^4.8.0",
    "sweetalert2": "^11.26.25",
    "tailwind-merge": "^3.3.1",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.5.0",
    "postcss": "^8.5.15",
    "tailwindcss": "^4.2.0",
    "vite": "^6.0.7"
  }
}
```

path of the file : `frontend/postcss.config.js`

```
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

path of the file : `frontend/public/icon.svg`

```
<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    @media (prefers-color-scheme: light) {
      .background { fill: black; }
      .foreground { fill: white; }
    }
    @media (prefers-color-scheme: dark) {
      .background { fill: white; }
      .foreground { fill: black; }
    }
  </style>
  <g clip-path="url(#clip0_7960_43945)">
    <rect class="background" width="180" height="180" rx="37" />
    <g style="transform: scale(95%); transform-origin: center">
      <path class="foreground"
        d="M101.141 53H136.632C151.023 53 162.689 64.6662 162.689 79.0573V112.904H148.112V79.0573C148.112 78.7105 148.098 78.3662 148.072 78.0251L112.581 112.898C112.701 112.902 112.821 112.904 112.941 112.904H148.112V126.672H112.941C98.5504 126.672 86.5638 114.891 86.5638 100.5V66.7434H101.141V100.5C101.141 101.15 101.191 101.792 101.289 102.422L137.56 66.7816C137.255 66.7563 136.945 66.7434 136.632 66.7434H101.141V53Z" />
      <path class="foreground"
        d="M65.2926 124.136L14 66.7372H34.6355L64.7495 100.436V66.7372H80.1365V118.47C80.1365 126.278 70.4953 129.958 65.2926 124.136Z" />
    </g>
  </g>
  <defs>
    <clipPath id="clip0_7960_43945">
      <rect width="180" height="180" fill="white" />
    </clipPath>
  </defs>
</svg>
```

path of the file : `frontend/public/placeholder-logo.svg`

```
<svg xmlns="http://www.w3.org/2000/svg" width="215" height="48" fill="none"><path fill="#000" d="M57.588 9.6h6L73.828 38h-5.2l-2.36-6.88h-11.36L52.548 38h-5.2l10.24-28.4Zm7.16 17.16-4.16-12.16-4.16 12.16h8.32Zm23.694-2.24c-.186-1.307-.706-2.32-1.56-3.04-.853-.72-1.866-1.08-3.04-1.08-1.68 0-2.986.613-3.92 1.84-.906 1.227-1.36 2.947-1.36 5.16s.454 3.933 1.36 5.16c.934 1.227 2.24 1.84 3.92 1.84 1.254 0 2.307-.373 3.16-1.12.854-.773 1.387-1.867 1.6-3.28l5.12.24c-.186 1.68-.733 3.147-1.64 4.4-.906 1.227-2.08 2.173-3.52 2.84-1.413.667-2.986 1-4.72 1-2.08 0-3.906-.453-5.48-1.36-1.546-.907-2.76-2.2-3.64-3.88-.853-1.68-1.28-3.627-1.28-5.84 0-2.24.427-4.187 1.28-5.84.88-1.68 2.094-2.973 3.64-3.88 1.574-.907 3.4-1.36 5.48-1.36 1.68 0 3.227.32 4.64.96 1.414.64 2.56 1.56 3.44 2.76.907 1.2 1.454 2.6 1.64 4.2l-5.12.28Zm11.486-7.72.12 3.4c.534-1.227 1.307-2.173 2.32-2.84 1.04-.693 2.267-1.04 3.68-1.04 1.494 0 2.76.387 3.8 1.16 1.067.747 1.827 1.813 2.28 3.2.507-1.44 1.294-2.52 2.36-3.24 1.094-.747 2.414-1.12 3.96-1.12 1.414 0 2.64.307 3.68.92s1.84 1.52 2.4 2.72c.56 1.2.84 2.667.84 4.4V38h-4.96V25.92c0-1.813-.293-3.187-.88-4.12-.56-.96-1.413-1.44-2.56-1.44-.906 0-1.68.213-2.32.64-.64.427-1.133 1.053-1.48 1.88-.32.827-.48 1.84-.48 3.04V38h-4.56V25.92c0-1.2-.133-2.213-.4-3.04-.24-.827-.626-1.453-1.16-1.88-.506-.427-1.133-.64-1.88-.64-.906 0-1.68.227-2.32.68-.64.427-1.133 1.053-1.48 1.88-.32.827-.48 1.827-.48 3V38h-4.96V16.8h4.48Zm26.723 10.6c0-2.24.427-4.187 1.28-5.84.854-1.68 2.067-2.973 3.64-3.88 1.574-.907 3.4-1.36 5.48-1.36 1.84 0 3.494.413 4.96 1.24 1.467.827 2.64 2.08 3.52 3.76.88 1.653 1.347 3.693 1.4 6.12v1.32h-15.08c.107 1.813.614 3.227 1.52 4.24.907.987 2.134 1.48 3.68 1.48.987 0 1.88-.253 2.68-.76a4.803 4.803 0 0 0 1.84-2.2l5.08.36c-.64 2.027-1.84 3.64-3.6 4.84-1.733 1.173-3.733 1.76-6 1.76-2.08 0-3.906-.453-5.48-1.36-1.573-.907-2.786-2.2-3.64-3.88-.853-1.68-1.28-3.627-1.28-5.84Zm15.16-2.04c-.213-1.733-.76-3.013-1.64-3.84-.853-.827-1.893-1.24-3.12-1.24-1.44 0-2.6.453-3.48 1.36-.88.88-1.44 2.12-1.68 3.72h9.92ZM163.139 9.6V38h-5.04V9.6h5.04Zm8.322 7.2.24 5.88-.64-.36c.32-2.053 1.094-3.56 2.32-4.52 1.254-.987 2.787-1.48 4.6-1.48 2.32 0 4.107.733 5.36 2.2 1.254 1.44 1.88 3.387 1.88 5.84V38h-4.96V25.92c0-1.253-.12-2.28-.36-3.08-.24-.8-.64-1.413-1.2-1.84-.533-.427-1.253-.64-2.16-.64-1.44 0-2.573.48-3.4 1.44-.8.933-1.2 2.307-1.2 4.12V38h-4.96V16.8h4.48Zm30.003 7.72c-.186-1.307-.706-2.32-1.56-3.04-.853-.72-1.866-1.08-3.04-1.08-1.68 0-2.986.613-3.92 1.84-.906 1.227-1.36 2.947-1.36 5.16s.454 3.933 1.36 5.16c.934 1.227 2.24 1.84 3.92 1.84 1.254 0 2.307-.373 3.16-1.12.854-.773 1.387-1.867 1.6-3.28l5.12.24c-.186 1.68-.733 3.147-1.64 4.4-.906 1.227-2.08 2.173-3.52 2.84-1.413.667-2.986 1-4.72 1-2.08 0-3.906-.453-5.48-1.36-1.546-.907-2.76-2.2-3.64-3.88-.853-1.68-1.28-3.627-1.28-5.84 0-2.24.427-4.187 1.28-5.84.88-1.68 2.094-2.973 3.64-3.88 1.574-.907 3.4-1.36 5.48-1.36 1.68 0 3.227.32 4.64.96 1.414.64 2.56 1.56 3.44 2.76.907 1.2 1.454 2.6 1.64 4.2l-5.12.28Zm11.443 8.16V38h-5.6v-5.32h5.6Z"/><path fill="#171717" fill-rule="evenodd" d="m7.839 40.783 16.03-28.054L20 6 0 40.783h7.839Zm8.214 0H40L27.99 19.894l-4.02 7.032 3.976 6.914H20.02l-3.967 6.943Z" clip-rule="evenodd"/></svg>
```

path of the file : `frontend/public/placeholder.svg`

```
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" fill="none"><rect width="1200" height="1200" fill="#EAEAEA" rx="3"/><g opacity=".5"><g opacity=".5"><path fill="#FAFAFA" d="M600.709 736.5c-75.454 0-136.621-61.167-136.621-136.62 0-75.454 61.167-136.621 136.621-136.621 75.453 0 136.62 61.167 136.62 136.621 0 75.453-61.167 136.62-136.62 136.62Z"/><path stroke="#C9C9C9" stroke-width="2.418" d="M600.709 736.5c-75.454 0-136.621-61.167-136.621-136.62 0-75.454 61.167-136.621 136.621-136.621 75.453 0 136.62 61.167 136.62 136.621 0 75.453-61.167 136.62-136.62 136.62Z"/></g><path stroke="url(#a)" stroke-width="2.418" d="M0-1.209h553.581" transform="scale(1 -1) rotate(45 1163.11 91.165)"/><path stroke="url(#b)" stroke-width="2.418" d="M404.846 598.671h391.726"/><path stroke="url(#c)" stroke-width="2.418" d="M599.5 795.742V404.017"/><path stroke="url(#d)" stroke-width="2.418" d="m795.717 796.597-391.441-391.44"/><path fill="#fff" d="M600.709 656.704c-31.384 0-56.825-25.441-56.825-56.824 0-31.384 25.441-56.825 56.825-56.825 31.383 0 56.824 25.441 56.824 56.825 0 31.383-25.441 56.824-56.824 56.824Z"/><g clip-path="url(#e)"><path fill="#666" fill-rule="evenodd" d="M616.426 586.58h-31.434v16.176l3.553-3.554.531-.531h9.068l.074-.074 8.463-8.463h2.565l7.18 7.181V586.58Zm-15.715 14.654 3.698 3.699 1.283 1.282-2.565 2.565-1.282-1.283-5.2-5.199h-6.066l-5.514 5.514-.073.073v2.876a2.418 2.418 0 0 0 2.418 2.418h26.598a2.418 2.418 0 0 0 2.418-2.418v-8.317l-8.463-8.463-7.181 7.181-.071.072Zm-19.347 5.442v4.085a6.045 6.045 0 0 0 6.046 6.045h26.598a6.044 6.044 0 0 0 6.045-6.045v-7.108l1.356-1.355-1.282-1.283-.074-.073v-17.989h-38.689v23.43l-.146.146.146.147Z" clip-rule="evenodd"/></g><path stroke="#C9C9C9" stroke-width="2.418" d="M600.709 656.704c-31.384 0-56.825-25.441-56.825-56.824 0-31.384 25.441-56.825 56.825-56.825 31.383 0 56.824 25.441 56.824 56.825 0 31.383-25.441 56.824-56.824 56.824Z"/></g><defs><linearGradient id="a" x1="554.061" x2="-.48" y1=".083" y2=".087" gradientUnits="userSpaceOnUse"><stop stop-color="#C9C9C9" stop-opacity="0"/><stop offset=".208" stop-color="#C9C9C9"/><stop offset=".792" stop-color="#C9C9C9"/><stop offset="1" stop-color="#C9C9C9" stop-opacity="0"/></linearGradient><linearGradient id="b" x1="796.912" x2="404.507" y1="599.963" y2="599.965" gradientUnits="userSpaceOnUse"><stop stop-color="#C9C9C9" stop-opacity="0"/><stop offset=".208" stop-color="#C9C9C9"/><stop offset=".792" stop-color="#C9C9C9"/><stop offset="1" stop-color="#C9C9C9" stop-opacity="0"/></linearGradient><linearGradient id="c" x1="600.792" x2="600.794" y1="403.677" y2="796.082" gradientUnits="userSpaceOnUse"><stop stop-color="#C9C9C9" stop-opacity="0"/><stop offset=".208" stop-color="#C9C9C9"/><stop offset=".792" stop-color="#C9C9C9"/><stop offset="1" stop-color="#C9C9C9" stop-opacity="0"/></linearGradient><linearGradient id="d" x1="404.85" x2="796.972" y1="403.903" y2="796.02" gradientUnits="userSpaceOnUse"><stop stop-color="#C9C9C9" stop-opacity="0"/><stop offset=".208" stop-color="#C9C9C9"/><stop offset=".792" stop-color="#C9C9C9"/><stop offset="1" stop-color="#C9C9C9" stop-opacity="0"/></linearGradient><clipPath id="e"><path fill="#fff" d="M581.364 580.535h38.689v38.689h-38.689z"/></clipPath></defs></svg>
```

path of the file : `frontend/src/App.jsx`

```
import { AuthLayout } from "@/components/auth/auth-layout"
import { SignInForm } from "@/components/auth/sign-in-form"
import { RequireAuth, RequireRole, LoadingScreen } from "@/components/auth/route-guards"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { getDashboardPath } from "@/lib/auth"
import { AdminDashboard } from "@/pages/admin-dashboard"
import { StudentDashboard } from "@/pages/student-dashboard"
import { AccountManagement } from "@/pages/account-management"
import { CompleteAccount } from "@/pages/complete-account"
import { LogigrammeView } from "@/pages/logigramme-view"
import FilieresManagement from "@/pages/filieres-management"
import FormateursManagement from "@/pages/formateurs-management"
import AcademicYears from "@/pages/academic-years"
import { LogigrammeProvider } from "@/contexts/logigramme-context"
import { useCallback, useEffect, useState } from "react"

function usePath() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const navigate = useCallback((nextPath, options = {}) => {
    if (window.location.pathname === nextPath) return
    const method = options.replace ? "replaceState" : "pushState"
    window.history[method](null, "", nextPath)
    setPath(nextPath)
  }, [])

  return { path, navigate }
}

function LoginPage({ navigate }) {
  const { loading, user, role } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      navigate(getDashboardPath(role), { replace: true })
    }
  }, [loading, navigate, role, user])

  if (loading) return <LoadingScreen />
  if (user) return null

  return (
    <AuthLayout>
      <SignInForm navigate={navigate} />
    </AuthLayout>
  )
}

function AppRoutes() {
  const { path, navigate } = usePath()

  if (path === "/" || path === "/login") {
    return <LoginPage navigate={navigate} />
  }

  if (path === "/complete-account") {
    return <CompleteAccount navigate={navigate} />
  }

  if (path.startsWith("/admin/")) {
    return (
      <RequireRole role="admin" navigate={navigate}>
        <LogigrammeProvider>
          {path === "/admin/dashboard" && <AdminDashboard path={path} navigate={navigate} />}
          {path === "/admin/accounts" && <AccountManagement path={path} navigate={navigate} />}
          {path === "/admin/logigrammes" && <LogigrammeView path={path} navigate={navigate} />}
          {path === "/admin/filieres" && <FilieresManagement path={path} navigate={navigate} />}
          {path === "/admin/formateurs" && <FormateursManagement path={path} navigate={navigate} />}
          {path === "/admin/academic-years" && <AcademicYears path={path} navigate={navigate} />}
        </LogigrammeProvider>
      </RequireRole>
    )
  }

  if (path === "/student/dashboard") {
    return (
      <RequireRole role="student" navigate={navigate}>
        <StudentDashboard path={path} navigate={navigate} />
      </RequireRole>
    )
  }

  return (
    <RequireAuth navigate={navigate}>
      <DashboardRedirect navigate={navigate} />
    </RequireAuth>
  )
}

function DashboardRedirect({ navigate }) {
  const { role } = useAuth()

  useEffect(() => {
    navigate(getDashboardPath(role), { replace: true })
  }, [navigate, role])

  return <LoadingScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
```

path of the file : `frontend/src/components/auth/auth-layout.jsx`

```
import { HeartPulse } from "lucide-react"
import { BrandPanel } from "@/components/auth/brand-panel"

export function AuthLayout({ children }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2 bg-background">
      <BrandPanel />
      <section className="relative flex flex-col px-6 py-8 sm:px-10 overflow-hidden">
        {/* Subtle decorative background for the form area */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none [background-image:radial-gradient(var(--primary)_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden="true" />
        
        <div className="relative z-10 flex items-center gap-3 lg:hidden mb-8">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <HeartPulse className="size-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight uppercase leading-none text-foreground">ESFPP</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Mohammedia</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center py-10">
          {children}
        </div>

        <footer className="relative z-10 mt-auto pt-8 border-t border-border/50">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            &copy; {new Date().getFullYear()} ESFPP Mohammedia — Portail Académique
          </p>
        </footer>
      </section>
    </main>
  )
}
```

path of the file : `frontend/src/components/auth/brand-panel.jsx`

```
import { HeartPulse, Stethoscope, BookOpenCheck, ShieldCheck } from "lucide-react"

const stats = [
  { icon: Stethoscope, label: "Formation clinique" },
  { icon: BookOpenCheck, label: "Cours & examens" },
  { icon: ShieldCheck, label: "Suivi des stages" },
]

export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
      <img
        src="/nursing.png"
        alt="Étudiants en soins infirmiers en formation à l'ESFPP"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Primary brand overlay with a subtle gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/60" aria-hidden="true" />
      
      {/* Decorative medical grid pattern */}
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(var(--primary-foreground)_1px,transparent_1px)] [background-size:20px_20px]" aria-hidden="true" />

      <div className="relative z-10 flex items-center gap-3 p-10 text-primary-foreground">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm ring-1 ring-primary-foreground/30 shadow-lg">
          <HeartPulse className="size-6 text-accent" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight uppercase leading-none">ESFPP</span>
          <span className="text-xs font-medium opacity-80 uppercase tracking-widest mt-0.5">Mohammedia</span>
        </div>
      </div>

      <div className="relative z-10 max-w-md p-10 text-primary-foreground">
        <h2 className="text-balance text-4xl font-bold leading-tight tracking-tight">
          L'excellence en formation paramédicale.
        </h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-primary-foreground/85">
          Bienvenue sur le dashboard officiel de l'ESFPP. Accédez à vos outils pédagogiques et administrez votre parcours en toute simplicité.
        </p>

        <ul className="mt-10 flex flex-wrap gap-3">
          {stats.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2.5 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-sm font-semibold ring-1 ring-white/20 transition-all hover:bg-white/20"
            >
              <Icon className="size-4 text-accent" />
              {label}
            </li>
          ))}
        </ul>
      </div>
      
      {/* Subtle branding footer */}
      <div className="relative z-10 p-10 mt-auto">
        <p className="text-xs font-medium text-primary-foreground/50 uppercase tracking-[0.2em]">
          ESFPP Dashboard &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  )
}
```

path of the file : `frontend/src/components/auth/password-input.jsx`

```
import { useState } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type={visible ? "text" : "password"}
        className={cn("pl-9 pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
```

path of the file : `frontend/src/components/auth/route-guards.jsx`

```
import { useEffect } from "react"
import { getDashboardPath } from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"

export function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        Chargement de la session...
      </div>
    </main>
  )
}

export function RequireAuth({ children, navigate }) {
  const { loading, user } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true })
    }
  }, [loading, navigate, user])

  if (loading) return <LoadingScreen />
  if (!user) return null

  return children
}

export function RequireRole({ role, children, navigate }) {
  const { loading, user, role: currentRole } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    if (currentRole !== role) {
      navigate(getDashboardPath(currentRole), { replace: true })
    }
  }, [currentRole, loading, navigate, role, user])

  if (loading) return <LoadingScreen />
  if (!user || currentRole !== role) return null

  return children
}
```

path of the file : `frontend/src/components/auth/sign-in-form.jsx`

```
import { useState } from "react"
import { Mail, Loader2, KeyRound, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { PasswordInput } from "@/components/auth/password-input"
import { getDashboardPath, getUserRole } from "@/lib/auth"
import { supabase } from "@/supabaseClient"
import { cn } from "@/lib/utils"

export function SignInForm({ navigate }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get("email") || "").trim()
    const password = String(formData.get("password") || "")

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError("Email ou mot de passe incorrect.")
      return
    }

    navigate(getDashboardPath(getUserRole(data.user)), { replace: true })
  }

  return (
    <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 text-center sm:text-left">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 mx-auto sm:mx-0">
          <ShieldCheck className="size-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Content de vous revoir</h1>
        <p className="mt-3 text-base font-medium text-muted-foreground leading-relaxed">
          Connectez-vous à votre portail ESFPP Mohammedia pour accéder à vos outils.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Email Académique</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="votre.nom@esfpp.ma"
              className="h-12 pl-10 rounded-xl bg-background/50 focus:bg-background border-border/50"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <Label htmlFor="password" name="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mot de passe</Label>
            <a
              href="#"
              className="text-[11px] font-bold text-primary hover:underline underline-offset-4 uppercase tracking-wider"
            >
              Oublié ?
            </a>
          </div>
          <div className="relative">
             <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50 z-10" />
             <PasswordInput 
                id="password" 
                name="password" 
                autoComplete="current-password" 
                placeholder="••••••••" 
                className="h-12 pl-10 rounded-xl bg-background/50 focus:bg-background border-border/50" 
                required 
             />
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
            <Checkbox id="remember" defaultChecked className="rounded-md border-border/50" />
            Rester connecté
          </label>
        </div>

        <Button type="submit" className="h-12 w-full rounded-xl font-black text-base shadow-xl shadow-primary/20 group" disabled={loading}>
          {loading ? (
            <Loader2 className="size-5 animate-spin mr-2" />
          ) : (
            <>
              Se connecter
              <ArrowRight className="size-5 ml-2 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600 animate-in fade-in zoom-in-95 duration-200">
            {error}
          </div>
        )}
      </form>

      <div className="mt-12 text-center sm:text-left">
         <p className="text-xs font-medium text-muted-foreground/60 leading-relaxed">
           L&apos;accès à ce système est strictement réservé aux étudiants et au personnel autorisé de l&apos;ESFPP.
         </p>
      </div>
    </div>
  )
}
```

path of the file : `frontend/src/components/layout/dashboard-shell.jsx`

```
// frontend/src/components/layout/dashboard-shell.jsx (compact version with toggle in header)
import { useState, useRef, useEffect } from "react"
import {
  HeartPulse,
  LogOut,
  UserCircle,
  Settings,
  User,
  Shield,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Users,
  CalendarDays,
  BookOpen,
  GraduationCap,
  Calendar,
  Menu,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

export function DashboardShell({ title, subtitle, navItems, activePath, navigate, accent = "admin", children }) {
  const { user, role, signOut } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef(null)

  const userRole = role || (accent === "student" ? "student" : "admin")
  const isStudent = userRole === "student"

  const menuSections = isStudent
  ? [
    {
      title: "Espace Étudiant",
      items: [
        { label: "Mon espace", path: "/student/dashboard", icon: BookOpen },
      ],
    },
  ]
  : [
    {
      title: "Gestion",
      items: [
        { label: "Tableau de bord", path: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Comptes", path: "/admin/accounts", icon: Users },
      ],
    },
    {
      title: "Pédagogie",
      items: [
        { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
        { label: "Filières", path: "/admin/filieres", icon: BookOpen },
        { label: "Formateurs", path: "/admin/formateurs", icon: GraduationCap },
        { label: "Années", path: "/admin/academic-years", icon: Calendar },
      ],
    },
  ]

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
    <div
    className={cn(
      "grid min-h-screen transition-all duration-300 ease-in-out grid-cols-1",
      isCollapsed ? "md:grid-cols-[64px_1fr]" : "md:grid-cols-[200px_1fr]"
    )}
    >
    {/* Sidebar Drawer Mobile Overlay */}
    {isMobileOpen && (
      <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
      onClick={() => setIsMobileOpen(false)}
      />
    )}

    {/* Sidebar */}
    <aside
    className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar/95 backdrop-blur-2xl px-2 py-4 transform transition-all duration-300 ease-in-out shadow-2xl md:static md:translate-x-0 md:bg-sidebar/50 md:shadow-none md:overflow-hidden",
      isMobileOpen ? "translate-x-0" : "-translate-x-full",
      isCollapsed ? "md:w-16" : "md:w-[200px]"
    )}
    >
    <div className="flex items-center gap-2 px-2 mb-6 transition-all">
    <div className={cn("flex items-center gap-2 flex-1", isCollapsed && "md:justify-center")}>
    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
    <HeartPulse className="size-4" />
    </div>
    {(!isCollapsed || isMobileOpen) && (
      <div className="animate-in fade-in slide-in-from-left-2 duration-300">
      <p className="text-sm font-bold tracking-tight leading-none">ESFPP</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5 whitespace-nowrap">
      {isStudent ? "Étudiant" : "Admin"}
      </p>
      </div>
    )}
    </div>
    <button
    type="button"
    onClick={() => setIsMobileOpen(false)}
    className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors ml-auto"
    aria-label="Close menu"
    >
    <X className="size-4" />
    </button>
    </div>

    <nav className="flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
    {menuSections.map((section) => (
      <div key={section.title} className="flex flex-col gap-1">
      {(!isCollapsed || isMobileOpen) && (
        <p className="px-2 mb-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 animate-in fade-in duration-300">
        {section.title}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
      {section.items.map(({ label, icon: Icon, path }) => {
        const isActive = activePath === path;
        return (
          <button
          key={path}
          type="button"
          onClick={() => {
            navigate(path);
            setIsMobileOpen(false);
          }}
          title={isCollapsed && !isMobileOpen ? label : ""}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold transition-all duration-200 group relative",
            isActive
            ? "bg-primary/10 text-primary font-bold"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActive && (!isCollapsed || isMobileOpen) && "border-l-3 border-accent rounded-l-none pl-1.5",
                        isCollapsed && !isMobileOpen && "justify-center px-0"
          )}
          >
          <Icon className={cn("size-4 shrink-0", isActive ? "text-accent" : "text-muted-foreground group-hover:text-primary")} />
          {(!isCollapsed || isMobileOpen) && <span className="animate-in fade-in duration-300 truncate">{label}</span>}
          {isCollapsed && !isMobileOpen && isActive && (
            <div className="absolute left-0 w-0.5 h-5 bg-accent rounded-r-full" />
          )}
          </button>
        );
      })}
      </div>
      </div>
    ))}
    </nav>

    <div className="mt-auto px-1">
    {(!isCollapsed || isMobileOpen) ? (
      <div className="p-2 rounded-xl bg-muted/50 border border-border/50 animate-in zoom-in-95 duration-300">
      <p className="text-[10px] font-semibold text-muted-foreground">Support</p>
      </div>
    ) : (
      <div className="flex justify-center">
      <div className="size-8 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground text-xs" title="Support">
      ?
      </div>
      </div>
    )}
    {/* OLD TOGGLE BUTTON REMOVED FROM HERE */}
    </div>
    </aside>

    {/* Main Content */}
    <section className="min-w-0 flex flex-col">
    {/* Compact header */}
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4">
    <div className="flex items-center gap-2">
    {/* NEW TOGGLE BUTTON (desktop only) */}
    <button
    type="button"
    onClick={() => setIsCollapsed(!isCollapsed)}
    className="hidden md:flex p-1.5 -ml-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
    {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
    </button>

    {/* Mobile menu button */}
    <button
    type="button"
    onClick={() => setIsMobileOpen(true)}
    className="md:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0"
    aria-label="Open menu"
    >
    <Menu className="size-4" />
    </button>

    {/* Title and subtitle */}
    <div>
    <h1 className="text-base font-bold tracking-tight text-foreground">{title}</h1>
    {subtitle && <p className="text-[10px] font-medium text-muted-foreground hidden sm:block">{subtitle}</p>}
    </div>
    </div>

    <div className="flex items-center gap-2">
    <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors relative">
    <Bell className="size-4" />
    <span className="absolute top-1 right-1 size-1.5 bg-accent rounded-full ring-1 ring-card" />
    </button>

    <div className="h-5 w-px bg-border mx-0.5" />

    <div className="relative" ref={dropdownRef}>
    <button
    onClick={() => setIsProfileOpen(!isProfileOpen)}
    className="flex items-center gap-2 p-0.5 pr-2 rounded-full hover:bg-muted transition-all border border-transparent hover:border-border/50 group"
    >
    <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
    <UserCircle className="size-4" />
    </div>
    <div className="hidden text-left sm:block">
    <p className="text-[11px] font-bold leading-tight max-w-[100px] truncate">{user?.email}</p>
    <p className="text-[8px] font-bold uppercase tracking-wider text-accent leading-tight mt-0.5">
    {isStudent ? "Étudiant" : "Admin"}
    </p>
    </div>
    </button>

    {isProfileOpen && (
      <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-card p-1.5 shadow-2xl shadow-primary/10 animate-in fade-in zoom-in-95 duration-200 z-50 medical-glass">
      <div className="px-2 py-2 border-b border-border/50 mb-1">
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Connecté</p>
      <p className="text-xs font-bold text-foreground mt-0.5 truncate">{user?.email}</p>
      </div>

      <div className="space-y-0.5">
      <button className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors">
      <User className="size-3" />
      Profil
      </button>
      <button className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors">
      <Settings className="size-3" />
      Paramètres
      </button>
      </div>

      <div className="h-px bg-border/50 my-1" />

      <button
      onClick={handleSignOut}
      className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
      >
      <LogOut className="size-3" />
      Déconnexion
      </button>
      </div>
    )}
    </div>
    </div>
    </header>

    {/* Reduced padding for content area */}
    <div className="w-full px-3 py-3 flex-1 overflow-y-auto">
    {children}
    </div>
    </section>
    </div>
    </main>
  )
}
```

path of the file : `frontend/src/components/logigramme/CellContextMenu.jsx`

```
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function CellContextMenu({ x = 0, y = 0, onClose = () => {}, onSelect = () => {} }) {
  const menuRef = useRef(null);
  const portalNodeRef = useRef(typeof document !== 'undefined' ? document.createElement('div') : null);

  useEffect(() => {
    // append portal node to body (created synchronously above)
    if (portalNodeRef.current && !portalNodeRef.current.parentNode) {
      portalNodeRef.current.style.position = 'absolute';
      portalNodeRef.current.style.top = '0';
      portalNodeRef.current.style.left = '0';
      portalNodeRef.current.style.width = '0';
      portalNodeRef.current.style.height = '0';
      portalNodeRef.current.style.zIndex = '9999';
      document.body.appendChild(portalNodeRef.current);
    }
    // ensure high stacking and pointer events
    portalNodeRef.current.style.position = 'absolute';
    portalNodeRef.current.style.top = '0';
    portalNodeRef.current.style.left = '0';
    portalNodeRef.current.style.width = '0';
    portalNodeRef.current.style.height = '0';
    portalNodeRef.current.style.zIndex = '9999';
    document.body.appendChild(portalNodeRef.current);

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      if (portalNodeRef.current && portalNodeRef.current.parentNode) {
        portalNodeRef.current.parentNode.removeChild(portalNodeRef.current);
      }
    };
  }, [onClose]);

  // Clamp so menu stays inside viewport
  const clamp = (coord, max, pad = 8, size = 160) => Math.min(Math.max(pad, coord), Math.max(pad, max - size - pad));
  const left = clamp(x, window.innerWidth);
  const top = clamp(y, window.innerHeight);

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[120px] bg-white rounded-md border border-slate-200 shadow-lg py-1 text-xs font-medium text-slate-700"
      style={{ top: `${top}px`, left: `${left}px` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        onClick={() => onSelect('normal')}
        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEF9C3] border border-slate-300"></span>
        Session
      </button>
      <button
        onClick={() => onSelect('vacation')}
        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#F472B6]"></span>
        Vacance
      </button>
      <button
        onClick={() => onSelect('exam')}
        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></span>
        Examen
      </button>
    </div>
  );

  return createPortal(menu, portalNodeRef.current || document.body);
}

export default CellContextMenu;
```

path of the file : `frontend/src/components/logigramme/EditLogigrammeModal.jsx`

```
import { useState, useEffect } from 'react'
import { apiRequest } from '@/lib/api'
import { useLogigrammeContext } from '@/contexts/logigramme-context'
import { X, Save, Loader2, Pencil, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function EditLogigrammeModal({ isOpen, onClose, logigrammeData, onSaveSuccess }) {
  const { formateurs } = useLogigrammeContext()
  const [editedUnites, setEditedUnites] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    if (isOpen && logigrammeData?.unites) {
      setEditedUnites(
        logigrammeData.unites.map(u => ({
          id: u.id,
          nom: u.nom,
          vhg: u.vhg,
          formateur_id: u.formateur?.id || u.formateur_id || '',
          _original_nom: u.nom,
          _original_vhg: u.vhg,
          _original_formateur_id: u.formateur?.id || u.formateur_id || '',
        }))
      )
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, logigrammeData])

  const updateUnit = (index, field, value) => {
    setEditedUnites(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const hasChanges = editedUnites.some(u =>
    u.nom !== u._original_nom ||
    Number(u.vhg) !== Number(u._original_vhg) ||
    (u.formateur_id || '') !== (u._original_formateur_id || '')
  )

  const getChangedUnites = () => {
    return editedUnites
      .filter(u =>
        u.nom !== u._original_nom ||
        Number(u.vhg) !== Number(u._original_vhg) ||
        (u.formateur_id || '') !== (u._original_formateur_id || '')
      )
      .map(u => ({
        id: u.id,
        nom: u.nom,
        vhg: Number(u.vhg),
        formateur_id: u.formateur_id || null,
      }))
  }

  const handleSave = async () => {
    const changedUnites = getChangedUnites()
    if (changedUnites.length === 0) return

    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      await apiRequest(`/api/logigramme/${logigrammeData.id}/unites`, {
        method: 'PUT',
        body: JSON.stringify({ unites: changedUnites }),
      })

      setSuccessMsg(`${changedUnites.length} unité(s) modifiée(s) avec succès.`)
      if (onSaveSuccess) onSaveSuccess()

      // Update the _original values so hasChanges resets
      setEditedUnites(prev =>
        prev.map(u => ({
          ...u,
          _original_nom: u.nom,
          _original_vhg: u.vhg,
          _original_formateur_id: u.formateur_id,
        }))
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const title = logigrammeData
    ? `${logigrammeData.filiere?.name || '?'} — ${logigrammeData.classe?.label || '?'}`
    : 'Modifier le logigramme'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Modifier les unités
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            disabled={saving}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar mb-4">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/80 backdrop-blur-sm">
                <th className="text-left p-2 font-black uppercase tracking-widest text-[9px] text-muted-foreground w-10">#</th>
                <th className="text-left p-2 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Nom de l'unité</th>
                <th className="text-left p-2 font-black uppercase tracking-widest text-[9px] text-muted-foreground w-20">VHG</th>
                <th className="text-left p-2 font-black uppercase tracking-widest text-[9px] text-muted-foreground w-48">Formateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {editedUnites.map((unit, idx) => {
                const isModified =
                  unit.nom !== unit._original_nom ||
                  Number(unit.vhg) !== Number(unit._original_vhg) ||
                  (unit.formateur_id || '') !== (unit._original_formateur_id || '')

                return (
                  <tr
                    key={unit.id}
                    className={cn(
                      'transition-colors',
                      isModified ? 'bg-primary/5' : 'hover:bg-muted/30'
                    )}
                  >
                    <td className="p-2 text-muted-foreground font-bold">{idx + 1}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={unit.nom}
                        onChange={e => updateUnit(idx, 'nom', e.target.value)}
                        className={cn(
                          'w-full bg-transparent border-b border-transparent focus:border-primary outline-none py-1 px-1 font-medium transition-colors rounded-md',
                          isModified && unit.nom !== unit._original_nom && 'border-primary/30 bg-primary/5'
                        )}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={unit.vhg}
                        onChange={e => updateUnit(idx, 'vhg', e.target.value)}
                        className={cn(
                          'w-full bg-transparent border-b border-transparent focus:border-primary outline-none py-1 px-1 font-bold text-center transition-colors rounded-md',
                          isModified && Number(unit.vhg) !== Number(unit._original_vhg) && 'border-primary/30 bg-primary/5'
                        )}
                        min={0}
                        step={1}
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={unit.formateur_id || ''}
                        onChange={e => updateUnit(idx, 'formateur_id', e.target.value)}
                        className={cn(
                          'w-full bg-transparent border-b border-transparent focus:border-primary outline-none py-1 px-1 font-medium transition-colors rounded-md',
                          isModified && (unit.formateur_id || '') !== (unit._original_formateur_id || '') && 'border-primary/30 bg-primary/5'
                        )}
                      >
                        <option value="">— Aucun —</option>
                        {formateurs.map(f => (
                          <option key={f.id} value={f.id}>{f.nom}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {editedUnites.length === 0 && (
            <div className="p-8 text-center text-muted-foreground/40">
              <p className="text-[10px] font-bold uppercase tracking-widest">Aucune unité à modifier</p>
            </div>
          )}
        </div>

        {/* Error / Success */}
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2 mb-4 animate-in slide-in-from-top-2 shrink-0">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2 mb-4 animate-in slide-in-from-top-2 shrink-0">
            <Save className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
            disabled={saving}
          >
            Fermer
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="size-3.5 mr-2" />
                {hasChanges ? `Sauvegarder (${getChangedUnites().length})` : 'Aucune modification'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

path of the file : `frontend/src/components/logigramme/FilterBar.jsx`

```
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
```

path of the file : `frontend/src/components/logigramme/FormateurVue.jsx`

```
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useLogigrammeContext } from '@/contexts/logigramme-context';
import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';
import { Legend } from './Legend';
import { Loader2, AlertTriangle, Info } from 'lucide-react';

export function FormateurVue({ formateurId }) {
  const { filters } = useLogigrammeContext();
  const [data, setData] = useState(null);
  const [weeks, setWeeks] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchFormateurData = async () => {
    if (!formateurId) return;
    try {
      // Build query parameters with all filters
      const queryParams = new URLSearchParams();
      if (filters.niveau_id) queryParams.append('niveau_id', filters.niveau_id);
      if (filters.filiere_id) queryParams.append('filiere_id', filters.filiere_id);
      if (filters.classe_id) queryParams.append('classe_id', filters.classe_id);

      const url = `/api/formateurs/${formateurId}/unites?${queryParams.toString()}`;
      console.log('[FormateurVue] Fetching with URL:', url);
      console.log('[FormateurVue] Current filters:', filters);

      const [res, weeksRes] = await Promise.all([
        apiRequest(url),
        apiRequest(`/api/years/${filters.year_id}/weeks`)
      ]);
      console.log('[FormateurVue] Response:', res);
      setData(res);
      setWeeks(weeksRes);
    } catch (err) {
      console.error('Failed to fetch formateur data:', err);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchFormateurData();
      setLoading(false);
    }
    init();
  }, [formateurId, filters.year_id, filters.niveau_id, filters.filiere_id, filters.classe_id]);

  if (loading && (!data || !weeks)) {
    return (
      <div className="flex flex-col items-center justify-center py-40 bg-card rounded-3xl border border-border">
        <Loader2 className="size-10 animate-spin text-primary/30 mb-4" />
        <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Calcul de la vue formateur...</p>
      </div>
    );
  }

  if (!data || !weeks) return null;

  const { unites, conflicts } = data;

  // Group units by logigramme
  const logigrammeGroups = unites.reduce((acc, unit) => {
    const logId = unit.logigramme_id;
    if (!acc[logId]) {
      acc[logId] = {
        meta: unit.logigramme,
        items: []
      };
    }
    acc[logId].items.push(unit);
    return acc;
  }, {});

  const totalVhg = unites.reduce((sum, u) => sum + (parseFloat(u.vhg) || 0), 0);

  // ── Cell Interaction Handlers ──────────────────────────────────────────
  const handleToggleCell = async (cellId, currentStatus) => {
    const isDone = currentStatus === 'done' || currentStatus === 'auto_done';
    const nextStatus = isDone ? 'pending' : 'done';

    // Optimistic state update in FormateurVue
    setData(prev => {
      if (!prev) return prev;
      const nextUnites = prev.unites.map(u => {
        const hasCell = u.cells.some(c => c.id === cellId);
        if (!hasCell) return u;

        const nextCells = u.cells.map(c =>
          c.id === cellId ? { ...c, completion_status: nextStatus } : c
        );

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
      await apiRequest(`/api/completion/cell/${cellId}`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {
      console.error('Failed to toggle cell:', err);
      fetchFormateurData(); // Revert on error
    }
  };

  const handleMarkWeek = async (logigrammeId, semaine, status) => {
    try {
      await apiRequest(`/api/completion/week`, {
        method: 'POST',
        body: JSON.stringify({ logigramme_id: logigrammeId, semaine, status })
      });
      // Refresh list to update all cells in that logigramme
      await fetchFormateurData();
    } catch (err) {
      console.error('Failed to mark week:', err);
    }
  };

  const handleCreateCell = async (uniteId, semaine, heures) => {
    // Determine completion_status based on auto_done logic
    const today = new Date().toISOString().split('T')[0];
    const week = weeks?.find(w => w.semaine === semaine);
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
      await apiRequest('/api/logigramme/cell', {
        method: 'POST',
        body: JSON.stringify({
          unite_id: uniteId,
          semaine,
          cell_type: 'normal',
          heures,
        })
      });
      // Refetch to get real DB ids and sync state
      await fetchFormateurData();
    } catch (err) {
      console.error('Failed to create cell:', err);
      // Rollback
      setData(prev => {
        if (!prev) return prev;
        const nextUnites = prev.unites.map(u => {
          if (u.id !== uniteId) return u;
          let nextCells;
          if (isUpdate) {
            nextCells = u.cells.map(c => c.semaine === semaine ? oldCell : c);
          } else {
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

  return (
    <div className="space-y-6">
      {/* ── Info Banner ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Info className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-black text-primary uppercase tracking-widest">Mode Vue Formateur</p>
            <p className="text-sm font-medium text-muted-foreground">
              Enseigne dans <span className="font-black text-foreground">{Object.keys(logigrammeGroups).length} programmes</span> — <span className="font-black text-foreground">{totalVhg} heures</span> au total.
            </p>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-xl animate-bounce">
            <AlertTriangle className="size-4 text-destructive" />
            <p className="text-xs font-black text-destructive uppercase tracking-widest">
              {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''} d&apos;horaire détecté{conflicts.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* ── Conflicts List ───────────────────────────────────────────────── */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-destructive/60">Détails des conflits</h4>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {conflicts.map((conf, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white border border-destructive/10 shadow-sm">
                <p className="text-[10px] font-black text-destructive mb-1">Semaine {conf.semaine} ({conf.week_start_date})</p>
                <ul className="space-y-1">
                  {conf.programmes.map((p, pidx) => (
                    <li key={idx + '-' + pidx} className="text-[9px] font-bold text-muted-foreground leading-tight">
                      • {p.label}: <span className="text-foreground">{p.unite_nom}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grids per Logigramme ────────────────────────────────────────── */}
      {Object.values(logigrammeGroups).map((group) => (
        <div key={group.meta.id} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary text-white">
              {group.meta.filiere.code}
            </span>
            <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
              {group.meta.filiere.name} — {group.meta.classe.label}
            </h3>
          </div>

          <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <div className="w-fit min-w-full">
                <GridHeader
                  weeks={weeks}
                  onMarkWeek={(sem, status) => {
                    if (confirm(`Voulez-vous marquer toute la semaine ${sem} comme '${status}'?`)) {
                      handleMarkWeek(group.meta.id, sem, status);
                    }
                  }}
                />
                <div className="flex flex-col">
                  {group.items.map((unite, idx) => (
                    <GridRow
                      key={unite.id}
                      unite={unite}
                      rowIndex={idx + 1}
                      weeksCount={weeks.length}
                      onToggleCell={handleToggleCell}
                      onCreateCell={handleCreateCell}
                      highlightWeeks={[]}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <Legend />
    </div>
  );
}
```

path of the file : `frontend/src/components/logigramme/GridCell.jsx`

```
import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getCellClassName } from '@/lib/logigramme-helpers';
import { cn } from '@/lib/utils';

export function GridCell({ cell, semaine, onToggle, onCreateCell, isHighlighted = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Clear error flash after 1.5s
  useEffect(() => {
    if (hasError) {
      const timer = setTimeout(() => setHasError(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [hasError]);

  const isExistingNormal = cell && cell.cell_type === 'normal';

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onCreateCell && (!cell || isExistingNormal)) {
      setIsEditing(true);
    }
  };

  const commitValue = (value) => {
    setIsEditing(false);
    const numVal = parseFloat(value);
    if (!numVal || numVal <= 0) return; // Ignore empty or invalid

    if (onCreateCell) {
      // If it hasn't changed from existing value, we could skip, but let's just save
      if (isExistingNormal && numVal === cell.heures) return;
      
      onCreateCell(semaine, numVal).catch(() => {
        setHasError(true);
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue(e.target.value);
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleBlur = (e) => {
    commitValue(e.target.value);
  };

  // Editing state: show input on yellow background
  if (isEditing) {
    return (
      <div className="relative w-10 h-12 border-r border-b border-slate-300 bg-[#FEF9C3] flex items-center justify-center">
        <input
          ref={inputRef}
          type="number"
          min="1"
          step="1"
          defaultValue={isExistingNormal ? cell.heures : undefined}
          className="w-8 h-8 text-center text-[11px] font-bold bg-transparent border-b-2 border-slate-400 outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      </div>
    );
  }

  // ── Empty cell (no row in DB for this semaine/unité) ──
  if (!cell) {
    // Default empty cell with right-click support
    return (
      <div
        className={cn(
          "w-10 h-12 border-r border-b border-slate-300 bg-white",
          hasError && "ring-2 ring-red-500 ring-inset z-20"
        )}
        onContextMenu={handleContextMenu}
      />
    );
  }

  // ── Existing cell ──
  const { id, cell_type, heures, completion_status } = cell;
  const isDone = completion_status === 'done' || completion_status === 'auto_done';
  const isNormal = cell_type === 'normal';

  const handleClick = () => {
    if ((isNormal || cell_type === 'exam') && onToggle) {
      onToggle(id, completion_status);
    }
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={isNormal ? handleContextMenu : undefined}
      className={cn(
        getCellClassName(cell_type, completion_status),
        isHighlighted && "ring-2 ring-destructive ring-inset z-20 shadow-[0_0_8px_rgba(239,68,68,0.4)]",
        hasError && "ring-2 ring-red-500 ring-inset z-20"
      )}
      title={isHighlighted ? "CONFLIT D'HORAIRE ! " + (isNormal ? `${heures}h` : cell_type) : (isNormal ? `${heures}h - ${completion_status}` : cell_type)}
    >
      {cell_type === 'vacation' && 'V'}
      {cell_type === 'exam' && (
        <>
          <span>E</span>
          {isDone && <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-emerald-600">✔</span>}
        </>
      )}
      {cell_type === 'tiff' && 'T'}
      {isNormal && (
        <>
          <span>{heures > 0 ? Math.round(heures) : ''}</span>
          {isDone && <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-emerald-600">✔</span>}
        </>
      )}
    </div>
  );
}
```

path of the file : `frontend/src/components/logigramme/GridHeader.jsx`

```
import { groupWeeksByMonth, formatShortDate, getDominantWeekMonth } from '@/lib/logigramme-helpers';

export function GridHeader({ weeks, onMarkWeek }) {
  const weekColumnWidth = 40;

  return (
    <div className="flex flex-col sticky top-0 z-30 shadow-sm select-none">
      {/* 1. Semesters and Months */}
      <div className="flex w-fit bg-white border-b border-slate-300">
         <div className="sticky left-0 z-30 w-[520px] bg-[#FFE600] border-r border-slate-300 flex items-center justify-center text-[12px] font-black uppercase tracking-[0.25em] text-black flex-shrink-0">
           Plan de formation
         </div>
         <div className="flex">
           {weeks.map((w, idx) => {
             const monthName = getDominantWeekMonth(w);
             const isFirstInMonth = idx === 0 || getDominantWeekMonth(weeks[idx - 1]) !== monthName;
             const isLastInMonth = idx === weeks.length - 1 || getDominantWeekMonth(weeks[idx + 1]) !== monthName;

             let groupCount = 0;
             if (isFirstInMonth) {
               for (let i = idx; i < weeks.length; i++) {
                 if (getDominantWeekMonth(weeks[i]) === monthName) {
                   groupCount++;
                 } else {
                   break;
                 }
               }
             }

             return (
               <div
                 key={idx}
                 className={`relative w-10 h-10 bg-white flex items-center justify-center ${
                   isLastInMonth ? 'border-r border-slate-300' : ''
                 }`}
               >
                 {isFirstInMonth && (
                   <div
                     className="absolute left-0 top-0 h-full flex items-center justify-center pointer-events-none z-10"
                     style={{ width: `${groupCount * weekColumnWidth}px` }}
                   >
                     <span className="text-[11px] font-extrabold uppercase text-slate-800 tracking-wider whitespace-nowrap">
                       {monthName}
                     </span>
                   </div>
                 )}
               </div>
             );
           })}
         </div>
         <div className="sticky right-0 z-30 w-24 bg-white border-l border-slate-300 flex items-center justify-center text-[11px] font-black text-slate-800 uppercase flex-shrink-0">Progression</div>
      </div>

      {/* 2. Week Numbers */}
      <div className="flex w-fit bg-white border-b border-slate-300">
         <div className="sticky left-0 z-30 flex bg-white border-r border-slate-300 flex-shrink-0">
            <div className="w-10 h-8 flex items-center justify-center text-[10px] font-black text-slate-700 border-r border-slate-300">N°</div>
            <div className="w-64 h-8 flex items-center px-3 text-[10px] font-black text-slate-700 border-r border-slate-300 uppercase">Unité de formation</div>
            <div className="w-40 h-8 flex items-center justify-center px-3 text-[10px] font-black text-slate-700 border-r border-slate-300 uppercase">Formateur</div>
            <div className="w-16 h-8 flex items-center justify-center text-[10px] font-black text-slate-700 uppercase">VHG</div>
         </div>
         <div className="flex">
           {weeks.map((w, idx) => (
             <div
               key={idx}
               onClick={() => onMarkWeek && onMarkWeek(w.semaine, 'done')}
               className="w-10 h-8 border-r border-slate-300 flex items-center justify-center text-[10px] font-extrabold text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
               title="Cliquer pour marquer toute la semaine comme 'Terminé'"
             >
               {w.semaine}
             </div>
           ))}
         </div>
         <div className="sticky right-0 z-30 w-24 bg-white border-l border-slate-300 h-8 flex-shrink-0" />
      </div>

      {/* 3. Dates */}
      <div className="flex w-fit bg-white border-b border-slate-300">
         <div className="sticky left-0 z-30 w-[520px] bg-white border-r border-slate-300 h-6 flex-shrink-0" />
         <div className="flex">
           {weeks.map((w, idx) => (
             <div
               key={idx}
               className="w-10 h-6 border-r border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-500"
             >
               {formatShortDate(w.week_start_date)}
             </div>
           ))}
         </div>
         <div className="sticky right-0 z-30 w-24 bg-white border-l border-slate-300 h-6 flex-shrink-0" />
      </div>
    </div>
  );
}
```

path of the file : `frontend/src/components/logigramme/GridRow.jsx`

```
import { GridCell } from './GridCell';

export function GridRow({ unite, rowIndex, weeksCount = 52, onToggleCell, onCreateCell, highlightWeeks = [] }) {
  const { nom, formateur, vhg, vh_realise, cells } = unite;
  const taux = vhg > 0 ? (vh_realise / vhg) * 100 : 0;

  // Map sparse cells to 52-week array
  const weekMap = {};
  cells.forEach(c => {
    weekMap[c.semaine] = c;
  });

  const cellsArray = [];
  for (let i = 1; i <= weeksCount; i++) {
    cellsArray.push(weekMap[i] || null);
  }

  const normalAndExamCells = cells.filter(c => c.cell_type === 'normal' || c.cell_type === 'exam');
  const totalCellsCount = normalAndExamCells.length;
  const completedCellsCount = normalAndExamCells.filter(c => c.completion_status === 'done' || c.completion_status === 'auto_done').length;
  const completionPercentage = totalCellsCount > 0 ? Math.round((completedCellsCount / totalCellsCount) * 100) : 0;

  return (
    <div className="flex w-fit bg-white hover:bg-slate-50 transition-colors group isolate">
      {/* Sticky Left Panel */}
      <div className="sticky left-0 z-20 flex bg-white border-b border-slate-300 group-hover:bg-slate-50 transition-colors select-none flex-shrink-0">
        <div className="w-10 h-12 border-r border-slate-300 flex items-center justify-center text-[11px] font-extrabold text-slate-800 bg-white">{rowIndex}</div>
        <div className="w-64 h-12 border-r border-slate-300 flex items-center px-3 text-[11px] font-bold text-slate-800 bg-[#FEF9C3] truncate" title={nom}>{nom}</div>
        <div className="w-40 h-12 border-r border-slate-300 flex items-center justify-center px-3 text-[11px] font-bold text-blue-700 hover:underline cursor-pointer bg-[#FEF9C3] truncate" title={formateur?.nom}>{formateur?.nom || '—'}</div>
        <div className="w-16 h-12 border-r border-slate-300 flex items-center justify-center text-[11px] font-extrabold text-slate-800 bg-[#FEF9C3]">{vhg}</div>
      </div>

      {/* 52 Week Cells */}
      <div className="flex">
        {cellsArray.map((cell, idx) => (
          <GridCell
            key={idx}
            cell={cell}
            semaine={idx + 1}
            onToggle={onToggleCell}
            onCreateCell={onCreateCell ? (semaine, heures) => onCreateCell(unite.id, semaine, heures) : undefined}
            isHighlighted={cell && highlightWeeks.includes(cell.semaine)}
          />
        ))}
      </div>

      {/* Sticky Right Panel - Progress */}
      <div className="sticky right-0 z-20 w-24 h-12 bg-white border-b border-l border-slate-300 flex items-center px-2 group-hover:bg-slate-50 transition-colors select-none flex-shrink-0">
        <div className="w-full">
           <div className="flex justify-between text-[9px] font-black text-slate-700 mb-0.5">
             <span>{Math.round(vh_realise)}h / {vhg}h</span>
             <span className={completionPercentage >= 100 ? 'text-emerald-600' : ''}>{completionPercentage}%</span>
           </div>
           <div className="text-[8px] font-extrabold text-slate-400 uppercase mb-1">
             {completedCellsCount}/{totalCellsCount} CELLULES
           </div>
           <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
             <div
               className={`h-full transition-all duration-500 ${completionPercentage >= 100 ? 'bg-emerald-500' : 'bg-[#0F4C81]'}`}
               style={{ width: `${Math.min(completionPercentage, 100)}%` }}
             />
           </div>
        </div>
      </div>
    </div>
  );
}
```

path of the file : `frontend/src/components/logigramme/HeatmapView.jsx`

```
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useLogigrammeContext } from '@/contexts/logigramme-context';
import { groupWeeksByMonth, groupWeeksBySemester } from '@/lib/logigramme-helpers';
import { Loader2, AlertCircle } from 'lucide-react';

export function HeatmapView({ onSelectRow }) {
  const { filters } = useLogigrammeContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchHeatmap() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (filters.year_id) query.append('year_id', filters.year_id);
        if (filters.filiere_id) query.append('filiere_id', filters.filiere_id);
        
        const res = await apiRequest(`/api/logigramme/heatmap?${query.toString()}`);
        setData(res);
      } catch (err) {
        console.error('Failed to fetch heatmap:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHeatmap();
  }, [filters.year_id, filters.filiere_id]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-40 bg-card rounded-3xl border border-border">
        <Loader2 className="size-10 animate-spin text-primary/30 mb-4" />
        <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Calcul de la vue d'ensemble...</p>
      </div>
    );
  }

  if (!data) return null;

  const { weeks, rows } = data;
  const monthGroups = groupWeeksByMonth(weeks);
  const semesterGroups = groupWeeksBySemester(weeks);

  const getCellColor = (taux, hasCells) => {
    if (!hasCells) return 'bg-muted/30'; // diagonal hatch pattern could be added via CSS
    if (taux === 0) return 'bg-slate-200/50';
    if (taux === 1) return 'bg-emerald-500';
    if (taux >= 0.5) return 'bg-blue-400';
    return 'bg-orange-300';
  };

  return (
    <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="border-collapse w-full text-[10px]">
          <thead>
            {/* Semesters */}
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-20 bg-muted/50 border-b border-r border-border p-2 w-[240px]" />
              {semesterGroups.map((s, i) => (
                <th key={i} colSpan={s.count} className="border-b border-r border-border p-1 font-black uppercase tracking-tighter text-muted-foreground/60">
                  Semestre {s.semestre}
                </th>
              ))}
            </tr>
            {/* Months */}
            <tr className="bg-muted/20">
              <th className="sticky left-0 z-20 bg-muted/20 border-b border-r border-border p-2 w-[240px]" />
              {monthGroups.map((m, i) => (
                <th key={i} colSpan={m.count} className="border-b border-r border-border p-1 font-bold uppercase tracking-tighter text-muted-foreground/40">
                  {m.mois}
                </th>
              ))}
            </tr>
            {/* Week numbers */}
            <tr className="bg-white">
              <th className="sticky left-0 z-20 bg-white border-b border-r border-border p-2 w-[240px] text-left font-black uppercase tracking-widest text-muted-foreground/80">Logigramme</th>
              {weeks.map(w => (
                <th key={w.semaine} className="border-b border-r border-border w-6 h-6 font-bold text-muted-foreground/40">
                  {w.semaine}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.logigramme_id} className="group hover:bg-muted/10">
                <td 
                  className="sticky left-0 z-10 bg-white border-b border-r border-border p-2 w-[240px] font-bold text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                  onClick={() => onSelectRow(row.logigramme_id)}
                >
                  {row.label}
                </td>
                {weeks.map(w => {
                  const comp = row.weekly_completion.find(c => c.semaine === w.semaine);
                  return (
                    <td 
                      key={w.semaine} 
                      className={`border-b border-r border-border w-6 h-6 p-0.5`}
                      title={comp ? `S${w.semaine}: ${Math.round(comp.taux * 100)}%` : `S${w.semaine}: Pas de session`}
                    >
                      <div className={`w-full h-full rounded-sm transition-colors ${getCellColor(comp?.taux, !!comp)}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="p-4 bg-muted/5 border-t border-border flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-slate-200/50 rounded-sm" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">0%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-orange-300 rounded-sm" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">1-49%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-400 rounded-sm" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">50-99%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-muted/30 rounded-sm" />
          <span className="text-[9px] font-bold uppercase text-muted-foreground">Vacances/Exams</span>
        </div>
      </div>
    </div>
  );
}
```

path of the file : `frontend/src/components/logigramme/ImportModal.jsx`

```
import { useState, useEffect } from "react"
import { supabase } from "@/supabaseClient"
import { apiRequest } from "@/lib/api"
import { X, Upload, FileSpreadsheet, Loader2, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const [academicYears, setAcademicYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState("")
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  
  const [loadingYears, setLoadingYears] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [successData, setSuccessData] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchAcademicYears()
      setFile(null)
      setError(null)
      setSuccessData(null)
    }
  }, [isOpen])

  const fetchAcademicYears = async () => {
    setLoadingYears(true)
    try {
      const res = await apiRequest("/api/years")
      setAcademicYears(res)
      
      // Auto-select current year if available
      const currentYear = res.find(y => y.is_current)
      if (currentYear) {
        setSelectedYearId(currentYear.id)
      } else if (res.length > 0) {
        setSelectedYearId(res[0].id)
      }
    } catch (err) {
      console.error("Failed to load academic years:", err)
      setError("Impossible de charger les années académiques.")
    } finally {
      setLoadingYears(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith(".xls")) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError("Seuls les fichiers Excel au format .xls sont supportés.")
      }
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.name.endsWith(".xls")) {
        setFile(selectedFile)
        setError(null)
      } else {
        setError("Seuls les fichiers Excel au format .xls sont supportés.")
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedYearId) {
      setError("Veuillez sélectionner une année académique.")
      return
    }
    if (!file) {
      setError("Veuillez sélectionner un fichier.")
      return
    }

    setImporting(true)
    setError(null)
    setSuccessData(null)

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      const formData = new FormData()
      formData.append("academic_year_id", selectedYearId)
      formData.append("file", file)

      const response = await fetch(`${API_URL}/api/logigramme/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || "L'importation a échoué.")
      }

      setSuccessData(payload)
      if (onImportSuccess) {
        onImportSuccess()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Importer un logigramme
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Importez vos fichiers d'organisation horaire au format .xls.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-muted transition-colors"
            disabled={importing}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        {!successData ? (
          <div className="space-y-4">
            
            {/* Year selector */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Année Académique
              </Label>
              {loadingYears ? (
                <div className="h-10 rounded-xl border border-border bg-background flex items-center px-3 gap-2">
                  <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground">Chargement des années...</span>
                </div>
              ) : (
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:border-primary transition-colors"
                >
                  <option value="">Sélectionner une année académique...</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label} {y.is_current ? "(Courante)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Drag & Drop Area */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Fichier de planification (.xls uniquement)
              </Label>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background/50",
                  file && "border-emerald-500/50 bg-emerald-500/5"
                )}
              >
                <input
                  type="file"
                  id="excel-file-upload"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept=".xls"
                  onChange={handleFileChange}
                  disabled={importing}
                />
                
                {file ? (
                  <>
                    <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 animate-in zoom-in-95">
                      <FileSpreadsheet className="size-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground truncate max-w-[300px]">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                        {(file.size / 1024).toFixed(1)} KB — Prêt pour l'import
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="size-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/40">
                      <Upload className="size-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground">
                        Glissez-déposez votre fichier ici, ou cliquez pour parcourir
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-1">
                        Seuls les fichiers .xls sont acceptés (xls-files)
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-3 mt-8">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                disabled={importing}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleUpload} 
                className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                disabled={importing || !file || !selectedYearId}
              >
                {importing ? (
                  <>
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                    Importation...
                  </>
                ) : (
                  "Importer le planning"
                )}
              </Button>
            </div>

          </div>
        ) : (
          /* Success Screen */
          <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-200">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
              <Check className="size-8" />
            </div>
            
            <div>
              <h4 className="text-base font-bold text-foreground">Importation Réussie !</h4>
              <p className="text-xs text-muted-foreground font-medium mt-2">
                {successData.message}
              </p>
            </div>

            {successData.importedLogs && successData.importedLogs.length > 0 && (
              <div className="max-h-[160px] overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background/50 custom-scrollbar text-left">
                {successData.importedLogs.map((log, index) => (
                  <div key={index} className="p-3 text-[11px] font-semibold flex items-center justify-between">
                    <div>
                      <p className="text-foreground">{log.filiere}</p>
                      <p className="text-muted-foreground/60 text-[9px] mt-0.5">{log.classe}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] rounded-md uppercase font-bold">
                      {log.unitsCount} unités
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={onClose} 
              className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Fermer
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}
```

path of the file : `frontend/src/components/logigramme/KpiBar.jsx`

```
import { useState, useEffect } from 'react';
import { useLogigrammeContext } from '@/contexts/logigramme-context';
import { apiRequest } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export function KpiBar() {
  const { filters } = useLogigrammeContext();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchKpis() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (filters.year_id) query.append('year_id', filters.year_id);
        if (filters.filiere_id) query.append('filiere_id', filters.filiere_id);
        if (filters.formateur_id) query.append('formateur_id', filters.formateur_id);

        const data = await apiRequest(`/api/logigramme/kpis?${query.toString()}`);
        setKpis(data);
      } catch (err) {
        console.error('Failed to fetch KPIs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchKpis();
  }, [filters.year_id, filters.filiere_id, filters.formateur_id]);

  if (!kpis && loading) {
    return (
      <div className="grid grid-cols-4 gap-3 mb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-xl border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const stats = [
    { label: "Programmes", value: kpis.total_programmes },
    { label: "Heures totales", value: kpis.total_heures.toLocaleString() + 'h' },
    { label: "Formateurs", value: kpis.total_formateurs },
    { label: "Taux global", value: Math.round(kpis.taux_global * 100) + '%' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
      {stats.map((stat) => (
        <div key={stat.label} className="p-2.5 rounded-xl border border-border bg-card shadow-sm medical-glass flex items-center gap-3">
          <p className="text-lg font-black text-primary tracking-tight leading-none">{stat.value}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-tight">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
```

path of the file : `frontend/src/components/logigramme/Legend.jsx`

```
export function Legend() {
  return (
    <div className="px-3 py-2 bg-white border-t border-slate-300 flex flex-wrap gap-x-5 gap-y-2 items-center select-none">
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-[#FEF9C3] border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">Session normale</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-[#BBF7D0] border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">Terminé</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-[#F472B6] border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">Vacance</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-slate-200 border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">Examen</span>
       </div>
       <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-3.5 h-3.5 bg-yellow-400 border border-slate-300 rounded" />
          <span className="text-[10px] font-bold uppercase text-slate-600 whitespace-nowrap">TIFF / Clôture</span>
       </div>
    </div>
  );
}
```

path of the file : `frontend/src/components/logigramme/LogigrammeGrid.jsx`

```
import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';
import { Legend } from './Legend';
import { Loader2 } from 'lucide-react';

export function LogigrammeGrid({ data, loading, onToggleCell, onMarkWeek, onCreateCell }) {
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-border">
        <Loader2 className="size-10 animate-spin text-primary/30 mb-4" />
        <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Chargement du logigramme...</p>
      </div>
    );
  }

  if (!data) return null;

  const { weeks, unites } = data;

  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar">
        <div className="w-fit min-w-full">
          <GridHeader
            weeks={weeks}
            onMarkWeek={(sem, status) => {
               if (confirm(`Voulez-vous marquer toute la semaine ${sem} comme '${status}'?`)) {
                 onMarkWeek(sem, status);
               }
            }}
          />
          <div className="flex flex-col">
            {unites.map((unite, index) => (
              <GridRow
                key={unite.id}
                unite={unite}
                rowIndex={index + 1}
                weeksCount={weeks.length}
                onToggleCell={onToggleCell}
                onCreateCell={onCreateCell}
              />
            ))}
          </div>
        </div>
      </div>

      <Legend />
    </div>
  );
}
```

path of the file : `frontend/src/components/logigramme/ProgrammeTree.jsx`

```
import { useState } from 'react';
import { ChevronDown, ChevronRight, Activity, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProgrammeTree({ list, activeLogId, onSelect, onDelete }) {
  // Group by filiere
  const groups = list.reduce((acc, log) => {
    const filiereId = log.filiere?.id || 'unknown';
    if (!acc[filiereId]) {
      acc[filiereId] = {
        filiere: log.filiere || { name: 'Inconnu', code: '???' },
        items: []
      };
    }
    acc[filiereId].items.push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {Object.values(groups).map((group) => (
        <FiliereSection 
          key={group.filiere.id} 
          group={group} 
          activeLogId={activeLogId} 
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function FiliereSection({ group, activeLogId, onSelect, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const avgTaux = group.items.reduce((sum, item) => sum + (item.taux || 0), 0) / group.items.length;
  const progressPercent = !isNaN(avgTaux) ? Math.round(avgTaux * 100) : 0;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="relative size-8 flex-shrink-0">
            {/* Progress ring placeholder or icon */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
            <div 
              className="absolute inset-0 rounded-full border-2 border-primary transition-all duration-500" 
              style={{ 
                clipPath: `inset(${100 - progressPercent}% 0 0 0)`,
                opacity: progressPercent > 0 ? 1 : 0.2
              }} 
            />
            <Activity className="absolute inset-0 m-auto size-3.5 text-primary" />
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-[11px] font-black uppercase tracking-widest text-foreground truncate">{group.filiere.name}</p>
            <p className="text-[9px] font-bold text-muted-foreground/60">{group.items.length} classe{group.items.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="space-y-1 ml-2 pl-2 border-l border-border/50 animate-in slide-in-from-top-1 duration-200">
          {group.items.map((log) => {
            const progressValue = typeof log.taux === 'number' && !isNaN(log.taux) 
              ? Math.round(log.taux * 100) 
              : 0;

            return (
              <div key={log.id} className="relative group/card">
                <button
                  onClick={() => onSelect(log.id)}
                  className={cn(
                    "w-full flex flex-col p-2 rounded-lg border transition-all hover:translate-x-1",
                    activeLogId === log.id 
                      ? "bg-primary border-primary shadow-sm" 
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tight",
                      activeLogId === log.id ? "text-white" : "text-foreground"
                    )}>
                      {log.classe?.label || '???'}
                    </span>
                    <span className={cn(
                      "text-[9px] font-black",
                      activeLogId === log.id ? "text-white" : "text-primary"
                    )}>
                      {progressValue}%
                    </span>
                  </div>
                  <div className={cn(
                    "h-1 w-full rounded-full overflow-hidden",
                    activeLogId === log.id ? "bg-white/20" : "bg-muted"
                  )}>
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        activeLogId === log.id ? "bg-white" : "bg-primary"
                      )}
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                </button>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(log.id, `${group.filiere.name} — ${log.classe?.label}`);
                    }}
                    className={cn(
                      "absolute -top-1.5 -right-1.5 size-6 rounded-full flex items-center justify-center transition-all",
                      "bg-destructive/90 text-white shadow-md",
                      "opacity-0 scale-75 group-hover/card:opacity-100 group-hover/card:scale-100",
                      "hover:bg-destructive hover:shadow-lg"
                    )}
                    title="Supprimer ce logigramme"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

path of the file : `frontend/src/components/ui/button.jsx`

```
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/10 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-10 gap-2 px-4',
        xs: "h-7 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-11 gap-2 px-5',
        icon: 'size-10',
        'icon-xs': "size-7 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({ className, variant = 'default', size = 'default', ...props }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

path of the file : `frontend/src/components/ui/checkbox.jsx`

```
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({ className, ...props }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
```

path of the file : `frontend/src/components/ui/data-table.jsx`

```
(empty file)
```

path of the file : `frontend/src/components/ui/input.jsx`

```
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

path of the file : `frontend/src/components/ui/label.jsx`

```
import { cn } from "@/lib/utils"

function Label({ className, ...props }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
```

path of the file : `frontend/src/contexts/auth-context.jsx`

```
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { supabase } from "@/supabaseClient"
import { getUserRole } from "@/lib/auth"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => {
    const user = session?.user ?? null

    return {
      session,
      user,
      role: user ? getUserRole(user) : null,
      loading,
      signOut: () => supabase.auth.signOut(),
    }
  }, [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return context
}
```

path of the file : `frontend/src/contexts/logigramme-context.jsx`

```

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
```

path of the file : `frontend/src/globals.css`

```
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;700&display=swap');
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-heading: 'Figtree', ui-sans-serif, system-ui, sans-serif;
  --font-sans: 'Figtree', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;

  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  /* ESFPP Brand Colors - Refined Healthcare Palette */
  --background: oklch(0.98 0.005 195); /* Very soft blue-gray background */
  --foreground: oklch(0.25 0.06 230); /* Dark medical blue for text */
  
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.25 0.06 230);
  
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.25 0.06 230);
  
  /* Primary: Professional Medical Blue (#1E3E72 approx) */
  --primary: oklch(0.42 0.12 245); 
  --primary-foreground: oklch(0.99 0.005 245);
  
  /* Secondary: Calming Cyan/Turquoise (#22D3EE style) */
  --secondary: oklch(0.85 0.08 195);
  --secondary-foreground: oklch(0.35 0.1 200);
  
  /* Muted: Soft blue-tinted gray */
  --muted: oklch(0.94 0.01 200);
  --muted-foreground: oklch(0.5 0.03 210);
  
  /* Accent: Medical Vitality Green (#059669 approx) */
  --accent: oklch(0.6 0.15 160);
  --accent-foreground: oklch(0.98 0.02 165);
  
  --destructive: oklch(0.55 0.18 25);
  --border: oklch(0.9 0.02 210);
  --input: oklch(0.9 0.02 210);
  --ring: oklch(0.42 0.12 245);
  
  --chart-1: oklch(0.42 0.12 245);
  --chart-2: oklch(0.6 0.15 160);
  --chart-3: oklch(0.75 0.12 195);
  --chart-4: oklch(0.55 0.1 215);
  --chart-5: oklch(0.45 0.15 175);
  
  --radius: 0.625rem;
  
  --sidebar: oklch(0.97 0.01 205);
  --sidebar-foreground: oklch(0.3 0.06 235);
  --sidebar-primary: oklch(0.42 0.12 245);
  --sidebar-primary-foreground: oklch(0.99 0.005 245);
  --sidebar-accent: oklch(0.9 0.04 195);
  --sidebar-accent-foreground: oklch(0.35 0.1 200);
  --sidebar-border: oklch(0.9 0.02 210);
  --sidebar-ring: oklch(0.42 0.12 245);
}

.dark {
  --background: oklch(0.18 0.03 240);
  --foreground: oklch(0.95 0.01 220);
  
  --card: oklch(0.22 0.03 245);
  --card-foreground: oklch(0.95 0.01 220);
  
  --popover: oklch(0.22 0.03 245);
  --popover-foreground: oklch(0.95 0.01 220);
  
  --primary: oklch(0.65 0.12 225);
  --primary-foreground: oklch(0.18 0.03 240);
  
  --secondary: oklch(0.28 0.04 235);
  --secondary-foreground: oklch(0.9 0.02 210);
  
  --muted: oklch(0.28 0.04 235);
  --muted-foreground: oklch(0.65 0.03 220);
  
  --accent: oklch(0.55 0.15 165);
  --accent-foreground: oklch(0.98 0.02 170);
  
  --destructive: oklch(0.5 0.18 25);
  --border: oklch(0.3 0.03 235);
  --input: oklch(0.3 0.03 235);
  --ring: oklch(0.65 0.12 225);
  
  --sidebar: oklch(0.2 0.03 245);
  --sidebar-foreground: oklch(0.9 0.02 220);
  --sidebar-primary: oklch(0.65 0.12 225);
  --sidebar-primary-foreground: oklch(0.18 0.03 240);
  --sidebar-accent: oklch(0.28 0.04 235);
  --sidebar-accent-foreground: oklch(0.95 0.01 220);
  --sidebar-border: oklch(0.3 0.03 235);
  --sidebar-ring: oklch(0.65 0.12 225);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
  html {
    @apply font-sans;
  }
}

/* Custom Healthcare UI Enhancements */
@layer components {
  .medical-glass {
    @apply bg-white/70 backdrop-blur-md border border-white/20 shadow-sm;
  }
  
  .dark .medical-glass {
    @apply bg-slate-900/60 backdrop-blur-md border border-slate-700/30;
  }
}

/* Print Styles */
@media print {
  .no-print, 
  aside, 
  header,
  .filter-bar { 
    display: none !important; 
  }
  
  main {
    padding: 0 !important;
    margin: 0 !important;
    background: white !important;
  }

  .mx-auto {
    max-width: none !important;
    padding: 0 !important;
  }

  /* Expand grid */
  .overflow-x-auto {
    overflow: visible !important;
  }
  
  .max-h-\[70vh\] {
    max-height: none !important;
  }

  /* Unstick headers/columns for cleaner multipage print if needed */
  .sticky {
    position: static !important;
  }

  /* But wait, Excel style often wants the first column. 
     For simple window.print(), static is safer to avoid clipping. */
  
  .rounded-2xl {
    border-radius: 0 !important;
  }

  table, div {
    break-inside: auto;
  }
}

/* Custom scrollbar styling */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: oklch(0.8 0.02 210) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: oklch(0.8 0.02 210);
  border-radius: 9999px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: oklch(0.7 0.03 210);
}
```

path of the file : `frontend/src/hooks/useLogigramme.js`

```
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
```

path of the file : `frontend/src/lib/api.js`

```
import { supabase } from "@/supabaseClient"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...options.headers,
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || payload.erreur || "Request failed")
  }

  return payload
}
```

path of the file : `frontend/src/lib/auth.js`

```
export const ROLES = {
  admin: "admin",
  student: "student",
}

export function getUserRole(user) {
  return user?.user_metadata?.role === ROLES.admin ? ROLES.admin : ROLES.student
}

export function getDashboardPath(role) {
  return role === ROLES.admin ? "/admin/dashboard" : "/student/dashboard"
}

export function isKnownRole(role) {
  return role === ROLES.admin || role === ROLES.student
}
```

path of the file : `frontend/src/lib/logigramme-helpers.js`

```
function parseLocalDate(dateStr) {
  if (!dateStr) return null;

  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatMonthName(date) {
  const month = date.toLocaleString('fr-FR', { month: 'long' });
  return month.charAt(0).toUpperCase() + month.slice(1);
}

export function getDominantWeekMonth(week) {
  const startDate = parseLocalDate(week.week_start_date);
  if (!startDate) return week.mois;

  const dayCountsByMonth = new Map();

  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + offset);

    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const count = dayCountsByMonth.get(monthKey) || { date, count: 0 };
    count.count += 1;
    dayCountsByMonth.set(monthKey, count);
  }

  const dominantMonth = [...dayCountsByMonth.values()]
    .sort((a, b) => b.count - a.count)[0];

  return formatMonthName(dominantMonth.date);
}

/**
 * Group weeks into contiguous month blocks for the grid header.
 * A week that overlaps two months is assigned to the month containing most of its days.
 * @param {Array} weeks - Array of week objects { semaine, week_start_date, mois, semestre }
 * @returns {Array} - Array of { mois, count, span }
 */
export function groupWeeksByMonth(weeks) {
  if (!weeks || weeks.length === 0) return [];
  
  const groups = [];
  let currentMonth = getDominantWeekMonth(weeks[0]);
  let currentCount = 0;

  for (const w of weeks) {
    const month = getDominantWeekMonth(w);

    if (month === currentMonth) {
      currentCount++;
    } else {
      groups.push({ mois: currentMonth, count: currentCount, span: currentCount });
      currentMonth = month;
      currentCount = 1;
    }
  }
  groups.push({ mois: currentMonth, count: currentCount, span: currentCount });
  return groups;
}

export function groupWeeksBySemester(weeks) {
  if (!weeks || weeks.length === 0) return [];
  
  const groups = [];
  let currentSemestre = weeks[0].semestre;
  let currentCount = 0;

  for (const w of weeks) {
    if (w.semestre === currentSemestre) {
      currentCount++;
    } else {
      groups.push({ semestre: currentSemestre, count: currentCount });
      currentSemestre = w.semestre;
      currentCount = 1;
    }
  }
  groups.push({ semestre: currentSemestre, count: currentCount });
  return groups;
}

/**
 * Format a short date for the grid (e.g., "01/09")
 */
export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

/**
 * Compute progress for a unit or logigramme
 */
export function computeProgress(vhg, cells) {
  if (!vhg || vhg === 0) return { vh_realise: 0, vh_restant: 0, taux: 0 };
  
  const vh_realise = cells
    .filter(c => c.cell_type === 'normal' && (c.completion_status === 'done' || c.completion_status === 'auto_done'))
    .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);
    
  return {
    vh_realise,
    vh_restant: vhg - vh_realise,
    taux: vh_realise / vhg
  };
}

/**
 * Map cell types to CSS classes
 */
export function getCellClassName(type, status) {
  const base = "relative w-10 h-12 border-r border-b border-slate-300 text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer select-none";
  
  const isDone = status === 'done' || status === 'auto_done';
  
  if (type === 'vacation') return `${base} bg-[#F472B6] text-white border-slate-300 cursor-default font-extrabold text-[12px]`;
  if (type === 'exam') {
    if (isDone) {
      return `${base} bg-[#BBF7D0] text-[#065F46] border-slate-300 hover:bg-[#A7F3D0]`;
    }
    return `${base} bg-slate-200 text-slate-700 border-slate-300`;
  }
  if (type === 'tiff') return `${base} bg-yellow-400 text-yellow-900 border-slate-300 cursor-default`;
  
  if (type === 'normal') {
    if (isDone) {
      return `${base} bg-[#BBF7D0] text-slate-800 border-slate-300 hover:bg-[#A7F3D0]`;
    }
    return `${base} bg-[#FEF9C3] text-slate-800 border-slate-300 hover:bg-[#FEF08A]`;
  }
  
  return `${base} bg-white text-transparent border-slate-300`;
}
```

path of the file : `frontend/src/lib/utils.js`

```
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

path of the file : `frontend/src/main.jsx`

```
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "@/App.jsx"
import "@/globals.css"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

path of the file : `frontend/src/pages/academic-years.jsx`

```
import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { apiRequest } from "@/lib/api"
import { 
  Calendar, 
  Plus, 
  CheckCircle2, 
  X, 
  Loader2,
  CalendarDays,
  Copy,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: Calendar },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Filières", path: "/admin/filieres", icon: Calendar },
]

export default function AcademicYears({ path, navigate }) {
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCloning, setIsCloning] = useState(false)
  
  const [formData, setFormData] = useState({
    label: "",
    start_date: "",
    clone_from_year_id: ""
  })

  const fetchYears = async () => {
    setLoading(true)
    try {
      const data = await apiRequest("/api/years")
      setYears(data)
    } catch (err) {
      console.error("Failed to fetch years:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchYears()
  }, [])

  const handleOpenModal = () => {
    setFormData({
      label: "",
      start_date: "",
      clone_from_year_id: ""
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    if (formData.clone_from_year_id) {
        setIsCloning(true)
    }
    try {
      await apiRequest("/api/years", {
        method: "POST",
        body: JSON.stringify(formData)
      })
      setIsModalOpen(false)
      fetchYears()
    } catch (err) {
      alert("Erreur: " + err.message)
    } finally {
      setIsCloning(false)
    }
  }

  const handleSetCurrent = async (id) => {
    try {
      await apiRequest(`/api/years/${id}/set-current`, {
        method: "PUT"
      })
      fetchYears()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <DashboardShell
      title="Années Académiques"
      subtitle="Gérez les cycles annuels et la structure des calendriers."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="flex justify-end mb-6">
        <Button onClick={handleOpenModal} className="rounded-xl font-bold uppercase tracking-widest text-xs">
          <Plus className="size-4 mr-2" />
          Nouvelle année
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Année</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Début</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fin</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Statut</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <Loader2 className="size-6 animate-spin text-primary/40 mx-auto" />
                </td>
              </tr>
            ) : years.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Aucune année configurée
                </td>
              </tr>
            ) : (
              years.map((year) => (
                <tr key={year.id} className={cn("group hover:bg-muted/30 transition-colors", year.is_current && "bg-primary/[0.02]")}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-foreground">{year.label}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-muted-foreground">{formatDate(year.start_date)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-muted-foreground">{formatDate(year.end_date)}</p>
                  </td>
                  <td className="px-6 py-4">
                    {year.is_current ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 className="size-3" />
                        Actuelle
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Archive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!year.is_current && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSetCurrent(year.id)}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
                      >
                        Définir comme actuelle
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold tracking-tight">Nouvelle année académique</h3>
              <button onClick={() => !isCloning && setIsModalOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="size-4" />
              </button>
            </div>

            {isCloning ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="size-12 animate-spin text-primary/30 mb-4" />
                    <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">Clonage en cours...</h4>
                    <p className="text-xs text-muted-foreground mt-2 max-w-[250px]">
                        Nous dupliquons la structure des logigrammes et recalculons toutes les dates. Merci de patienter.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="label" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Label de l'année</Label>
                    <Input 
                    id="label" 
                    value={formData.label} 
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="ex: 2026-2027"
                    className="rounded-xl font-bold"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Date de début (Lundi)</Label>
                    <Input 
                    id="start_date" 
                    type="date"
                    value={formData.start_date} 
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="rounded-xl font-bold"
                    />
                    <p className="text-[9px] font-medium text-muted-foreground/60 mt-1">
                        Note: Le système s'alignera automatiquement sur le lundi le plus proche.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cloner la structure (Optionnel)</Label>
                    <select 
                    value={formData.clone_from_year_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, clone_from_year_id: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none"
                    >
                    <option value="">Ne pas cloner (Année vide)</option>
                    {years.map(y => <option key={y.id} value={y.id}>Cloner de {y.label}</option>)}
                    </select>
                    {formData.clone_from_year_id && (
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3 mt-2">
                            <AlertCircle className="size-4 text-primary mt-0.5" />
                            <p className="text-[10px] font-medium text-primary/80 leading-relaxed">
                                Les unités et semaines seront copiées. Les données de complétion (séances terminées) seront réinitialisées.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-8">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                        Créer l'année
                    </Button>
                </div>
                </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
```

path of the file : `frontend/src/pages/account-management.jsx`

```
import { useEffect, useState, useRef } from "react"
import { Activity, Check, ClipboardCopy, ExternalLink, Loader2, Link2, MailPlus, RefreshCw, Users, X, UserPlus, Shield, User, CalendarDays, Search } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest } from "@/lib/api"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: Activity },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Gestion des comptes", path: "/admin/accounts", icon: Users },
]

const statusConfig = {
  active: { label: "Actif", className: "bg-emerald-100/80 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400" },
  invited: { label: "Invité", className: "bg-amber-100/80 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400" },
  pending: { label: "En attente", className: "bg-blue-100/80 text-blue-800 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400" },
  blocked: { label: "Bloqué", className: "bg-rose-100/80 text-rose-800 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400" },
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.invited
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset", config.className)}>
      {config.label}
    </span>
  )
}

function CopyButton({ text, label = "Copier" }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button type="button" variant="outline" size="xs" onClick={handleCopy} className={cn("h-7", copied && "border-emerald-500 bg-emerald-50 text-emerald-600")}>
      {copied ? <Check className="size-3 mr-1" /> : <ClipboardCopy className="size-3 mr-1" />}
      {copied ? "Copié" : label}
    </Button>
  )
}

function InviteLinkDisplay({ inviteLink, onClose }) {
  if (!inviteLink) return null

  return (
    <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Link2 className="size-4 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">Lien d'invitation généré</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="rounded-xl border border-input bg-background/50 px-4 py-3 shadow-inner">
        <p className="break-all text-[11px] font-mono text-muted-foreground leading-relaxed select-all">{inviteLink}</p>
      </div>

      <div className="flex items-center gap-2">
        <CopyButton text={inviteLink} label="Copier le lien" />
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-7"
          onClick={() => window.open(inviteLink, "_blank")}
        >
          <ExternalLink className="size-3 mr-1" />
          Ouvrir
        </Button>
      </div>
    </div>
  )
}

export function AccountManagement({ path, navigate }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [inviteLink, setInviteLink] = useState("")
  const [regenerating, setRegenerating] = useState(null)
  const [rowInviteLinks, setRowInviteLinks] = useState({})
  const [searchQuery, setSearchQuery] = useState("")
  const formRef = useRef(null)

  async function loadUsers() {
    setLoadingUsers(true)
    setError("")
    try {
      const payload = await apiRequest("/api/admin/users")
      setUsers(payload.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleCreateAccount(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage("")
    setError("")
    setInviteLink("")

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get("email") || "").trim()
    const role = String(formData.get("role") || "student")

    try {
      const result = await apiRequest("/api/admin/invitations", {
        method: "POST",
        body: JSON.stringify({ email, role }),
      })
      formRef.current?.reset()
      setInviteLink(result.inviteLink || "")
      setMessage(`Invitation créée pour ${email}.`)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegenerate(userId) {
    setRegenerating(userId)
    setRowInviteLinks((prev) => ({ ...prev, [userId]: undefined }))

    try {
      const result = await apiRequest(`/api/admin/invitations/${userId}/regenerate`, {
        method: "POST",
      })
      setRowInviteLinks((prev) => ({ ...prev, [userId]: result.inviteLink }))
    } catch (err) {
      setRowInviteLinks((prev) => ({ ...prev, [userId]: null }))
      setError(err.message)
    } finally {
      setRegenerating(null)
    }
  }

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase()
    return (
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.status.toLowerCase().includes(query)
    )
  })

  return (
    <DashboardShell
      title="Gestion des comptes"
      subtitle="Gérez les accès et surveillez l'onboarding des utilisateurs."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        {/* Create invitation */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass h-fit sticky top-28">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="size-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Nouvelle invitation</h2>
          </div>

          <form ref={formRef} onSubmit={handleCreateAccount} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adresse Email</Label>
              <Input 
                id="invite-email" 
                name="email" 
                type="email" 
                placeholder="nom.prenom@esfpp.ma" 
                required 
                className="h-11 rounded-xl bg-background/50 border-border/50 focus:bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rôle assigné</Label>
              <div className="relative group">
                <select
                  id="invite-role"
                  name="role"
                  className="flex h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm font-semibold outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 appearance-none group-hover:border-primary/50 transition-colors"
                  defaultValue="student"
                >
                  <option value="student">Étudiant (Accès restreint)</option>
                  <option value="admin">Administrateur (Accès complet)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/50">
                   <Activity className="size-4" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={submitting}>
              {submitting ? <Loader2 className="size-5 animate-spin mr-2" /> : <MailPlus className="size-5 mr-2" />}
              Envoyer l'invitation
            </Button>
          </form>

          {(message || error) && !inviteLink && (
            <div className={cn(
              "mt-6 p-4 rounded-xl text-xs font-bold border animate-in fade-in zoom-in-95 duration-200",
              error ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-primary/5 border-primary/10 text-primary"
            )}>
              {error || message}
            </div>
          )}

          <InviteLinkDisplay
            inviteLink={inviteLink}
            onClose={() => {
              setInviteLink("")
              setMessage("")
            }}
          />
        </section>

        {/* Users table */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Users className="size-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Annuaire des comptes</h2>
                  <p className="text-xs text-muted-foreground font-medium">{users.length} utilisateurs enregistrés</p>
                </div>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="rounded-xl font-bold h-10 px-4 hover:bg-muted"
                onClick={loadUsers} 
                disabled={loadingUsers}
              >
                <RefreshCw className={cn("size-4 mr-2", loadingUsers && "animate-spin")} />
                Actualiser
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher par email, rôle ou statut..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/30 backdrop-blur-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Utilisateur</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rôle</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loadingUsers ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan="4">
                       <Loader2 className="size-8 animate-spin mx-auto text-primary/20" />
                       <p className="mt-2 text-sm font-bold text-muted-foreground/50">Synchronisation des données...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan="4">
                       <Users className="size-8 mx-auto text-muted-foreground/20" />
                       <p className="mt-2 text-sm font-bold text-muted-foreground/50">Aucun compte trouvé</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan="4">
                       <Users className="size-8 mx-auto text-muted-foreground/20" />
                       <p className="mt-2 text-sm font-bold text-muted-foreground/50">Aucun compte ne correspond à votre recherche</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground/60 border border-border/50">
                             <User className="size-4" />
                          </div>
                          <span className="text-sm font-bold text-foreground truncate max-w-[200px]">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {user.role === 'admin' ? <Shield className="size-3 text-primary" /> : <User className="size-3 text-muted-foreground" />}
                          <span className={cn("text-xs font-bold uppercase tracking-wider", user.role === 'admin' ? "text-primary" : "text-muted-foreground")}>
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-6 py-4">
                        {user.status !== "active" && user.status !== "blocked" && (
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="rounded-lg h-8 font-bold text-[10px] uppercase tracking-wider hover:border-primary hover:text-primary transition-all"
                              onClick={() => handleRegenerate(user.id)}
                              disabled={regenerating === user.id}
                            >
                              {regenerating === user.id ? (
                                <Loader2 className="size-3 animate-spin mr-1" />
                              ) : (
                                <RefreshCw className="size-3 mr-1" />
                              )}
                              Générer le lien
                            </Button>

                            {rowInviteLinks[user.id] && (
                              <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-3 space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                <p className="break-all text-[10px] font-mono text-muted-foreground select-all leading-tight">
                                  {rowInviteLinks[user.id]}
                                </p>
                                <CopyButton text={rowInviteLinks[user.id]} label="Copier" />
                              </div>
                            )}
                          </div>
                        )}
                        {user.status === "active" && (
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600/60">
                            <Check className="size-3" />
                            Finalisé
                          </div>
                        )}
                        {user.status === "blocked" && (
                          <span className="text-xs font-bold italic text-rose-500/60">Restreint</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {error && !inviteLink && (
            <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600">
              {error}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  )
}
```

path of the file : `frontend/src/pages/admin-dashboard.jsx`

```
import { Activity, CalendarCheck, GraduationCap, Users, UserPlus, ClipboardCheck, ArrowUpRight, CalendarDays } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: Activity },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Gestion des comptes", path: "/admin/accounts", icon: Users },
]

const stats = [
  { label: "Comptes actifs", value: "128", helper: "Admins et étudiants", icon: Users, color: "text-primary", bg: "bg-primary/10" },
  { label: "Invitations", value: "12", helper: "En attente d'activation", icon: UserPlus, color: "text-accent", bg: "bg-accent/10" },
  { label: "Stages planifiés", value: "34", helper: "Session en cours", icon: CalendarCheck, color: "text-secondary-foreground", bg: "bg-secondary" },
  { label: "Taux de complétion", value: "86%", helper: "+2% depuis hier", icon: ClipboardCheck, color: "text-primary", bg: "bg-primary/10" },
]

export function AdminDashboard({ path, navigate }) {
  return (
    <DashboardShell
      title="Tableau de bord"
      subtitle="Bienvenue sur votre espace de pilotage ESFPP."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <section key={stat.label} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className={cn("flex size-12 items-center justify-center rounded-xl transition-colors", stat.bg)}>
                <stat.icon className={cn("size-6", stat.color)} />
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground/30 transition-colors group-hover:text-primary" />
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground/70">{stat.helper}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="size-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">Suivi académique</h2>
            </div>
            <button className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">Voir tout</button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Inscriptions", count: "45 nouvelles", desc: "Cette semaine" },
              { title: "Évaluations", count: "12 en cours", desc: "Modules cliniques" },
              { title: "Documents", count: "8 à valider", desc: "Stages S2" }
            ].map((item) => (
              <div key={item.title} className="group cursor-pointer rounded-xl border border-border bg-background/50 p-5 transition-all hover:border-primary/50 hover:bg-primary/[0.02]">
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <p className="mt-2 text-xl font-black text-primary">{item.count}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-8 p-6 rounded-xl bg-muted/30 border border-dashed border-border flex flex-col items-center text-center">
            <Activity className="size-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">Espace réservé aux futurs modules métier</p>
            <p className="text-xs text-muted-foreground/60 mt-1">La gestion des notes et plannings détaillés sera disponible prochainement.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <CalendarCheck className="size-5 text-accent" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Activité récente</h2>
          </div>
          
          <div className="space-y-4">
            {[
              { event: "Invitation envoyée", user: "m.amrani@esfpp.ma", time: "14:20", icon: UserPlus, color: "text-accent" },
              { event: "Profil complété", user: "s.benali@student.ma", time: "11:05", icon: ClipboardCheck, color: "text-primary" },
              { event: "Accès admin vérifié", user: "Admin Système", time: "Hier", icon: Activity, color: "text-muted-foreground" },
              { event: "Nouveau stage créé", user: "Dr. Hassan", time: "Hier", icon: CalendarCheck, color: "text-secondary-foreground" }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-muted/50">
                <div className={cn("mt-1 p-1.5 rounded-md bg-muted", item.color)}>
                  <item.icon className="size-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold truncate">{item.event}</p>
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.user}</p>
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-6 py-3 rounded-xl border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors">
            Consulter les logs
          </button>
        </section>
      </div>
    </DashboardShell>
  )
}
```

path of the file : `frontend/src/pages/complete-account.jsx`

```
import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, UserCheck, ShieldCheck, UserCircle, KeyRound, ArrowRight } from "lucide-react"
import { AuthLayout } from "@/components/auth/auth-layout"
import { PasswordInput } from "@/components/auth/password-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { getDashboardPath } from "@/lib/auth"
import { apiRequest } from "@/lib/api"
import { cn } from "@/lib/utils"

function ExpiredLinkScreen({ navigate }) {
  return (
    <AuthLayout>
      <div className="w-full max-w-sm text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 shadow-sm">
          <AlertTriangle className="size-10" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Lien expiré</h1>
        <p className="mt-4 text-base font-medium leading-relaxed text-muted-foreground">
          Ce lien d'invitation n'est plus valide ou a déjà été utilisé.
          Veuillez contacter l'administration de l'ESFPP pour obtenir une nouvelle invitation.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-8 h-12 px-8 rounded-xl font-bold border-border hover:bg-muted transition-all"
          onClick={() => navigate("/login", { replace: true })}
        >
          Retour à la connexion
        </Button>
      </div>
    </AuthLayout>
  )
}

export function CompleteAccount({ navigate }) {
  const { loading, user, role } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showExpired, setShowExpired] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      setShowExpired(true)
    }
  }, [loading, user])

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")

    const formData = new FormData(e.currentTarget)
    const firstName = String(formData.get("firstName") || "").trim()
    const lastName = String(formData.get("lastName") || "").trim()
    const password = String(formData.get("password") || "")
    const confirmPassword = String(formData.get("confirmPassword") || "")

    if (!firstName || !lastName || password.length < 8 || password !== confirmPassword) {
      setError("Veuillez vérifier les informations. Le mot de passe doit contenir au moins 8 caractères et les deux champs doivent correspondre.")
      return
    }

    setSubmitting(true)

    try {
      const result = await apiRequest("/api/complete-account", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, password }),
      })

      navigate(getDashboardPath(result.role || role), { replace: true })
    } catch (err) {
      setSubmitting(false)

      if (err.message.includes("already activated")) {
        navigate(getDashboardPath(role), { replace: true })
        return
      }

      setError(err.message)
    }
  }

  if (showExpired) {
    return <ExpiredLinkScreen navigate={navigate} />
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10 text-center sm:text-left">
          <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 mx-auto sm:mx-0">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Activez votre compte</h1>
          <p className="mt-3 text-base font-medium text-muted-foreground leading-relaxed">
            Bienvenue à l'ESFPP. Définissez votre identité et sécurisez votre accès.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border/50">
             <Loader2 className="size-5 animate-spin text-primary" />
             <p className="text-sm font-bold text-muted-foreground">Validation de l'accès...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Prénom</Label>
                <div className="relative">
                  <Input id="firstName" name="firstName" autoComplete="given-name" required className="h-11 rounded-xl bg-background/50 focus:bg-background border-border/50 pl-10" />
                  <UserCircle className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Nom</Label>
                <Input id="lastName" name="lastName" autoComplete="family-name" required className="h-11 rounded-xl bg-background/50 focus:bg-background border-border/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" title="Au moins 8 caractères" className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Mot de passe</Label>
              <div className="relative">
                <PasswordInput id="password" name="password" autoComplete="new-password" required className="h-11 rounded-xl bg-background/50 focus:bg-background border-border/50 pl-10" />
                <KeyRound className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Confirmation</Label>
              <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required className="h-11 rounded-xl bg-background/50 focus:bg-background border-border/50" />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full h-12 rounded-xl font-black text-base shadow-xl shadow-primary/20 group" disabled={submitting || !user}>
                {submitting ? (
                  <Loader2 className="size-5 animate-spin mr-2" />
                ) : (
                  <>
                    Finaliser mon inscription
                    <ArrowRight className="size-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600 animate-in fade-in zoom-in-95 duration-200">
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
```

path of the file : `frontend/src/pages/filieres-management.jsx`

```
import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { apiRequest } from "@/lib/api"
import { 
  BookOpen, 
  Plus, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  X, 
  Loader2,
  CheckCircle2,
  CalendarDays,
  Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: BookOpen },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Filières", path: "/admin/filieres", icon: BookOpen },
]

export default function FilieresManagement({ path, navigate }) {
  const [filieres, setFilieres] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingFiliere, setEditingFiliere] = useState(null)
  const [filiereToDelete, setFiliereToDelete] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    niveau: "Technicien Spécialisé",
    nb_annees: 3
  })

  const fetchFilieres = async () => {
    setLoading(true)
    try {
      const data = await apiRequest("/api/filieres")
      setFilieres(data)
    } catch (err) {
      console.error("Failed to fetch filieres:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFilieres()
  }, [])

  const handleOpenModal = (filiere = null) => {
    if (filiere) {
      setEditingFiliere(filiere)
      setFormData({
        name: filiere.name,
        code: filiere.code,
        niveau: filiere.niveau,
        nb_annees: filiere.classes?.length || 0
      })
    } else {
      setEditingFiliere(null)
      setFormData({
        name: "",
        code: "",
        niveau: "Technicien Spécialisé",
        nb_annees: 3
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingFiliere(null)
  }

  const handleSubmit = async () => {
    try {
      if (editingFiliere) {
        await apiRequest(`/api/filieres/${editingFiliere.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: formData.name,
            code: formData.code,
            niveau: formData.niveau
          })
        })
      } else {
        await apiRequest("/api/filieres", {
          method: "POST",
          body: JSON.stringify(formData)
        })
      }
      handleCloseModal()
      fetchFilieres()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  const handleDelete = async () => {
    if (!filiereToDelete) return
    try {
      await apiRequest(`/api/filieres/${filiereToDelete.id}`, {
        method: "DELETE"
      })
      setIsDeleteModalOpen(false)
      setFiliereToDelete(null)
      fetchFilieres()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  const suggestCode = (name) => {
    if (!name) return ""
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 5)
  }

  // Filter filieres based on search query
  const filteredFilieres = filieres.filter((filiere) => {
    const query = searchQuery.toLowerCase()
    return (
      filiere.name.toLowerCase().includes(query) ||
      filiere.code.toLowerCase().includes(query) ||
      filiere.niveau.toLowerCase().includes(query)
    )
  })

  return (
    <DashboardShell
      title="Gestion des Filières"
      subtitle="Configurez les programmes de formation et leurs cycles."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par nom, code ou niveau..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold uppercase tracking-widest text-xs">
          <Plus className="size-4 mr-2" />
          Nouvelle filière
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Code</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom de la filière</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Niveau</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <Loader2 className="size-6 animate-spin text-primary/40 mx-auto" />
                </td>
              </tr>
            ) : filieres.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Aucune filière configurée
                </td>
              </tr>
            ) : filteredFilieres.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Aucune filière ne correspond à votre recherche
                </td>
              </tr>
            ) : (
              filteredFilieres.map((filiere) => (
                <tr key={filiere.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-black tracking-wider">
                      {filiere.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-foreground">{filiere.name}</p>
                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{filiere.classes?.length || 0} années de formation</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-muted-foreground">{filiere.niveau}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(filiere)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setFiliereToDelete(filiere)
                          setIsDeleteModalOpen(true)
                        }}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold tracking-tight">
                {editingFiliere ? "Modifier la filière" : "Nouvelle filière"}
              </h3>
              <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nom complet</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => {
                    const name = e.target.value
                    setFormData(prev => ({ 
                      ...prev, 
                      name, 
                      code: prev.code || suggestCode(name) 
                    }))
                  }}
                  placeholder="ex: Aide-Soignant"
                  className="rounded-xl font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Code (court)</Label>
                <Input 
                  id="code" 
                  value={formData.code} 
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="ex: AS"
                  className="rounded-xl font-black uppercase tracking-wider"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Niveau</Label>
                <select 
                  value={formData.niveau}
                  onChange={(e) => setFormData(prev => ({ ...prev, niveau: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="QUALIFICATION">QUALIFICATION</option>
                  <option value="Technicien Spécialisé">Technicien Spécialisé</option>
                </select>
              </div>

              {!editingFiliere && (
                <div className="space-y-2">
                  <Label htmlFor="years" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cycle de formation (années)</Label>
                  <Input 
                    id="years" 
                    type="number"
                    min="1"
                    max="4"
                    value={formData.nb_annees} 
                    onChange={(e) => setFormData(prev => ({ ...prev, nb_annees: parseInt(e.target.value) }))}
                    className="rounded-xl font-bold"
                  />
                  <p className="text-[9px] font-medium text-muted-foreground/60 mt-1 italic">
                    Note: Cela créera automatiquement les classes (1ère année, etc.)
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={handleCloseModal} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Annuler
              </Button>
              <Button onClick={handleSubmit} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                {editingFiliere ? "Enregistrer" : "Créer la filière"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="size-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">Supprimer la filière ?</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Supprimer <span className="font-bold text-foreground">{filiereToDelete?.name}</span> supprimera également tous les logigrammes associés. Cette action est irréversible.
              </p>
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDelete} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
```

path of the file : `frontend/src/pages/formateurs-management.jsx`

```
import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { apiRequest } from "@/lib/api"
import { 
  GraduationCap, 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowRightLeft,
  X, 
  Loader2,
  CalendarDays,
  Search,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: GraduationCap },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Filières", path: "/admin/filieres", icon: GraduationCap },
]

export default function FormateursManagement({ path, navigate }) {
  const [formateurs, setFormateurs] = useState([])
  const [logigrammes, setLogigrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [editingFormateur, setEditingFormateur] = useState(null)
  const [formateurToDelete, setFormateurToDelete] = useState(null)
  const [formateurToReplace, setFormateurToReplace] = useState(null)

  const [formData, setFormData] = useState({
    nom: "",
    statut: "vacataire"
  })

  const [replaceData, setReplaceData] = useState({
    new_formateur_id: "",
    scope: "all",
    logigramme_id: ""
  })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [fData, lData] = await Promise.all([
        apiRequest("/api/formateurs"),
        apiRequest("/api/logigramme/list")
      ])
      setFormateurs(fData)
      setLogigrammes(lData)
    } catch (err) {
      console.error("Failed to fetch:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleOpenModal = (formateur = null) => {
    if (formateur) {
      setEditingFormateur(formateur)
      setFormData({
        nom: formateur.nom,
        statut: formateur.statut
      })
    } else {
      setEditingFormateur(null)
      setFormData({
        nom: "",
        statut: "vacataire"
      })
    }
    setIsModalOpen(true)
  }

  const handleOpenReplaceModal = (formateur) => {
    setFormateurToReplace(formateur)
    setReplaceData({
      new_formateur_id: "",
      scope: "all",
      logigramme_id: ""
    })
    setIsReplaceModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingFormateur) {
        await apiRequest(`/api/formateurs/${editingFormateur.id}`, {
          method: "PUT",
          body: JSON.stringify(formData)
        })
      } else {
        await apiRequest("/api/formateurs", {
          method: "POST",
          body: JSON.stringify(formData)
        })
      }
      setIsModalOpen(false)
      fetchAll()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  const handleReplace = async () => {
    if (!replaceData.new_formateur_id) return
    try {
      await apiRequest("/api/formateurs/replace", {
        method: "POST",
        body: JSON.stringify({
          old_formateur_id: formateurToReplace.id,
          ...replaceData
        })
      })
      setIsReplaceModalOpen(false)
      fetchAll()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  const handleDelete = async () => {
    if (!formateurToDelete) return
    try {
      await apiRequest(`/api/formateurs/${formateurToDelete.id}`, {
        method: "DELETE"
      })
      setIsDeleteModalOpen(false)
      fetchAll()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  // Filter formateurs based on search query
  const filteredFormateurs = formateurs.filter((formateur) => {
    const query = searchQuery.toLowerCase()
    return (
      formateur.nom.toLowerCase().includes(query) ||
      formateur.statut.toLowerCase().includes(query)
    )
  })

  return (
    <DashboardShell
      title="Gestion des Formateurs"
      subtitle="Gérez l'affectation des enseignants aux unités de formation."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par nom ou statut..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold uppercase tracking-widest text-xs">
          <Plus className="size-4 mr-2" />
          Nouveau formateur
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom Complet</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Statut</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="3" className="px-6 py-12 text-center">
                  <Loader2 className="size-6 animate-spin text-primary/40 mx-auto" />
                </td>
              </tr>
            ) : formateurs.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-12 text-center text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Aucun formateur trouvé
                </td>
              </tr>
            ) : filteredFormateurs.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-12 text-center text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Aucun formateur ne correspond à votre recherche
                </td>
              </tr>
            ) : (
              filteredFormateurs.map((formateur) => (
                <tr key={formateur.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-foreground">{formateur.nom}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
                      formateur.statut === 'permanent' 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {formateur.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenReplaceModal(formateur)}
                        className="p-2 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                        title="Remplacer par un autre formateur"
                      >
                        <ArrowRightLeft className="size-4" />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(formateur)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setFormateurToDelete(formateur)
                          setIsDeleteModalOpen(true)
                        }}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold tracking-tight">
                {editingFormateur ? "Modifier le formateur" : "Nouveau formateur"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nom complet</Label>
                <Input 
                  id="nom" 
                  value={formData.nom} 
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="ex: ZOURARAH CHAFIA"
                  className="rounded-xl font-bold uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Statut</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['permanent', 'vacataire'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFormData(prev => ({ ...prev, statut: s }))}
                      className={cn(
                        "h-10 rounded-xl border px-4 text-xs font-bold uppercase tracking-widest transition-all",
                        formData.statut === s 
                          ? "bg-primary/10 border-primary text-primary shadow-sm" 
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Annuler
              </Button>
              <Button onClick={handleSubmit} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                {editingFormateur ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Modal */}
      {isReplaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-accent">Remplacer le formateur</h3>
                <p className="text-xs text-muted-foreground font-medium mt-1">Cession globale des unités de formation</p>
              </div>
              <button onClick={() => setIsReplaceModalOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 mb-6 flex items-center gap-4">
               <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent/60">Ancien</p>
                  <p className="text-sm font-black text-foreground truncate">{formateurToReplace?.nom}</p>
               </div>
               <ArrowRightLeft className="size-4 text-accent/30" />
               <div className="flex-1 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent/60">Nouveau</p>
                  <p className="text-sm font-black text-foreground truncate">
                    {formateurs.find(f => f.id === replaceData.new_formateur_id)?.nom || "Choisir..."}
                  </p>
               </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nouveau formateur</Label>
                <select 
                  value={replaceData.new_formateur_id}
                  onChange={(e) => setReplaceData(prev => ({ ...prev, new_formateur_id: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none"
                >
                  <option value="">Sélectionner un formateur...</option>
                  {formateurs
                    .filter(f => f.id !== formateurToReplace?.id)
                    .map(f => <option key={f.id} value={f.id}>{f.nom}</option>)
                  }
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Portée du remplacement</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'all', label: 'Tout le Dashboard' },
                    { id: 'logigramme', label: 'Logigramme spécifique' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setReplaceData(prev => ({ ...prev, scope: s.id }))}
                      className={cn(
                        "h-12 rounded-xl border px-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        replaceData.scope === s.id 
                          ? "bg-accent/10 border-accent text-accent shadow-sm" 
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {replaceData.scope === 'logigramme' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Choisir le logigramme</Label>
                  <select 
                    value={replaceData.logigramme_id}
                    onChange={(e) => setReplaceData(prev => ({ ...prev, logigramme_id: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none"
                  >
                    <option value="">Sélectionner un logigramme...</option>
                    {logigrammes.map(l => (
                      <option key={l.id} value={l.id}>{l.filiere.code} - {l.classe.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setIsReplaceModalOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Annuler
              </Button>
              <Button 
                onClick={handleReplace} 
                className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-accent hover:bg-accent/90"
                disabled={!replaceData.new_formateur_id || (replaceData.scope === 'logigramme' && !replaceData.logigramme_id)}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <h3 className="text-lg font-bold tracking-tight">Supprimer ?</h3>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              Voulez-vous vraiment supprimer <span className="text-foreground font-bold">{formateurToDelete?.nom}</span> ?
              Les unités associées n'auront plus de formateur assigné.
            </p>
            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDelete} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
```

path of the file : `frontend/src/pages/logigramme-view.jsx`

```
import { useState, useEffect, useCallback } from "react"
import Swal from 'sweetalert2'
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { FilterBar } from "@/components/logigramme/FilterBar"
import { KpiBar } from "@/components/logigramme/KpiBar"
import { ProgrammeTree } from "@/components/logigramme/ProgrammeTree"
import { FormateurVue } from "@/components/logigramme/FormateurVue"
import { LogigrammeGrid } from "@/components/logigramme/LogigrammeGrid"
import { useLogigrammeContext } from "@/contexts/logigramme-context"
import { useLogigramme } from "@/hooks/useLogigramme"
import { apiRequest } from "@/lib/api"
import { CalendarDays, FileSpreadsheet, Loader2, AlertCircle, LayoutGrid, Upload, Pencil, PanelLeftClose, PanelLeftOpen, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ImportModal } from "@/components/logigramme/ImportModal"
import { EditLogigrammeModal } from "@/components/logigramme/EditLogigrammeModal"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: LayoutGrid },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Gestion des comptes", path: "/admin/accounts", icon: FileSpreadsheet },
]

export function LogigrammeView({ path, navigate }) {
  const { filters } = useLogigrammeContext()
  const [list, setList] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [activeLogId, setActiveLogId] = useState(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const {
    data: activeLog,
    loading: loadingGrid,
    toggleCell,
    createCell,
    markWeek,
    refresh: refreshGrid
  } = useLogigramme(activeLogId)

  // Find the label for the active logigramme to show as breadcrumb
  const activeLogEntry = list.find(l => l.id === activeLogId)
  const activeLabel = activeLogEntry
    ? `${activeLogEntry.filiere?.name || '???'} — ${activeLogEntry.classe?.label || '???'}`
    : null

  const handleDelete = async (logId, label) => {
    const result = await Swal.fire({
      title: 'Supprimer ce logigramme ?',
      html: `
        <p style="font-size:0.85rem;color:#6b7280;margin-bottom:6px">Vous êtes sur le point de supprimer :</p>
        <p style="font-weight:800;font-size:0.95rem;margin:8px 0;color:#1e293b">"${label}"</p>
        <p style="font-size:0.8rem;color:#ef4444;margin-top:6px">
          Cette action est irréversible et supprimera toutes les unités,
          cellules et données de progression associées.
        </p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
      focusCancel: true,
    })

    if (!result.isConfirmed) return

    try {
      await apiRequest(`/api/logigramme/${logId}`, { method: 'DELETE' })
      if (activeLogId === logId) setActiveLogId(null)
      fetchList()
      Swal.fire({
        title: 'Supprimé !',
        text: `Le logigramme "${label}" a été supprimé avec succès.`,
        icon: 'success',
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: false,
      })
    } catch (err) {
      console.error('[LogigrammeView] Delete failed:', err)
      Swal.fire({
        title: 'Erreur',
        text: `La suppression a échoué : ${err.message}`,
        icon: 'error',
        confirmButtonColor: '#ef4444',
      })
    }
  }

  const fetchList = useCallback(async () => {
    setLoadingList(true)
    try {
      const query = new URLSearchParams()
      if (filters.year_id) query.append('year_id', filters.year_id)
      if (filters.filiere_id) query.append('filiere_id', filters.filiere_id)
      if (filters.classe_id) query.append('classe_id', filters.classe_id)
      if (filters.formateur_id) query.append('formateur_id', filters.formateur_id)

      const url = `/api/logigramme/list?${query.toString()}`
      console.log('[LogigrammeView] Fetching list with filters:', { ...filters }, 'URL:', url)
      const res = await apiRequest(url)
      console.log(`[LogigrammeView] List response: ${res.length} logigramme(s)`, res.map(l => ({
        id: l.id,
        filiere: l.filiere?.name,
        classe: l.classe?.label,
        annee: l.classe?.annee,
        total_unites: l.total_unites,
        vhg_total: l.vhg_total
      })))
      setList(res)

      const activeLogStillVisible = res.some(log => log.id === activeLogId)
      if (res.length > 0 && !activeLogStillVisible) {
        console.log('[LogigrammeView] Auto-selecting first logigramme:', res[0].id)
        setActiveLogId(res[0].id)
      } else if (res.length === 0) {
        console.warn('[LogigrammeView] ⚠ List is EMPTY for these filters — no logigramme found in DB')
        setActiveLogId(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingList(false)
    }
  }, [filters, activeLogId])

  useEffect(() => {
    fetchList()
  }, [filters]) // Re-fetch list when filters change

  return (
    <DashboardShell
      title="Logigrammes"
      subtitle="Visualisation et suivi de l'avancement pédagogique."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <KpiBar />

      {/* Toolbar: Filters + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-2">
        <FilterBar className="mb-0 flex-1 min-w-0" />
        <div className="flex items-center gap-2 lg:flex-shrink-0 w-full lg:w-auto justify-end">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-[34px] px-3 flex-1 sm:flex-initial"
          >
            <Upload className="size-3.5 mr-1.5" />
            Importer
          </Button>

          {activeLogId && activeLog && (
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-[34px] px-3 flex-1 sm:flex-initial"
            >
              <Pencil className="size-3.5 mr-1.5" />
              Éditer
            </Button>
          )}
        </div>
      </div>

      {filters.formateur_id ? (
        <FormateurVue
          formateurId={filters.formateur_id}
          onToggleCell={toggleCell}
          onMarkWeek={markWeek}
        />
      ) : (
        <div className="flex gap-3 relative">
          {/* Sidebar Toggle Button — always visible */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "absolute top-0 z-40 flex items-center gap-1.5 h-8 px-2 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:bg-muted/50 transition-all group",
              sidebarOpen ? "left-[236px]" : "left-0"
            )}
            title={sidebarOpen ? "Masquer la liste" : "Afficher la liste"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
              <>
                <PanelLeftOpen className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">
                  {list.length}
                </span>
              </>
            )}
          </button>

          {/* Sidebar List — collapsible */}
          <aside
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0",
              sidebarOpen ? "w-[260px] opacity-100" : "w-0 opacity-0"
            )}
          >
            <div className="w-[260px] space-y-3">
              <div className="flex items-center justify-between px-1 pt-1">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Programmes ({list.length})</h3>
              </div>

              <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
                {loadingList ? (
                  // Loading Skeletons
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-full p-2.5 rounded-lg border border-border bg-card/50 animate-pulse">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-3 w-10 bg-muted rounded" />
                        <div className="h-3 flex-1 bg-muted rounded" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-muted rounded-full" />
                        <div className="h-3 w-8 bg-muted rounded" />
                      </div>
                    </div>
                  ))
                ) : list.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center bg-muted/20">
                    <AlertCircle className="size-5 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-tight">Aucun logigramme ne correspond aux filtres</p>
                  </div>
                ) : (
                  <ProgrammeTree
                    list={list}
                    activeLogId={activeLogId}
                    onSelect={setActiveLogId}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            </div>
          </aside>

          {/* Main Content: Grid */}
          <main className="flex-1 min-w-0">
            {/* Active programme breadcrumb when sidebar is collapsed */}
            {!sidebarOpen && activeLabel && (
              <div className="flex items-center gap-2 mb-2 pl-10">
                <Activity className="size-3 text-primary" />
                <span className="text-[10px] font-bold text-foreground truncate">{activeLabel}</span>
              </div>
            )}

            {activeLogId ? (
              <LogigrammeGrid
                data={activeLog}
                loading={loadingGrid}
                onToggleCell={toggleCell}
                onCreateCell={createCell}
                onMarkWeek={markWeek}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-32 bg-card rounded-2xl border border-dashed border-border medical-glass">
                <div className="size-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-5">
                  <FileSpreadsheet className="size-7 text-primary/20" />
                </div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-2">Prêt à piloter</h3>
                <p className="text-xs font-medium text-muted-foreground/60 max-w-xs text-center">
                  Sélectionnez un programme dans la liste de gauche pour visualiser et mettre à jour l'état d'avancement du logigramme.
                </p>
              </div>
            )}
          </main>
        </div>
      )}

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={fetchList}
      />
      <EditLogigrammeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        logigrammeData={activeLog}
        onSaveSuccess={() => {
          refreshGrid()
          fetchList()
        }}
      />
    </DashboardShell>
  )
}
```

path of the file : `frontend/src/pages/student-dashboard.jsx`

```
import { BookOpenCheck, CalendarDays, ClipboardList, UserRound, GraduationCap, MapPin, Clock, ArrowRight } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Mon espace", path: "/student/dashboard", icon: BookOpenCheck },
]

export function StudentDashboard({ path, navigate }) {
  const { user } = useAuth()
  const firstName = user?.user_metadata?.first_name || user?.user_metadata?.prenom || "Étudiant"

  return (
    <DashboardShell
      title="Espace Étudiant"
      subtitle="Suivez votre progression et accédez à vos ressources pédagogiques."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
      accent="student"
    >
      <section className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-8 shadow-sm medical-glass">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
             <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
               Session {new Date().getFullYear()}
             </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
            Bonjour, {firstName}. <br className="hidden sm:block" />
            Votre portail est prêt.
          </h2>
          <p className="mt-4 max-w-2xl text-base font-medium text-muted-foreground leading-relaxed">
            Bienvenue sur votre espace personnel ESFPP. Retrouvez ici vos cours, vos affectations de stage et votre suivi administratif.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 flex items-center gap-2 group">
              Mes cours
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="h-11 px-6 rounded-xl border border-border bg-background/50 backdrop-blur-sm font-bold text-sm transition-all hover:bg-background">
              Mon planning
            </button>
          </div>
        </div>
        
        {/* Decorative background element */}
        <GraduationCap className="absolute -bottom-6 -right-6 size-48 text-primary/5 -rotate-12 pointer-events-none" />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.8fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <UserRound className="size-5 text-accent" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Mon Profil</h2>
          </div>
          
          <div className="space-y-1">
            {[
              { label: "Email académique", value: user?.email, icon: null },
              { label: "Rôle", value: "Étudiant ESFPP", icon: null },
              { label: "Statut du compte", value: "Vérifié & Actif", icon: null, color: "text-accent" },
              { label: "Dernière connexion", value: "Aujourd'hui", icon: null },
            ].map((item, i) => (
              <div key={i} className="flex flex-col py-3 border-b border-border/50 last:border-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">{item.label}</span>
                <span className={cn("text-sm font-bold mt-1", item.color || "text-foreground")}>{item.value}</span>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-6 py-3 rounded-xl bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors">
            Modifier mes informations
          </button>
        </section>

        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Cours", icon: BookOpenCheck, value: "Modules S1", helper: "4 documents", color: "text-primary", bg: "bg-primary/10" },
              { label: "Stages", icon: MapPin, value: "Non affecté", helper: "Dossier en cours", color: "text-accent", bg: "bg-accent/10" },
              { label: "Examens", icon: ClipboardList, value: "Session Janv.", helper: "Calendrier à venir", color: "text-secondary-foreground", bg: "bg-secondary" },
            ].map((card) => (
              <div key={card.label} className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:-translate-y-1">
                <div className={cn("flex size-10 items-center justify-center rounded-xl mb-4 transition-colors", card.bg)}>
                  <card.icon className={cn("size-5", card.color)} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-lg font-black text-foreground">{card.value}</p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground/70">{card.helper}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="size-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold tracking-tight">Prochainement</h2>
             </div>
             
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                   <CalendarDays className="size-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">Aucun événement prévu cette semaine</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[240px]">Les plannings de cours et de stages seront affichés ici dès leur publication.</p>
             </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  )
}
```

path of the file : `frontend/src/supabaseClient.js`

```
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

path of the file : `frontend/tailwind.config.js`

```
(empty file)
```

path of the file : `frontend/vite.config.js`

```
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
```

path of the file : `supabase/migrations/20260609_auth_rbac_profiles.sql`

```
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  status text not null default 'invited' check (status in ('invited', 'active', 'blocked')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.auth_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'student');
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can complete their own profile" on public.profiles;
create policy "Users can complete their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.auth_role() = 'admin');

drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles"
on public.profiles
for all
to authenticated
using (public.auth_role() = 'admin')
with check (public.auth_role() = 'admin');

alter table if exists public."Admin" enable row level security;

drop policy if exists "Admins can read Admin records" on public."Admin";
create policy "Admins can read Admin records"
on public."Admin"
for select
to authenticated
using (public.auth_role() = 'admin');

drop policy if exists "Admins can manage Admin records" on public."Admin";
create policy "Admins can manage Admin records"
on public."Admin"
for all
to authenticated
using (public.auth_role() = 'admin')
with check (public.auth_role() = 'admin');
```

path of the file : `supabase/migrations/20260609_auth_rbac_profiles_allow_pending.sql`

```
alter table public.profiles
drop constraint if exists profiles_status_check;

alter table public.profiles
add constraint profiles_status_check
check (status in ('invited', 'pending', 'active', 'blocked'));
```

path of the file : `supabase/migrations/20260610_fix_profiles_updated_at.sql`

```
-- Fix: profiles table is missing updated_at column but the trigger references it.
-- This migration adds the column and recreates the trigger cleanly.

-- 1. Drop the broken trigger
drop trigger if exists profiles_set_updated_at on public.profiles;

-- 2. Add the missing updated_at column
alter table public.profiles
add column if not exists updated_at timestamptz not null default now();

-- 3. Backfill updated_at for existing rows
update public.profiles set updated_at = created_at where updated_at = now();

-- 4. Recreate the function (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 5. Recreate the trigger
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
```

path of the file : `supabase/migrations/20260611_logigramme_rls.sql`

```
-- ============================================================
-- Enable RLS on all logigramme tables
-- ============================================================
ALTER TABLE public.academic_years     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filieres           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formateurs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logigrammes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unites_formation   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.week_cells         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.year_weeks         ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
-- (reuses the auth_role() function from the existing auth migration)

-- ============================================================
-- READ policies: admins see all, students see all (read-only)
-- ============================================================
CREATE POLICY "anyone_authenticated_can_read_academic_years"
  ON public.academic_years FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_filieres"
  ON public.filieres FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_classes"
  ON public.classes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_formateurs"
  ON public.formateurs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_logigrammes"
  ON public.logigrammes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_unites"
  ON public.unites_formation FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_week_cells"
  ON public.week_cells FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_completions"
  ON public.completions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "anyone_authenticated_can_read_year_weeks"
  ON public.year_weeks FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- WRITE policies: admins only
-- ============================================================

CREATE POLICY "admins_can_write_filieres"
  ON public.filieres FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_academic_years"
  ON public.academic_years FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_classes"
  ON public.classes FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_formateurs"
  ON public.formateurs FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_logigrammes"
  ON public.logigrammes FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_unites"
  ON public.unites_formation FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_week_cells"
  ON public.week_cells FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_completions"
  ON public.completions FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

CREATE POLICY "admins_can_write_year_weeks"
  ON public.year_weeks FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');
```

path of the file : `supabase/migrations/20260611_logigramme_schema.sql`

```
-- ============================================================
-- LOOKUP TABLES
-- ============================================================

-- Academic years (e.g. "2025-2026")
CREATE TABLE public.academic_years (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL UNIQUE,          -- "2025-2026"
  start_date  date NOT NULL,                 -- First Monday of September
  end_date    date NOT NULL,                 -- Last Friday of August next year
  is_current  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one current year at a time
CREATE UNIQUE INDEX academic_years_one_current
  ON public.academic_years (is_current)
  WHERE is_current = true;

-- Filières (training programs)
CREATE TABLE public.filieres (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,          -- "AS", "REA", "IA", "IP", "RADIO"
  name        text NOT NULL,                 -- "Aide-Soignant"
  niveau      text NOT NULL,                 -- "QUALIFICATION" | "Technicien Spécialisé"
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Classes within a filière (one row per year of training)
CREATE TABLE public.classes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiere_id   uuid NOT NULL REFERENCES public.filieres(id) ON DELETE CASCADE,
  label        text NOT NULL,                -- "1ère année", "2ème année"
  annee        integer NOT NULL,             -- 1, 2, 3
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (filiere_id, annee)
);

-- Formateurs (teachers)
CREATE TABLE public.formateurs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         text NOT NULL UNIQUE,          -- "ZOURARAH CHAFIA"
  statut      text NOT NULL DEFAULT 'vacataire'
                CHECK (statut IN ('permanent', 'vacataire')),
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PLANNING TABLES
-- ============================================================

-- One logigramme per (filiere × classe × academic_year)
CREATE TABLE public.logigrammes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiere_id       uuid NOT NULL REFERENCES public.filieres(id) ON DELETE CASCADE,
  classe_id        uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  auto_complete    boolean NOT NULL DEFAULT false, -- auto-mark past weeks as done
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (filiere_id, classe_id, academic_year_id)
);

-- Training units (one per row in the Excel grid)
CREATE TABLE public.unites_formation (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logigramme_id  uuid NOT NULL REFERENCES public.logigrammes(id) ON DELETE CASCADE,
  ordre          integer NOT NULL,            -- row order (1, 2, 3…)
  nom            text NOT NULL,               -- unit name
  formateur_id   uuid REFERENCES public.formateurs(id) ON DELETE SET NULL,
  vhg            integer NOT NULL,            -- Volume Horaire Global (total hours)
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (logigramme_id, ordre)
);

-- Weekly schedule cells (one row per unit × week)
-- Only non-empty cells are stored (sparse storage)
CREATE TABLE public.week_cells (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unite_id        uuid NOT NULL REFERENCES public.unites_formation(id) ON DELETE CASCADE,
  semaine         integer NOT NULL CHECK (semaine BETWEEN 1 AND 52), -- week number
  week_start_date date NOT NULL,              -- actual calendar date of that Monday
  cell_type       text NOT NULL DEFAULT 'normal'
                    CHECK (cell_type IN ('normal', 'vacation', 'exam', 'tiff', 'empty')),
  heures          numeric(4,1),               -- scheduled hours (null for vacation/exam/tiff)
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unite_id, semaine)
);

-- Completion tracking (one row per cell that has been interacted with)
CREATE TABLE public.completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id      uuid NOT NULL REFERENCES public.week_cells(id) ON DELETE CASCADE UNIQUE,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'done', 'auto_done')),
  -- 'auto_done' = set by the system because week_start_date < today and auto_complete = true
  -- 'done'      = set manually by admin
  -- 'pending'   = not yet done
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- WEEK CALENDAR TABLE
-- A pre-computed lookup of week_number → date for each academic year
-- Generated once when an academic_year is created
-- ============================================================
CREATE TABLE public.year_weeks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  semaine          integer NOT NULL CHECK (semaine BETWEEN 1 AND 52),
  week_start_date  date NOT NULL,
  mois             text NOT NULL,             -- "Septembre", "Octobre", etc.
  semestre         integer NOT NULL CHECK (semestre IN (1, 2)),
  UNIQUE (academic_year_id, semaine)
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER filieres_updated_at
  BEFORE UPDATE ON public.filieres
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER formateurs_updated_at
  BEFORE UPDATE ON public.formateurs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER logigrammes_updated_at
  BEFORE UPDATE ON public.logigrammes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER unites_formation_updated_at
  BEFORE UPDATE ON public.unites_formation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

path of the file : `supabase/seed.sql`

```
-- Seed Academic Year 2025-2026
INSERT INTO public.academic_years (label, start_date, end_date, is_current)
VALUES ('2025-2026', '2025-09-01', '2026-08-31', true)
ON CONFLICT (label) DO UPDATE SET is_current = EXCLUDED.is_current;
```

## Binary Or Generated Files Omitted

path of the file : `frontend/public/apple-icon.png`
mime type: `image/png`
[binary/generated content omitted]

path of the file : `frontend/public/campus.png`
mime type: `image/png`
[binary/generated content omitted]

path of the file : `frontend/public/icon-dark-32x32.png`
mime type: `image/png`
[binary/generated content omitted]

path of the file : `frontend/public/icon-light-32x32.png`
mime type: `image/png`
[binary/generated content omitted]

path of the file : `frontend/public/nursing.png`
mime type: `image/png`
[binary/generated content omitted]

path of the file : `frontend/public/placeholder-logo.png`
mime type: `image/png`
[binary/generated content omitted]

path of the file : `frontend/public/placeholder-user.jpg`
mime type: `image/jpeg`
[binary/generated content omitted]

path of the file : `frontend/public/placeholder.jpg`
mime type: `image/jpeg`
[binary/generated content omitted]
