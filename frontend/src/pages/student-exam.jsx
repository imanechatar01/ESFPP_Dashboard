import { useCallback, useEffect, useMemo, useState } from "react"
import Swal from "sweetalert2"
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  HeartPulse,
  ListChecks,
  Play,
  ShieldCheck,
  Video,
} from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { useAuth } from "@/contexts/auth-context"
import { apiRequest } from "@/lib/api"

const EXAMS_STORAGE_KEY = "esfpp-admin-exams"

const navItems = [
  { label: "Mon espace", path: "/student/dashboard", icon: BookOpenCheck },
  { label: "Cours & Vidéos", path: "/student/courses", icon: Video },
  { label: "Mes examens", path: "/student/exams", icon: ClipboardCheck },
]

const FALLBACK_EXAM = {
  id: "student-final-introduction",
  title: "Examen Final : Introduction",
  date: "",
  duration: 60,
  locked: true,
  questions: [
    {
      id: "intro-question-1",
      statement: "Quelle est la première étape avant tout soin au patient ?",
      options: [
        "Vérifier son identité",
        "Préparer sa sortie",
        "Contacter sa famille",
        "Administrer un traitement",
      ],
      correctAnswer: 0,
    },
  ],
}

function readExams() {
  try {
    const value = window.localStorage.getItem(EXAMS_STORAGE_KEY)
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) && parsed.length ? parsed : [FALLBACK_EXAM]
  } catch {
    return [FALLBACK_EXAM]
  }
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function Brand() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <HeartPulse className="size-4.5" />
      </div>
      <div className="text-left">
        <p className="text-sm font-bold leading-none text-foreground">ESFPP</p>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Espace examen
        </p>
      </div>
    </div>
  )
}

function StudentExamShell({ navigate, children }) {
  return (
    <DashboardShell
      title="Mes examens"
      subtitle="Consultez les examens disponibles et suivez vos sessions."
      navItems={navItems}
      activePath="/student/exams"
      navigate={navigate}
      accent="student"
    >
      {children}
    </DashboardShell>
  )
}

function WaitingRoom({ navigate }) {
  return (
    <StudentExamShell navigate={navigate}>
      <div className="min-h-[calc(100vh-8rem)] bg-background px-4 py-8 font-sans sm:flex sm:items-center sm:justify-center sm:py-12">
        <div className="w-full max-w-[680px]">
        <div className="mb-8">
          <Brand />
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-lg shadow-primary/5 sm:p-10">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarDays className="size-7" strokeWidth={1.8} />
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Calendrier des examens
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Aucun examen programmé
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-justify text-sm font-normal leading-relaxed text-muted-foreground sm:text-base">
            Aucun examen n'est planifié pour le moment. Dès qu'un examen sera créé, sa date et son
            statut apparaîtront ici afin que vous puissiez vous organiser à l'avance.
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-accent" />
            Le calendrier est actualisé automatiquement
          </div>
          </section>
        </div>
      </div>
    </StudentExamShell>
  )
}

