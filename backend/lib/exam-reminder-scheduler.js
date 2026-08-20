// backend/lib/exam-reminder-scheduler.js
//
// Rationale for this approach:
// No cron library nor Supabase Edge Function scheduler exist in this project.
// A lightweight `setInterval` started once at server boot is the simplest solution
// compatible with the Express-only architecture and requires zero new dependencies.
// It runs every 24 h and is idempotent: the UNIQUE (exam_cell_id, notified_date)
// constraint in admin_notifications guarantees at most one row per exam per day
// even if the interval fires twice (e.g., after a server restart on the same day).

import { supabaseAdmin } from './supabase.js';
import { broadcastToAdmins } from './ws-broadcaster.js';

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check for upcoming exam cells (not yet done, within the next 7 days)
 * and insert a notification for today if one hasn't been sent yet.
 */
export async function runExamReminderCheck() {
  const today = new Date();
  // Use local YYYY-MM-DD for the deduplication key
  const todayISO = today.toISOString().split('T')[0];

  // Window: today .. today + 7 days
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);
  const in7DaysISO = in7Days.toISOString().split('T')[0];

  console.log(`[exam-reminder] Running check for ${todayISO} → ${in7DaysISO}`);

  try {
    // 1. Fetch all exam cells whose week_start_date is within the next 7 days
    //    (week_start_date = Monday of that exam week, so the exam is "this week or next 7 days")
    const { data: examCells, error: cellsError } = await supabaseAdmin
      .from('week_cells')
      .select(`
        id,
        semaine,
        week_start_date,
        unite_id,
        unite:unites_formation (
          id,
          nom,
          formateur_id,
          formateur:formateurs ( id, nom ),
          logigramme:logigrammes (
            id,
            filiere:filieres ( code, name ),
            classe:classes ( label )
          )
        )
      `)
      .eq('cell_type', 'exam')
      .gte('week_start_date', todayISO)
      .lte('week_start_date', in7DaysISO);

    if (cellsError) throw cellsError;
    if (!examCells || examCells.length === 0) {
      console.log('[exam-reminder] No upcoming exam cells found.');
      return;
    }

    const examCellIds = examCells.map(c => c.id);

    // 2. Among those, filter out cells that are already marked done/auto_done
    const { data: doneCompletions, error: completionsError } = await supabaseAdmin
      .from('completions')
      .select('cell_id, status')
      .in('cell_id', examCellIds)
      .in('status', ['done', 'auto_done']);

    if (completionsError) throw completionsError;

    const doneIds = new Set((doneCompletions || []).map(c => c.cell_id));
    const pendingExamCells = examCells.filter(c => !doneIds.has(c.id));

    if (pendingExamCells.length === 0) {
      console.log('[exam-reminder] All upcoming exam cells are already done.');
      return;
    }

    // 3. For each pending exam cell, try to insert today's notification.
    //    The UNIQUE (exam_cell_id, notified_date) constraint will silently reject
    //    a duplicate insert (we use upsert with ignoreDuplicates).
    const notifications = pendingExamCells.map(cell => {
      const filiere = cell.unite?.logigramme?.filiere;
      const classe = cell.unite?.logigramme?.classe;
      const uniteName = cell.unite?.nom || 'Unité inconnue';
      const weekDate = cell.week_start_date;
      const formateurNom = cell.unite?.formateur?.nom || null;

      const contextLabel = [
        filiere ? `${filiere.code} – ${filiere.name}` : null,
        classe ? classe.label : null,
      ].filter(Boolean).join(' / ');

      const formateurLabel = formateurNom ? ` — ${formateurNom}` : '';
      const message = `EXAMEN à venir (semaine du ${weekDate}) — ${uniteName}${contextLabel ? ` [${contextLabel}]` : ''}${formateurLabel}`;

      return {
        type: 'exam_reminder',
        exam_cell_id: cell.id,
        notified_date: todayISO,
        message,
        is_read: false,
      };
    });

    const { error: insertError } = await supabaseAdmin
      .from('admin_notifications')
      .upsert(notifications, {
        onConflict: 'exam_cell_id,notified_date',
        ignoreDuplicates: true,
      });

    if (insertError) throw insertError;

    // Broadcast each notification to connected admin sockets
    for (const notif of notifications) {
      broadcastToAdmins('notification:new', {
        id: `temp-${notif.exam_cell_id}-${notif.notified_date}`,
        type: notif.type,
        exam_cell_id: notif.exam_cell_id,
        notified_date: notif.notified_date,
        message: notif.message,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    console.log(`[exam-reminder] Inserted/skipped ${notifications.length} notification(s) for ${todayISO}.`);
  } catch (err) {
    // Log but do not crash the server process
    console.error('[exam-reminder] Scheduler error:', err.message);
  }
}

/**
 * Start the recurring 24-hour exam reminder scheduler.
 * Runs once immediately at startup, then every 24 h.
 */
export function startExamReminderScheduler() {
  // First run: slight delay to let Supabase connections settle after boot
  setTimeout(runExamReminderCheck, 5_000);

  // Recurring: every 24 h
  setInterval(runExamReminderCheck, INTERVAL_MS);
  console.log('[exam-reminder] Scheduler started (interval: 24 h).');
}
