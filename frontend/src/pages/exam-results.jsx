import { useEffect, useMemo, useState } from "react"
import {
  Award,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Loader2,
  Search,
  UserRound,
  Users,
  XCircle,
} from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { apiRequest } from "@/lib/api"

function formatDate(value) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function ExamResults({ path, navigate }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedStudentId, setExpandedStudentId] = useState(null)

  useEffect(() => {
    let active = true

    apiRequest("/api/exams/results")
      .then((data) => {
        if (active) setResults(Array.isArray(data) ? data : [])
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Impossible de charger les notes.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const students = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const grouped = new Map()

    for (const result of results) {
      const matchesTerm =
        !term ||
        result.studentName?.toLowerCase().includes(term) ||
        result.studentEmail?.toLowerCase().includes(term) ||
        result.examTitle?.toLowerCase().includes(term)
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "passed" && result.passed) ||
        (statusFilter === "failed" && !result.passed)

      if (!matchesTerm || !matchesStatus) continue

      if (!grouped.has(result.studentId)) {
        grouped.set(result.studentId, {
          id: result.studentId,
          name: result.studentName,
          email: result.studentEmail,
          exams: [],
        })
      }
      grouped.get(result.studentId).exams.push(result)
    }

    return [...grouped.values()]
      .map((student) => ({
        ...student,
        exams: student.exams.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
  }, [results, searchTerm, statusFilter])

  const stats = useMemo(() => {
    const studentCount = new Set(results.map((result) => result.studentId)).size
    const passed = results.filter((result) => result.passed).length
    const failed = results.length - passed
    const average = results.length
      ? Math.round(results.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / results.length)
      : 0
    return { studentCount, passed, failed, average }
  }, [results])

  return (
    <DashboardShell
      title="Notes des étudiants"
      subtitle="Consultez la note finale de chaque examen, regroupée par étudiant."
      activePath={path}
      navigate={navigate}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Étudiants", value: stats.studentCount, icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "Examens validés", value: stats.passed, icon: CheckCircle2, color: "text-accent", bg: "bg-accent/10" },
            { label: "Examens non validés", value: stats.failed, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
            { label: "Moyenne finale", value: `${stats.average}%`, icon: Award, color: "text-primary", bg: "bg-primary/10" },
          ].map((stat) => (
            <article key={stat.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className={`flex size-10 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`size-5 ${stat.color}`} />
              </div>
              <p className="mt-4 text-2xl font-black text-foreground">{stat.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Résultats par étudiant</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Une seule fiche par étudiant. Cliquez dessus pour consulter ses examens.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Étudiant ou examen..."
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary sm:w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
              >
                <option value="all">Tous les résultats</option>
                <option value="passed">Validés</option>
                <option value="failed">Non validés</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="m-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-semibold text-destructive">
              {error}
            </div>
          ) : students.length ? (
            <div className="divide-y divide-border">
              {students.map((student) => {
                const expanded = expandedStudentId === student.id
                const passedCount = student.exams.filter((exam) => exam.passed).length
                const average = Math.round(
                  student.exams.reduce((sum, exam) => sum + Number(exam.percentage || 0), 0) /
                    student.exams.length,
                )

                return (
                  <article key={student.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedStudentId(expanded ? null : student.id)}
                      className="grid w-full gap-4 px-5 py-4 text-left transition hover:bg-muted/30 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
                      aria-expanded={expanded}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <UserRound className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{student.name}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">{student.exams.length}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Examen(s)</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-accent">{passedCount}/{student.exams.length}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Validé(s)</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div>
                          <p className="text-sm font-black text-primary">{average}%</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Moyenne</p>
                        </div>
                        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-border bg-muted/20 px-4 py-4 sm:px-6">
                        <div className="overflow-x-auto rounded-xl border border-border bg-card">
                          <table className="w-full min-w-[760px] text-left">
                            <thead className="bg-muted/50 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              <tr>
                                <th className="px-4 py-3">Examen</th>
                                <th className="px-4 py-3">Tentative finale</th>
                                <th className="px-4 py-3">Note finale</th>
                                <th className="px-4 py-3">Statut</th>
                                <th className="px-4 py-3">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {student.exams.map((exam) => (
                                <tr key={exam.id} className="text-xs">
                                  <td className="px-4 py-3 font-semibold text-foreground">{exam.examTitle}</td>
                                  <td className="px-4 py-3 text-muted-foreground">N° {exam.attemptNumber}</td>
                                  <td className="px-4 py-3">
                                    <p className={`text-base font-black ${exam.passed ? "text-accent" : "text-destructive"}`}>
                                      {Math.round(Number(exam.percentage || 0))}%
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">{exam.score}/{exam.totalQuestions}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${
                                      exam.passed ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                                    }`}>
                                      {exam.passed ? "Validé" : "Non validé"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">{formatDate(exam.submittedAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-16 text-center">
              <FileCheck2 className="mx-auto size-10 text-muted-foreground/30" />
              <h3 className="mt-3 text-sm font-bold text-foreground">Aucun étudiant trouvé</h3>
              <p className="mt-1 text-xs text-muted-foreground">Les fiches apparaîtront après la soumission des examens.</p>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  )
}