function ExamHeader({ exam, currentIndex, totalQuestions, timeLeft }) {
  const progress = totalQuestions ? ((currentIndex + 1) / totalQuestions) * 100 : 0
  const isUrgent = timeLeft <= 300

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto grid max-w-[900px] gap-3 px-4 py-4 sm:grid-cols-[1fr_220px_150px] sm:items-center sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-foreground sm:text-lg">{exam.title}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Examen en cours
          </p>
        </div>

        <div className="order-3 sm:order-none">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
            <span>Progression</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div
          className={`flex items-center gap-2 sm:justify-end ${
            isUrgent ? "text-destructive" : "text-foreground"
          }`}
          aria-label={`Temps restant ${formatTime(timeLeft)}`}
        >
          <Clock3 className={`size-5 ${isUrgent ? "animate-pulse" : "text-primary"}`} />
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Temps restant
            </p>
            <p className="font-mono text-lg font-bold leading-none">{formatTime(timeLeft)}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

function QuestionCard({ question, index, selectedAnswer, onAnswer }) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8"
      aria-labelledby={`question-title-${question.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Question {index + 1}
          </p>
          <h2
            id={`question-title-${question.id}`}
            className="mt-2 text-base font-semibold leading-relaxed text-foreground sm:text-lg"
          >
            {question.statement}
          </h2>
        </div>
      </div>

      <fieldset className="mt-7 space-y-3">
        <legend className="sr-only">Choisissez une réponse</legend>
        {question.options.map((option, optionIndex) => {
          const selected = selectedAnswer === optionIndex
          return (
            <label
              key={`${question.id}-${optionIndex}`}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all duration-200 ${
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name={`answer-${question.id}`}
                checked={selected}
                onChange={() => onAnswer(optionIndex)}
                className="sr-only"
              />
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {selected ? <Check className="size-3.5" /> : String.fromCharCode(65 + optionIndex)}
              </span>
              <span className="text-sm font-normal leading-relaxed text-foreground sm:text-base">
                {option}
              </span>
            </label>
          )
        })}
      </fieldset>
    </section>
  )
}

function AvailableExams({ exams, completedExamIds, onStart, navigate }) {
  const accessibleCount = exams.filter((exam) => !exam.locked).length

  return (
    <StudentExamShell navigate={navigate}>
      <div className="bg-background px-4 py-4 font-sans sm:py-6">
        <div className="mx-auto max-w-[900px]">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <button
            type="button"
            onClick={() => navigate("/student/dashboard")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-muted-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            Retour à mon espace
          </button>
        </header>

        <section className="mt-8 rounded-2xl border border-primary/10 bg-primary p-6 text-primary-foreground shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/75">
                  Examens à distance
                </p>
              </div>
              <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                Calendrier de vos examens
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-primary-foreground/75">
                Consultez à l'avance les dates prévues. Les examens ouverts peuvent être commencés
                immédiatement ; les autres restent visibles comme examens programmés.
              </p>
            </div>
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <FileCheck2 className="size-8" />
            </div>
          </div>
        </section>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Examens programmés</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {exams.length} examen{exams.length !== 1 ? "s" : ""} dans votre calendrier,
              dont {accessibleCount} actuellement accessible{accessibleCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent">
            <ShieldCheck className="size-4" />
            Calendrier à jour
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {exams.map((exam) => {
            const completed = completedExamIds.includes(exam.id)
            const canRetry = Boolean(exam.canRetry)
            const locked = Boolean(exam.locked)
            const examDate = exam.date
              ? new Intl.DateTimeFormat("fr-FR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(new Date(`${exam.date}T12:00:00`))
              : "Date à confirmer"
            return (
              <article
                key={exam.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className={`h-1 ${completed ? "bg-accent" : locked ? "bg-muted-foreground/30" : "bg-primary"}`} />
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                      completed
                        ? "bg-accent/10 text-accent"
                        : locked
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                    }`}>
                      {completed ? <CheckCircle2 className="size-5" /> : locked ? <CalendarDays className="size-5" /> : <FileCheck2 className="size-5" />}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      completed
                        ? "bg-accent/10 text-accent"
                        : locked
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                    }`}>
                      {canRetry ? "2ᵉ tentative" : completed ? "Déjà passé" : locked ? "Programmé" : "Disponible"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold leading-snug text-foreground">
                    {exam.title}
                  </h3>

                  <div className={`mt-4 flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
                    locked ? "border-border bg-muted/40" : "border-primary/15 bg-primary/5"
                  }`}>
                    <CalendarDays className={`size-5 shrink-0 ${locked ? "text-muted-foreground" : "text-primary"}`} />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Date prévue</p>
                      <p className="mt-0.5 text-xs font-bold capitalize text-foreground">{examDate}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-xl bg-muted/40 py-3">
                    <div className="px-2 text-center">
                      <Clock3 className="mx-auto size-4 text-primary" />
                      <p className="mt-1.5 text-[10px] font-semibold text-foreground">
                        {exam.duration} min
                      </p>
                    </div>
                    <div className="px-2 text-center">
                      <ListChecks className="mx-auto size-4 text-primary" />
                      <p className="mt-1.5 text-[10px] font-semibold text-foreground">
                        {exam.questions.length} question{exam.questions.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="px-2 text-center">
                      <CalendarDays className="mx-auto size-4 text-primary" />
                      <p className="mt-1.5 truncate text-[10px] font-semibold text-foreground">
                        {exam.date
                          ? new Intl.DateTimeFormat("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                            }).format(new Date(`${exam.date}T12:00:00`))
                          : "Aujourd'hui"}
                      </p>
                    </div>
                  </div>

                  {exam.result && (
                    <div className={`mt-4 flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold ${
                      exam.result.passed
                        ? "bg-accent/10 text-accent"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      <span>{exam.result.passed ? "Validé" : "Non validé"}</span>
                      <span>{Math.round(Number(exam.result.percentage || 0))}%</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={completed || locked}
                    onClick={() => onStart(exam)}
                    className={`mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition focus:outline-none focus:ring-4 ${
                      completed || locked
                        ? "cursor-not-allowed bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/20"
                    }`}
                  >
                    {completed ? <CheckCircle2 className="size-4" /> : locked ? <CalendarDays className="size-4" /> : <Play className="size-4 fill-current" />}
                    {completed ? "Examen terminé" : locked ? "Examen programmé" : canRetry ? "Passer la 2ᵉ tentative" : "Commencer l'examen"}
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Les dates et les statuts sont actualisés automatiquement.
          </p>
        </div>
      </div>
    </StudentExamShell>
  )
}

