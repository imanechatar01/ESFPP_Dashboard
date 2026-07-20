import { supabase } from './supabase.js';

const AUTH_CACHE_TTL_MS = 30_000;
const MAX_AUTH_CACHE_ENTRIES = 500;
const verifiedUsers = new Map();
const pendingVerifications = new Map();

export function getRole(user) {
  return user?.user_metadata?.role === 'admin' ? 'admin' : 'student';
}

function cacheVerifiedUser(token, user) {
  const now = Date.now();

  for (const [cachedToken, entry] of verifiedUsers) {
    if (entry.expiresAt <= now) verifiedUsers.delete(cachedToken);
  }

  if (verifiedUsers.size >= MAX_AUTH_CACHE_ENTRIES) {
    verifiedUsers.delete(verifiedUsers.keys().next().value);
  }

  verifiedUsers.set(token, { user, expiresAt: now + AUTH_CACHE_TTL_MS });
}

async function getVerifiedUser(token) {
  const cached = verifiedUsers.get(token);
  if (cached?.expiresAt > Date.now()) return cached.user;
  if (cached) verifiedUsers.delete(token);

  if (!pendingVerifications.has(token)) {
    const verification = supabase.auth.getUser(token)
      .then(({ data, error }) => {
        if (error || !data.user) {
          const authError = new Error('Invalid session');
          authError.status = 401;
          throw authError;
        }

        cacheVerifiedUser(token, data.user);
        return data.user;
      })
      .finally(() => pendingVerifications.delete(token));

    pendingVerifications.set(token, verification);
  }

  return pendingVerifications.get(token);
}

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const user = await getVerifiedUser(token);
    req.user = user;
    req.role = getRole(user);
    next();
  } catch (error) {
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    console.error('Authentication service unavailable:', error.message);
    return res.status(503).json({ error: 'Authentication service temporarily unavailable' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export function requireServiceRole(req, res, next) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY' });
  }
  next();
}
