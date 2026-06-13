/**
 * Group 52 weeks into 12 months for the grid header
 * @param {Array} weeks - Array of 52 week objects { semaine, week_start_date, mois, semestre }
 * @returns {Array} - Array of { mois, span, semestre }
 */
export function groupWeeksByMonth(weeks) {
  if (!weeks || weeks.length === 0) return [];
  
  const groups = [];
  let currentMonth = weeks[0].mois;
  let currentCount = 0;

  for (const w of weeks) {
    if (w.mois === currentMonth) {
      currentCount++;
    } else {
      groups.push({ mois: currentMonth, count: currentCount });
      currentMonth = w.mois;
      currentCount = 1;
    }
  }
  groups.push({ mois: currentMonth, count: currentCount });
  return groups;
}

export function groupWeeksBySemester(weeks) {
  if (!weeks || weeks.length === 0) return [];
  
  const groups = [];
  let currentSemestre = weeks[0].semestre;
  let currentCount = 0;

  for (const w of weeks) {
    if (w.semestre === currentSemestre) {
      currentCount++;
    } else {
      groups.push({ semestre: currentSemestre, count: currentCount });
      currentSemestre = w.semestre;
      currentCount = 1;
    }
  }
  groups.push({ semestre: currentSemestre, count: currentCount });
  return groups;
}

/**
 * Format a short date for the grid (e.g., "01/09")
 */
export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

/**
 * Compute progress for a unit or logigramme
 */
export function computeProgress(vhg, cells) {
  if (!vhg || vhg === 0) return { vh_realise: 0, vh_restant: 0, taux: 0 };
  
  const vh_realise = cells
    .filter(c => c.cell_type === 'normal' && (c.completion_status === 'done' || c.completion_status === 'auto_done'))
    .reduce((sum, c) => sum + (parseFloat(c.heures) || 0), 0);
    
  return {
    vh_realise,
    vh_restant: vhg - vh_realise,
    taux: vh_realise / vhg
  };
}

/**
 * Map cell types to CSS classes
 */
export function getCellClassName(type, status) {
  const base = "w-10 h-10 border-r border-b text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer select-none";
  
  if (type === 'vacation') return `${base} bg-pink-100 text-pink-700 border-pink-200 cursor-default`;
  if (type === 'exam') return `${base} bg-slate-200 text-slate-700 border-slate-300 cursor-default`;
  if (type === 'tiff') return `${base} bg-yellow-400 text-yellow-900 border-yellow-500 cursor-default`;
  
  if (type === 'normal') {
    if (status === 'done' || status === 'auto_done') {
      return `${base} bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600`;
    }
    return `${base} bg-yellow-50 text-yellow-800 border-yellow-100 hover:bg-yellow-100`;
  }
  
  return `${base} bg-white text-transparent border-slate-100`;
}
