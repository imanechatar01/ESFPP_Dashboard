import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

// GET /api/years
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/years
router.post('/', async (req, res) => {
  const { label, start_date, clone_from_year_id } = req.body;

  try {
    // 1. Calculate end date (roughly 1 year minus 1 day)
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(startDateObj);
    endDateObj.setFullYear(endDateObj.getFullYear() + 1);
    endDateObj.setDate(endDateObj.getDate() - 1);
    const end_date = endDateObj.toISOString().split('T')[0];

    // 2. Create Academic Year
    const { data: newYear, error: yearError } = await supabaseAdmin
      .from('academic_years')
      .insert({ label, start_date, end_date })
      .select()
      .single();

    if (yearError) throw yearError;

    // 3. Generate year_weeks
    const weeks = [];
    let currentMonday = new Date(start_date);
    // Adjust to nearest Monday if not already
    const day = currentMonday.getDay();
    const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
    currentMonday.setDate(diff);

    for (let i = 1; i <= 52; i++) {
        const weekDate = currentMonday.toISOString().split('T')[0];
        const mois = currentMonday.toLocaleString('fr-FR', { month: 'long' });
        weeks.push({
            academic_year_id: newYear.id,
            semaine: i,
            week_start_date: weekDate,
            mois: mois.charAt(0).toUpperCase() + mois.slice(1),
            semestre: i <= 26 ? 1 : 2
        });
        currentMonday.setDate(currentMonday.getDate() + 7);
    }
    
    await supabaseAdmin.from('year_weeks').insert(weeks);
    const dateMap = Object.fromEntries(weeks.map(w => [w.semaine, w.week_start_date]));

    // 4. Clone from year if requested
    if (clone_from_year_id) {
        console.log(`Cloning from ${clone_from_year_id} to ${newYear.id}...`);
        
        // a. Fetch source logigrammes
        const { data: srcLogs } = await supabaseAdmin
            .from('logigrammes')
            .select('*')
            .eq('academic_year_id', clone_from_year_id);
        
        if (srcLogs && srcLogs.length > 0) {
            for (const sLog of srcLogs) {
                // i. Insert new logigramme
                const { data: nLog, error: nLogError } = await supabaseAdmin
                    .from('logigrammes')
                    .insert({
                        filiere_id: sLog.filiere_id,
                        classe_id: sLog.classe_id,
                        academic_year_id: newYear.id,
                        auto_complete: sLog.auto_complete
                    })
                    .select()
                    .single();
                
                if (nLogError) {
                    console.error(`Error cloning logigramme: ${nLogError.message}`);
                    continue;
                }

                // ii. Fetch and clone units
                const { data: srcUnites } = await supabaseAdmin
                    .from('unites_formation')
                    .select('*')
                    .eq('logigramme_id', sLog.id);
                
                if (srcUnites && srcUnites.length > 0) {
                    for (const sUnite of srcUnites) {
                        const { data: nUnite, error: nUniteError } = await supabaseAdmin
                            .from('unites_formation')
                            .insert({
                                logigramme_id: nLog.id,
                                ordre: sUnite.ordre,
                                nom: sUnite.nom,
                                formateur_id: sUnite.formateur_id,
                                vhg: sUnite.vhg
                            })
                            .select()
                            .single();
                        
                        if (nUniteError) {
                            console.error(`Error cloning unite: ${nUniteError.message}`);
                            continue;
                        }

                        // iii. Fetch and clone cells
                        const { data: srcCells } = await supabaseAdmin
                            .from('week_cells')
                            .select('*')
                            .eq('unite_id', sUnite.id);
                        
                        if (srcCells && srcCells.length > 0) {
                            const nCells = srcCells.map(c => ({
                                unite_id: nUnite.id,
                                semaine: c.semaine,
                                week_start_date: dateMap[c.semaine],
                                cell_type: c.cell_type,
                                heures: c.heures
                            })).filter(c => c.week_start_date); // Safety check

                            if (nCells.length > 0) {
                                const { error: nCellsError } = await supabaseAdmin
                                    .from('week_cells')
                                    .insert(nCells);
                                if (nCellsError) console.error(`Error cloning cells: ${nCellsError.message}`);
                            }
                        }
                    }
                }
            }
        }
        console.log(`Cloning completed for ${newYear.id}`);
    }

    res.status(201).json(newYear);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/years/:id/set-current
router.put('/:id/set-current', async (req, res) => {
    const { id } = req.params;
    try {
        // Supabase trigger or manual unsetting
        await supabaseAdmin.from('academic_years').update({ is_current: false }).neq('id', id);
        const { data, error } = await supabaseAdmin.from('academic_years').update({ is_current: true }).eq('id', id).select().single();
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/years/:id/weeks
router.get('/:id/weeks', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('year_weeks')
      .select('*')
      .eq('academic_year_id', id)
      .order('semaine');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
