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
