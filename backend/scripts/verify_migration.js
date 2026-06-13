import { supabaseAdmin } from '../lib/supabase.js';

async function verify() {
  const { data: logs, error } = await supabaseAdmin.from("logigrammes").select(`
    id,
    filiere:filieres(name),
    classe:classes(label),
    unites:unites_formation(id, nom, vhg)
  `);

  if (error) {
    console.error("Verification query error:", error.message);
    return;
  }

  const expected = [
    { name: "Radiologie", label: "Radio 1", units: 35, vhg: 975.0 },
    { name: "Radiologie", label: "Radio 2", units: 28, vhg: 660.0 },
    { name: "Radiologie", label: "Radio 3", units: 23, vhg: 450.0 },
    { name: "Infirmier auxiliaire", label: "IA1", units: 29, vhg: 515.0 },
    { name: "Infirmier auxiliaire", label: "IA2", units: 23, vhg: 245.0 },
    { name: "Infirmier Polyvalent", label: "IP1", units: 37, vhg: 957.0 },
    { name: "Infirmier Polyvalent", label: "IP2", units: 33, vhg: 940.0 },
    { name: "Infirmier Polyvalent", label: "IP3", units: 26, vhg: 320.0 },
    { name: "Infirmier en réanimation", label: "Réa 1", units: 35, vhg: 920.0 },
    { name: "Infirmier en réanimation", label: "Réa 2", units: 19, vhg: 440.0 },
    { name: "Infirmier en réanimation", label: "Réa 3", units: 17, vhg: 330.0 },
    { name: "AIDE SOIGNANT", label: "1ère année", units: 41, vhg: 504.0 }
  ];

  console.log("--- Verification Results ---");
  let totalLoss = false;

  logs.forEach(log => {
    const totalUnits = log.unites.length;
    const totalVHG = log.unites.reduce((sum, u) => sum + u.vhg, 0);
    
    // Find expected entry
    // Note: mapping might be slightly different in names due to metadata cleanup
    const match = expected.find(e => 
      (log.filiere.name.toLowerCase() === e.name.toLowerCase() || log.filiere.name.includes(e.name)) &&
      (log.classe.label.toLowerCase() === e.label.toLowerCase() || e.label === "1ère année" && log.classe.label === "1ère année")
    );

    if (match) {
      const unitsOk = totalUnits === match.units;
      const vhgOk = Math.abs(totalVHG - match.vhg) < 0.1;
      console.log(`${log.filiere.name} (${log.classe.label}): Units=${totalUnits} (Exp: ${match.units}) ${unitsOk ? '✅' : '❌'}, VHG=${totalVHG} (Exp: ${match.vhg}) ${vhgOk ? '✅' : '❌'}`);
      if (!unitsOk || !vhgOk) totalLoss = true;
    } else {
      console.log(`Unknown logigramme in DB: ${log.filiere.name} - ${log.classe.label} (Units=${totalUnits}, VHG=${totalVHG})`);
    }
  });

  if (!totalLoss) {
    console.log("\nMigration successful! No data loss detected in units/hours.");
  } else {
    console.log("\nDATA LOSS DETECTED! Check the discrepancies above.");
  }
}

verify();
