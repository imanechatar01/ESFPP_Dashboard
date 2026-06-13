// backend/routes/logigrammes.js
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

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

// POST /api/logigramme/import
router.post('/import', upload.single('file'), async (req, res) => {
  const { academic_year_id } = req.body;
  const file = req.file;

  if (!academic_year_id) {
    if (file) fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'academic_year_id est requis.' });
  }

  if (!file) {
    return res.status(400).json({ error: 'Aucun fichier téléchargé.' });
  }

  const filePath = file.path;

  try {
    // 1. Get sheet names from Python parser
    const pythonScriptPath = path.join(__dirname, '../scripts/parse_xls.py');
    const sheetsResult = spawnSync('python3', [
      pythonScriptPath,
      '--file', filePath,
      '--list-sheets'
    ]);

    if (sheetsResult.error || sheetsResult.status !== 0) {
      const errorMsg = sheetsResult.stderr ? sheetsResult.stderr.toString() : 'Impossible de lister les feuilles.';
      throw new Error(errorMsg);
    }

    const sheets = JSON.parse(sheetsResult.stdout.toString());
    const importedLogs = [];

    // 2. Fetch academic year details
    const { data: yearData, error: yearError } = await supabaseAdmin
      .from('academic_years')
      .select('*')
      .eq('id', academic_year_id)
      .single();

    if (yearError || !yearData) {
      throw new Error(`Année académique introuvable : ${yearError?.message || 'inconnue'}`);
    }

    // 3. Process each sheet (excluding Feuil1)
    for (const sheetName of sheets) {
      if (sheetName === 'Feuil1') continue;

      // Run Python parser for the sheet
      const dataResult = spawnSync('python3', [
        pythonScriptPath,
        '--file', filePath,
        '--sheet', sheetName
      ]);

      if (dataResult.error || dataResult.status !== 0) {
        console.error(`Error parsing sheet ${sheetName}:`, dataResult.stderr?.toString());
        continue;
      }

      const data = JSON.parse(dataResult.stdout.toString());
      const { metadata, unites, weeks } = data;

      if (!metadata.filiere || !metadata.classe) {
        console.warn(`Skipping sheet ${sheetName} due to missing filiere or classe metadata`);
        continue;
      }

      // a. Upsert Filière
      const filiereName = metadata.filiere.trim();
      const FILIERE_CODES = {
        'aide-soignant': 'AS',
        'aide soignant': 'AS',
        'infirmier en réanimation': 'REA',
        'infirmier en reanimation': 'REA',
        'infirmier anesthésiste': 'IA',
        'infirmier anesthesiste': 'IA',
        'infirmier auxiliaire': 'IA',
        'infirmier polyvalent': 'IP',
        'radiologie': 'RADIO',
      };
      const filiereCode = FILIERE_CODES[filiereName.toLowerCase()] || filiereName.substring(0, 5).toUpperCase().trim();
      
      const { data: filData, error: filError } = await supabaseAdmin
        .from('filieres')
        .upsert({ 
          code: filiereCode, 
          name: filiereName, 
          niveau: metadata.niveau.trim() || 'QUALIFICATION'
        }, { onConflict: 'code' })
        .select()
        .single();

      if (filError) throw filError;
      const filiereId = filData.id;

      // b. Upsert Classe
      let annee = 1;
      if (metadata.classe.includes('2')) annee = 2;
      if (metadata.classe.includes('3')) annee = 3;

      const { data: clData, error: clError } = await supabaseAdmin
        .from('classes')
        .upsert({
          filiere_id: filiereId,
          label: metadata.classe,
          annee: annee
        }, { onConflict: 'filiere_id, annee' })
        .select()
        .single();

      if (clError) throw clError;
      const classeId = clData.id;

      // c. Upsert Logigramme
      const { data: logData, error: logError } = await supabaseAdmin
        .from('logigrammes')
        .upsert({
          filiere_id: filiereId,
          classe_id: classeId,
          academic_year_id: academic_year_id
        }, { onConflict: 'filiere_id, classe_id, academic_year_id' })
        .select()
        .single();

      if (logError) throw logError;
      const logigrammeId = logData.id;

      // d. Insert year_weeks (once per year/week)
      const weekDateMap = {};
      for (let i = 0; i < weeks.length; i++) {
        const weekDate = weeks[i];
        if (!weekDate) continue;
        
        const dateObj = new Date(weekDate);
        const mois = dateObj.toLocaleString('fr-FR', { month: 'long' });
        const semestre = (i + 1) <= 26 ? 1 : 2;

        const { data: ywData, error: ywError } = await supabaseAdmin
          .from('year_weeks')
          .upsert({
            academic_year_id: academic_year_id,
            semaine: i + 1,
            week_start_date: weekDate,
            mois: mois.charAt(0).toUpperCase() + mois.slice(1),
            semestre: semestre
          }, { onConflict: 'academic_year_id, semaine' })
          .select()
          .single();
        
        if (ywError) throw ywError;
        weekDateMap[i + 1] = weekDate;
      }

      // e. Process Unités and Cells
      for (const unit of unites) {
        let formateurId = null;
        if (unit.formateur) {
          // Find or create formateur
          const { data: existingF, error: sError } = await supabaseAdmin
            .from('formateurs')
            .select('id')
            .eq('nom', unit.formateur)
            .maybeSingle();
          
          if (existingF) {
            formateurId = existingF.id;
          } else {
            const { data: newF, error: iError } = await supabaseAdmin
              .from('formateurs')
              .insert({ nom: unit.formateur })
              .select()
              .single();
            
            if (iError) {
              console.error(`Error inserting formateur "${unit.formateur}":`, iError);
            } else {
              formateurId = newF.id;
            }
          }
        }

        // Upsert Unit
        const { data: uData, error: uError } = await supabaseAdmin
          .from('unites_formation')
          .upsert({
            logigramme_id: logigrammeId,
            ordre: unit.ordre,
            nom: unit.nom,
            formateur_id: formateurId,
            vhg: unit.vhg
          }, { onConflict: 'logigramme_id, ordre' })
          .select()
          .single();

        if (uError) throw uError;
        const uniteId = uData.id;

        // Insert Cells
        if (unit.cells && unit.cells.length > 0) {
          const cellInserts = unit.cells.map(c => ({
            unite_id: uniteId,
            semaine: c.week,
            week_start_date: weekDateMap[c.week],
            cell_type: c.type,
            heures: c.value
          })).filter(c => c.week_start_date); // Safety check

          if (cellInserts.length > 0) {
            const { error: cellError } = await supabaseAdmin
              .from('week_cells')
              .upsert(cellInserts, { onConflict: 'unite_id, semaine' });
            if (cellError) throw cellError;
          }
        }
      }

      importedLogs.push({
        sheetName,
        filiere: filiereName,
        classe: metadata.classe,
        unitsCount: unites.length
      });
    }

    res.json({
      success: true,
      message: `Importation réussie de ${importedLogs.length} programmes.`,
      importedLogs
    });

  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    // Always clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

export default router;
