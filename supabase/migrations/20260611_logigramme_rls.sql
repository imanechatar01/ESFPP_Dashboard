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
