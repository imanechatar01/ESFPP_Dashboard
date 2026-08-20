// frontend/src/pages/reset-password.jsx
import { useState, useEffect } from 'react';
// ❌ Supprimer : import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, CheckCircle, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/supabaseClient';

export function ResetPassword({ navigate }) {  // ✅ Recevoir navigate en props
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [checking, setChecking] = useState(true);
  const [devEmail, setDevEmail] = useState(null);
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    async function checkToken() {
      try {
        console.log('🔍 Vérification du token...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.substring(1));
        
        const errorParam = urlParams.get('error') || hashParams.get('error');
        const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');
        
        if (errorParam === 'access_denied' || errorParam === 'otp_expired') {
          console.log('❌ Token expiré ou invalide');
          setTokenExpired(true);
          setError('Le lien de réinitialisation a expiré ou est invalide. Veuillez en demander un nouveau.');
          setIsValidToken(false);
          setChecking(false);
          return;
        }
        
        const isDev = urlParams.get('dev') === 'true';
        const email = urlParams.get('email');
        
        if (isDev && email) {
          console.log('🔧 Mode développement activé pour:', email);
          setDevEmail(email);
          setIsValidToken(true);
          setChecking(false);
          return;
        }

        if (hash && hash.includes('access_token')) {
          console.log('🔑 Token trouvé dans le hash');
          
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const type = params.get('type');
          
          console.log(`📝 Type: ${type}`);
          console.log(`🔑 Access Token: ${accessToken ? '✅ Présent' : '❌ Non trouvé'}`);
          
          if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (error) {
              console.error('❌ Erreur setSession:', error);
              if (error.message?.includes('expired')) {
                setTokenExpired(true);
                setError('Le lien a expiré. Veuillez en demander un nouveau.');
              }
              throw error;
            }
            
            console.log('✅ Session définie avec succès');
            setIsValidToken(true);
            setChecking(false);
            return;
          }
        }
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Erreur getSession:', error);
          throw error;
        }
        
        if (data.session) {
          console.log('✅ Session existante trouvée');
          setIsValidToken(true);
        } else {
          console.log('❌ Aucune session trouvée');
          setIsValidToken(false);
        }
        
      } catch (err) {
        console.error('❌ Erreur vérification token:', err);
        setIsValidToken(false);
      } finally {
        setChecking(false);
      }
    }
    
    checkToken();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('❌ Erreur mise à jour:', error);
        throw error;
      }
      
      console.log('✅ Mot de passe mis à jour avec succès');
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (tokenExpired) {
    return (
      <AuthLayout>
        <div className="text-center py-12">
          <div className="mx-auto size-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <AlertCircle className="size-7 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Lien expiré</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Le lien de réinitialisation a expiré pour des raisons de sécurité.
            <br />
            <span className="text-xs">Demandez un nouveau lien depuis la page de connexion.</span>
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="mt-4 text-xs font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="size-3.5 mr-2" />
            Retour à la connexion
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (!isValidToken) {
    return (
      <AuthLayout>
        <div className="text-center py-12">
          <div className="mx-auto size-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Lock className="size-7 text-destructive" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Lien invalide</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Le lien de réinitialisation est invalide.
            <br />
            <span className="text-xs">Demandez un nouveau lien depuis la page de connexion.</span>
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 space-y-2">
              <Button
                onClick={() => {
                  setIsValidToken(true);
                  setDevEmail('test@esfpp.ma');
                }}
                className="text-xs font-bold uppercase tracking-widest"
                variant="outline"
              >
                🔧 Mode développement
              </Button>
            </div>
          )}
          
          <Button
            onClick={() => navigate('/login')}
            className="mt-4 text-xs font-bold uppercase tracking-widest"
          >
            Retour à la connexion
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="text-center py-12">
          <div className="mx-auto size-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle className="size-7 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Mot de passe réinitialisé !</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Votre mot de passe a été modifié avec succès.
            <br />
            <span className="text-xs">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</span>
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="mt-6 text-xs font-bold uppercase tracking-widest"
          >
            Se connecter
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-foreground">Nouveau mot de passe</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Créez un nouveau mot de passe pour votre compte.
          </p>
          {devEmail && (
            <p className="text-[9px] text-amber-600 mt-2 font-bold">
              🔧 Mode développement - {devEmail}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Nouveau mot de passe
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 rounded-xl h-11"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Confirmer le mot de passe
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 rounded-xl h-11"
              required
            />
          </div>
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
              Réinitialisation...
            </>
          ) : (
            'Réinitialiser le mot de passe'
          )}
        </Button>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}