import { supabase } from './supabase.js';

export function getRole(user) {
  return user?.user_metadata?.role === 'admin' ? 'admin' : 'student';
}

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  req.user = data.user;
  req.role = getRole(data.user);
  next();
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
