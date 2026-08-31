import { formatShortDate, getDominantWeekMonth } from '@/lib/logigramme-helpers';

function isCellMeaningful(cell) {
  if (!cell) return false;
  if (cell.cell_type && cell.cell_type !== 'normal') return true;
  return cell.cell_type === 'normal' && parseFloat(cell.heures) > 0;
}

function isCellDone(cell) {
  return cell?.completion_status === 'done' || cell?.completion_status === 'auto_done';
}

function dedupeUnits(unites) {
  const seen = new Set();

  return (unites || []).filter((unite, index) => {
    const key = unite.id || `${unite.logigramme_id || 'unknown'}-${unite.nom || index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupUnitsByLogigramme(unites) {
  const groups = new Map();

  unites.forEach((unite) => {
    const logigramme = unite.logigramme || {};
    const key = unite.logigramme_id || logigramme.id || 'unknown';

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        meta: logigramme,
        units: [],
      });
    }

    groups.get(key).units.push(unite);
  });

  return Array.from(groups.values());
}

function createCellMap(unite) {
  return new Map((unite.cells || []).map((cell) => [String(cell.semaine), cell]));
}

function getActiveWeeks(weeks, cellMaps) {
  return (weeks || []).filter((week) =>
    week && cellMaps.some((cellMap) => isCellMeaningful(cellMap.get(String(week.semaine))))
  );
}

function getMonthGroups(weeks) {
  const groups = [];

  weeks.forEach((week) => {
    const month = getDominantWeekMonth(week) || '—';
    const current = groups[groups.length - 1];

    if (current?.label === month) {
      current.count += 1;
    } else {
      groups.push({
        key: `${month}-${week.semaine}`,
        label: month,
        count: 1,
      });
    }
  });

  return groups;
}

const SHORT_MONTH_LABELS = {
  janvier: 'JAN.',
  février: 'FÉV.',
  mars: 'MAR.',
  avril: 'AVR.',
  mai: 'MAI',
  juin: 'JUIN',
  juillet: 'JUIL.',
  août: 'AOÛT',
  septembre: 'SEPT.',
  octobre: 'OCT.',
  novembre: 'NOV.',
  décembre: 'DÉC.',
};

function getPrintableMonthLabel(month) {
  if (month.count >= 4) return month.label;
  return SHORT_MONTH_LABELS[month.label.toLocaleLowerCase('fr-FR')] || month.label;
}

function getProgrammeDetails(meta) {
  return {
    code: meta?.filiere?.code || '—',
    name: meta?.filiere?.name || 'Programme inconnu',
    classe: meta?.classe?.label || 'Classe non renseignée',
  };
}

function getUnitProgress(unite) {
  const trackableCells = (unite.cells || []).filter(
    (cell) => cell.cell_type === 'normal' || cell.cell_type === 'exam'
  );
  const completedCells = trackableCells.filter(isCellDone).length;
  const percentage = trackableCells.length > 0
    ? Math.round((completedCells / trackableCells.length) * 100)
    : 0;

  return {
    completedCells,
    totalCells: trackableCells.length,
    percentage,
    realisedHours: Number(parseFloat(unite.vh_realise || 0).toFixed(1)),
  };
}

function getCellLabel(cell) {
  if (!cell) return '';

  if (cell.cell_type === 'vacation') return 'V';
  if (cell.cell_type === 'exam') return isCellDone(cell) ? 'E ✓' : 'E';
  if (cell.cell_type === 'tiff') return 'T';

  if (cell.cell_type === 'normal') {
    const hours = cell.heures !== null && cell.heures !== undefined
      ? Number(cell.heures)
      : '';
    return isCellDone(cell) ? `${hours} ✓` : hours;
  }

  return '';
}

function getCellClassName(cell) {
  if (!cell) return 'print-schedule-cell print-schedule-cell--empty';
  if (cell.cell_type === 'vacation') return 'print-schedule-cell print-schedule-cell--vacation';
  if (cell.cell_type === 'exam') return 'print-schedule-cell print-schedule-cell--exam';
  if (cell.cell_type === 'tiff') return 'print-schedule-cell print-schedule-cell--tiff';
  if (cell.cell_type === 'normal' && isCellDone(cell)) {
    return 'print-schedule-cell print-schedule-cell--done';
  }
  return 'print-schedule-cell print-schedule-cell--normal';
}

function PrintLegendItem({ className, label }) {
  return (
    <div className="print-logigramme-legend-item">
      <span className={`print-logigramme-legend-swatch ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function ProgrammePrintTable({ group, weeks, programmeIndex, formateurNom }) {
  const details = getProgrammeDetails(group.meta);
  const cellMaps = group.units.map(createCellMap);
  const activeWeeks = getActiveWeeks(weeks, cellMaps);
  const monthGroups = getMonthGroups(activeWeeks);
  const programmeVhg = Number(
    group.units.reduce((sum, unit) => sum + (parseFloat(unit.vhg) || 0), 0).toFixed(1)
  );
  const weekWidth = activeWeeks.length > 0 ? 58 / activeWeeks.length : 0;

  return (
    <section className="print-logigramme-programme">
      <header className="print-logigramme-programme-header">
        <div className="print-logigramme-programme-identity">
          <span className="print-logigramme-programme-index">{String(programmeIndex + 1).padStart(2, '0')}</span>
          <span className="print-logigramme-programme-code">{details.code}</span>
          <div>
            <h2>{details.name}</h2>
            <p>{details.classe} · Formateur : {formateurNom}</p>
          </div>
        </div>
        <div className="print-logigramme-programme-stats">
          <span><strong>{group.units.length}</strong> unités</span>
          <span><strong>{programmeVhg}</strong> h VHG</span>
          <span><strong>{activeWeeks.length}</strong> semaines planifiées</span>
        </div>
      </header>

      <div className="print-logigramme-table-frame">
        <table className={`print-logigramme-table ${activeWeeks.length > 28 ? 'is-dense' : ''}`}>
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '6%' }} />
            {activeWeeks.map((week) => (
              <col key={`col-${week.semaine}`} style={{ width: `${weekWidth}%` }} />
            ))}
            <col style={{ width: '10%' }} />
          </colgroup>

          <thead>
            <tr>
              <th className="print-logigramme-plan-title" colSpan={3}>Plan de formation</th>
              {monthGroups.map((month) => (
                <th
                  key={month.key}
                  className="print-logigramme-month"
                  colSpan={month.count}
                >
                  {getPrintableMonthLabel(month)}
                </th>
              ))}
              <th className="print-logigramme-progress-heading" rowSpan={3}>Progression</th>
            </tr>
            <tr>
              <th className="print-logigramme-fixed-heading" rowSpan={2}>N°</th>
              <th className="print-logigramme-fixed-heading print-logigramme-unit-heading" rowSpan={2}>
                Unité de formation
              </th>
              <th className="print-logigramme-fixed-heading" rowSpan={2}>VHG</th>
              {activeWeeks.map((week) => (
                <th key={`week-${week.semaine}`} className="print-logigramme-week-number">
                  {week.semaine}
                </th>
              ))}
            </tr>
            <tr>
              {activeWeeks.map((week) => (
                <th key={`date-${week.semaine}`} className="print-logigramme-week-date">
                  {formatShortDate(week.week_start_date)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {group.units.map((unite, unitIndex) => {
              const progress = getUnitProgress(unite);
              const cellMap = cellMaps[unitIndex];

              return (
                <tr key={unite.id || `${group.key}-${unitIndex}`}>
                  <td className="print-logigramme-row-number">{unitIndex + 1}</td>
                  <td className="print-logigramme-unit-name">{unite.nom}</td>
                  <td className="print-logigramme-vhg">{unite.vhg}</td>
                  {activeWeeks.map((week) => {
                    const cell = cellMap.get(String(week.semaine));
                    return (
                      <td
                        key={`${unite.id || unitIndex}-${week.semaine}`}
                        className={getCellClassName(cell)}
                      >
                        {getCellLabel(cell)}
                      </td>
                    );
                  })}
                  <td className="print-logigramme-progress-cell">
                    <div className="print-logigramme-progress-value">
                      <span>{progress.realisedHours}h / {unite.vhg}h</span>
                      <strong>{progress.percentage}%</strong>
                    </div>
                    <div className="print-logigramme-progress-caption">
                      {progress.completedCells}/{progress.totalCells} cellules
                    </div>
                    <div className="print-logigramme-progress-track">
                      <span
                        className={progress.percentage >= 100 ? 'is-complete' : ''}
                        style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PrintableFormateurTable({ formateurNom, unites, weeks }) {
  if (!unites?.length || !weeks?.length) return null;

  const dedupedUnits = dedupeUnits(unites);
  const programmeGroups = groupUnitsByLogigramme(dedupedUnits);
  const totalVhg = Number(
    dedupedUnits.reduce((sum, unite) => sum + (parseFloat(unite.vhg) || 0), 0).toFixed(1)
  );

  return (
    <div className="print-only print-logigramme-document">
      <header className="print-logigramme-document-header">
        <div className="print-logigramme-brand">
          <div className="print-logigramme-brand-mark">ESFPP</div>
          <div>
            <h1>Plan de formation</h1>
            <p>Vue consolidée du formateur</p>
          </div>
        </div>

        <div className="print-logigramme-professor">
          <span>Formateur</span>
          <strong>{formateurNom}</strong>
        </div>
      </header>

      <div className="print-logigramme-summary">
        <div><strong>{programmeGroups.length}</strong><span>Logigrammes</span></div>
        <div><strong>{dedupedUnits.length}</strong><span>Unités de formation</span></div>
        <div><strong>{totalVhg} h</strong><span>Volume global</span></div>
        <p>Chaque filière et classe est présentée séparément pour préserver la structure pédagogique.</p>
      </div>

      {programmeGroups.map((group, index) => (
        <ProgrammePrintTable
          key={group.key}
          group={group}
          weeks={weeks}
          programmeIndex={index}
          formateurNom={formateurNom}
        />
      ))}

      <footer className="print-logigramme-footer">
        <div className="print-logigramme-legend">
          <PrintLegendItem className="print-schedule-cell--normal" label="Session normale" />
          <PrintLegendItem className="print-schedule-cell--done" label="Terminé" />
          <PrintLegendItem className="print-schedule-cell--vacation" label="Vacance" />
          <PrintLegendItem className="print-schedule-cell--exam" label="Examen" />
          <PrintLegendItem className="print-schedule-cell--tiff" label="TIFF / Clôture" />
        </div>
        <span>ESFPP · Suivi pédagogique</span>
      </footer>
    </div>
  );
}
