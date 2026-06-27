function parseLocalDate(dateStr) {
  if (!dateStr) return null;

  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatMonthName(date) {
  const month = date.toLocaleString('fr-FR', { month: 'long' });
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function getDominantWeekMonth(week) {
  const startDate = parseLocalDate(week.week_start_date);
  if (!startDate) return week.mois;

  const dayCountsByMonth = new Map();

  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + offset);

    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const count = dayCountsByMonth.get(monthKey) || { date, count: 0 };
    count.count += 1;
    dayCountsByMonth.set(monthKey, count);
  }

  const dominantMonth = [...dayCountsByMonth.values()]
    .sort((a, b) => b.count - a.count)[0];

  return formatMonthName(dominantMonth.date);
}

/**
 * Group weeks into contiguous month blocks for the grid header.
 * A week that overlaps two months is assigned to the month containing most of its days.
 * @param {Array} weeks - Array of week objects { semaine, week_start_date, mois, semestre }
 * @returns {Array} - Array of { mois, count, span }
 */
export function groupWeeksByMonth(weeks) {
  if (!weeks || weeks.length === 0) return [];
  
  const groups = [];
  let currentMonth = getDominantWeekMonth(weeks[0]);
  let currentCount = 0;

  for (const w of weeks) {
    const month = getDominantWeekMonth(w);

    if (month === currentMonth) {
      currentCount++;
    } else {
      groups.push({ mois: currentMonth, count: currentCount, span: currentCount });
      currentMonth = month;
      currentCount = 1;
    }
  }
  groups.push({ mois: currentMonth, count: currentCount, span: currentCount });
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
