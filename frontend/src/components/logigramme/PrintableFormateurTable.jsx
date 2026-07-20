/**
 * PrintableFormateurTable.jsx
 *
 * Dedicated print component for the Formateur view.
 * Renders a single merged table (all units across all programmes)
 * in landscape orientation, WITHOUT the "Progression" column.
 *
 * Changes vs. original:
 *  - VHG column removed from print output (screen view unchanged)
 *  - Weeks with zero data across all units are filtered out
 *  - Week header shows the Monday date (DD/MM) instead of week number
 *  - Table borders strengthened for print rendering
 *  - Table rotated 90° clockwise via CSS class (handled in globals.css)
 *
 * Visibility: hidden on screen (`print-only` class), shown only during print.
 * The @page rule (landscape, margins) is declared in globals.css.
 */

/**
 * Returns true if a cell object carries meaningful data worth printing.
 * Vacances, examens, TIFF/clôture, and normal sessions all qualify.
 * An absent cell (undefined/null) does not.
 */
function isCellMeaningful(cell) {
  if (!cell) return false;
  // Any typed cell (vacation, exam, tiff) is meaningful regardless of heures
  if (cell.cell_type && cell.cell_type !== 'normal') return true;
  // A normal cell is meaningful only when heures is a positive number
  return cell.cell_type === 'normal' && !!cell.heures && parseFloat(cell.heures) > 0;
}

/**
 * @param {object}  props
 * @param {string}  props.formateurNom    - Full name of the formateur
 * @param {object[]} props.unites         - Flat array of unite objects (all programmes merged)
 * @param {object[]} props.weeks          - Array of week objects { semaine, week_start_date }
 * @param {function} props.onContextMenu  - Optional right-click handler for cells
 */
