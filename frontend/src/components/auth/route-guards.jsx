import { useEffect } from "react"
import { getDashboardPath } from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"

export function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        Chargement de la session...
      </div>
    </main>
  )
}

export function RequireAuth({ children, navigate }) {
  const { loading, user } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true })
    }
  }, [loading, navigate, user])

  if (loading) return <LoadingScreen />
  if (!user) return null

  return children
}

export function RequireRole({ role, children, navigate }) {
  const { loading, user, role: currentRole } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    if (currentRole !== role) {
      navigate(getDashboardPath(currentRole), { replace: true })
    }
  }, [currentRole, loading, navigate, role, user])

  if (loading) return <LoadingScreen />
  if (!user || currentRole !== role) return null

  return children
}
