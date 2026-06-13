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
