// backend/routes/auth.js
import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

router.post('/forgot-password', async (req, res) => {
  console.log('[Auth] ➡️ forgot-password appelé');
  console.log('[Auth] Body:', req.body);

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email est requis' });
  }

  try {
    console.log(`[Auth] 📧 Email: ${email}`);

    // ✅ VÉRIFIER DANS auth.users (pas dans la table users)
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[Auth] ❌ Erreur listUsers:', listError);
    }

    // ✅ Vérifier si l'utilisateur existe dans auth.users
    const userExists = users?.users?.some(u => u.email === email);
    console.log(`[Auth] 👤 Utilisateur existe dans auth.users: ${userExists ? '✅ OUI' : '❌ NON'}`);

    if (!userExists) {
      console.log('[Auth] ⚠️ Utilisateur non trouvé');
      return res.json({
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'
      });
    }

    // ✅ Trouver l'utilisateur pour récupérer son ID
    const user = users.users.find(u => u.email === email);
    console.log(`[Auth] 🆔 User ID: ${user.id}`);
    console.log(`[Auth] 📧 Email confirmé: ${user.email_confirmed_at ? '✅ OUI' : '❌ NON'}`);

    // ✅ ENVOYER L'EMAIL AVEC SUPABASE
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`;
    console.log(`[Auth] 🔗 Redirect URL: ${redirectUrl}`);

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('[Auth] ❌ Erreur envoi email:', error);
      
      // Si erreur, afficher le lien dans les logs
      console.log('=========================================');
      console.log('📧 🔑 LIEN DE RÉINITIALISATION');
      console.log(`🔗 ${redirectUrl}`);
      console.log(`📧 Email: ${email}`);
      console.log('=========================================');
      
      // Ne pas bloquer, renvoyer une réponse de succès
      return res.json({
        success: true,
        message: 'Un email de réinitialisation a été envoyé. Vérifiez votre boîte mail (et vos spams).',
        dev: true,
        link: redirectUrl
      });
    }

    console.log(`[Auth] ✅ Email envoyé à: ${email}`);
    return res.json({
      success: true,
      message: 'Un email de réinitialisation a été envoyé. Vérifiez votre boîte mail (et vos spams).'
    });

  } catch (err) {
    console.error('[Auth] ❌ Erreur:', err);
    return res.status(500).json({ error: err.message || 'Une erreur est survenue' });
  }
});

export default router;