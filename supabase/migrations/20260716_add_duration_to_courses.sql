-- ============================================================
-- ADD DURATION TO COURSES
-- Add duration (in seconds) to courses table to configure playback targets
-- ============================================================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration integer DEFAULT 300;
