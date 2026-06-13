// backend/routes/logigrammes.js
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// Helper to get the current academic year ID
async function getCurrentYearId() {
  const { data, error } = await supabaseAdmin
  .from('academic_years')
  .select('id')
  .eq('is_current', true)
  .single();
  if (error || !data) return null;
  return data.id;
}

// GET /api/logigramme/kpis
router.get('/kpis', async (req, res) => {
  let { year_id, filiere_id, formateur_id } = req.query;

  try {
    if (!year_id) {
      const currentYearId = await getCurrentYearId();
      if (currentYearId) year_id = currentYearId;
    }

    // 1. Get Logigramme IDs
    let logQuery = supabaseAdmin.from('logigrammes').select('id');
    if (year_id) logQuery = logQuery.eq('academic_year_id', year_id);
    if (filiere_id) logQuery = logQuery.eq('filiere_id', filiere_id);

    const { data: logs, error: logsError } = await logQuery;
    if (logsError) throw logsError;

    const logIds = logs.map(l => l.id);
    if (logIds.length === 0) {
      return res.json({
        total_programmes: 0,
        total_heures: 0,
        total_formateurs: 0,
        taux_global: 0
      });
    }

    // 2. Get Unites and Cells
    let unitQuery = supabaseAdmin
      .from('unites_formation')
      .select(`
        id,
        vhg,
        logigramme_id,
        formateur_id,
        cells:week_cells (
          cell_type,
          heures,
          completion:completions (status)
        )
      `)
      .in('logigramme_id', logIds);

    if (formateur_id) unitQuery = unitQuery.eq('formateur_id', formateur_id);

    const { data: units, error: unitsError } = await unitQuery;
    if (unitsError) throw unitsError;

    // 3. Aggregate
    const uniqueLogIds = new Set();
    const uniqueFormateurIds = new Set();
    let totalVhg = 0;
    let totalRealise = 0;

    for (const unit of units) {
      uniqueLogIds.add(unit.logigramme_id);
      if (unit.formateur_id) uniqueFormateurIds.add(unit.formateur_id);
      totalVhg += (parseFloat(unit.vhg) || 0);

      const cells = unit.cells || [];
      for (const cell of cells) {
        if (cell.cell_type === 'normal') {
          const status = cell.completion?.[0]?.status;
          if (status === 'done' || status === 'auto_done') {
            totalRealise += (parseFloat(cell.heures) || 0);
          }
        }
      }
    }

    res.json({
      total_programmes: uniqueLogIds.size,
      total_heures: Math.round(totalVhg),
      total_formateurs: uniqueFormateurIds.size,
      taux_global: totalVhg > 0 ? totalRealise / totalVhg : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logigramme/heatmap
router.get('/heatmap', async (req, res) => {
  let { year_id, filiere_id } = req.query;

  try {
    if (!year_id) {
      const currentYearId = await getCurrentYearId();
      if (currentYearId) year_id = currentYearId;
    }

    // 1. Get Weeks
    const { data: weeks, error: weeksError } = await supabaseAdmin
      .from('year_weeks')
      .select('*')
      .eq('academic_year_id', year_id)
      .order('semaine');

    if (weeksError) throw weeksError;

    // 2. Get Logigrammes
    let logQuery = supabaseAdmin
      .from('logigrammes')
      .select(`
        id,
        filiere:filieres (name),
        classe:classes (label)
      `)
      .eq('academic_year_id', year_id);

    if (filiere_id) logQuery = logQuery.eq('filiere_id', filiere_id);

    const { data: logs, error: logsError } = await logQuery;
    if (logsError) throw logsError;

    // 3. Get Completion Data for all cells in these logigrammes
    const logIds = logs.map(l => l.id);
    const { data: cells, error: cellsError } = await supabaseAdmin
      .from('week_cells')
      .select(`
        id,
        semaine,
        cell_type,
        unite:unites_formation (logigramme_id),
        completion:completions (status)
      `)
      .in('unite_id', (
        await supabaseAdmin.from('unites_formation').select('id').in('logigramme_id', logIds)
      ).data.map(u => u.id))
      .eq('cell_type', 'normal');

    if (cellsError) throw cellsError;

    // 4. Group by logigramme and week
    const heatmapRows = logs.map(log => {
      const logCells = cells.filter(c => c.unite.logigramme_id === log.id);
      
      const weekly_completion = [];
      const weeksWithCells = [...new Set(logCells.map(c => c.semaine))];

      for (const sem of weeksWithCells) {
        const weekCells = logCells.filter(c => c.semaine === sem);
        const doneCount = weekCells.filter(c => 
          c.completion?.[0]?.status === 'done' || c.completion?.[0]?.status === 'auto_done'
        ).length;

        weekly_completion.push({
          semaine: sem,
          taux: doneCount / weekCells.length,
          total_cells: weekCells.length
        });
      }

      return {
        logigramme_id: log.id,
        label: `${log.filiere.name} — ${log.classe.label}`,
        weekly_completion
      };
    });

    res.json({ weeks, rows: heatmapRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logigramme/list
router.get('/list', async (req, res) => {
  let { year_id, filiere_id, classe_id, formateur_id } = req.query;

  try {
    // Determine year
    if (!year_id) {
      const currentYearId = await getCurrentYearId();
      if (currentYearId) year_id = currentYearId;
    }

    // Build base query for logigrammes
    let query = supabaseAdmin
    .from('logigrammes')
    .select(`
    id,
    auto_complete,
    filiere:filieres (id, code, name, niveau),
            classe:classes (id, label, annee),
            academic_year:academic_years (id, label)
            `);

    if (year_id) query = query.eq('academic_year_id', year_id);
    if (filiere_id) query = query.eq('filiere_id', filiere_id);
    if (classe_id) query = query.eq('classe_id', classe_id);

    const { data: logigrammes, error: listError } = await query;
    if (listError) throw listError;

    if (!logigrammes || logigrammes.length === 0) {
      return res.json([]);
    }

    // If formateur filter is applied, filter logigrammes that have at least one unit with that formateur
    let filteredLogigrammes = logigrammes;
    if (formateur_id) {
      const logIds = logigrammes.map(l => l.id);
      const { data: units, error: unitsError } = await supabaseAdmin
      .from('unites_formation')
      .select('logigramme_id')
      .eq('formateur_id', formateur_id)
      .in('logigramme_id', logIds);
      if (unitsError) throw unitsError;
      const matchingLogIds = new Set(units.map(u => u.logigramme_id));
      filteredLogigrammes = logigrammes.filter(l => matchingLogIds.has(l.id));
    }

    // For each logigramme, compute aggregations
    const enrichedLogigrammes = await Promise.all(filteredLogigrammes.map(async (log) => {
      // Get units for this logigramme
      const { data: units, error: unitsError } = await supabaseAdmin
      .from('unites_formation')
      .select(`
      id,
      vhg,
      cells:week_cells (
        id,
        cell_type,
        heures,
        completion:completions (status)
      )
      `)
      .eq('logigramme_id', log.id);

      if (unitsError) {
        console.error(unitsError);
        return { ...log, total_unites: 0, vhg_total: 0, vh_realise: 0, taux: 0 };
      }

      const total_unites = units.length;
      const vhg_total = units.reduce((sum, u) => sum + (u.vhg || 0), 0);

      let vh_realise = 0;
      for (const unit of units) {
        const cells = unit.cells || [];
        for (const cell of cells) {
          if (cell.cell_type === 'normal') {
            const status = cell.completion?.[0]?.status;
            if (status === 'done' || status === 'auto_done') {
              vh_realise += parseFloat(cell.heures) || 0;
            }
          }
        }
      }

      const taux = vhg_total > 0 ? vh_realise / vhg_total : 0;

      return {
        ...log,
        total_unites,
        vhg_total,
        vh_realise,
        taux
      };
    }));

    res.json(enrichedLogigrammes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logigramme/:id (unchanged, but ensure it works)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch Logigramme Meta
    const { data: logigramme, error: logError } = await supabaseAdmin
    .from('logigrammes')
    .select(`
    id,
    auto_complete,
    filiere:filieres (*),
            classe:classes (*),
            academic_year:academic_years (*)
            `)
    .eq('id', id)
    .single();

    if (logError) throw logError;

    // 2. Fetch Weeks for this year
    const { data: weeks, error: weeksError } = await supabaseAdmin
    .from('year_weeks')
    .select('*')
    .eq('academic_year_id', logigramme.academic_year.id)
    .order('semaine');

    if (weeksError) throw weeksError;

    // 3. Fetch Unites and Cells (Sparse)
    const { data: unites, error: unitesError } = await supabaseAdmin
    .from('unites_formation')
    .select(`
    *,
    formateur:formateurs (*),
      cells:week_cells (
        id,
        semaine,
        cell_type,
        heures,
        completion:completions (status)
      )
      `)
    .eq('logigramme_id', id)
    .order('ordre');

    if (unitesError) throw unitesError;

    // Flatten completion status and add calculations
    const processedUnites = unites.map(u => {
      const processedCells = u.cells.map(c => ({
        ...c,
        completion_status: c.completion?.[0]?.status || 'pending'
      }));

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
      ...logigramme,
      weeks,
      unites: processedUnites
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/logigramme/:id/auto-complete (unchanged)
router.put('/:id/auto-complete', async (req, res) => {
  const { id } = req.params;
  const { auto_complete } = req.body;

  try {
    const { data, error } = await supabaseAdmin
    .from('logigrammes')
    .update({ auto_complete })
    .eq('id', id)
    .select()
    .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
