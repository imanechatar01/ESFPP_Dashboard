import { AuthLayout } from "@/components/auth/auth-layout"
import { SignInForm } from "@/components/auth/sign-in-form"
import { RequireAuth, RequireRole, LoadingScreen } from "@/components/auth/route-guards"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { getDashboardPath } from "@/lib/auth"
import { AdminDashboard } from "@/pages/admin-dashboard"
import { StudentDashboard } from "@/pages/student-dashboard"
import { AccountManagement } from "@/pages/account-management"
import { CompleteAccount } from "@/pages/complete-account"
import { LogigrammeView } from "@/pages/logigramme-view"
import FilieresManagement from "@/pages/filieres-management"
import FormateursManagement from "@/pages/formateurs-management"
import AcademicYears from "@/pages/academic-years"
import { AdminCourses } from "@/pages/admin-courses"
import { StudentCourses } from "@/pages/student-courses"
import { LogigrammeProvider } from "@/contexts/logigramme-context"
import { useCallback, useEffect, useState } from "react"
import { ControlsManagement } from './pages/controls-management' // ✅ AJOUTER CETTE LIGNE
import { ExamsManagement } from "@/pages/exams-management"
import { StudentExam } from "@/pages/student-exam"
import { ExamResults } from "@/pages/exam-results"

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

  if (path.startsWith("/admin/")) {
    return (
      <RequireRole role="admin" navigate={navigate}>
        <LogigrammeProvider>
          {path === "/admin/dashboard" && <AdminDashboard path={path} navigate={navigate} />}
          {path === "/admin/accounts" && <AccountManagement path={path} navigate={navigate} />}
          {path === "/admin/logigrammes" && <LogigrammeView path={path} navigate={navigate} />}
          {path === "/admin/filieres" && <FilieresManagement path={path} navigate={navigate} />}
          {path === "/admin/formateurs" && <FormateursManagement path={path} navigate={navigate} />}
          {path === "/admin/academic-years" && <AcademicYears path={path} navigate={navigate} />}
          {path === "/admin/courses" && <AdminCourses path={path} navigate={navigate} />}
          {path === "/admin/controls" && <ControlsManagement path={path} navigate={navigate} />} {/* ✅ AJOUTER CETTE LIGNE */}
          {path === "/admin/exams" && <ExamsManagement path={path} navigate={navigate} />}
          {path === "/admin/exam-results" && <ExamResults path={path} navigate={navigate} />}
        </LogigrammeProvider>
      </RequireRole>
    )
  }

  if (path.startsWith("/student/")) {
    return (
      <RequireRole role="student" navigate={navigate}>
        {path === "/student/dashboard" && <StudentDashboard path={path} navigate={navigate} />}
        {path === "/student/courses" && <StudentCourses path={path} navigate={navigate} />}
        {path === "/student/exams" && <StudentExam navigate={navigate} />}
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
