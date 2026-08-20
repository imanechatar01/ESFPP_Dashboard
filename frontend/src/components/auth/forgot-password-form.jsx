// frontend/src/components/auth/forgot-password-form.jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, CheckCircle, Loader2, Copy, Link } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export function ForgotPasswordForm({ navigate }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [devLink, setDevLink] = useState(null);
  const [devEmail, setDevEmail] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      
      // Si c'est le mode développement, on récupère le lien
      if (response.dev) {
        setDevLink(response.link);
        setDevEmail(response.email);
      }
      
      setSent(true);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Feedback visuel rapide
    const btn = document.activeElement;
    if (btn) {
      btn.textContent = '✅ Copié !';
      setTimeout(() => {
        btn.textContent = '📋 Copier';
      }, 2000);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto size-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle className="size-7 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Email envoyé !</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Un lien de réinitialisation a été envoyé à <strong className="text-foreground">{email}</strong>.
          <br />
          <span className="text-xs">Vérifiez votre boîte mail (et vos spams).</span>
        </p>
        
        {/* Mode développement : afficher le lien */}
        {devLink && devEmail && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">
              🔧 Mode développement
            </p>
            <p className="text-xs font-mono text-amber-800 break-all mt-2">
              Lien de réinitialisation :
              <br />
              <a 
                href={devLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline break-all"
              >
                {devLink}
              </a>
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => copyToClipboard(devLink)}
                className="flex items-center gap-1 px-3 py-1 bg-amber-200/50 hover:bg-amber-200 rounded-lg text-[9px] font-bold text-amber-800 transition-colors"
              >
                <Copy className="size-3" />
                Copier
              </button>
              <button
                onClick={() => window.open(devLink, '_blank')}
                className="flex items-center gap-1 px-3 py-1 bg-primary/10 hover:bg-primary/20 rounded-lg text-[9px] font-bold text-primary transition-colors"
              >
                <Link className="size-3" />
                Ouvrir
              </button>
            </div>
            <p className="text-[8px] text-amber-700 mt-2">
              ⚠️ Ce lien n'apparaît qu'en mode développement.
            </p>
          </div>
        )}
        
        <Button
          variant="ghost"
          onClick={() => navigate('/login')}
          className="mt-6 text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="size-3.5 mr-2" />
          Retour à la connexion
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-foreground">Mot de passe oublié</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Entrez votre email académique pour recevoir un lien de réinitialisation.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          Email académique
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="votre.nom@esfpp.ma"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 rounded-xl h-11"
            required
          />
        </div>
        <p className="text-[9px] text-muted-foreground/60 mt-1">
          Utilisez votre email académique (@esfpp.ma)
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-[10px] font-bold text-destructive">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px] h-11"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Envoi en cours...
          </>
        ) : (
          'Envoyer le lien de réinitialisation'
        )}
      </Button>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
        >
          <ArrowLeft className="size-3" />
          Retour à la connexion
        </button>
      </div>
    </form>
  );
}