import { useEffect, useState, useCallback } from "react"
import { Play, Loader2, Video, Search, BookOpen, X, CheckCircle2, Trophy, Lock } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import CourseVideoPlayer from "@/components/ui/CourseVideoPlayer"
import CourseCardPreview from "@/components/ui/CourseCardPreview"
import { apiRequest } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Mon espace", path: "/student/dashboard", icon: BookOpen },
]

/**
 * Checks if a video URL points to an H5P interactive module.
 */
function isH5PCourse(url) {
  if (!url) return false
  const lowerUrl = url.toLowerCase()
  return (
    lowerUrl.includes("h5p.com") ||
    lowerUrl.includes("h5p.org") ||
    lowerUrl.includes("lumi.education") ||
    lowerUrl.includes("lumi/")
  )
}

/**
 * ScoreCompletedCard — Premium card shown when a student has already
 * completed the H5P evaluation for a course.
 */
function ScoreCompletedCard({ scoreData, courseTitle }) {
  const pct = Math.round(scoreData.percentage)
  const isPerfect = pct === 100
  const isGood = pct >= 70

  return (
    <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200/60 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.06),transparent_50%)]" />

      <div className="relative z-10 flex flex-col items-center text-center gap-4">
        {/* Icon */}
        <div className={cn(
          "size-16 rounded-2xl flex items-center justify-center shadow-lg",
          isPerfect
            ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-amber-200/50"
            : isGood
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200/50"
              : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-200/50"
        )}>
          {isPerfect ? (
            <Trophy className="size-8" />
          ) : (
            <CheckCircle2 className="size-8" />
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-extrabold text-emerald-800 tracking-tight">
            Évaluation terminée
          </h3>
          <p className="text-xs text-emerald-600/70 font-medium mt-1">
            {courseTitle}
          </p>
        </div>

        {/* Score display */}
        <div className="flex items-baseline gap-1.5">
          <span className={cn(
            "text-4xl font-black tabular-nums tracking-tight",
            isPerfect ? "text-amber-600" : isGood ? "text-emerald-700" : "text-blue-700"
          )}>
            {pct}%
          </span>
          <span className="text-sm font-bold text-emerald-600/50">
            ({scoreData.score}/{scoreData.max_score})
          </span>
        </div>

        {/* Status label */}
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
          isPerfect
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : isGood
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
        )}>
          <Lock className="size-3" />
          {isPerfect ? "Score parfait" : isGood ? "Réussi" : "Complété"}
        </span>
      </div>
    </div>
  )
}

