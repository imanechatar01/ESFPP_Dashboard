import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, UserCheck, ShieldCheck, UserCircle, KeyRound, ArrowRight } from "lucide-react"
import { AuthLayout } from "@/components/auth/auth-layout"
import { PasswordInput } from "@/components/auth/password-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { getDashboardPath } from "@/lib/auth"
import { apiRequest } from "@/lib/api"
import { cn } from "@/lib/utils"

function ExpiredLinkScreen({ navigate }) {
  return (
    <AuthLayout>
      <div className="w-full max-w-sm text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 shadow-sm">
          <AlertTriangle className="size-10" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Lien expiré</h1>
        <p className="mt-4 text-base font-medium leading-relaxed text-muted-foreground">
          Ce lien d'invitation n'est plus valide ou a déjà été utilisé.
          Veuillez contacter l'administration de l'ESFPP pour obtenir une nouvelle invitation.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-8 h-12 px-8 rounded-xl font-bold border-border hover:bg-muted transition-all"
          onClick={() => navigate("/login", { replace: true })}
        >
          Retour à la connexion
        </Button>
      </div>
    </AuthLayout>
  )
}

export function CompleteAccount({ navigate }) {
  const { loading, user, role } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showExpired, setShowExpired] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      setShowExpired(true)
    }
  }, [loading, user])

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")

    const formData = new FormData(e.currentTarget)
    const firstName = String(formData.get("firstName") || "").trim()
    const lastName = String(formData.get("lastName") || "").trim()
    const password = String(formData.get("password") || "")
    const confirmPassword = String(formData.get("confirmPassword") || "")

    if (!firstName || !lastName || password.length < 8 || password !== confirmPassword) {
      setError("Veuillez vérifier les informations. Le mot de passe doit contenir au moins 8 caractères et les deux champs doivent correspondre.")
      return
    }

    setSubmitting(true)

    try {
      const result = await apiRequest("/api/complete-account", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, password }),
      })

      navigate(getDashboardPath(result.role || role), { replace: true })
    } catch (err) {
      setSubmitting(false)

      if (err.message.includes("already activated")) {
        navigate(getDashboardPath(role), { replace: true })
        return
      }

      setError(err.message)
    }
  }

  if (showExpired) {
    return <ExpiredLinkScreen navigate={navigate} />
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10 text-center sm:text-left">
          <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 mx-auto sm:mx-0">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Activez votre compte</h1>
          <p className="mt-3 text-base font-medium text-muted-foreground leading-relaxed">
            Bienvenue à l'ESFPP. Définissez votre identité et sécurisez votre accès.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border/50">
             <Loader2 className="size-5 animate-spin text-primary" />
             <p className="text-sm font-bold text-muted-foreground">Validation de l'accès...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Prénom</Label>
                <div className="relative">
                  <Input id="firstName" name="firstName" autoComplete="given-name" required className="h-11 rounded-xl bg-background/50 focus:bg-background border-border/50 pl-10" />
                  <UserCircle className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Nom</Label>
                <Input id="lastName" name="lastName" autoComplete="family-name" required className="h-11 rounded-xl bg-background/50 focus:bg-background border-border/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" title="Au moins 8 caractères" className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Mot de passe</Label>
              <div className="relative">
                <PasswordInput id="password" name="password" autoComplete="new-password" required className="h-11 rounded-xl bg-background/50 focus:bg-background border-border/50 pl-10" />
                <KeyRound className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Confirmation</Label>
              <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required className="h-11 rounded-xl bg-background/50 focus:bg-background border-border/50" />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full h-12 rounded-xl font-black text-base shadow-xl shadow-primary/20 group" disabled={submitting || !user}>
                {submitting ? (
                  <Loader2 className="size-5 animate-spin mr-2" />
                ) : (
                  <>
                    Finaliser mon inscription
                    <ArrowRight className="size-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600 animate-in fade-in zoom-in-95 duration-200">
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </AuthLayout>
  )
}

