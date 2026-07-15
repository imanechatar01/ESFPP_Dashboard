-- ============================================================
-- COURSES & VIDEOS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.courses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  video_url   text NOT NULL,
  filiere_id  uuid REFERENCES public.filieres(id) ON DELETE CASCADE,
  classe_id   uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update updated_at automatically
DROP TRIGGER IF EXISTS courses_updated_at ON public.courses;
CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Select policies: All authenticated users can read courses
DROP POLICY IF EXISTS "anyone_authenticated_can_read_courses" ON public.courses;
CREATE POLICY "anyone_authenticated_can_read_courses"
  ON public.courses FOR SELECT
  TO authenticated USING (true);

-- Manage policies: Only admins can manage (insert/update/delete) courses
DROP POLICY IF EXISTS "admins_can_write_courses" ON public.courses;
CREATE POLICY "admins_can_write_courses"
  ON public.courses FOR ALL TO authenticated
  USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');
