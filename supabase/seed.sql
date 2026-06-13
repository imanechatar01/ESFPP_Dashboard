-- Seed Academic Year 2025-2026
INSERT INTO public.academic_years (label, start_date, end_date, is_current)
VALUES ('2025-2026', '2025-09-01', '2026-08-31', true)
ON CONFLICT (label) DO UPDATE SET is_current = EXCLUDED.is_current;
