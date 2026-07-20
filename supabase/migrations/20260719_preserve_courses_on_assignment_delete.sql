-- Preserve course content when an administrator removes its filiere or class.
-- Course assignments are optional, so clear them instead of deleting courses.

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_filiere_id_fkey;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_filiere_id_fkey
  FOREIGN KEY (filiere_id)
  REFERENCES public.filieres(id)
  ON DELETE SET NULL;

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_classe_id_fkey;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_classe_id_fkey
  FOREIGN KEY (classe_id)
  REFERENCES public.classes(id)
  ON DELETE SET NULL;
