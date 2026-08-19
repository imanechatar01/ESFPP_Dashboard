// backend/routes/notifications.js
// Handles admin in-app notifications (bell dropdown).
// Rows are inserted by the exam-reminder scheduler in server.js.
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// GET /api/notifications
// Returns the 20 most recent notifications with target exam context (logigramme_id, unite_id, week_start_date)
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_notifications')
      .select(`
        id, 
        type, 
        message, 
        is_read, 
        created_at, 
        exam_cell_id,
        exam_cell:week_cells (
          id,
          semaine,
          week_start_date,
          unite_id,
          unite:unites_formation (
            id,
            nom,
            logigramme_id,
            formateur_id,
            formateur:formateurs (
              id,
              nom
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const unread_count = (data || []).filter(n => !n.is_read).length;
    res.json({ notifications: data || [], unread_count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
// Marks a single notification as read.
router.patch('/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/read-all
// Marks all notifications as read (called when admin opens the bell dropdown).
router.patch('/read-all', async (_req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/clear-all
// Deletes all notifications (destructive, requires confirmation on client side).
router.delete('/clear-all', async (_req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .delete()
      .gte('created_at', '1970-01-01'); // Matches all rows (Supabase requires a filter for DELETE)

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
