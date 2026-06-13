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