function CompletionScreen({ exam, answeredCount, result, onBackToExams, onRetry, navigate }) {
  const percentage = Number(result?.percentage || 0)
  const passed = Boolean(result?.passed)
  const passingPercentage = Number(result?.passingPercentage || 60)
  const canRetry = !passed && Number(result?.attemptNumber || 1) < 2

  return (
    <StudentExamShell navigate={navigate}>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-background px-4 py-10 font-sans">
        <section className={`w-full max-w-xl rounded-2xl border bg-card p-7 text-center shadow-lg sm:p-10 ${
          passed ? "border-accent/30 shadow-accent/5" : "border-destructive/30 shadow-destructive/5"
        }`}>
          <div className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${
            passed ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
          }`}>
            {passed ? <CheckCircle2 className="size-8" /> : <FileCheck2 className="size-8" />}
          </div>
          <p className={`mt-6 text-xs font-bold uppercase tracking-[0.18em] ${
            passed ? "text-accent" : "text-destructive"
          }`}>
            {passed ? "Examen validé" : "Examen non validé"}
          </p>
          <h1 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">Votre résultat</h1>

          <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 divide-x divide-border rounded-2xl bg-muted/50 py-5">
            <div className="px-4">
              <p className={`text-4xl font-black tabular-nums ${passed ? "text-accent" : "text-destructive"}`}>
                {Math.round(percentage)}%
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Note obtenue</p>
            </div>
            <div className="px-4">
              <p className="text-2xl font-black text-foreground">
                {result?.score ?? 0}/{result?.totalQuestions ?? exam.questions?.length ?? 0}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bonnes réponses</p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {answeredCount} réponse{answeredCount !== 1 ? "s" : ""} enregistrée{answeredCount !== 1 ? "s" : ""} pour « {exam.title} ».
            Le seuil de validation est fixé à {passingPercentage}%.
          </p>
          {!passed && (
            <p className="mt-3 rounded-xl bg-destructive/5 px-4 py-3 text-xs font-semibold leading-relaxed text-destructive">
              {canRetry
                ? "Vous pouvez repasser cet examen une deuxième et dernière fois."
                : "Vos deux tentatives ont été utilisées. Cette note est votre résultat final."}
            </p>
          )}

          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={canRetry ? onRetry : onBackToExams}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              {canRetry ? "Passer la 2ᵉ tentative" : "Voir les autres examens"}
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/student/dashboard")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
            >
              Retour à mon espace
            </button>
          </div>
        </section>
      </div>
    </StudentExamShell>
  )
}

export function StudentExam({ navigate }) {
  const { user } = useAuth()
  const completionStorageKey = `esfpp-student-completed-exams-${user?.id || "anonymous"}`
  const [exams, setExams] = useState(readExams)
  const [activeExamId, setActiveExamId] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submissionResult, setSubmissionResult] = useState(null)
  const [previousAttemptResult, setPreviousAttemptResult] = useState(null)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [sharedBackend, setSharedBackend] = useState(false)
  const [completedExamIds, setCompletedExamIds] = useState(() => {
    try {
      const saved = window.localStorage.getItem(completionStorageKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const scheduledExams = useMemo(
    () => exams.filter((exam) => exam.questions?.length),
    [exams],
  )
  const exam = useMemo(
    () => exams.find((item) => item.id === activeExamId) || null,
    [activeExamId, exams],
  )
  const isUnlocked = Boolean(exam && !exam.locked && exam.questions?.length)

  const submitExam = useCallback(async () => {
    let result

    if (sharedBackend && activeExamId) {
      try {
        result = await apiRequest(`/api/exams/${activeExamId}/submit`, {
          method: "POST",
          body: JSON.stringify({ answers }),
        })
      } catch (error) {
        await Swal.fire({
          icon: "error",
          iconColor: "var(--destructive)",
          background: "var(--card)",
          color: "var(--foreground)",
          title: "Envoi impossible",
          text: error.message || "Vos réponses n'ont pas pu être envoyées.",
          confirmButtonText: "Réessayer",
          confirmButtonColor: "var(--primary)",
        })
        return false
      }
    } else {
      const localQuestions = exam?.questions || []
      const score = localQuestions.reduce(
        (total, question) =>
          Number(answers[question.id]) === Number(question.correctAnswer) ? total + 1 : total,
        0,
      )
      const percentage = localQuestions.length ? (score * 100) / localQuestions.length : 0
      const currentResult = {
        score,
        totalQuestions: localQuestions.length,
        percentage,
        passed: percentage >= 60,
        attemptNumber,
        passingPercentage: 60,
      }
      result = previousAttemptResult && Number(previousAttemptResult.percentage) > percentage
        ? { ...previousAttemptResult, attemptNumber }
        : currentResult
    }

    setSubmissionResult(result)
    setSubmitted(true)
    if (activeExamId) {
      const completed = Boolean(result.passed || Number(result.attemptNumber || 1) >= 2)
      setCompletedExamIds((current) =>
        completed
          ? current.includes(activeExamId) ? current : [...current, activeExamId]
          : current.filter((id) => id !== activeExamId),
      )
      setExams((current) =>
        current.map((item) =>
          item.id === activeExamId
            ? { ...item, result, completed, canRetry: !completed }
            : item,
        ),
      )
    }
    return true
  }, [activeExamId, answers, attemptNumber, exam, previousAttemptResult, sharedBackend])

  useEffect(() => {
    let active = true
    const syncExams = async () => {
      try {
        const data = await apiRequest("/api/exams/available")
        if (!active) return
        const available = Array.isArray(data) ? data : []
        setExams(available)
        setCompletedExamIds(
          available.filter((item) => item.completed).map((item) => item.id),
        )
        setSharedBackend(true)
      } catch {
        if (!active) return
        setExams(readExams())
        setSharedBackend(false)
      }
    }

    syncExams()
    window.addEventListener("storage", syncExams)
    const poller = window.setInterval(syncExams, 2000)
    return () => {
      active = false
      window.removeEventListener("storage", syncExams)
      window.clearInterval(poller)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      completionStorageKey,
      JSON.stringify(completedExamIds),
    )
  }, [completedExamIds, completionStorageKey])

  const startExam = (selectedExam, nextAttemptNumber = selectedExam.canRetry ? 2 : 1) => {
    setPreviousAttemptResult(nextAttemptNumber > 1 ? submissionResult || selectedExam.result : null)
    setActiveExamId(selectedExam.id)
    setCurrentIndex(0)
    setAnswers({})
    setSubmitted(false)
    setSubmissionResult(null)
    setAttemptNumber(nextAttemptNumber)
    setTimeLeft(Number(selectedExam.duration || 60) * 60)
  }

  const backToExamList = () => {
    setActiveExamId(null)
    setCurrentIndex(0)
    setAnswers({})
    setTimeLeft(null)
    setSubmitted(false)
    setSubmissionResult(null)
    setPreviousAttemptResult(null)
    setAttemptNumber(1)
  }

  useEffect(() => {
    if (!isUnlocked || submitted || timeLeft === null) return undefined
    if (timeLeft <= 0) {
      submitExam()
      return undefined
    }
    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isUnlocked, submitExam, submitted, timeLeft])

  const questions = exam?.questions || []
  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const isLastQuestion = currentIndex === questions.length - 1

  const requestSubmission = async () => {
    const unanswered = questions.length - answeredCount
    const result = await Swal.fire({
      icon: unanswered ? "warning" : "question",
      iconColor: unanswered ? "var(--destructive)" : "var(--primary)",
      background: "var(--card)",
      color: "var(--foreground)",
      title: "Valider votre examen ?",
      text: unanswered
        ? `${unanswered} question${unanswered > 1 ? "s sont" : " est"} encore sans réponse.`
        : "Après validation, vous ne pourrez plus modifier vos réponses.",
      showCancelButton: true,
      confirmButtonText: "Valider l'examen",
      cancelButtonText: "Continuer l'examen",
      reverseButtons: true,
      focusCancel: true,
      buttonsStyling: false,
      customClass: {
        popup: "rounded-2xl",
        actions: "gap-2",
        confirmButton:
          "inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground transition hover:opacity-90",
        cancelButton:
          "inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-5 text-xs font-bold text-muted-foreground transition hover:bg-muted",
      },
    })

    if (result.isConfirmed) await submitExam()
  }

  if (!activeExamId && !scheduledExams.length) {
    return <WaitingRoom navigate={navigate} />
  }

  if (!activeExamId) {
    return (
      <AvailableExams
        exams={scheduledExams}
        completedExamIds={completedExamIds}
        onStart={startExam}
        navigate={navigate}
      />
    )
  }

  if (submitted) {
    return (
      <CompletionScreen
        exam={exam || FALLBACK_EXAM}
        answeredCount={answeredCount}
        result={submissionResult}
        onBackToExams={backToExamList}
        onRetry={() => startExam(exam || FALLBACK_EXAM, Number(submissionResult?.attemptNumber || 1) + 1)}
        navigate={navigate}
      />
    )
  }

  if (!isUnlocked || !currentQuestion) {
    return scheduledExams.length ? (
      <AvailableExams
        exams={scheduledExams}
        completedExamIds={completedExamIds}
        onStart={startExam}
        navigate={navigate}
      />
    ) : (
      <WaitingRoom navigate={navigate} />
    )
  }

  return (
    <StudentExamShell navigate={navigate}>
      <div className="bg-background font-sans text-foreground">
        <ExamHeader
          exam={exam}
          currentIndex={currentIndex}
          totalQuestions={questions.length}
          timeLeft={timeLeft ?? Number(exam.duration || 60) * 60}
        />

        <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileCheck2 className="size-4 text-primary" />
            Une seule réponse possible
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            {answeredCount}/{questions.length} répondue{answeredCount !== 1 ? "s" : ""}
          </p>
        </div>

        <QuestionCard
          question={currentQuestion}
          index={currentIndex}
          selectedAnswer={answers[currentQuestion.id]}
          onAnswer={(optionIndex) =>
            setAnswers((current) => ({ ...current, [currentQuestion.id]: optionIndex }))
          }
        />

        <nav
          className="mt-6 flex flex-col-reverse gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          aria-label="Navigation entre les questions"
        >
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-4" />
            Précédent
          </button>

          <p className="text-center text-sm font-normal text-muted-foreground">
            Question <span className="font-bold text-foreground">{currentIndex + 1}</span> sur{" "}
            <span className="font-bold text-foreground">{questions.length}</span>
          </p>

          <button
            type="button"
            onClick={() => {
              if (isLastQuestion) requestSubmission()
              else setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20"
          >
            {isLastQuestion ? "Valider l'examen" : "Suivant"}
            {isLastQuestion ? <FileCheck2 className="size-4" /> : <ArrowRight className="size-4" />}
          </button>
        </nav>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Vos réponses sont conservées pendant cette session. Ne fermez pas cette page avant la validation.
        </p>
        </div>
      </div>
    </StudentExamShell>
  )
}