export function PrintableFormateurTable({ formateurNom, unites, weeks, onContextMenu }) {
  if (!unites?.length || !weeks?.length) return null;

  // Deduplicate by unite.id (safety net in case the same unite appears twice)
  const seen = new Set();
  const dedupedUnites = unites.filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });

  // ── Point 3: Filter out weeks that are empty across ALL units ──────────────
  // Pre-build cellMaps per unite for fast lookup
  const cellMaps = dedupedUnites.map((u) => {
    const map = {};
    (u.cells || []).forEach((c) => { map[c.semaine] = c; });
    return map;
  });

  const activeWeeks = weeks.filter((w) =>
    w && cellMaps.some((map) => isCellMeaningful(map[w.semaine]))
  );

  // Determine distinct programme labels for the header info line
  const programmeLabels = [...new Set(
    dedupedUnites.map((u) =>
      u.logigramme
        ? `${u.logigramme.filiere?.code ?? ''} – ${u.logigramme.classe?.label ?? ''}`
        : '—'
    )
  )];

  // Total VHG (kept in the document header text only, column removed)
  const totalVhg = Number(dedupedUnites.reduce((sum, u) => sum + (parseFloat(u.vhg) || 0), 0).toFixed(1));

  return (
    /* print-only: hidden on screen, shown on print via globals.css */
    <div className="print-only">
        {/* ── Document Header ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: '6px', borderBottom: '2px solid #1e3a6e', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            <h1 style={{
              fontSize: dedupedUnites.length > 15 ? '9pt' : '12pt',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#1e3a6e',
              margin: 0
            }}>
              Plan de Formation
            </h1>
            <span style={{ fontSize: dedupedUnites.length > 15 ? '8pt' : '9pt', fontWeight: 700, color: '#374151' }}>
              Formateur : {formateurNom}
            </span>
          </div>
          <p style={{ fontSize: '6.5pt', color: '#6b7280', marginTop: '2px', marginBottom: 0 }}>
            {programmeLabels.join('  |  ')} &nbsp;—&nbsp;
            <strong>{dedupedUnites.length} unités</strong> &nbsp;—&nbsp;
            <strong>{totalVhg} h VHG total</strong> &nbsp;—&nbsp;
            <strong>{activeWeeks.length} semaines actives</strong>
          </p>
        </div>

        {/* ── Merged Table ─────────────────────────────────────────────────── */}
        {/* Layout rationale:
             - Fixed 3 label cols take ~28% of width (Programme + N° + Unité)
             - Remaining 72% split equally among all active week columns
             - tableLayout: fixed + width: 100% ensures the table always
               spans the full printable width, whatever the column count.
        */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontSize: `${Math.max(4.5, Math.min(6.5, 200 / Math.max(activeWeeks.length, 10)))}pt`,
          fontFamily: 'Figtree, ui-sans-serif, system-ui, sans-serif',
        }}>
          <colgroup>
            {/* Programme column — fixed ~10% */}
            <col style={{ width: '10%' }} />
            {/* # — fixed ~3% */}
            <col style={{ width: '3%' }} />
            {/* Unité de formation — fixed ~15% */}
            <col style={{ width: '15%' }} />
            {/* NOTE: VHG column removed — Point 2 */}
            {/* One col per ACTIVE week — remaining 72% split equally */}
            {activeWeeks.map((w) => (
              <col key={w?.semaine || Math.random()} style={{ width: `${72 / Math.max(activeWeeks.length, 1)}%` }} />
            ))}
          </colgroup>

          <thead>
            {/* Row 1: Title + Month spans */}
            <tr>
              {/* Fixed left columns header cell spanning "Programme / # / Unité" (3 cols, VHG removed) */}
              <th
                colSpan={3}
                style={{
                  backgroundColor: '#FFE600',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '8pt',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  textAlign: 'center',
                  border: '2px solid #1e3a6e',
                  padding: '3px 5px',
                  verticalAlign: 'middle',
                }}
              >
                Plan de formation
              </th>

              {/* Month group headers — operating on activeWeeks only */}
              <MonthHeaders weeks={activeWeeks} />
            </tr>

            {/* Row 2: Sub-column labels + week Monday dates — Point 4 */}
            <tr style={{ backgroundColor: '#f0f4f8' }}>
              <th style={thStyle}>Programme</th>
              <th style={thStyle}>N°</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Unité de formation</th>
              {/* Point 4: Monday date DD/MM in week header */}
              {activeWeeks.map((w) => (
                <th key={w?.semaine || Math.random()} style={{ ...thStyle, fontSize: '5.5pt' }}>
                  {getMondayLabel(w)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {dedupedUnites.map((unite, idx) => {
              const weekMap = cellMaps[idx];

              const programmeName = unite.logigramme
                ? `${unite.logigramme.filiere?.code ?? ''} ${unite.logigramme.classe?.label ?? ''}`
                : '—';

              return (
                <tr
                  key={unite.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  {/* Programme */}
                  <td style={{ ...tdStyle, fontSize: '5.5pt', fontWeight: 700, color: '#1e3a6e' }}>
                    {programmeName}
                  </td>
                  {/* Numéro */}
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>
                    {idx + 1}
                  </td>
                  {/* Unité name */}
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700, maxWidth: '138px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                    title={unite.nom}>
                    {unite.nom}
                  </td>
                  {/* VHG column REMOVED — Point 2 */}
                  {/* Active week cells only — Point 3 */}
                  {activeWeeks.map((w) => {
                    const cell = w ? weekMap[w.semaine] : null;
                    return (
                      <td
                        key={w?.semaine || Math.random()}
                        onContextMenu={onContextMenu ? (e) => onContextMenu(e, unite, w?.semaine, cell) : undefined}
                        style={{
                          ...tdStyle,
                          textAlign: 'center',
                          backgroundColor: getCellColor(cell),
                          fontSize: '6pt',
                          fontWeight: cell?.heures ? 800 : 400,
                          padding: '2px 1px',
                        }}
                      >
                        {cell?.heures ? cell.heures : ''}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Legend (print version — compact) ─────────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '6px',
          flexWrap: 'wrap',
          fontSize: '6.5pt',
          color: '#374151',
        }}>
          <LegendItem color="#FEF9C3" label="Session normale" />
          <LegendItem color="#BBF7D0" label="Terminé" />
          <LegendItem color="#F472B6" label="Vacance" />
          <LegendItem color="#e2e8f0" label="Examen" />
          <LegendItem color="#facc15" label="TIFF / Clôture" />
        </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Renders the month-spanning header cells for (filtered) week columns */
function MonthHeaders({ weeks }) {
  // Group consecutive weeks by month name
  const groups = [];
  weeks.forEach((w) => {
    if (!w) return;
    const month = getMonthName(w.week_start_date);
    const last = groups[groups.length - 1];
    if (last && last.month === month) {
      last.count++;
    } else {
      groups.push({ month, count: 1 });
    }
  });

  return groups.map((g, i) => (
    <th
      key={i}
      colSpan={g.count}
      style={{
        backgroundColor: '#dbeafe',
        color: '#1e3a6e',
        fontWeight: 800,
        fontSize: '7pt',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        textAlign: 'center',
        border: '2px solid #1e3a6e',
        padding: '3px 2px',
        verticalAlign: 'middle',
      }}
    >
      {g.month}
    </th>
  ));
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      <div style={{
        width: '9px',
        height: '9px',
        backgroundColor: color,
        border: '1px solid #374151',
        borderRadius: '2px',
        flexShrink: 0,
      }} />
      <span>{label}</span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCellColor(cell) {
  if (!cell) return 'transparent';
  switch (cell.cell_type) {
    case 'vacation':  return '#F472B6';
    case 'exam':      return '#e2e8f0';
    case 'tiff':      return '#facc15';
    case 'normal':
      if (cell.completion_status === 'done' || cell.completion_status === 'auto_done') {
        return '#BBF7D0';
      }
      return '#FEF9C3';
    default:          return 'transparent';
  }
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getMonthName(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return MONTHS_FR[d.getMonth()] || '—';
}

/**
 * Point 4: Returns the Monday date as "DD/MM" for a week object.
 * Uses week_start_date when available, otherwise falls back to the
 * semaine identifier (which may itself be a date string or week number).
 */
function getMondayLabel(week) {
  if (!week) return '—';
  // Prefer the explicit week_start_date field
  const src = week.week_start_date || week.semaine;
  if (!src) return week.semaine ?? '—';

  // Try parsing as a date
  const d = new Date(src);
  if (!isNaN(d.getTime())) {
    const day   = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  // Fallback: return as-is (e.g. "S36")
  return String(src);
}

// ── Shared cell styles (plain JS objects — no Tailwind needed here) ──────────

// Point 5: borders use solid black for guaranteed print rendering
const thStyle = {
  backgroundColor: '#f0f4f8',
  color: '#0f172a',
  fontWeight: 800,
  fontSize: '6.5pt',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  textAlign: 'center',
  border: '1.5px solid #334155',   // stronger border for print
  padding: '3px 2px',
  verticalAlign: 'middle',
};

const tdStyle = {
  border: '1px solid #475569',     // stronger than #cbd5e1 for print
  padding: '2px 2px',
  verticalAlign: 'middle',
  fontSize: '6.5pt',
  color: '#0f172a',
};
