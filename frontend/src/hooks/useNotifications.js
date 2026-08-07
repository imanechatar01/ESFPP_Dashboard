// frontend/src/hooks/useNotifications.js
// Fetches admin notifications from the backend and polls every 60 s.
// No localStorage/sessionStorage usage — state lives in React only.
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/auth-context';

const POLL_INTERVAL_MS = 60_000; // 60 seconds

export function useNotifications() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAdmin) return; // Students never call this endpoint (would 403)
    try {
      setLoading(true);
      const data = await apiRequest('/api/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Silently ignore — the bell just won't update (network error, etc.)
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

  // Mark all notifications as read (called when dropdown opens)
  const markAllRead = useCallback(async () => {
    if (!isAdmin || unreadCount === 0) return;
    try {
      await apiRequest('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, [isAdmin, unreadCount]);

  useEffect(() => {
    if (!isAdmin) return; // No interval for students
    fetchNotifications();

    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAdmin, fetchNotifications]);

  return { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead };
}
