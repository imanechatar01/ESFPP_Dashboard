import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// POST /api/completion/cell/:cell_id
router.post('/cell/:cell_id', async (req, res) => {
  const { cell_id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  try {
    const { data, error } = await supabaseAdmin
      .from('completions')
      .upsert({
        cell_id,
        status,
        updated_by: userId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'cell_id' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/completion/week
router.post('/week', async (req, res) => {
  const { logigramme_id, semaine, status } = req.body;
  const userId = req.user.id;

  try {
    // 1. Find all normal cells for this logigramme and week
    const { data: unites, error: unitesError } = await supabaseAdmin
      .from('unites_formation')
      .select('id')
      .eq('logigramme_id', logigramme_id);

    if (unitesError) throw unitesError;
    const uniteIds = (unites || []).map(u => u.id);

    if (uniteIds.length === 0) {
      return res.json({ updated: 0 });
    }

    const { data: cells, error: cellsError } = await supabaseAdmin
      .from('week_cells')
      .select('id')
      .eq('semaine', semaine)
      .eq('cell_type', 'normal')
      .in('unite_id', uniteIds);

    if (cellsError) throw cellsError;

    if (!cells || cells.length === 0) {
      return res.json({ updated: 0 });
    }

    const cellIds = cells.map(c => c.id);

    // 2. Upsert completions for these cells
    const completionInserts = cellIds.map(id => ({
      cell_id: id,
      status,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }));

    const { error: upsertError } = await supabaseAdmin
      .from('completions')
      .upsert(completionInserts, { onConflict: 'cell_id' });

    if (upsertError) throw upsertError;

    res.json({ updated: cellIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/completion/auto-sync/:logigramme_id
router.post('/auto-sync/:logigramme_id', async (req, res) => {
    const { logigramme_id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Get cells that should be auto_done
        const { data: unites, error: unitesError } = await supabaseAdmin
            .from('unites_formation')
            .select('id')
            .eq('logigramme_id', logigramme_id);

        if (unitesError) throw unitesError;
        const uniteIds = (unites || []).map(u => u.id);

        if (uniteIds.length === 0) {
            return res.json({ updated: 0 });
        }

        const { data: cells, error: cellsError } = await supabaseAdmin
            .from('week_cells')
            .select('id')
            .lt('week_start_date', today)
            .eq('cell_type', 'normal')
            .in('unite_id', uniteIds);

        if (cellsError) throw cellsError;

        if (!cells || cells.length === 0) {
            return res.json({ updated: 0 });
        }

        const cellIds = cells.map(c => c.id);

        // 2. Filter out already 'done' manually (optional, but let's keep manual overrides)
        // For simplicity, let's just upsert 'auto_done'
        const completionInserts = cellIds.map(id => ({
            cell_id: id,
            status: 'auto_done',
            updated_at: new Date().toISOString()
        }));

        const { error: upsertError } = await supabaseAdmin
            .from('completions')
            .upsert(completionInserts, { onConflict: 'cell_id' });

        if (upsertError) throw upsertError;

        res.json({ updated: cellIds.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
