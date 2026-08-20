// frontend/src/lib/notification-ws.js
// Manages a single WebSocket connection to the backend for real-time notifications.
// The connection is lazy (created on first call to connect()) and auto-reconnects.
import { supabase } from '@/supabaseClient';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/^http/, 'ws');

let ws = null;
let reconnectTimer = null;
let shouldReconnect = true;
const listeners = new Set();

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function connectNotificationWs() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  const token = await getToken();
  if (!token) return;

  shouldReconnect = true;
  ws = new WebSocket(`${WS_BASE}/?token=${encodeURIComponent(token)}`);

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      for (const fn of listeners) fn(msg);
    } catch { /* ignore */ }
  };

  ws.onclose = (evt) => {
    ws = null;
    // Don't reconnect if closed intentionally (code 4401/4403) or disconnected by app
    if (!shouldReconnect || evt.code === 4401 || evt.code === 4403) return;
    // Reconnect after 5s
    reconnectTimer = setTimeout(connectNotificationWs, 5_000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function disconnectNotificationWs() {
  shouldReconnect = false;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}

export function addNotificationWsListener(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
