-- Keep exactly one result row per student and exam.
-- If two rows already exist, retain the best score and record that both attempts were used.
CREATE TEMP TABLE exam_attempts_consolidation ON COMMIT DROP AS
SELECT
  id,
  ROW_NUMBER() OVER (
    PARTITION BY exam_id, student_id
    ORDER BY percentage DESC, score DESC, submitted_at DESC
  ) AS result_rank,
  COUNT(*) OVER (PARTITION BY exam_id, student_id) AS attempts_used,
  MAX(submitted_at) OVER (PARTITION BY exam_id, student_id) AS last_submission
FROM public.exam_attempts;

UPDATE public.exam_attempts AS attempt
SET
  attempt_number = LEAST(summary.attempts_used, 2),
  submitted_at = summary.last_submission,
  passed = attempt.percentage >= 60
FROM exam_attempts_consolidation AS summary
WHERE attempt.id = summary.id
  AND summary.result_rank = 1;

DELETE FROM public.exam_attempts AS attempt
USING exam_attempts_consolidation AS summary
WHERE attempt.id = summary.id
  AND summary.result_rank > 1;

DROP INDEX IF EXISTS public.exam_attempts_student_exam_number_idx;

ALTER TABLE public.exam_attempts
  DROP CONSTRAINT IF EXISTS exam_attempts_exam_id_student_id_attempt_number_key;

ALTER TABLE public.exam_attempts
  DROP CONSTRAINT IF EXISTS exam_attempts_attempt_number_check;

ALTER TABLE public.exam_attempts
  ADD CONSTRAINT exam_attempts_attempt_number_check
  CHECK (attempt_number BETWEEN 1 AND 2);

CREATE UNIQUE INDEX IF NOT EXISTS exam_attempts_one_result_per_student_idx
  ON public.exam_attempts (exam_id, student_id);
