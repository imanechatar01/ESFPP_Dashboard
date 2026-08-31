// frontend/src/components/auth/forgot-password-form.jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { publicApiRequest } from '@/lib/api';

export function ForgotPasswordForm({ navigate }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      await publicApiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail }),
      });

      setEmail(normalizedEmail);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto size-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle className="size-7 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Demande envoyée</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Si un compte existe pour <strong className="text-foreground">{email}</strong>, vous recevrez un lien de réinitialisation.
          <br />
          <span className="text-xs">Vérifiez votre boîte mail (et vos spams).</span>
        </p>
        
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
