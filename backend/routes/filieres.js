import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireRole } from '../lib/auth.js';

const router = express.Router();

// GET /api/filieres
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('filieres')
      .select('*, classes (*)')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/filieres
router.post('/', requireRole('admin'), async (req, res) => {
  const { code, name, niveau, nb_annees } = req.body;

  try {
    // 1. Create Filière
    const { data: filiere, error: filError } = await supabaseAdmin
      .from('filieres')
      .insert({ code, name, niveau })
      .select()
      .single();

    if (filError) throw filError;

    // 2. Create Classes
    const classes = [];
    for (let i = 1; i <= nb_annees; i++) {
      classes.push({
        filiere_id: filiere.id,
        label: i === 1 ? '1ère année' : `${i}ème année`,
        annee: i
      });
    }

    const { error: clError } = await supabaseAdmin
      .from('classes')
      .insert(classes);

    if (clError) throw clError;

    res.status(201).json(filiere);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/filieres/:id
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, niveau, code } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('filieres')
      .update({ name, niveau, code })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/filieres/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('filieres')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
