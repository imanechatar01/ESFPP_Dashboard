-- Shared online exams with graded, repeatable attempts.
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  exam_date date NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes IN (30, 45, 60, 90, 120)),
  locked boolean NOT NULL DEFAULT true,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(questions) = 'array'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  -- Number of attempts already used (maximum 2). The row always keeps the best score.
  attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number BETWEEN 1 AND 2),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS exams_locked_idx ON public.exams (locked);
CREATE INDEX IF NOT EXISTS exam_attempts_student_idx ON public.exam_attempts (student_id);

DROP TRIGGER IF EXISTS exams_updated_at ON public.exams;
CREATE TRIGGER exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- Answer keys live in the questions JSON. Direct client reads are therefore
-- restricted to admins; students receive a sanitized payload from the API.
DROP POLICY IF EXISTS "authenticated_can_read_unlocked_exams" ON public.exams;
DROP POLICY IF EXISTS "admins_can_read_exams" ON public.exams;
CREATE POLICY "admins_can_read_exams"
  ON public.exams FOR SELECT TO authenticated
  USING (auth_role() = 'admin');

DROP POLICY IF EXISTS "admins_manage_exams" ON public.exams;
CREATE POLICY "admins_manage_exams"
  ON public.exams FOR ALL TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

DROP POLICY IF EXISTS "students_read_own_exam_attempts" ON public.exam_attempts;
CREATE POLICY "students_read_own_exam_attempts"
  ON public.exam_attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR auth_role() = 'admin');

-- Attempts are inserted by the protected API so students cannot forge scores.
DROP POLICY IF EXISTS "students_create_own_exam_attempts" ON public.exam_attempts;
