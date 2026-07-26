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
  const { filiere_id, classe_id, niveau_id } = req.query;

  try {
    // 1. Get all units for this formateur
    const { data: units, error: unitsError } = await supabaseAdmin
      .from('unites_formation')
      .select(`
        id,
        ordre,
        nom,
        vhg,
        formateur_id,
        formateur:formateurs (*),
        logigramme_id,
        logigramme:logigrammes (
          id,
          filiere_id,
          classe_id,
          filiere:filieres (code, name, niveau),
          classe:classes (label, annee)
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

    // Debug: Log what we actually got
    if (units.length > 0) {
      console.log('[FormateursAPI] First unit structure:', JSON.stringify(units[0], null, 2));
    }

    // Apply client-side filtering based on query parameters
    let filteredUnits = units;
    
    console.log('[FormateursAPI] Filtering with params:', { filiere_id, classe_id, niveau_id });
    console.log('[FormateursAPI] Total units before filter:', units.length);

    if (niveau_id) {
      filteredUnits = filteredUnits.filter(u => {
        const match = u.logigramme?.filiere?.niveau === niveau_id;
        if (!match && units.length > 0) {
          console.log('[FormateursAPI] Unit niveau check:', {
            niveau_value: u.logigramme?.filiere?.niveau,
            niveau_id_param: niveau_id,
            match
          });
        }
        return match;
      });
      console.log('[FormateursAPI] After niveau filter:', filteredUnits.length);
    }
    if (filiere_id) {
      filteredUnits = filteredUnits.filter(u => {
        const match = String(u.logigramme?.filiere_id) === String(filiere_id);
        return match;
      });
      console.log('[FormateursAPI] After filiere filter:', filteredUnits.length);
    }
    if (classe_id) {
      filteredUnits = filteredUnits.filter(u => {
        const match = String(u.logigramme?.classe_id) === String(classe_id);
        return match;
      });
      console.log('[FormateursAPI] After classe filter:', filteredUnits.length);
    }

    console.log('[FormateursAPI] Final filtered units:', filteredUnits.length);

    // 2. Process units: flatten completion, compute vh_realise (same logic as logigrammes.js)
    const today = new Date().toISOString().split('T')[0];
    const processedUnits = filteredUnits.map(u => {
      const processedCells = u.cells.map(c => {
        let status = c.completion?.status || 'pending';
        if (status === 'pending') {
          if (c.week_start_date && c.week_start_date < today) {
            status = 'auto_done';
          }
        }
        return {
          ...c,
          completion_status: status
        };
      });
      const vh_realise = processedCells
        .filter(c => c.cell_type === 'normal' && (c.completion_status === 'done' || c.completion_status === 'auto_done'))
        .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);
      return {
        ...u,
        cells: processedCells,
        vh_realise,
        vh_restant: u.vhg - vh_realise,
        taux: u.vhg > 0 ? vh_realise / u.vhg : 0
      };
    });

    res.json({
      unites: processedUnits,
      conflicts: []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
