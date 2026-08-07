import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireRole } from '../lib/auth.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Courses CRUD
// ---------------------------------------------------------------------------

// GET /api/courses
// Anyone authenticated can read
router.get('/', async (req, res) => {
  const { filiere_id, classe_id } = req.query;

  try {
    let query = supabaseAdmin
      .from('courses')
      .select(`
        *,
        filiere:filieres (id, code, name),
        classe:classes (id, label, annee)
      `)
      .order('created_at', { ascending: false });

    if (filiere_id) {
      query = query.eq('filiere_id', filiere_id);
    }
    if (classe_id) {
      query = query.eq('classe_id', classe_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/courses
// Admin only
router.post('/', requireRole('admin'), async (req, res) => {
  const { title, description, video_url, filiere_id, classe_id } = req.body;

  if (!title || !video_url) {
    return res.status(400).json({ error: 'Title and Video URL are required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .insert({
        title,
        description,
        video_url,
        filiere_id: filiere_id || null,
        classe_id: classe_id || null
      })
      .select(`
        *,
        filiere:filieres (id, code, name),
        classe:classes (id, label, annee)
      `)
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/courses/:id
// Admin only
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { title, description, video_url, filiere_id, classe_id } = req.body;

  if (!title || !video_url) {
    return res.status(400).json({ error: 'Title and Video URL are required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .update({
        title,
        description,
        video_url,
        filiere_id: filiere_id || null,
        classe_id: classe_id || null
      })
      .eq('id', id)
      .select(`
        *,
        filiere:filieres (id, code, name),
        classe:classes (id, label, annee)
      `)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/courses/:id
// Admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
