// backend/lib/ws-broadcaster.js
//
// Attaches a WebSocket server to the existing Express HTTP server.
// Only authenticated admin connections are accepted (token validated via Supabase).
// Exports broadcastToAdmins() used by the exam-reminder scheduler to push
// real-time notifications without any polling from the client.

import { WebSocketServer } from 'ws';
import { supabase } from './supabase.js';

const adminSockets = new Set();

/**
 * Attach a WebSocket server to an existing http.Server instance.
 * Clients must connect with ?token=<supabase_access_token> in the URL.
 * Only users with role=admin are accepted.
 */
export function initWsBroadcaster(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  // Ping every 30 s to detect dead connections
  const pingInterval = setInterval(() => {
    for (const ws of adminSockets) {
      if (ws.isAlive === false) {
        adminSockets.delete(ws);
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30_000);

  wss.on('close', () => clearInterval(pingInterval));

  wss.on('connection', async (ws, req) => {
    // Extract token from query string: ws://host/?token=...
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4401, 'Missing token');
      return;
    }

    // Validate via Supabase — same approach as the HTTP auth middleware
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        ws.close(4401, 'Invalid token');
        return;
      }
      const role = data.user?.user_metadata?.role;
      if (role !== 'admin') {
        ws.close(4403, 'Admin only');
        return;
      }
    } catch {
      ws.close(4401, 'Auth error');
      return;
    }

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    adminSockets.add(ws);

    ws.on('close', () => {
      adminSockets.delete(ws);
    });

    ws.on('error', () => {
      adminSockets.delete(ws);
    });
  });

  console.log('[ws-broadcaster] WebSocket broadcaster initialized.');
}

/**
 * Send an event to all connected admin sockets.
 * @param {string} eventName - e.g. 'notification:new'
 * @param {object} payload   - JSON-serialisable data
 */
export function broadcastToAdmins(eventName, payload) {
  const message = JSON.stringify({ event: eventName, data: payload });
  for (const ws of adminSockets) {
    if (ws.readyState === 1 /* WebSocket.OPEN */) {
      try { ws.send(message); } catch { /* ignore */ }
    }
  }
}
