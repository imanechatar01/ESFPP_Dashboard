-- ============================================================
-- COURSE PROGRESS — Video Playback Tracking
-- Tracks watched seconds and progress percentages for videos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.course_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  watched_seconds   numeric NOT NULL DEFAULT 0,
  duration_seconds  numeric NOT NULL DEFAULT 0,
  percentage        numeric NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_student_course_progress UNIQUE (student_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Students can read their own progress
DROP POLICY IF EXISTS "students_read_own_progress" ON public.course_progress;
CREATE POLICY "students_read_own_progress"
  ON public.course_progress FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Students can insert/update (upsert) their own progress
DROP POLICY IF EXISTS "students_insert_own_progress" ON public.course_progress;
CREATE POLICY "students_insert_own_progress"
  ON public.course_progress FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "students_update_own_progress" ON public.course_progress;
CREATE POLICY "students_update_own_progress"
  ON public.course_progress FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Admins can read all progress records
DROP POLICY IF EXISTS "admins_read_all_progress" ON public.course_progress;
CREATE POLICY "admins_read_all_progress"
  ON public.course_progress FOR SELECT
  TO authenticated
  USING (public.auth_role() = 'admin');

-- Trigger to update updated_at automatically
DROP TRIGGER IF EXISTS course_progress_set_updated_at ON public.course_progress;
CREATE TRIGGER course_progress_set_updated_at
  BEFORE UPDATE ON public.course_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
