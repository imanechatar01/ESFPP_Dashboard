import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// GET /api/formateurs
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('formateurs')
      .select('*')
      .is('deleted_at', null)
      .order('nom');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/formateurs
router.post('/', async (req, res) => {
  const { nom, statut } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('formateurs')
      .insert({ nom, statut })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/formateurs/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, statut } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('formateurs')
      .update({ nom, statut })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/formateurs/:id (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('formateurs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/formateurs/replace
router.post('/replace', async (req, res) => {
  const { old_formateur_id, new_formateur_id, scope, logigramme_id } = req.body;

  try {
    let query = supabaseAdmin
      .from('unites_formation')
      .update({ formateur_id: new_formateur_id })
      .eq('formateur_id', old_formateur_id);

    if (scope === 'logigramme') {
      query = query.eq('logigramme_id', logigramme_id);
    }

    const { data, error, count } = await query.select();

    if (error) throw error;
    res.json({ updated_units: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/formateurs/:id/unites
router.get('/:id/unites', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Get all units for this formateur
    const { data: units, error: unitsError } = await supabaseAdmin
      .from('unites_formation')
      .select(`
        id,
        ordre,
        nom,
        vhg,
        logigramme_id,
        logigramme:logigrammes (
          id,
          filiere:filieres (code, name),
          classe:classes (label)
        ),
        cells:week_cells (
          id,
          semaine,
          cell_type,
          heures,
          week_start_date,
          completion:completions (status)
        )
      `)
      .eq('formateur_id', id)
      .order('logigramme_id');

    if (unitsError) throw unitsError;

    // 2. Process units and find conflicts
    const processedUnits = units.map(u => ({
      ...u,
      cells: u.cells.map(c => ({
        ...c,
        completion_status: c.completion?.[0]?.status || 'pending'
      }))
    }));

    // Conflict Detection (Task E)
    // A conflict = same formateur has a normal cell with heures > 0 in the same semaine across 2+ logigrammes
    const conflictsMap = {}; // semaine -> [programmes]
    
    processedUnits.forEach(unit => {
      unit.cells.forEach(cell => {
        if (cell.cell_type === 'normal' && (parseFloat(cell.heures) || 0) > 0) {
          if (!conflictsMap[cell.semaine]) {
            conflictsMap[cell.semaine] = {
              semaine: cell.semaine,
              week_start_date: cell.week_start_date,
              programmes: []
            };
          }
          conflictsMap[cell.semaine].programmes.push({
            logigramme_id: unit.logigramme_id,
            label: `${unit.logigramme.filiere.name} — ${unit.logigramme.classe.label}`,
            unite_nom: unit.nom
          });
        }
      });
    });

    const conflicts = Object.values(conflictsMap).filter(c => c.programmes.length > 1);

    res.json({
      unites: processedUnits,
      conflicts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
