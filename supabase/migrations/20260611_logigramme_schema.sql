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
