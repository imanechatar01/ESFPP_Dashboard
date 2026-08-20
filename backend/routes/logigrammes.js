// backend/routes/logigrammes.js
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(path.join(__dirname, '../uploads/'));
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

/**
 * Safely delete a file only if it is located inside the allowed uploadDir.
 * Prevents path-traversal attacks where user-controlled input could resolve
 * to an arbitrary path outside the uploads folder.
 * @param {string} filePath - Path to delete (typically req.file.path from multer)
 */
function safeUnlink(filePath) {
  if (!filePath) return;
  
  // 1. Extraction du nom de fichier pur (supprime tout répertoire ou segment ../)
  const safeName = path.basename(filePath);
  
  // 2. Re-construction sécurisée dans le répertoire de base (uploadDir)
  const resolved = path.join(uploadDir, safeName);
  
  // 3. Vérification de sécurité
  const finalPath = path.resolve(resolved);
  if (!finalPath.startsWith(uploadDir + path.sep) && finalPath !== uploadDir) {
    console.error('[security] Blocked attempt to delete file outside uploadDir:', finalPath);
    return;
  }
  
  try {
    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
  } catch (e) {
    console.error('[cleanup] Failed to delete temp file:', String(finalPath), '-', String(e.message));
  }
}

const router = express.Router();

async function getYearWeekDateMap(academicYearId) {
  const { data, error } = await supabaseAdmin
    .from('year_weeks')
    .select('semaine, week_start_date')
    .eq('academic_year_id', academicYearId);

  if (error) throw error;

  return Object.fromEntries((data || []).map(w => [w.semaine, w.week_start_date]));
}

// ============================================================
// ISO 8601 Week → Monday calculator
// Returns the date of the Monday of ISO week `weekNum` in `year`.
// Based on ISO 8601: week 1 is the week containing the first Thursday.
// This is exact — not an approximation.
// ============================================================
export function isoWeekMonday(year, weekNum) {
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  // Day of week: 0=Sun, 1=Mon, ..., 6=Sat. ISO: 1=Mon, 7=Sun.
  const jan4DayOfWeek = jan4.getUTCDay() || 7; // Convert Sunday(0) to 7
  // Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4DayOfWeek - 1));
  // Monday of weekNum
  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (weekNum - 1) * 7);
  return targetMonday.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getFirstMondayOfSeptember(year) {
  const d = new Date(Date.UTC(year, 8, 1)).getUTCDay();
  const day = d === 1 ? 1 : (d === 0 ? 2 : 1 + (8 - d));
  const dayStr = String(day).padStart(2, '0');
  return `${year}-09-${dayStr}`;
}

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

function calculateUnitMetrics(unit) {
  const cells = unit?.cells || [];
  const plannedHours = cells
    .filter(c => c.cell_type === 'normal')
    .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);

  const effectiveVhg = plannedHours > 0 ? plannedHours : (parseFloat(unit?.vhg) || 0);
  const vh_realise = cells
    .filter(c => c.cell_type === 'normal' && (c.completion_status === 'done' || c.completion_status === 'auto_done'))
    .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);

  return {
    ...unit,
    vhg: effectiveVhg,
    vh_realise,
    vh_restant: effectiveVhg - vh_realise,
    taux: effectiveVhg > 0 ? vh_realise / effectiveVhg : 0,
  };
}

