import { supabaseAdmin as supabase } from '../lib/supabase.js';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const FILIERE_CODES = {
  'aide-soignant': 'AS',
  'aide soignant': 'AS',
  'aide soignante': 'AS',
  'infirmier en réanimation': 'REA',
  'infirmier en reanimation': 'REA',
  'infirmier anesthésiste': 'IAN',
  'infirmier anesthesiste': 'IAN',
  'infirmier auxiliaire': 'IA',
  'infirmier polyvalent': 'IP',
  'radiologie': 'RADIO',
};

const CELL_TYPES = new Set(['normal', 'vacation', 'exam', 'tiff', 'empty']);

function getArg(args, name, fallback = null) {
  const idx = args.indexOf(name);
  return idx === -1 ? fallback : args[idx + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage:',
    '  node scripts/import-xls.js --year "2025-2026" --dir "../../excels" --dry-run',
    '  node scripts/import-xls.js --year "2025-2026" --dir "../../excels" --commit --replace-schedule',
    '',
    'Safety defaults:',
    '  --dry-run           parse and validate only, no database writes',
    '  --commit            write to Supabase',
    '  --replace-schedule  delete existing units/cells for each imported logigramme before inserting source data',
    '  --allow-merge       allow upsert into an existing logigramme without deleting old rows',
  ].join('\n'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runPython(args, context) {
  const result = spawnSync('python3', [path.join(__dirname, 'parse_xls.py'), ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50,
  });

  if (result.status !== 0 || !result.stdout) {
    throw new Error(`${context}: ${result.stderr || result.error?.message || 'unknown parser error'}`);
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function parseJson(text, context) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${context}: invalid JSON from parser (${err.message})`);
  }
}

function listXlsFiles(xlsDir) {
  const files = fs.readdirSync(xlsDir)
    .filter(file => file.toLowerCase().endsWith('.xls'))
    .sort((a, b) => a.localeCompare(b, 'fr'));

  assert(files.length > 0, `No .xls files found in ${xlsDir}`);
  return files.map(file => path.join(xlsDir, file));
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function filiereCodeFor(name) {
  const key = normalizeName(name).toLowerCase();
  return FILIERE_CODES[key] || key.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 12)
    .toUpperCase();
}

function classYearFor(label) {
  const text = String(label || '');
  if (text.includes('3')) return 3;
  if (text.includes('2')) return 2;
  return 1;
}

function monthName(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  const mois = date.toLocaleString('fr-FR', { month: 'long', timeZone: 'UTC' });
  return mois.charAt(0).toUpperCase() + mois.slice(1);
}

function cellCounts(unites) {
  const counts = { normal: 0, vacation: 0, exam: 0, tiff: 0, empty: 0 };
  for (const unit of unites) {
    for (const cell of unit.cells || []) {
      counts[cell.type] = (counts[cell.type] || 0) + 1;
    }
  }
  return counts;
}

function validateSheet(filePath, sheetName, payload) {
  const errors = [];
  const warnings = [];
  const { metadata = {}, unites = [], weeks = [] } = payload;

  if (!normalizeName(metadata.filiere)) errors.push('Missing metadata.filiere');
  if (!normalizeName(metadata.classe)) errors.push('Missing metadata.classe');
  if (!normalizeName(metadata.niveau)) warnings.push('Missing metadata.niveau; importer will use QUALIFICATION');
  if (weeks.length !== 52) errors.push(`Expected 52 week slots, found ${weeks.length}`);

  const missingWeekDates = weeks
    .map((week, index) => ({ semaine: index + 1, week }))
    .filter(item => !item.week);
  if (missingWeekDates.length > 0) {
    errors.push(`Missing ${missingWeekDates.length} week date(s): ${missingWeekDates.map(w => w.semaine).join(', ')}`);
  }

  if (unites.length === 0) errors.push('Parsed 0 unités');

  const seenOrdres = new Set();
  for (const unit of unites) {
    if (seenOrdres.has(unit.ordre)) errors.push(`Duplicate unité ordre ${unit.ordre}`);
    seenOrdres.add(unit.ordre);

    if (!normalizeName(unit.nom)) errors.push(`Unité ordre ${unit.ordre}: missing name`);
    if (!Number.isFinite(Number(unit.vhg))) errors.push(`Unité "${unit.nom}": invalid VHG "${unit.vhg}"`);

    const sourceHours = (unit.cells || [])
      .filter(cell => Number.isFinite(Number(cell.value)))
      .reduce((sum, cell) => sum + Number(cell.value), 0);
    const delta = Math.abs(sourceHours - Number(unit.vhg || 0));
    if (delta > 0.01) {
      warnings.push(`Unité "${unit.nom}": VHG=${unit.vhg}, numeric source cells sum=${sourceHours}`);
    }

    const seenWeeks = new Set();
    for (const cell of unit.cells || []) {
      if (!Number.isInteger(cell.week) || cell.week < 1 || cell.week > 52) {
        errors.push(`Unité "${unit.nom}": invalid week ${cell.week}`);
      }
      if (seenWeeks.has(cell.week)) errors.push(`Unité "${unit.nom}": duplicate week ${cell.week}`);
      seenWeeks.add(cell.week);
      if (!CELL_TYPES.has(cell.type)) errors.push(`Unité "${unit.nom}": invalid cell type "${cell.type}"`);
      if (!cell.date) errors.push(`Unité "${unit.nom}": week ${cell.week} has no source date`);
      if (cell.date && weeks[cell.week - 1] && cell.date !== weeks[cell.week - 1]) {
        errors.push(`Unité "${unit.nom}": week ${cell.week} date mismatch cell=${cell.date}, header=${weeks[cell.week - 1]}`);
      }
    }
  }

  return {
    file: path.basename(filePath),
    sheet: sheetName,
    metadata,
    unit_count: unites.length,
    vhg_total: unites.reduce((sum, unit) => sum + Number(unit.vhg || 0), 0),
    cell_count: unites.reduce((sum, unit) => sum + (unit.cells || []).length, 0),
    cell_counts: cellCounts(unites),
    parser_warnings: payload.warnings || [],
    warnings,
    errors,
    debug: payload.debug || {},
  };
}

function parseWorkbook(filePath) {
  const listResult = runPython(['--file', filePath, '--list-sheets'], `listing sheets for ${filePath}`);
  const sheets = parseJson(listResult.stdout, `listing sheets for ${filePath}`);
  assert(sheets.length > 0, `No valid logigramme sheets found in ${filePath}`);

  return sheets.map(sheetName => {
    const parsed = runPython(['--file', filePath, '--sheet', sheetName], `parsing ${path.basename(filePath)}:${sheetName}`);
    const payload = parseJson(parsed.stdout, `parsing ${path.basename(filePath)}:${sheetName}`);
    const audit = validateSheet(filePath, sheetName, payload);
    if (parsed.stderr.trim()) audit.parser_diagnostics = parsed.stderr.trim();
    return { filePath, sheetName, payload, audit };
  });
}

function writeReport(report, reportDir) {
  fs.mkdirSync(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `xls-import-audit-${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return reportPath;
}

async function requireAcademicYear(label) {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, label')
    .eq('label', label)
    .single();

  if (error || !data) throw new Error(`Academic year "${label}" not found. Create it before importing.`);
  return data;
}

async function loadWeekDateMap(academicYearId) {
  const { data, error } = await supabase
    .from('year_weeks')
    .select('semaine, week_start_date')
    .eq('academic_year_id', academicYearId);

  if (error) throw error;
  return Object.fromEntries((data || []).map(row => [row.semaine, row.week_start_date]));
}

async function upsertYearWeeks(academicYearId, weeks) {
  const rows = weeks.map((weekDate, index) => ({
    academic_year_id: academicYearId,
    semaine: index + 1,
    week_start_date: weekDate,
    mois: monthName(weekDate),
    semestre: index + 1 <= 26 ? 1 : 2,
  }));

  const { error } = await supabase
    .from('year_weeks')
    .upsert(rows, { onConflict: 'academic_year_id, semaine' });
  if (error) throw error;

  return Object.fromEntries(rows.map(row => [row.semaine, row.week_start_date]));
}

async function getOrCreateFormateur(nom) {
  const cleanName = normalizeName(nom);
  if (!cleanName) return null;

  const { data: existing, error: findError } = await supabase
    .from('formateurs')
    .select('id')
    .eq('nom', cleanName)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from('formateurs')
    .insert({ nom: cleanName })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return created.id;
}

async function importSheet(item, academicYearId, options) {
  const { metadata, unites, weeks } = item.payload;
  const filiereName = normalizeName(metadata.filiere);
  const filiereCode = filiereCodeFor(filiereName);

  const { data: filiere, error: filiereError } = await supabase
    .from('filieres')
    .upsert({
      code: filiereCode,
      name: filiereName,
      niveau: normalizeName(metadata.niveau) || 'QUALIFICATION',
    }, { onConflict: 'code' })
    .select('id')
    .single();
  if (filiereError) throw filiereError;

  const { data: classe, error: classeError } = await supabase
    .from('classes')
    .upsert({
      filiere_id: filiere.id,
      label: normalizeName(metadata.classe),
      annee: classYearFor(metadata.classe),
    }, { onConflict: 'filiere_id, annee' })
    .select('id')
    .single();
  if (classeError) throw classeError;

  const { data: logigramme, error: logigrammeError } = await supabase
    .from('logigrammes')
    .upsert({
      filiere_id: filiere.id,
      classe_id: classe.id,
      academic_year_id: academicYearId,
    }, { onConflict: 'filiere_id, classe_id, academic_year_id' })
    .select('id')
    .single();
  if (logigrammeError) throw logigrammeError;

  const { data: existingUnits, error: existingError } = await supabase
    .from('unites_formation')
    .select('id')
    .eq('logigramme_id', logigramme.id);
  if (existingError) throw existingError;

  if ((existingUnits || []).length > 0 && !options.replaceSchedule && !options.allowMerge) {
    throw new Error(
      `Existing data found for ${filiereName} / ${metadata.classe}. ` +
      'Use --replace-schedule to replace it or --allow-merge to upsert into it.'
    );
  }

  if ((existingUnits || []).length > 0 && options.replaceSchedule) {
    const { error: deleteError } = await supabase
      .from('unites_formation')
      .delete()
      .eq('logigramme_id', logigramme.id);
    if (deleteError) throw deleteError;
  }

  const weekDateMap = await upsertYearWeeks(academicYearId, weeks);

  // 1. Batch Formateurs
  const uniqueFormateurs = [...new Set(unites.map(u => normalizeName(u.formateur)).filter(Boolean))];
  const formateurMap = {};

  if (uniqueFormateurs.length > 0) {
    const { data: existingFormateurs, error: findError } = await supabase
      .from('formateurs')
      .select('id, nom')
      .in('nom', uniqueFormateurs);
    if (findError) throw findError;

    (existingFormateurs || []).forEach(f => {
      formateurMap[f.nom] = f.id;
    });

    const missingFormateurs = uniqueFormateurs.filter(name => !formateurMap[name]);
    if (missingFormateurs.length > 0) {
      const { data: createdFormateurs, error: insertError } = await supabase
        .from('formateurs')
        .insert(missingFormateurs.map(name => ({ nom: name })))
        .select('id, nom');
      if (insertError) throw insertError;
      
      (createdFormateurs || []).forEach(f => {
        formateurMap[f.nom] = f.id;
      });
    }
  }

  // 2. Batch Units
  const unitsToUpsert = unites.map(unit => ({
    logigramme_id: logigramme.id,
    ordre: unit.ordre,
    nom: normalizeName(unit.nom),
    formateur_id: formateurMap[normalizeName(unit.formateur)] || null,
    vhg: Number(unit.vhg || 0),
  }));

  const { data: savedUnits, error: unitsError } = await supabase
    .from('unites_formation')
    .upsert(unitsToUpsert, { onConflict: 'logigramme_id, ordre' })
    .select('id, ordre');
  if (unitsError) throw unitsError;

  const unitIdByOrdre = Object.fromEntries((savedUnits || []).map(u => [u.ordre, u.id]));

  // 3. Batch Cells
  const cellsToUpsert = [];
  for (const unit of unites) {
    const unitId = unitIdByOrdre[unit.ordre];
    if (!unitId) {
      throw new Error(`Failed to associate unit ID for order ${unit.ordre} ("${unit.nom}")`);
    }

    const cells = (unit.cells || []).map(cell => ({
      unite_id: unitId,
      semaine: cell.week,
      week_start_date: weekDateMap[cell.week],
      cell_type: cell.type,
      heures: Number.isFinite(Number(cell.value)) ? Number(cell.value) : null,
    }));

    const missingDates = cells.filter(cell => !cell.week_start_date);
    if (missingDates.length > 0) {
      throw new Error(`Refusing to drop ${missingDates.length} cells for unité "${unit.nom}" due to missing week dates`);
    }

    cellsToUpsert.push(...cells);
  }

  if (cellsToUpsert.length > 0) {
    const { error: cellsError } = await supabase
      .from('week_cells')
      .upsert(cellsToUpsert, { onConflict: 'unite_id, semaine' });
    if (cellsError) throw cellsError;
  }

  return {
    logigramme_id: logigramme.id,
    filiere: filiereName,
    classe: normalizeName(metadata.classe),
    units: unites.length,
  };
}

async function run() {
  const args = process.argv.slice(2);
  const academicYearLabel = getArg(args, '--year');
  const xlsDir = getArg(args, '--dir', path.resolve(__dirname, '../../../excels'));
  const reportDir = getArg(args, '--report-dir', path.resolve(__dirname, '../import-reports'));
  const dryRun = hasFlag(args, '--dry-run') || !hasFlag(args, '--commit');
  const commit = hasFlag(args, '--commit');
  const replaceSchedule = hasFlag(args, '--replace-schedule');
  const allowMerge = hasFlag(args, '--allow-merge');

  if (!academicYearLabel || hasFlag(args, '--help')) {
    usage();
    process.exit(1);
  }
  if (replaceSchedule && allowMerge) {
    throw new Error('Use only one of --replace-schedule or --allow-merge.');
  }

  const files = listXlsFiles(path.resolve(xlsDir));
  const parsedSheets = files.flatMap(file => parseWorkbook(file));
  const sheets = parsedSheets.map(item => item.audit);
  const errors = sheets.flatMap(sheet => sheet.errors.map(error => `${sheet.file}:${sheet.sheet}: ${error}`));
  const warnings = sheets.flatMap(sheet => [
    ...sheet.warnings.map(warning => `${sheet.file}:${sheet.sheet}: ${warning}`),
    ...sheet.parser_warnings.map(warning => `${sheet.file}:${sheet.sheet}: ${warning.message || warning}`),
  ]);

  const report = {
    generated_at: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'commit',
    source_dir: path.resolve(xlsDir),
    academic_year: academicYearLabel,
    files: files.map(file => path.basename(file)),
    totals: {
      files: files.length,
      sheets: sheets.length,
      units: sheets.reduce((sum, sheet) => sum + sheet.unit_count, 0),
      cells: sheets.reduce((sum, sheet) => sum + sheet.cell_count, 0),
      vhg: sheets.reduce((sum, sheet) => sum + sheet.vhg_total, 0),
      warnings: warnings.length,
      errors: errors.length,
    },
    sheets,
    errors,
    warnings,
  };

  const reportPath = writeReport(report, path.resolve(reportDir));
  console.log(`Audit report: ${reportPath}`);
  console.log(`Parsed ${report.totals.files} file(s), ${report.totals.sheets} sheet(s), ${report.totals.units} unité(s), ${report.totals.cells} cell(s).`);

  if (warnings.length > 0) {
    console.warn(`Warnings: ${warnings.length}. See report before importing.`);
  }
  if (errors.length > 0) {
    errors.slice(0, 20).forEach(error => console.error(`ERROR: ${error}`));
    throw new Error(`Validation failed with ${errors.length} error(s). No database writes were made.`);
  }
  if (dryRun) {
    console.log('Dry-run complete. No database writes were made. Add --commit to import.');
    return;
  }
  assert(commit, 'Internal safety check failed: commit mode not enabled');

  const year = await requireAcademicYear(academicYearLabel);
  await loadWeekDateMap(year.id);

  const imported = [];
  for (const item of parsedSheets) {
    imported.push(await importSheet(item, year.id, { replaceSchedule, allowMerge }));
  }

  console.log(`Imported ${imported.length} logigramme(s).`);
  for (const item of imported) {
    console.log(`  ${item.filiere} / ${item.classe}: ${item.units} unité(s), logigramme=${item.logigramme_id}`);
  }
}

run().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});
