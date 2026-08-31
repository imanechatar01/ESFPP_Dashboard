import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  GraduationCap,
  Layers3,
  Loader2,
  Mail,
  PlayCircle,
  RefreshCw,
  UserRound,
  Video,
} from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { useAuth } from "@/contexts/auth-context"
import { apiRequest } from "@/lib/api"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Mon espace", path: "/student/dashboard", icon: BookOpenCheck },
  { label: "Cours & Vidéos", path: "/student/courses", icon: Video },
  { label: "Mes examens", path: "/student/exams", icon: ClipboardCheck },
]

function formatDate(value) {
  if (!value) return "Date à confirmer"

  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return "Date à confirmer"

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Chargement du tableau de bord">
      <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  )
}

export function StudentDashboard({ path, navigate }) {
  const { user } = useAuth()
  const metadata = user?.user_metadata || {}
  const firstName = metadata.first_name || metadata.prenom || user?.email?.split("@")[0] || "Étudiant"
  const fullName = [
    metadata.first_name || metadata.prenom,
    metadata.last_name || metadata.nom,
  ].filter(Boolean).join(" ") || firstName
  const studentFiliereId = metadata.filiere_id || ""
  const studentClasseId = metadata.classe_id || ""

  const [courses, setCourses] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError("")

    const [coursesResult, examsResult] = await Promise.allSettled([
      apiRequest("/api/courses"),
      apiRequest("/api/exams/available"),
    ])

    if (coursesResult.status === "fulfilled") {
      setCourses(Array.isArray(coursesResult.value) ? coursesResult.value : [])
    }
    if (examsResult.status === "fulfilled") {
      setExams(Array.isArray(examsResult.value) ? examsResult.value : [])
    }

    const failedSections = [
      coursesResult.status === "rejected" ? "les cours" : null,
      examsResult.status === "rejected" ? "les examens" : null,
    ].filter(Boolean)

    if (failedSections.length) {
      setError(`Impossible de charger ${failedSections.join(" et ")}. Vous pouvez réessayer.`)
    }

    setLastUpdated(new Date())
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    if (user?.id) loadDashboard()
  }, [loadDashboard, user?.id])

  const visibleCourses = courses.filter((course) => {
    const matchesFiliere = !studentFiliereId || !course.filiere_id || course.filiere_id === studentFiliereId
    const matchesClasse = !studentClasseId || !course.classe_id || course.classe_id === studentClasseId
    return matchesFiliere && matchesClasse
  })
  const recentCourses = [...visibleCourses]
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .slice(0, 3)
  const sortedExams = [...exams]
    .filter((exam) => exam.questions?.length)
    .sort((left, right) => {
      if (!left.date) return 1
      if (!right.date) return -1
      return new Date(left.date) - new Date(right.date)
    })
  const recentExams = sortedExams.slice(0, 3)
  const completedExams = sortedExams.filter((exam) => exam.completed)
  const passedExams = sortedExams.filter((exam) => exam.result?.passed)
  const availableExams = sortedExams.filter((exam) => !exam.locked && !exam.completed)

  const courseWithFormation = visibleCourses.find((course) => course.filiere || course.classe)
  const formationName = metadata.filiere_name || courseWithFormation?.filiere?.name || "Formation non renseignée"
  const classeName = metadata.classe_name || metadata.classe_label || courseWithFormation?.classe?.label || "Classe non renseignée"

  const stats = [
    {
      label: "Cours disponibles",
      value: visibleCourses.length,
      helper: `${recentCourses.length} récent${recentCourses.length !== 1 ? "s" : ""}`,
      icon: PlayCircle,
      color: "text-primary",
      bg: "bg-primary/10",
      path: "/student/courses",
    },
    {
      label: "Examens ouverts",
      value: availableExams.length,
      helper: availableExams.length ? "À passer maintenant" : "Aucun examen ouvert",
      icon: FileCheck2,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      path: "/student/exams",
    },
    {
      label: "Examens terminés",
      value: completedExams.length,
      helper: `${sortedExams.length} examen${sortedExams.length !== 1 ? "s" : ""} au total`,
      icon: CheckCircle2,
      color: "text-accent",
      bg: "bg-accent/10",
      path: "/student/exams",
    },
    {
      label: "Examens validés",
      value: passedExams.length,
      helper: completedExams.length ? `${passedExams.length}/${completedExams.length} terminés` : "Aucun résultat final",
      icon: GraduationCap,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
      path: "/student/exams",
    },
  ]

  return (
    <DashboardShell
      title="Espace Étudiant"
      subtitle="Votre tableau de bord académique actualisé."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
      accent="student"
    >
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p className="font-semibold">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-card px-4 text-xs font-bold text-destructive transition hover:bg-destructive/5 disabled:opacity-60"
              >
                <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
                Réessayer
              </button>
            </div>
          )}

          <section className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-primary/[0.04] to-transparent p-6 shadow-sm medical-glass sm:p-8">
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                    Session {new Date().getFullYear()}
                  </span>
                  {lastUpdated && (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Mis à jour à {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
                  Bonjour, {firstName}.
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
                  Vous avez {visibleCourses.length} cours disponible{visibleCourses.length !== 1 ? "s" : ""} et {availableExams.length} examen{availableExams.length !== 1 ? "s" : ""} ouvert{availableExams.length !== 1 ? "s" : ""} dans votre espace.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/student/courses")}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                >
                  Voir mes cours
                  <ArrowRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => loadDashboard(true)}
                  disabled={refreshing}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card/80 px-4 text-sm font-bold text-muted-foreground transition hover:bg-card hover:text-foreground disabled:opacity-60"
                >
                  {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Actualiser
                </button>
              </div>
            </div>
            <GraduationCap className="pointer-events-none absolute -bottom-8 -right-5 size-44 -rotate-12 text-primary/5" />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Résumé étudiant">
            {stats.map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={() => navigate(stat.path)}
                className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={cn("flex size-10 items-center justify-center rounded-xl", stat.bg)}>
                    <stat.icon className={cn("size-5", stat.color)} />
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-4 text-2xl font-black tabular-nums text-foreground">{stat.value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{stat.label}</p>
                <p className="mt-1.5 text-[11px] font-medium text-muted-foreground/70">{stat.helper}</p>
              </button>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr_0.72fr]">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm medical-glass sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Video className="size-4.5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">Cours récents</h2>
                    <p className="text-[11px] text-muted-foreground">Les dernières ressources publiées</p>
                  </div>
                </div>
                <button type="button" onClick={() => navigate("/student/courses")} className="text-xs font-bold text-primary hover:underline">
                  Tout voir
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {recentCourses.length ? recentCourses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => navigate("/student/courses")}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-background/50 p-3 text-left transition hover:border-primary/25 hover:bg-primary/[0.03]"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <PlayCircle className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{course.title}</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">
                        {course.filiere?.name || "Toutes les filières"}{course.classe?.label ? ` · ${course.classe.label}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                )) : (
                  <div className="rounded-xl border border-dashed border-border px-4 py-9 text-center">
                    <Video className="mx-auto size-8 text-muted-foreground/20" />
                    <p className="mt-3 text-sm font-bold text-muted-foreground">Aucun cours disponible</p>
                    <p className="mt-1 text-xs text-muted-foreground/60">Les nouvelles ressources apparaîtront ici.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm medical-glass sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                    <CalendarDays className="size-4.5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">Mes examens</h2>
                    <p className="text-[11px] text-muted-foreground">Disponibilités et résultats</p>
                  </div>
                </div>
                <button type="button" onClick={() => navigate("/student/exams")} className="text-xs font-bold text-primary hover:underline">
                  Tout voir
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {recentExams.length ? recentExams.map((exam) => {
                  const completed = Boolean(exam.completed)
                  const available = !exam.locked && !completed
                  return (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => navigate("/student/exams")}
                      className="group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-background/50 p-3 text-left transition hover:border-primary/25 hover:bg-primary/[0.03]"
                    >
                      <div className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl",
                        completed ? "bg-accent/10 text-accent" : available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}>
                        {completed ? <CheckCircle2 className="size-5" /> : <ClipboardCheck className="size-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-foreground">{exam.title}</p>
                          <span className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider",
                            completed ? "bg-accent/10 text-accent" : available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                          )}>
                            {completed ? "Terminé" : available ? "Ouvert" : "Programmé"}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                          {formatDate(exam.date)} · {exam.duration || 60} min
                        </p>
                      </div>
                    </button>
                  )
                }) : (
                  <div className="rounded-xl border border-dashed border-border px-4 py-9 text-center">
                    <CalendarDays className="mx-auto size-8 text-muted-foreground/20" />
                    <p className="mt-3 text-sm font-bold text-muted-foreground">Aucun examen programmé</p>
                    <p className="mt-1 text-xs text-muted-foreground/60">Le calendrier se mettra à jour automatiquement.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm medical-glass sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <UserRound className="size-4.5" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">Mon parcours</h2>
                  <p className="text-[11px] text-muted-foreground">Informations académiques</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/60">Étudiant</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{fullName}</p>
                </div>
                <div className="border-t border-border/60 pt-4">
                  <div className="flex items-start gap-2.5">
                    <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/60">Email</p>
                      <p className="mt-1 truncate text-xs font-semibold text-foreground" title={user?.email}>{user?.email || "Non renseigné"}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-4">
                  <div className="flex items-start gap-2.5">
                    <Layers3 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/60">Filière</p>
                      <p className="mt-1 text-xs font-semibold text-foreground">{formationName}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-4">
                  <div className="flex items-start gap-2.5">
                    <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/60">Classe</p>
                      <p className="mt-1 text-xs font-semibold text-foreground">{classeName}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-accent">
                    <Clock className="size-3.5" />
                    Données synchronisées
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
