import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    // 1. Get profiles stats
    // Note: since auth.users isn't easily joinable without a complex view, 
    // we use public.profiles which mirrors roles and statuses
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, status, created_at, role, first_name, last_name');

    if (profilesError) throw profilesError;

    const totalActive = profiles.filter(p => p.status === 'active').length;
    const totalInvited = profiles.filter(p => p.status === 'invited').length;
    const totalStudents = profiles.filter(p => p.role === 'student').length;
    
    // 2. Get courses stats
    const { count: totalCourses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('*', { count: 'exact', head: true });

    if (coursesError) throw coursesError;

    // 3. Get controles stats
    const { data: controles, error: controlesError } = await supabaseAdmin
      .from('controles')
      .select('id, statut, created_at, date_controle');

    if (controlesError) throw controlesError;

    const totalControles = controles.length;
    const pendingControles = controles.filter(c => c.statut === 'pending').length;

    // 4. Get filieres stats
    const { count: totalFilieres, error: filieresError } = await supabaseAdmin
      .from('filieres')
      .select('*', { count: 'exact', head: true });

    if (filieresError) throw filieresError;

    // 5. Get recent activity
    const recentProfiles = profiles
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(p => ({
        type: p.status === 'invited' ? 'invitation' : 'profile',
        id: p.id,
        created_at: p.created_at,
        title: p.status === 'invited' ? 'Invitation envoyée' : 'Nouveau profil créé',
        subtitle: `${p.first_name} ${p.last_name}`.trim() || 'Utilisateur inconnu'
      }));

    const recentControles = controles
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(c => ({
        type: 'controle',
        id: c.id,
        created_at: c.created_at,
        title: 'Nouveau contrôle programmé',
        subtitle: c.date_controle ? new Date(c.date_controle).toLocaleDateString('fr-FR') : 'Date non définie'
      }));

    // Merge and sort combined activity
    const recentActivity = [...recentProfiles, ...recentControles]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    res.json({
      stats: {
        activeAccounts: totalActive,
        pendingInvitations: totalInvited,
        totalStudents: totalStudents,
        totalCourses: totalCourses || 0,
        pendingControles: pendingControles,
        totalControles: totalControles,
        totalFilieres: totalFilieres || 0
      },
      recentActivity
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
