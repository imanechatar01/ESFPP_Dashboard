// backend/routes/auth.js
import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

router.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Une adresse email valide est requise' });
  }

  try {
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('[Auth] Password recovery email failed:', error.message);
      return res.status(502).json({
        error: "Le lien de réinitialisation n'a pas pu être envoyé. Veuillez réessayer.",
      });
    }

    return res.json({
      success: true,
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'
    });

  } catch (err) {
    console.error('[Auth] Password recovery failed:', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue. Veuillez réessayer.' });
  }
});

export default router;
