import { supabaseAdmin } from '../lib/supabase.js';

async function check() {
  const { data: logigrammes, error: logError } = await supabaseAdmin
    .from('logigrammes')
    .select(`
      id,
      filiere:filieres (id, code, name),
      classe:classes (id, label, annee),
      academic_year:academic_years (id, label),
      unites:unites_formation (id, nom, vhg)
    `);

  if (logError) {
    console.error(logError);
    return;
  }

  console.log(`Total logigrammes in DB: ${logigrammes.length}`);
  logigrammes.forEach(l => {
    console.log(`Logigramme ID: ${l.id}`);
    console.log(`  Filiere: ${l.filiere.name} (${l.filiere.code})`);
    console.log(`  Classe: ${l.classe.label} (Annee: ${l.classe.annee})`);
    console.log(`  Year: ${l.academic_year.label}`);
    console.log(`  Units count: ${l.unites.length}`);
    const vhgSum = l.unites.reduce((sum, u) => sum + u.vhg, 0);
    console.log(`  Units VHG sum: ${vhgSum}`);
  });
}

check();
