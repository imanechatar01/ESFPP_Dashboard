-- Add graded results and admin-controlled retries to existing exam attempts.
ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS percentage numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1;

UPDATE public.exam_attempts
SET
  percentage = CASE
    WHEN total_questions > 0 THEN ROUND((score::numeric * 100) / total_questions, 2)
    ELSE 0
  END,
  passed = CASE
    WHEN total_questions > 0 THEN ((score::numeric * 100) / total_questions) >= 60
    ELSE false
  END;

ALTER TABLE public.exam_attempts
  DROP CONSTRAINT IF EXISTS exam_attempts_exam_id_student_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS exam_attempts_student_exam_number_idx
  ON public.exam_attempts (exam_id, student_id, attempt_number);

CREATE INDEX IF NOT EXISTS exam_attempts_exam_idx
  ON public.exam_attempts (exam_id);
