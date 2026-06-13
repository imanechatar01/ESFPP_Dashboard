import { useState } from "react"
import { Mail, Loader2, KeyRound, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { PasswordInput } from "@/components/auth/password-input"
import { getDashboardPath, getUserRole } from "@/lib/auth"
import { supabase } from "@/supabaseClient"
import { cn } from "@/lib/utils"

export function SignInForm({ navigate }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get("email") || "").trim()
    const password = String(formData.get("password") || "")

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError("Email ou mot de passe incorrect.")
      return
    }

    navigate(getDashboardPath(getUserRole(data.user)), { replace: true })
  }

  return (
    <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 text-center sm:text-left">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 mx-auto sm:mx-0">
          <ShieldCheck className="size-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Content de vous revoir</h1>
        <p className="mt-3 text-base font-medium text-muted-foreground leading-relaxed">
          Connectez-vous à votre portail ESFPP Mohammedia pour accéder à vos outils.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Email Académique</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="votre.nom@esfpp.ma"
              className="h-12 pl-10 rounded-xl bg-background/50 focus:bg-background border-border/50"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <Label htmlFor="password" name="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mot de passe</Label>
            <a
              href="#"
              className="text-[11px] font-bold text-primary hover:underline underline-offset-4 uppercase tracking-wider"
            >
              Oublié ?
            </a>
          </div>
          <div className="relative">
             <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50 z-10" />
             <PasswordInput 
                id="password" 
                name="password" 
                autoComplete="current-password" 
                placeholder="••••••••" 
                className="h-12 pl-10 rounded-xl bg-background/50 focus:bg-background border-border/50" 
                required 
             />
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
            <Checkbox id="remember" defaultChecked className="rounded-md border-border/50" />
            Rester connecté
          </label>
        </div>

        <Button type="submit" className="h-12 w-full rounded-xl font-black text-base shadow-xl shadow-primary/20 group" disabled={loading}>
          {loading ? (
            <Loader2 className="size-5 animate-spin mr-2" />
          ) : (
            <>
              Se connecter
              <ArrowRight className="size-5 ml-2 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600 animate-in fade-in zoom-in-95 duration-200">
            {error}
          </div>
        )}
      </form>

      <div className="mt-12 text-center sm:text-left">
         <p className="text-xs font-medium text-muted-foreground/60 leading-relaxed">
           L&apos;accès à ce système est strictement réservé aux étudiants et au personnel autorisé de l&apos;ESFPP.
         </p>
      </div>
    </div>
  )
}

