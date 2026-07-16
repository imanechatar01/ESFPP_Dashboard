-- ============================================================
-- COURSE SCORES — H5P Evaluation Results
-- One score per student per course (locked after first submission)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.course_scores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  score       numeric NOT NULL,
  max_score   numeric NOT NULL,
  percentage  numeric NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_student_course UNIQUE (student_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE public.course_scores ENABLE ROW LEVEL SECURITY;

-- Students can read their own scores
DROP POLICY IF EXISTS "students_read_own_scores" ON public.course_scores;
CREATE POLICY "students_read_own_scores"
  ON public.course_scores FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Students can insert their own scores (one-time, enforced by UNIQUE)
DROP POLICY IF EXISTS "students_insert_own_scores" ON public.course_scores;
CREATE POLICY "students_insert_own_scores"
  ON public.course_scores FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Admins can read all scores
DROP POLICY IF EXISTS "admins_read_all_scores" ON public.course_scores;
CREATE POLICY "admins_read_all_scores"
  ON public.course_scores FOR SELECT
  TO authenticated
  USING (public.auth_role() = 'admin');

-- Admins can manage all scores (update/delete for corrections)
DROP POLICY IF EXISTS "admins_manage_all_scores" ON public.course_scores;
CREATE POLICY "admins_manage_all_scores"
  ON public.course_scores FOR ALL
  TO authenticated
  USING (public.auth_role() = 'admin')
  WITH CHECK (public.auth_role() = 'admin');
