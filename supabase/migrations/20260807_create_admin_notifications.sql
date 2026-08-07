-- admin_notifications
-- Stores per-admin in-app notifications.
-- The scheduler checks `notified_date` to guarantee at most one notification
-- per exam per calendar day (deduplication key: exam_cell_id + notified_date).

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Discriminator for the type of notification (extensible for future types)
  type             text NOT NULL DEFAULT 'exam_reminder'
                     CHECK (type IN ('exam_reminder')),
  -- FK to week_cells.id — the exam cell that triggered this notification
  exam_cell_id     uuid NOT NULL REFERENCES public.week_cells(id) ON DELETE CASCADE,
  -- ISO date of the day this notification was created (YYYY-MM-DD)
  -- Uniqueness constraint prevents more than one notification per exam per day
  notified_date    date NOT NULL DEFAULT CURRENT_DATE,
  -- Human-readable message shown in the bell dropdown
  message          text NOT NULL,
  -- True once the admin has seen / dismissed the notification
  is_read          boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_cell_id, notified_date)
);

-- Index for the bell dropdown (fetch unread notifications quickly)
CREATE INDEX IF NOT EXISTS admin_notifications_unread_idx
  ON public.admin_notifications (is_read, created_at DESC);

-- Index for the scheduler deduplication query
CREATE INDEX IF NOT EXISTS admin_notifications_cell_date_idx
  ON public.admin_notifications (exam_cell_id, notified_date);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can read and update notifications
CREATE POLICY "admins_can_read_notifications"
  ON public.admin_notifications FOR SELECT TO authenticated
  USING (auth_role() = 'admin');

CREATE POLICY "admins_can_update_notifications"
  ON public.admin_notifications FOR UPDATE TO authenticated
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- The backend uses the service-role key (supabaseAdmin) to insert rows,
-- so no INSERT policy is needed for authenticated users.
