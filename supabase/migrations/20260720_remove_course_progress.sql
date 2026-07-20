-- Course playback progression has been retired.
-- Existing playback positions are intentionally deleted with the table.
DROP TABLE IF EXISTS public.course_progress;

-- This field was only used to estimate playback completion.
ALTER TABLE public.courses
  DROP COLUMN IF EXISTS duration;