export function StudentCourses({ path, navigate }) {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [filieres, setFilieres] = useState([])
  const [selectedFiliereId, setSelectedFiliereId] = useState("")
  const [classes, setClasses] = useState([])
  const [selectedClasseId, setSelectedClasseId] = useState("")

  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeVideo, setActiveVideo] = useState(null)
  const [error, setError] = useState("")

  // Scores map: { [course_id]: { score, max_score, percentage } }
  const [scores, setScores] = useState({})
  const [savingScore, setSavingScore] = useState(false)

  // Progress map: { [course_id]: { watched_seconds, duration_seconds, percentage } }
  const [progress, setProgress] = useState({})

  // Fetch initial data + scores + progress
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [coursesData, filieresData, scoresData, progressData] = await Promise.all([
          apiRequest("/api/courses"),
          apiRequest("/api/filieres"),
          apiRequest("/api/courses/scores"),
          apiRequest("/api/courses/progress"),
        ])
        setCourses(coursesData)
        setFilieres(filieresData)

        // Build scores map
        const scoresMap = {}
        for (const s of scoresData) {
          scoresMap[s.course_id] = s
        }
        setScores(scoresMap)

        // Build progress map
        const progressMap = {}
        for (const p of progressData) {
          progressMap[p.course_id] = p
        }
        setProgress(progressMap)

        // Try to autofilter based on student's metadata if available
        const userFiliereId = user?.user_metadata?.filiere_id
        const userClasseId = user?.user_metadata?.classe_id
        if (userFiliereId) {
          setSelectedFiliereId(userFiliereId)
          if (userClasseId) {
            setSelectedClasseId(userClasseId)
          }
        }
      } catch (err) {
        setError("Erreur de chargement: " + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  // Update classes select options when filiere changes
  useEffect(() => {
    if (!selectedFiliereId) {
      setClasses([])
      setSelectedClasseId("")
      return
    }
    const filiere = filieres.find(f => f.id === selectedFiliereId)
    setClasses(filiere?.classes || [])
  }, [selectedFiliereId, filieres])

  // Save video playback progress
  const saveProgress = useCallback(async (courseId, watchedSeconds, durationSeconds) => {
    const percentage = durationSeconds > 0 ? Math.round((watchedSeconds / durationSeconds) * 100) : 0

    // Optimistically update local progress state
    setProgress(prev => ({
      ...prev,
      [courseId]: {
        course_id: courseId,
        watched_seconds: watchedSeconds,
        duration_seconds: durationSeconds,
        percentage
      }
    }))

    try {
      await apiRequest(`/api/courses/${courseId}/progress`, {
        method: "POST",
        body: JSON.stringify({
          watched_seconds: watchedSeconds,
          duration_seconds: durationSeconds,
          percentage
        })
      })
    } catch (err) {
      console.error("Failed to save playback progress:", err.message)
    }
  }, [])

  // Save H5P evaluation score
  const saveScore = useCallback(async (courseId, score, maxScore, percentage) => {
    if (scores[courseId]) return

    setSavingScore(true)
    try {
      const result = await apiRequest(`/api/courses/${courseId}/score`, {
        method: "POST",
        body: JSON.stringify({
          score: Number(score),
          max_score: Number(maxScore),
          percentage: Number(percentage),
        }),
      })

      setScores(prev => ({
        ...prev,
        [courseId]: result,
      }))

      // Force progress to 100% in progress table to sync completion status
      const courseDuration = activeVideo?.duration && Number(activeVideo.duration) > 0
        ? Number(activeVideo.duration)
        : 180
      await saveProgress(courseId, courseDuration, courseDuration)
    } catch (err) {
      if (err.message?.includes("already recorded")) {
        setScores(prev => ({
          ...prev,
          [courseId]: { score, max_score: maxScore, percentage },
        }))
        const courseDuration = activeVideo?.duration && Number(activeVideo.duration) > 0
          ? Number(activeVideo.duration)
          : 180
        await saveProgress(courseId, courseDuration, courseDuration)
      } else {
        console.error("Failed to save score:", err.message)
      }
    } finally {
      setSavingScore(false)
    }
  }, [scores, saveProgress, activeVideo])

  // xAPI message listener for H5P score capture
  useEffect(() => {
    if (!activeVideo) return
    if (!isH5PCourse(activeVideo.video_url)) return
    if (scores[activeVideo.id]) return

    const courseId = activeVideo.id

    function handleMessage(event) {
      console.log("Captured postMessage event:", event.origin, event.data)
      try {
        let data = event.data

        if (typeof data === "string") {
          try {
            data = JSON.parse(data)
          } catch {
            return
          }
        }

        const statement =
          data?.statement ||
          data?.xAPI ||
          data?.event?.statement ||
          data

        if (!statement) return

        const verbId = statement.verb?.id || ""
        const verbDisplay = statement.verb?.display?.["en-US"] || ""

        const isCompletion =
          verbId.includes("completed") ||
          verbId.includes("answered") ||
          verbId.includes("scored") ||
          verbId.includes("passed") ||
          verbDisplay.toLowerCase() === "completed" ||
          verbDisplay.toLowerCase() === "answered" ||
          verbDisplay.toLowerCase() === "passed"

        if (!isCompletion) return

        const scoreObj = statement.result?.score
        if (!scoreObj) return

        const raw = scoreObj.raw != null ? Number(scoreObj.raw) : null
        const max = scoreObj.max != null ? Number(scoreObj.max) : null

        let pct = 0
        if (raw != null && max != null && max > 0) {
          pct = Math.round((raw / max) * 100)
        } else if (scoreObj.scaled != null) {
          pct = Math.round(Number(scoreObj.scaled) * 100)
        } else {
          return
        }

        const finalRaw = raw ?? Math.round((pct * 10) / 100)
        const finalMax = max ?? 10

        console.log("Parsed H5P completion details:", { finalRaw, finalMax, pct })
        saveScore(courseId, finalRaw, finalMax, pct)
      } catch (err) {
        console.error("Error parsing H5P message:", err)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [activeVideo, scores, saveScore])

  // Active timer to track time spent on H5P courses (estimated video progress)
  useEffect(() => {
    if (!activeVideo) return
    if (!isH5PCourse(activeVideo.video_url)) return

    const courseId = activeVideo.id
    // Don't track if already completed
    if (scores[courseId]) return

    // Read the starting time once on mount of activeVideo
    const currentProgress = progress[courseId]
    let seconds = currentProgress?.watched_seconds ? Number(currentProgress.watched_seconds) : 0

    // Use course's defined duration or fall back to 180 seconds (3 mins) if not set/empty
    const duration = activeVideo.duration && Number(activeVideo.duration) > 0
      ? Number(activeVideo.duration)
      : 180

    let lastSavedSeconds = seconds
    console.log("Starting H5P time-spent tracking at seconds:", seconds, "with target duration:", duration)

    const timer = setInterval(() => {
      seconds += 1

      if (seconds - lastSavedSeconds >= 5) {
        lastSavedSeconds = seconds
        saveProgress(courseId, seconds, duration)
      }
    }, 1000)

    return () => {
      clearInterval(timer)
      if (seconds > lastSavedSeconds) {
        saveProgress(courseId, seconds, duration)
      }
    }
  }, [activeVideo, scores, saveProgress])

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesFiliere = !selectedFiliereId || course.filiere_id === selectedFiliereId || !course.filiere_id
    const matchesClasse = !selectedClasseId || course.classe_id === selectedClasseId || !course.classe_id

    return matchesSearch && matchesFiliere && matchesClasse
  })

  const activeVideoScore = activeVideo ? scores[activeVideo.id] : null
  const activeVideoProgress = activeVideo ? progress[activeVideo.id] : null
  const activeVideoIsH5P = activeVideo ? isH5PCourse(activeVideo.video_url) : false

  return (
    <DashboardShell
      title="Cours & Vidéos"
      subtitle="Accédez à vos cours vidéo et supports de formation en ligne."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
      accent="student"
    >
      <div className="flex flex-col h-[calc(100vh-100px)] min-h-0">
        {/* Top Filter and Search Bar */}
        <section className="rounded-2xl border border-border bg-card p-5 mb-6 shadow-sm medical-glass shrink-0">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Rechercher un cours..."
                className="w-full pl-9 h-11 rounded-xl bg-background/50 border border-border/50 focus:bg-background outline-none text-sm font-medium focus:border-primary transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <select
                className="h-11 rounded-xl border border-border/50 bg-background/50 px-3 text-sm font-semibold outline-none focus:border-primary transition-all"
                value={selectedFiliereId}
                onChange={(e) => {
                  setSelectedFiliereId(e.target.value)
                  setSelectedClasseId("")
                }}
              >
                <option value="">Toutes les filières</option>
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              <select
                className="h-11 rounded-xl border border-border/50 bg-background/50 px-3 text-sm font-semibold outline-none focus:border-primary transition-all"
                value={selectedClasseId}
                onChange={(e) => setSelectedClasseId(e.target.value)}
                disabled={!selectedFiliereId}
              >
                <option value="">Toutes les classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Main Grid View */}
        {loading ? (
          <div className="py-24 text-center shrink-0">
            <Loader2 className="size-10 animate-spin mx-auto text-primary/20" />
            <p className="mt-2 text-sm font-bold text-muted-foreground/50">Synchronisation des cours...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-sm font-bold text-rose-600 shrink-0">
            {error}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-border rounded-2xl bg-card/20 shrink-0">
            <Video className="size-12 mx-auto text-muted-foreground/20 mb-3" />
            <h3 className="text-base font-bold text-foreground">Aucun cours trouvé</h3>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px] mx-auto">
              Ajustez vos filtres ou effectuez une nouvelle recherche pour trouver d'autres modules.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0 pb-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => {
                const courseScore = scores[course.id]
                const courseProgress = progress[course.id]
                const courseIsH5P = isH5PCourse(course.video_url)
                const isCompleted = courseIsH5P && courseScore

                return (
                  <div
                    key={course.id}
                    className={cn(
                      "group cursor-pointer rounded-2xl border bg-card hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between overflow-hidden",
                      isCompleted
                        ? "border-emerald-200/60 hover:bg-card/85"
                        : "border-border hover:bg-card/85"
                    )}
                    onClick={() => setActiveVideo(course)}
                  >
                    {/* Card visual header */}
                    <div className="relative aspect-video bg-muted flex items-center justify-center border-b border-border/50 overflow-hidden">
                      <CourseCardPreview videoUrl={course.video_url} title={course.title} />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

                      {isCompleted ? (
                        <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center z-10">
                          <div className="flex flex-col items-center gap-2">
                            <div className="size-12 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center">
                              <CheckCircle2 className="size-6" />
                            </div>
                            <span className="text-white text-sm font-black tracking-wide drop-shadow-lg">
                              {Math.round(courseScore.percentage)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="size-12 rounded-full bg-primary/95 text-primary-foreground shadow-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-accent transition-all duration-300 z-10">
                          <Play className="size-5 fill-current ml-0.5" />
                        </div>
                      )}

                      {/* Badges on video card thumbnail */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1 z-10">
                        <span className="inline-flex items-center rounded-lg bg-black/60 backdrop-blur-md text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border border-white/10">
                          {course.filiere?.code || "Général"}
                        </span>
                        {course.classe && (
                          <span className="inline-flex items-center rounded-lg bg-primary/80 backdrop-blur-md text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border border-white/10">
                            {course.classe.label}
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/90 backdrop-blur-md text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border border-white/10">
                            <CheckCircle2 className="size-2.5" />
                            Terminé
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card contents */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="mt-2 text-xs text-muted-foreground font-medium leading-relaxed line-clamp-2">
                          {course.description || "Consultez cette vidéo de formation en ligne."}
                        </p>

                        {/* Progress Bar UI (Always visible for all cards) */}
                        <div className="mt-4 space-y-1.5">
                          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                            <span className="text-slate-400">Progression</span>
                            <span className={cn(
                              isCompleted ? "text-emerald-600 font-extrabold" : "text-slate-500 font-bold"
                            )}>
                              {isCompleted ? "100% (Terminé)" : `${courseProgress ? Math.round(courseProgress.percentage) : 0}%`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                isCompleted ? "bg-emerald-500" : "bg-primary"
                              )}
                              style={{
                                width: `${isCompleted
                                    ? 100
                                    : courseProgress
                                      ? Math.min(100, Math.round(courseProgress.percentage))
                                      : 0
                                  }%`
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                        <span>Formation ESFPP</span>
                        {isCompleted ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="size-3" />
                            {Math.round(courseScore.percentage)}% — Terminé
                          </span>
                        ) : (
                          <span>{new Date(course.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-card overflow-hidden shadow-2xl flex flex-col medical-glass">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {activeVideo.filiere?.name || "Général"} {activeVideo.classe ? `• ${activeVideo.classe.label}` : ""}
                </span>
                <h3 className="font-bold text-base text-foreground mt-0.5">{activeVideo.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {savingScore && (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                    <Loader2 className="size-3 animate-spin" />
                    Enregistrement score...
                  </span>
                )}
                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                  aria-label="Close player"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Conditional: Score card OR Video Player */}
            {activeVideoIsH5P && activeVideoScore ? (
              <ScoreCompletedCard
                scoreData={activeVideoScore}
                courseTitle={activeVideo.title}
              />
            ) : (
              <CourseVideoPlayer
                videoUrl={activeVideo.video_url}
                resumeTime={activeVideoProgress?.watched_seconds ? Number(activeVideoProgress.watched_seconds) : 0}
                onProgress={(watched, duration) => saveProgress(activeVideo.id, watched, duration)}
              />
            )}

            {/* Modal Info Footer */}
            {activeVideo.description && (
              <div className="p-5 overflow-y-auto max-h-36 bg-background/30 text-sm leading-relaxed text-muted-foreground font-medium border-t border-border/50">
                {activeVideo.description}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
