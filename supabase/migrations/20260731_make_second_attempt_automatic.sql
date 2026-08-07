-- A failed first attempt automatically unlocks one final attempt.
-- Remove the former admin-approval flag if the previous migration was applied.
ALTER TABLE public.exam_attempts
  DROP COLUMN IF EXISTS retry_granted;
