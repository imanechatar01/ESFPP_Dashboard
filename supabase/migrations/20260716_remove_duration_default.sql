-- ============================================================
-- REMOVE DEFAULT DURATION FOR COURSES
-- ============================================================

ALTER TABLE public.courses ALTER COLUMN duration DROP DEFAULT;
