import { useEffect, useState, useRef } from "react"
import { Play, Plus, Edit2, Trash2, Loader2, Video, Search, Filter, BookOpen } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest } from "@/lib/api"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: BookOpen },
  { label: "Comptes", path: "/admin/accounts", icon: BookOpen },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: BookOpen },
]

export function AdminCourses({ path, navigate }) {
  const [courses, setCourses] = useState([])
  const [filieres, setFilieres] = useState([])
  const [selectedFiliereId, setSelectedFiliereId] = useState("")
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [filterFiliere, setFilterFiliere] = useState("")

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const formRef = useRef(null)

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [coursesData, filieresData] = await Promise.all([
          apiRequest("/api/courses"),
          apiRequest("/api/filieres")
        ])
        setCourses(coursesData)
        setFilieres(filieresData)
      } catch (err) {
        setError("Erreur de chargement: " + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Update classes list when selected filiere changes
  useEffect(() => {
    if (!selectedFiliereId) {
      setClasses([])
      return
    }
    const filiere = filieres.find(f => f.id === selectedFiliereId)
    setClasses(filiere?.classes || [])
  }, [selectedFiliereId, filieres])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage("")
    setError("")

    const formData = new FormData(e.currentTarget)
    const title = String(formData.get("title") || "").trim()
    const description = String(formData.get("description") || "").trim()
    const video_url = String(formData.get("video_url") || "").trim()
    const filiere_id = formData.get("filiere_id") || null
    const classe_id = formData.get("classe_id") || null

    try {
      if (editingCourse) {
        // Edit Mode
        const updated = await apiRequest(`/api/courses/${editingCourse.id}`, {
          method: "PUT",
          body: JSON.stringify({ title, description, video_url, filiere_id, classe_id }),
        })
        setCourses(prev => prev.map(c => c.id === updated.id ? updated : c))
        setMessage("Cours mis à jour avec succès.")
        setEditingCourse(null)
      } else {
        // Add Mode
        const created = await apiRequest("/api/courses", {
          method: "POST",
          body: JSON.stringify({ title, description, video_url, filiere_id, classe_id }),
        })
        setCourses(prev => [created, ...prev])
        setMessage("Cours ajouté avec succès.")
      }
      formRef.current?.reset()
      setSelectedFiliereId("")
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleStartEdit(course) {
    setEditingCourse(course)
    setSelectedFiliereId(course.filiere_id || "")
    setMessage("")
    setError("")

    // Allow React state to update the classes select input options first
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.elements["title"].value = course.title
        formRef.current.elements["description"].value = course.description || ""
        formRef.current.elements["video_url"].value = course.video_url
        formRef.current.elements["filiere_id"].value = course.filiere_id || ""
        formRef.current.elements["classe_id"].value = course.classe_id || ""
      }
    }, 50)
  }

  function handleCancelEdit() {
    setEditingCourse(null)
    setSelectedFiliereId("")
    formRef.current?.reset()
    setMessage("")
    setError("")
  }

  async function handleDelete(courseId) {
    Swal.fire({
      title: "Êtes-vous sûr ?",
      text: "Cette vidéo de cours sera définitivement supprimée !",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer !",
      cancelButtonText: "Annuler"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiRequest(`/api/courses/${courseId}`, { method: "DELETE" })
          setCourses(prev => prev.filter(c => c.id !== courseId))
          Swal.fire({
            title: "Supprimé !",
            text: "Le cours a été supprimé avec succès.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false
          })
        } catch (err) {
          Swal.fire("Erreur", err.message, "error")
        }
      }
    })
  }

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesFiliere = !filterFiliere || course.filiere_id === filterFiliere
    return matchesSearch && matchesFiliere
  })

  return (
    <DashboardShell
      title="Gestion des cours & vidéos"
      subtitle="Publiez et gérez les ressources vidéo pédagogiques par filière et classe."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="grid gap-8 lg:grid-cols-[400px_1fr] h-[calc(100vh-100px)] min-h-0">
        {/* Form column */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass h-full overflow-y-auto flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Video className="size-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              {editingCourse ? "Modifier le cours" : "Nouveau cours vidéo"}
            </h2>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="course-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Titre du cours</Label>
              <Input
                id="course-title"
                name="title"
                placeholder="Introduction à la pédiatrie"
                required
                className="h-10 rounded-xl bg-background/50 border-border/50 focus:bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description / Notes</Label>
              <textarea
                id="course-description"
                name="description"
                rows="3"
                placeholder="Détails du cours, liens utiles, chapitres..."
                className="flex w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-video-url" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lien Vidéo (YouTube, Vimeo, MP4)</Label>
              <Input
                id="course-video-url"
                name="video_url"
                placeholder="https://www.youtube.com/watch?v=..."
                required
                className="h-10 rounded-xl bg-background/50 border-border/50 focus:bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-filiere" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filière</Label>
              <select
                id="course-filiere"
                name="filiere_id"
                className="flex h-10 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm font-semibold outline-none focus-visible:border-primary appearance-none transition-colors"
                value={selectedFiliereId}
                onChange={(e) => setSelectedFiliereId(e.target.value)}
              >
                <option value="">-- Toutes les filières --</option>
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-classe" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Classe (Niveau)</Label>
              <select
                id="course-classe"
                name="classe_id"
                className="flex h-10 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm font-semibold outline-none focus-visible:border-primary appearance-none transition-colors"
                disabled={!selectedFiliereId}
              >
                <option value="">-- Toutes les classes --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1 h-10 rounded-xl font-bold" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                {editingCourse ? "Enregistrer" : "Ajouter"}
              </Button>

              {editingCourse && (
                <Button type="button" variant="outline" className="h-10 rounded-xl font-bold" onClick={handleCancelEdit}>
                  Annuler
                </Button>
              )}
            </div>
          </form>

          {(message || error) && (
            <div className={cn(
              "mt-4 p-4 rounded-xl text-xs font-bold border animate-in fade-in zoom-in-95 duration-200",
              error ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-primary/5 border-primary/10 text-primary"
            )}>
              {error || message}
            </div>
          )}
        </section>

        {/* List column */}
        <section className="min-w-0 rounded-xl border border-border bg-white p-6 shadow-sm flex flex-col h-full min-h-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold tracking-tight">Vidéos de cours publiées</h2>

            {/* Search and Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                <Input
                  placeholder="Rechercher un cours..."
                  className="pl-9 h-9 rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                value={filterFiliere}
                onChange={(e) => setFilterFiliere(e.target.value)}
              >
                <option value="">Filières: Toutes</option>
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>{f.code}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="size-8 animate-spin mx-auto text-primary/20" />
              <p className="mt-2 text-sm font-bold text-muted-foreground/50">Chargement des vidéos de cours...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-border rounded-xl">
              <Video className="size-8 mx-auto text-muted-foreground/20" />
              <p className="mt-2 text-sm font-bold text-muted-foreground/50">Aucun cours vidéo trouvé</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar min-h-0">
              <div className="grid gap-4 sm:grid-cols-2 pb-4">
                {filteredCourses.map((course) => (
                  <div key={course.id} className="group relative rounded-xl border border-border bg-background/40 hover:bg-background/80 hover:shadow-md p-5 transition-all flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                          {course.filiere?.code || "Général"}
                        </span>
                        {course.classe && (
                          <span className="inline-flex items-center rounded-full bg-accent/10 text-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-accent/20">
                            {course.classe.label}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-foreground line-clamp-1">{course.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 min-h-8">
                        {course.description || "Aucune description fournie."}
                      </p>

                      <div className="mt-3 text-[10px] text-muted-foreground font-semibold flex items-center gap-1 min-w-0">
                        <span className="shrink-0">Lien:</span>
                        <span className="text-primary hover:underline truncate flex-1" title={course.video_url}>{course.video_url}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground/50">
                        Ajouté le {new Date(course.created_at).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          className="size-8 p-0 text-muted-foreground hover:text-primary rounded-lg"
                          onClick={() => handleStartEdit(course)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="size-8 p-0 text-muted-foreground hover:text-rose-600 rounded-lg"
                          onClick={() => handleDelete(course.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  )
}