// GET /api/logigramme/kpis
router.get('/kpis', async (req, res) => {
  let { year_id, filiere_id, formateur_id, classe_id, niveau_id } = req.query;

  try {
    if (!year_id) {
      const currentYearId = await getCurrentYearId();
      if (currentYearId) year_id = currentYearId;
    }

    // 1. Get Logigramme IDs
    let logQuery = supabaseAdmin
      .from('logigrammes')
      .select('id, filiere:filieres(niveau)');
    if (year_id) logQuery = logQuery.eq('academic_year_id', year_id);
    if (filiere_id) logQuery = logQuery.eq('filiere_id', filiere_id);
    if (classe_id) logQuery = logQuery.eq('classe_id', classe_id);

    const { data: logs, error: logsError } = await logQuery;
    if (logsError) throw logsError;

    // Filter by niveau if provided (niveau is a property of filiere)
    const filteredLogs = niveau_id
      ? logs.filter(l => l.filiere?.niveau === niveau_id)
      : logs;

    const logIds = filteredLogs.map(l => l.id);
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
          week_start_date,
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
    const today = new Date().toISOString().split('T')[0];

    for (const unit of units) {
      uniqueLogIds.add(unit.logigramme_id);
      if (unit.formateur_id) uniqueFormateurIds.add(unit.formateur_id);

      const metricUnit = calculateUnitMetrics(unit);
      totalVhg += metricUnit.vhg;

      const cells = metricUnit.cells || [];
      for (const cell of cells) {
        if (cell.cell_type === 'normal') {
          let status = cell.completion?.status;
          // Only auto-done if there is NO explicit DB completion row
          if (!cell.completion && cell.week_start_date && cell.week_start_date < today) {
            status = 'auto_done';
          }
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
      taux_global: totalVhg > 0 ? totalRealise / totalVhg : 0,
      total_realise: totalRealise,
      total_vhg: totalVhg
    });
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
    const today = new Date().toISOString().split('T')[0];
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
            week_start_date,
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
            let status = cell.completion?.status;
            // Only auto-done if there is NO explicit DB completion row
            if (!cell.completion && cell.week_start_date && cell.week_start_date < today) {
              status = 'auto_done';
            }
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

// GET /api/logigramme/:id
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
          week_start_date,
          completion:completions (status)
        )
      `)
      .eq('logigramme_id', id)
      .order('ordre');

    if (unitesError) throw unitesError;

    // Flatten completion status and add calculations
    const today = new Date().toISOString().split('T')[0];
    const processedUnites = unites.map(u => {
      const processedCells = u.cells.map(c => {
        let status = c.completion?.status || 'pending';
        // Only auto-done if there is NO explicit completion row in the DB.
        // If the admin explicitly set status to 'pending' (un-toggle), respect it.
        if (!c.completion && c.week_start_date && c.week_start_date < today) {
          status = 'auto_done';
        }
        return {
          ...c,
          completion_status: status
        };
      });

      const metricUnit = calculateUnitMetrics({ ...u, cells: processedCells });

      return {
        ...metricUnit,
        cells: processedCells,
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

// PUT /api/logigramme/:id/auto-complete
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

// POST /api/logigramme/duplicate-year
// Duplicate all logigrammes from a source academic year to a target academic year.
// - The target year MUST already exist (with its year_weeks).
// - Dates are recalculated using ISO 8601 exact week → Monday mapping.
// - No completion data is ever copied (auto-mark re-applies based on new dates vs today).
// - Source year data is NEVER modified.
router.post('/duplicate-year', async (req, res) => {
  const { source_year_id, target_year_id, target_year_label, logigramme_ids } = req.body;

  if (!source_year_id || (!target_year_id && !target_year_label)) {
    return res.status(400).json({ error: 'source_year_id et (target_year_id ou target_year_label) sont requis.' });
  }

  if (logigramme_ids !== undefined && Array.isArray(logigramme_ids) && logigramme_ids.length === 0) {
    return res.status(400).json({ error: 'Aucun programme sélectionné pour la duplication.' });
  }

  try {
    // 1. Verify source year exists
    const { data: sourceYear, error: srcError } = await supabaseAdmin
      .from('academic_years')
      .select('id, label')
      .eq('id', source_year_id)
      .single();
    if (srcError || !sourceYear) {
      return res.status(404).json({ error: 'Année source introuvable.' });
    }

    // Resolve target year
    let targetYear = null;

    if (target_year_id) {
      const { data } = await supabaseAdmin
        .from('academic_years')
        .select('id, label')
        .eq('id', target_year_id)
        .maybeSingle();
      if (data) targetYear = data;
    }

    if (!targetYear && target_year_label) {
      // Check if target year already exists by label
      const { data: existing } = await supabaseAdmin
        .from('academic_years')
        .select('id, label')
        .eq('label', target_year_label)
        .maybeSingle();

      if (existing) {
        targetYear = existing;
      } else {
        // Create the new target academic year
        const startYear = parseInt(target_year_label.split('-')[0], 10);
        if (isNaN(startYear)) {
          return res.status(400).json({ error: `Label d'année cible invalide : "${target_year_label}". Format attendu: "YYYY-YYYY".` });
        }
        const start_date = getFirstMondayOfSeptember(startYear);
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(startDateObj);
        endDateObj.setFullYear(endDateObj.getFullYear() + 1);
        endDateObj.setDate(endDateObj.getDate() - 1);
        const end_date = endDateObj.toISOString().split('T')[0];

        const { data: newYear, error: createError } = await supabaseAdmin
          .from('academic_years')
          .insert({ label: target_year_label, start_date, end_date })
          .select()
          .single();

        if (createError) throw createError;
        targetYear = newYear;
        console.log(`[duplicate-year] Auto-created new target academic year "${target_year_label}" (${targetYear.id})`);
      }
    }

    if (!targetYear) {
      return res.status(404).json({ error: 'Année cible introuvable.' });
    }

    if (sourceYear.id === targetYear.id) {
      return res.status(400).json({ error: 'L\'année source et l\'année cible doivent être différentes.' });
    }

    // 2. Verify target year has no logigrammes yet (idempotency guard)
    const { data: existingLogs, error: existingError } = await supabaseAdmin
      .from('logigrammes')
      .select('id')
      .eq('academic_year_id', target_year_id);
    if (existingError) throw existingError;
    if (existingLogs && existingLogs.length > 0) {
      return res.status(409).json({
        error: `L'année cible "${targetYear.label}" contient déjà ${existingLogs.length} logigramme(s). Supprimez-les d'abord ou choisissez une année vide.`
      });
    }

    // 3. Build ISO 8601 week → Monday date map for target year
    // Extract the target year number from the label (e.g. "2026-2027" → 2026)
    const targetYearNumber = parseInt((targetYear.label || '').split('-')[0], 10);
    if (isNaN(targetYearNumber)) {
      return res.status(400).json({ error: `Impossible d'extraire l'année cible depuis le label "${targetYear.label}". Format attendu: "YYYY-YYYY".` });
    }

    // Get source year_weeks to know which semaine numbers exist
    const { data: srcWeeks, error: srcWeeksError } = await supabaseAdmin
      .from('year_weeks')
      .select('semaine, mois, semestre')
      .eq('academic_year_id', source_year_id)
      .order('semaine');
    if (srcWeeksError) throw srcWeeksError;

    if (!srcWeeks || srcWeeks.length === 0) {
      return res.status(400).json({ error: 'L\'année source n\'a aucune semaine configurée (year_weeks vide).' });
    }

    // Check if target year already has year_weeks
    const { data: tgtExistingWeeks, error: tgtWeeksCheckError } = await supabaseAdmin
      .from('year_weeks')
      .select('semaine, week_start_date')
      .eq('academic_year_id', target_year_id);
    if (tgtWeeksCheckError) throw tgtWeeksCheckError;

    // Build the date map for target year using ISO 8601 exact calculation
    const targetDateMap = {};

    if (tgtExistingWeeks && tgtExistingWeeks.length > 0) {
      // Use existing year_weeks if already populated
      for (const w of tgtExistingWeeks) {
        targetDateMap[w.semaine] = w.week_start_date;
      }
      console.log(`[duplicate-year] Using ${tgtExistingWeeks.length} existing year_weeks for "${targetYear.label}"`);
    } else {
      // Generate year_weeks using ISO 8601 exact calculation
      const weekInserts = [];
      for (const srcWeek of srcWeeks) {
        const { semaine, mois, semestre } = srcWeek;
        // Determine if the week belongs to the next calendar year
        // Academic year "2026-2027" starts in 2026 → weeks 1-12 may be in 2027
        // Rule: semaines 1..~35 belong to targetYearNumber, ~36..52 to targetYearNumber+1
        // We try targetYearNumber first, then targetYearNumber+1 for high week numbers
        // This is a heuristic; we refine below by checking actual ISO week year
        let weekYear = targetYearNumber;
        // For weeks 37-52, they likely fall in the first year of the label
        // For weeks 1-36, they likely fall in the second year
        // Academic year: e.g. "2026-2027" → weeks 37+ are in 2026, weeks 1-36 are in 2027
        if (semaine <= 36) {
          weekYear = targetYearNumber + 1;
        }
        const monday = isoWeekMonday(weekYear, semaine);
        targetDateMap[semaine] = monday;

        const moisStr = new Date(monday + 'T00:00:00Z').toLocaleString('fr-FR', { month: 'long', timeZone: 'UTC' });
        weekInserts.push({
          academic_year_id: target_year_id,
          semaine,
          week_start_date: monday,
          mois: moisStr.charAt(0).toUpperCase() + moisStr.slice(1),
          semestre
        });
      }

      // Insert the year_weeks for the target year
      const { error: weekInsertError } = await supabaseAdmin
        .from('year_weeks')
        .upsert(weekInserts, { onConflict: 'academic_year_id, semaine' });
      if (weekInsertError) throw weekInsertError;
      console.log(`[duplicate-year] Generated ${weekInserts.length} year_weeks for "${targetYear.label}" using ISO 8601`);
    }

    // 4. Fetch all source logigrammes with their units and cells
    let query = supabaseAdmin
      .from('logigrammes')
      .select('id, filiere_id, classe_id, auto_complete')
      .eq('academic_year_id', source_year_id);
      
    if (logigramme_ids && Array.isArray(logigramme_ids) && logigramme_ids.length > 0) {
      query = query.in('id', logigramme_ids);
    }

    const { data: srcLogigrammes, error: srcLogsError } = await query;
    if (srcLogsError) throw srcLogsError;

    if (!srcLogigrammes || srcLogigrammes.length === 0) {
      return res.status(404).json({ error: `Aucun logigramme trouvé pour l'année source "${sourceYear.label}".` });
    }

    const results = { logigrammes: 0, unites: 0, cells: 0, skipped_cells: 0 };

    // 5. Clone each logigramme
    for (const srcLog of srcLogigrammes) {
      // 5a. Insert new logigramme (no completion data)
      const { data: newLog, error: newLogError } = await supabaseAdmin
        .from('logigrammes')
        .insert({
          filiere_id: srcLog.filiere_id,
          classe_id: srcLog.classe_id,
          academic_year_id: target_year_id,
          auto_complete: srcLog.auto_complete
          // NOTE: completions are NOT copied — auto-mark re-applies via date comparison
        })
        .select()
        .single();

      if (newLogError) {
        console.error(`[duplicate-year] Error cloning logigramme ${srcLog.id}:`, newLogError.message);
        continue;
      }
      results.logigrammes++;

      // 5b. Fetch source units
      const { data: srcUnites, error: srcUnitesError } = await supabaseAdmin
        .from('unites_formation')
        .select('id, ordre, nom, formateur_id, vhg')
        .eq('logigramme_id', srcLog.id)
        .order('ordre');
      if (srcUnitesError) {
        console.error(`[duplicate-year] Error fetching units for logigramme ${srcLog.id}:`, srcUnitesError.message);
        continue;
      }
      if (!srcUnites || srcUnites.length === 0) continue;

      // 5c. Clone each unit
      for (const srcUnite of srcUnites) {
        const { data: newUnite, error: newUniteError } = await supabaseAdmin
          .from('unites_formation')
          .insert({
            logigramme_id: newLog.id,
            ordre: srcUnite.ordre,
            nom: srcUnite.nom,
            formateur_id: srcUnite.formateur_id,
            vhg: srcUnite.vhg
          })
          .select()
          .single();

        if (newUniteError) {
          console.error(`[duplicate-year] Error cloning unite ${srcUnite.id}:`, newUniteError.message);
          continue;
        }
        results.unites++;

        // 5d. Fetch source cells (no completions — they live in a separate table)
        const { data: srcCells, error: srcCellsError } = await supabaseAdmin
          .from('week_cells')
          .select('semaine, cell_type, heures')
          // NOTE: We explicitly do NOT select 'completion' — completions are separate
          .eq('unite_id', srcUnite.id);

        if (srcCellsError) {
          console.error(`[duplicate-year] Error fetching cells for unite ${srcUnite.id}:`, srcCellsError.message);
          continue;
        }
        if (!srcCells || srcCells.length === 0) continue;

        // 5e. Build new cells with ISO 8601 recalculated dates (no done status copied)
        const newCells = srcCells
          .map(c => {
            const newDate = targetDateMap[c.semaine];
            if (!newDate) return null; // Skip if week doesn't exist in target year
            return {
              unite_id: newUnite.id,
              semaine: c.semaine,
              week_start_date: newDate,   // ISO 8601 exact Monday
              cell_type: c.cell_type,
              heures: c.heures
              // Intentionally NOT setting completion — auto-mark handles it at read time
            };
          })
          .filter(Boolean);

        results.skipped_cells += srcCells.length - newCells.length;

        if (newCells.length > 0) {
          const { error: cellInsertError } = await supabaseAdmin
            .from('week_cells')
            .insert(newCells);
          if (cellInsertError) {
            console.error(`[duplicate-year] Error inserting cells for unite ${newUnite.id}:`, cellInsertError.message);
          } else {
            results.cells += newCells.length;
          }
        }
      }
    }

    console.log(
      `[duplicate-year] Completed: "${sourceYear.label}" → "${targetYear.label}" | ` +
      `${results.logigrammes} logigrammes, ${results.unites} unités, ${results.cells} cellules` +
      (results.skipped_cells > 0 ? `, ${results.skipped_cells} cellules ignorées (semaine sans date)` : '')
    );

    res.status(201).json({
      success: true,
      source: sourceYear.label,
      target: targetYear.label,
      ...results
    });

  } catch (err) {
    console.error('[duplicate-year] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logigramme/week/action — Grouped action on an entire week
router.post('/week/action', async (req, res) => {
  const { logigramme_id, semaine, action } = req.body;
  const userId = req.user.id;

  if (!logigramme_id || !semaine || !action) {
    return res.status(400).json({ error: 'logigramme_id, semaine, et action sont requis.' });
  }

  try {
    // 1. Find all units for this logigramme
    const { data: unites, error: unitesError } = await supabaseAdmin
      .from('unites_formation')
      .select('id')
      .eq('logigramme_id', logigramme_id);

    if (unitesError) throw unitesError;
    const uniteIds = (unites || []).map(u => u.id);

    if (uniteIds.length === 0) {
      return res.json({ updated: 0, deleted: 0 });
    }

    if (action === 'mark_done') {
      // Find all normal cells for this week/program
      const { data: cells, error: cellsError } = await supabaseAdmin
        .from('week_cells')
        .select('id')
        .eq('semaine', semaine)
        .eq('cell_type', 'normal')
        .in('unite_id', uniteIds);

      if (cellsError) throw cellsError;
      if (!cells || cells.length === 0) {
        return res.json({ updated: 0, deleted: 0 });
      }

      const cellIds = cells.map(c => c.id);
      const completionInserts = cellIds.map(id => ({
        cell_id: id,
        status: 'done',
        updated_by: userId,
        updated_at: new Date().toISOString()
      }));

      const { error: upsertError } = await supabaseAdmin
        .from('completions')
        .upsert(completionInserts, { onConflict: 'cell_id' });

      if (upsertError) throw upsertError;
      console.log(`[logigramme] Marked ${cellIds.length} cells as done for logigramme=${logigramme_id}, semaine=${semaine}`);
      return res.json({ updated: cellIds.length, deleted: 0 });
    } else if (action === 'clear') {
      // Delete all cells (any type) for this week/program
      const { data: deletedCells, error: deleteError } = await supabaseAdmin
        .from('week_cells')
        .delete()
        .eq('semaine', semaine)
        .in('unite_id', uniteIds)
        .select('id');

      if (deleteError) throw deleteError;
      console.log(`[logigramme] Cleared ${(deletedCells || []).length} cells for logigramme=${logigramme_id}, semaine=${semaine}`);
      return res.json({ updated: 0, deleted: (deletedCells || []).length });
    } else {
      return res.status(400).json({ error: 'Action non reconnue. Utilisez "mark_done" ou "clear".' });
    }
  } catch (err) {
    console.error('[logigramme] Week action error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logigramme/cell — Create or update a single week_cell
router.post('/cell', async (req, res) => {
  const { unite_id, semaine, cell_type, heures } = req.body;

  if (!unite_id || !semaine) {
    return res.status(400).json({ error: 'unite_id et semaine sont requis.' });
  }

  try {
    const hasHeures = heures !== undefined && heures !== null && String(heures).trim() !== '';
    const numericHeures = hasHeures ? Number(heures) : null;
    const finalCellType = cell_type || 'normal';

    if (hasHeures && (!Number.isFinite(numericHeures) || numericHeures < 0)) {
      return res.status(400).json({ error: 'heures doit être un nombre positif ou nul.' });
    }

    // 1. Resolve academic_year_id via the unite's logigramme
    const { data: unite, error: uniteError } = await supabaseAdmin
      .from('unites_formation')
      .select('logigramme_id, logigramme:logigrammes (academic_year_id)')
      .eq('id', unite_id)
      .single();

    if (uniteError || !unite) {
      return res.status(404).json({ error: 'Unité introuvable.' });
    }

    const academicYearId = unite.logigramme.academic_year_id;

    // 2. Resolve week_start_date from year_weeks
    const { data: weekRow, error: weekError } = await supabaseAdmin
      .from('year_weeks')
      .select('week_start_date')
      .eq('academic_year_id', academicYearId)
      .eq('semaine', semaine)
      .single();

    if (weekError || !weekRow) {
      return res.status(404).json({ error: `Semaine ${semaine} introuvable pour cette année académique.` });
    }

    const shouldDelete = finalCellType === 'empty' || (finalCellType === 'normal' && !hasHeures);

    if (shouldDelete) {
      const { data: deletedCell, error: deleteError } = await supabaseAdmin
        .from('week_cells')
        .delete()
        .eq('unite_id', unite_id)
        .eq('semaine', semaine)
        .select()
        .single();

      if (deleteError && deleteError.code !== 'PGRST116') throw deleteError;

      console.log(`[logigramme] Deleted cell: unite=${unite_id}, semaine=${semaine}`);
      return res.json({ success: true, deleted: !!deletedCell });
    }

    // 3. Upsert into week_cells
    const { data: cell, error: cellError } = await supabaseAdmin
      .from('week_cells')
      .upsert({
        unite_id,
        semaine,
        cell_type: finalCellType,
        heures: numericHeures,
        week_start_date: weekRow.week_start_date
      }, { onConflict: 'unite_id, semaine' })
      .select()
      .single();

    if (cellError) throw cellError;

    console.log(`[logigramme] Upserted cell: unite=${unite_id}, semaine=${semaine}, type=${finalCellType}, heures=${numericHeures}`);
    res.json(cell);
  } catch (err) {
    console.error('[logigramme] Cell upsert error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logigramme/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: existing, error: findError } = await supabaseAdmin
      .from('logigrammes')
      .select('id, filiere:filieres(name), classe:classes(label)')
      .eq('id', id)
      .single();

    if (findError) throw findError;
    if (!existing) return res.status(404).json({ error: 'Logigramme introuvable.' });

    // CASCADE handles unites_formation → week_cells → completions automatically
    const { error: deleteError } = await supabaseAdmin
      .from('logigrammes')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    console.log(`[logigramme] Deleted logigramme ${id} (${existing.filiere?.name} — ${existing.classe?.label})`);
    res.status(200).json({ success: true, deleted: existing });
  } catch (err) {
    console.error('[logigramme] Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/logigramme/:id/unites — Batch update unités (nom, vhg, formateur_id)
router.put('/:id/unites', async (req, res) => {
  const { id } = req.params;
  const { unites } = req.body;

  if (!Array.isArray(unites) || unites.length === 0) {
    return res.status(400).json({ error: 'Le champ "unites" est requis (tableau non vide).' });
  }

  try {
    const { data: existing, error: findError } = await supabaseAdmin
      .from('logigrammes')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({ error: 'Logigramme introuvable.' });
    }

    const results = [];
    for (const unit of unites) {
      if (!unit.id) continue;

      const updatePayload = {};
      if (unit.nom !== undefined) updatePayload.nom = unit.nom;
      if (unit.vhg !== undefined) updatePayload.vhg = parseFloat(unit.vhg) || 0;
      if (unit.formateur_id !== undefined) updatePayload.formateur_id = unit.formateur_id || null;

      if (Object.keys(updatePayload).length === 0) continue;

      const { data, error } = await supabaseAdmin
        .from('unites_formation')
        .update(updatePayload)
        .eq('id', unit.id)
        .eq('logigramme_id', id)
        .select()
        .single();

      if (error) {
        // Pass unit.id as a plain argument — never interpolate user-controlled data as a format string
        console.error('[logigramme] Error updating unité', String(unit.id), ':', String(error.message));
      } else {
        // --- REDISTRIBUTION AUTOMATIQUE DU VHG ---
        if (unit.vhg !== undefined) {
          const newVhg = parseFloat(unit.vhg) || 0;
          
          const { data: existingCells, error: cellsError } = await supabaseAdmin
            .from('week_cells')
            .select('id, semaine')
            .eq('unite_id', unit.id)
            .eq('cell_type', 'normal');

          if (!cellsError && existingCells && existingCells.length > 0) {
            const numCells = existingCells.length;
            const baseHeures = Math.floor(newVhg / numCells);
            const remainder = newVhg % numCells;

            existingCells.sort((a, b) => a.semaine - b.semaine);

            for (let i = 0; i < numCells; i++) {
              const allocated = baseHeures + (i < remainder ? 1 : 0);
              await supabaseAdmin
                .from('week_cells')
                .update({ heures: allocated })
                .eq('id', existingCells[i].id);
            }
            console.log(`[logigramme] Redistributed ${newVhg}h across ${numCells} cells for unité ${unit.id}`);
          }
        }
        
        results.push(data);
      }
    }

    console.log(`[logigramme] Updated ${results.length}/${unites.length} unités for logigramme ${id}`);
    res.json({ success: true, updated: results.length });
  } catch (err) {
    console.error('[logigramme] Update unités error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rate limiting specifically for file uploads (import) to prevent DoS
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: { error: 'Trop de tentatives d\'importation. Veuillez réessayer dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/logigramme/import
router.post('/import', importLimiter, upload.single('file'), async (req, res) => {
  const { academic_year_id } = req.body;
  const replaceSchedule = req.body.replace_schedule === true || req.body.replace_schedule === 'true';
  const allowMerge = req.body.allow_merge === true || req.body.allow_merge === 'true';
  const file = req.file;

  if (!academic_year_id) {
    if (file) safeUnlink(file.path);
    return res.status(400).json({ error: 'academic_year_id est requis.' });
  }

  if (!file) {
    return res.status(400).json({ error: 'Aucun fichier téléchargé.' });
  }
  if (replaceSchedule && allowMerge) {
    if (file) safeUnlink(file.path);
    return res.status(400).json({ error: 'Utilisez soit replace_schedule=true soit allow_merge=true, pas les deux.' });
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

    if (sheetsResult.status !== 0 || !sheetsResult.stdout) {
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

    const canonicalWeekDateMap = await getYearWeekDateMap(academic_year_id);

    // 3. Process each sheet (excluding Feuil1)
    for (const sheetName of sheets) {
      if (sheetName === 'Feuil1') continue;

      // Run Python parser for the sheet
      const dataResult = spawnSync('python3', [
        pythonScriptPath,
        '--file', filePath,
        '--sheet', sheetName
      ]);

      if (dataResult.status !== 0 || !dataResult.stdout) {
        const errorMsg = dataResult.stderr ? dataResult.stderr.toString() : 'Erreur inconnue du parseur.';
        throw new Error(`Erreur parsing feuille "${sheetName}": ${errorMsg}`);
      }

      // Log Python parser diagnostics (goes to stderr)
      const pyStderr = dataResult.stderr?.toString().trim();
      if (pyStderr) {
        console.log(`[import] Python parser diagnostics for '${sheetName}':\n${pyStderr}`);
      }

      const data = JSON.parse(dataResult.stdout.toString());
      const { metadata, unites, weeks } = data;

      if (!metadata.filiere || !metadata.classe) {
        throw new Error(`Feuille "${sheetName}": filière ou classe manquante.`);
      }

      if (unites.length === 0) {
        throw new Error(`Feuille "${sheetName}": 0 unité détectée. Import annulé pour éviter une perte de données.`);
      }

      // a. Upsert Filière
      const filiereName = metadata.filiere.trim();
      const FILIERE_CODES = {
        'aide-soignant': 'AS',
        'aide soignant': 'AS',
        'infirmier en réanimation': 'REA',
        'infirmier en reanimation': 'REA',
        'infirmier anesthésiste': 'IAN',
        'infirmier anesthesiste': 'IAN',
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

      const { data: existingUnits, error: existingUnitsError } = await supabaseAdmin
        .from('unites_formation')
        .select('id')
        .eq('logigramme_id', logigrammeId);

      if (existingUnitsError) throw existingUnitsError;
      if ((existingUnits || []).length > 0 && !replaceSchedule && !allowMerge) {
        const conflictError = new Error("SCHEDULE_CONFLICT");
        conflictError.code = "SCHEDULE_CONFLICT";
        conflictError.filiere = filiereName;
        conflictError.classe = metadata.classe;
        throw conflictError;
      }

      if ((existingUnits || []).length > 0 && replaceSchedule) {
        const { error: deleteUnitsError } = await supabaseAdmin
          .from('unites_formation')
          .delete()
          .eq('logigramme_id', logigrammeId);
        if (deleteUnitsError) throw deleteUnitsError;
      }

      // d. Insert year_weeks (once per year/week)
      const weekDateMap = { ...canonicalWeekDateMap };
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
        canonicalWeekDateMap[i + 1] = weekDate;
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
              throw new Error(`Erreur insertion formateur "${unit.formateur}": ${iError.message}`);
            }
            formateurId = newF.id;
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
            heures: (Number.isFinite(Number(c.value)) && Number(c.value) > 0) ? Number(c.value) : null
          })).filter(c => c.week_start_date); // Safety check

          if (cellInserts.length < unit.cells.length) {
            throw new Error(
              `Unité "${unit.nom}" / feuille "${sheetName}": ` +
              `${unit.cells.length - cellInserts.length}/${unit.cells.length} cellule(s) sans date semaine. Import annulé.`
            );
          }

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
    if (err.code === "SCHEDULE_CONFLICT") {
      return res.status(409).json({
        error: "SCHEDULE_CONFLICT",
        code: err.code,
        filiere: err.filiere,
        classe: err.classe
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    // Always clean up uploaded file — safeUnlink validates path stays inside uploadDir
    safeUnlink(filePath);
  }
});

export default router;
