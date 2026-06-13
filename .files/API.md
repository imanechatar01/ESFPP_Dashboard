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
