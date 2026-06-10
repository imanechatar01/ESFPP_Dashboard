import { AuthLayout } from "@/components/auth/auth-layout"
import { SignInForm } from "@/components/auth/sign-in-form"
import { RequireAuth, RequireRole, LoadingScreen } from "@/components/auth/route-guards"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { getDashboardPath } from "@/lib/auth"
import { AdminDashboard } from "@/pages/admin-dashboard"
import { StudentDashboard } from "@/pages/student-dashboard"
import { AccountManagement } from "@/pages/account-management"
import { CompleteAccount } from "@/pages/complete-account"
import { useCallback, useEffect, useState } from "react"

function usePath() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const navigate = useCallback((nextPath, options = {}) => {
    if (window.location.pathname === nextPath) return
    const method = options.replace ? "replaceState" : "pushState"
    window.history[method](null, "", nextPath)
    setPath(nextPath)
  }, [])

  return { path, navigate }
}

function LoginPage({ navigate }) {
  const { loading, user, role } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      navigate(getDashboardPath(role), { replace: true })
    }
  }, [loading, navigate, role, user])

  if (loading) return <LoadingScreen />
  if (user) return null

  return (
    <AuthLayout>
      <SignInForm navigate={navigate} />
    </AuthLayout>
  )
}

function AppRoutes() {
  const { path, navigate } = usePath()

  if (path === "/" || path === "/login") {
    return <LoginPage navigate={navigate} />
  }

  if (path === "/complete-account") {
    return <CompleteAccount navigate={navigate} />
  }

  if (path === "/admin/dashboard") {
    return (
      <RequireRole role="admin" navigate={navigate}>
        <AdminDashboard path={path} navigate={navigate} />
      </RequireRole>
    )
  }

  if (path === "/admin/accounts") {
    return (
      <RequireRole role="admin" navigate={navigate}>
        <AccountManagement path={path} navigate={navigate} />
      </RequireRole>
    )
  }

  if (path === "/student/dashboard") {
    return (
      <RequireRole role="student" navigate={navigate}>
        <StudentDashboard path={path} navigate={navigate} />
      </RequireRole>
    )
  }

  return (
    <RequireAuth navigate={navigate}>
      <DashboardRedirect navigate={navigate} />
    </RequireAuth>
  )
}

function DashboardRedirect({ navigate }) {
  const { role } = useAuth()

  useEffect(() => {
    navigate(getDashboardPath(role), { replace: true })
  }, [navigate, role])

  return <LoadingScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
