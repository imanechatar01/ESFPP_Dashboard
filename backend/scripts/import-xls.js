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
  'infirmier en réanimation': 'REA',
  'infirmier en reanimation': 'REA',
  'infirmier anesthésiste': 'IA',
  'infirmier anesthesiste': 'IA',
  'infirmier auxiliaire': 'IA',
  'infirmier polyvalent': 'IP',
  'radiologie': 'RADIO',
};

async function run() {
  const args = process.argv.slice(2);
  const yearArg = args.indexOf('--year');
  const dirArg = args.indexOf('--dir');

  if (yearArg === -1 || dirArg === -1) {
    console.error('Usage: node import-xls.js --year "2025-2026" --dir "./xls-files"');
    process.exit(1);
  }

  const academicYearLabel = args[yearArg + 1];
  const xlsDir = args[dirArg + 1];

  // 1. Get Academic Year ID
  const { data: yearData, error: yearError } = await supabase
    .from('academic_years')
    .select('id')
    .eq('label', academicYearLabel)
    .single();

  if (yearError || !yearData) {
    console.error(`Academic year "${academicYearLabel}" not found. Run seed first.`);
    process.exit(1);
  }
  const academicYearId = yearData.id;

  // 1b. Get all year_weeks for this year to use as canonical dates
  const { data: yearWeeksData, error: ywError } = await supabase
    .from('year_weeks')
    .select('semaine, week_start_date')
    .eq('academic_year_id', academicYearId);

  if (ywError) {
    console.error(`Error fetching year_weeks: ${ywError.message}`);
    process.exit(1);
  }

  const weekDateMap = {};
  yearWeeksData.forEach(yw => {
    weekDateMap[yw.semaine] = yw.week_start_date;
  });

  const files = fs.readdirSync(xlsDir).filter(f => f.endsWith('.xls'));

  for (const file of files) {

    const filePath = path.join(xlsDir, file);
    console.log(`Processing file: ${file}`);

    // List sheets
    const sheetsResult = spawnSync('python3', [
      path.join(__dirname, 'parse_xls.py'),
      '--file', filePath,
      '--list-sheets'
    ]);

    if (sheetsResult.error || sheetsResult.status !== 0) {
      console.error(`    Error listing sheets for ${file}:`, sheetsResult.stderr.toString());
      continue;
    }

    const sheets = JSON.parse(sheetsResult.stdout.toString());

    for (const sheetName of sheets) {
      if (sheetName === 'Feuil1') continue;

      console.log(`  Processing sheet: ${sheetName}`);
      const dataResult = spawnSync('python3', [
        path.join(__dirname, 'parse_xls.py'),
        '--file', filePath,
        '--sheet', sheetName
      ]);

      if (dataResult.error || dataResult.status !== 0) {
        console.error(`    Error parsing sheet ${sheetName}:`, dataResult.stderr.toString());
        continue;
      }

      const data = JSON.parse(dataResult.stdout.toString());

      const { metadata, unites, weeks } = data;

      // a. Upsert Filière
      const filiereName = metadata.filiere.trim();
      const filiereCode = FILIERE_CODES[filiereName.toLowerCase()] || filiereName.substring(0, 5).toUpperCase().trim();
      
      const { data: filData, error: filError } = await supabase
        .from('filieres')
        .upsert({ 
          code: filiereCode, 
          name: filiereName, 
          niveau: metadata.niveau.trim()
        }, { onConflict: 'code' })
        .select()
        .single();

      if (filError) {
        console.error(`    Error upserting filiere: ${filError.message}`);
        continue;
      }
      const filiereId = filData.id;

      // b. Upsert Classe
      // We need to parse annee from "1ère année" etc.
      let annee = 1;
      if (metadata.classe.includes('2')) annee = 2;
      if (metadata.classe.includes('3')) annee = 3;

      const { data: clData, error: clError } = await supabase
        .from('classes')
        .upsert({
          filiere_id: filiereId,
          label: metadata.classe,
          annee: annee
        }, { onConflict: 'filiere_id, annee' })
        .select()
        .single();

      if (clError) {
        console.error(`    Error upserting classe: ${clError.message}`);
        continue;
      }
      const classeId = clData.id;

      // c. Upsert Logigramme
      const { data: logData, error: logError } = await supabase
        .from('logigrammes')
        .upsert({
          filiere_id: filiereId,
          classe_id: classeId,
          academic_year_id: academicYearId
        }, { onConflict: 'filiere_id, classe_id, academic_year_id' })
        .select()
        .single();

      if (logError) {
        console.error(`    Error upserting logigramme: ${logError.message}`);
        continue;
      }
      const logigrammeId = logData.id;

      // DELETE existing cells for this logigramme before re-importing
      // First find all units for this logigramme
      const { data: existingUnits } = await supabase
        .from('unites_formation')
        .select('id')
        .eq('logigramme_id', logigrammeId);
      
      if (existingUnits && existingUnits.length > 0) {
        const unitIds = existingUnits.map(u => u.id);
        await supabase
          .from('week_cells')
          .delete()
          .in('unite_id', unitIds);
      }

      // d. Insert year_weeks (once per year)
      // This is slightly redundant but safe with UNIQUE constraint
      for (let i = 0; i < weeks.length; i++) {
        const weekDate = weeks[i];
        if (!weekDate) continue;
        
        const dateObj = new Date(weekDate);
        const mois = dateObj.toLocaleString('fr-FR', { month: 'long' });
        const semestre = (i + 1) <= 26 ? 1 : 2;

        await supabase
          .from('year_weeks')
          .upsert({
            academic_year_id: academicYearId,
            semaine: i + 1,
            week_start_date: weekDate,
            mois: mois.charAt(0).toUpperCase() + mois.slice(1),
            semestre: semestre
          }, { onConflict: 'academic_year_id, semaine' });

        weekDateMap[i + 1] = weekDate;
      }

      // e. Process Unités and Cells
      for (const unit of unites) {
        // Get or Create Formateur
        let formateurId = null;
        if (unit.formateur) {
          // 1. Try to find existing
          const { data: existingF, error: sError } = await supabase
            .from('formateurs')
            .select('id')
            .eq('nom', unit.formateur)
            .maybeSingle();
          
          if (existingF) {
            formateurId = existingF.id;
          } else {
            // 2. Insert new
            const { data: newF, error: iError } = await supabase
              .from('formateurs')
              .insert({ nom: unit.formateur })
              .select()
              .single();
            
            if (iError) {
              console.error(`    Error inserting formateur "${unit.formateur}": ${iError.message}`);
            } else {
              formateurId = newF.id;
            }
          }
        }

        // Upsert Unite
        const { data: uData, error: uError } = await supabase
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

        if (uError) {
          console.error(`    Error upserting unit "${unit.nom}" (ordre: ${unit.ordre}):`, uError.message);
          continue;
        }
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

          const { error: cellError } = await supabase
            .from('week_cells')
            .upsert(cellInserts, { onConflict: 'unite_id, semaine' });
          if (cellError) {
            console.error(`    Error upserting cells for unit "${unit.nom}":`, cellError.message);
          }
        }
      }
      console.log(`    Imported ${unites.length} unités.`);
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
