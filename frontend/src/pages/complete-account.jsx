import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, UserCheck } from "lucide-react"
import { AuthLayout } from "@/components/auth/auth-layout"
import { PasswordInput } from "@/components/auth/password-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { getDashboardPath } from "@/lib/auth"
import { apiRequest } from "@/lib/api"

function ExpiredLinkScreen({ navigate }) {
  return (
    <AuthLayout>
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Lien d'invitation invalide</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Ce lien d'invitation n'est plus valide ou a expiré.
          Veuillez contacter un administrateur pour obtenir une nouvelle invitation.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
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
      // If Supabase couldn't establish a session from the URL tokens,
      // the invitation link is expired or invalid
      setShowExpired(true)
    }
  }, [loading, user])

  // If user is already active (e.g. they navigated here by mistake), redirect
  useEffect(() => {
    if (!loading && user && role) {
      // Check if the user already has a completed profile by looking at metadata
      // If they have a password set and a name, they're likely already active
      const metadata = user.user_metadata || {}
      if (metadata.first_name && metadata.last_name && user.last_sign_in_at) {
        // User might already be active — let them proceed to form anyway
        // The backend will return 409 if they try to re-complete
      }
    }
  }, [loading, user, role])

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")

    const formData = new FormData(e.currentTarget)
    const firstName = String(formData.get("firstName") || "").trim()
    const lastName = String(formData.get("lastName") || "").trim()
    const password = String(formData.get("password") || "")
    const confirmPassword = String(formData.get("confirmPassword") || "")

    if (!firstName || !lastName || password.length < 8 || password !== confirmPassword) {
      setError("Vérifiez les champs. Le mot de passe doit contenir au moins 8 caractères et les deux mots de passe doivent correspondre.")
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
        // User's account is already active, redirect to dashboard
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
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UserCheck className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Compléter le compte</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Créez votre mot de passe et renseignez vos informations de profil.
          </p>
        </div>

        {loading ? (
          <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">Validation de l'invitation...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" name="firstName" autoComplete="given-name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" name="lastName" autoComplete="family-name" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <PasswordInput id="password" name="password" autoComplete="new-password" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required />
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !user}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Activer mon compte
            </Button>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
