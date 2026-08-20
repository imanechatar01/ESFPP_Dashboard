// frontend/src/hooks/useNotifications.js
// Fetches admin notifications and maintains real-time updates via WebSocket.
// Falls back to 60s polling if WS is unavailable.
// No localStorage/sessionStorage usage — state lives in React only.
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import {
  connectNotificationWs,
  disconnectNotificationWs,
  addNotificationWsListener,
} from '../lib/notification-ws';

const POLL_INTERVAL_MS = 60_000; // 60 seconds (fallback)

export function useNotifications() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const data = await apiRequest('/api/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Mark a single notification as read
  const markRead = useCallback(async (id) => {
    if (!isAdmin) return;
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }, [isAdmin]);

  // Mark all notifications as read
  const markAllRead = useCallback(async () => {
    if (!isAdmin) return;
    try {
      await apiRequest('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, [isAdmin]);

  // Clear all notifications (DELETE)
  const clearAll = useCallback(async () => {
    if (!isAdmin) return;
    try {
      await apiRequest('/api/notifications/clear-all', { method: 'DELETE' });
      setNotifications([]);
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, [isAdmin]);

  // Initial fetch + polling fallback
  useEffect(() => {
    if (!isAdmin) return;
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAdmin, fetchNotifications]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!isAdmin) return;

    connectNotificationWs();

    const removeListener = addNotificationWsListener((msg) => {
      if (msg.event === 'notification:new') {
        const newNotif = msg.data;
        setNotifications(prev => {
          // Deduplicate by exam_cell_id + notified_date
          const alreadyExists = prev.some(
            n => n.exam_cell_id === newNotif.exam_cell_id &&
                 n.notified_date === newNotif.notified_date
          );
          if (alreadyExists) return prev;
          return [newNotif, ...prev];
        });
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      removeListener();
      disconnectNotificationWs();
    };
  }, [isAdmin]);

  return { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead, clearAll };
}
