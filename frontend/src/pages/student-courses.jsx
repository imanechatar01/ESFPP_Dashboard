import { useEffect, useState } from "react"
import { Play, Loader2, Video, Search, BookOpen, X } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { apiRequest } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Mon espace", path: "/student/dashboard", icon: BookOpen },
]

function getEmbedInfo(url) {
  if (!url) return null;
  
  // YouTube RegExp
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return { type: 'iframe', url: `https://www.youtube.com/embed/${ytMatch[2]}` };
  }
  
  // Vimeo RegExp
  const vimeoRegExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
  const vimeoMatch = url.match(vimeoRegExp);
  if (vimeoMatch && vimeoMatch[3]) {
    return { type: 'iframe', url: `https://player.vimeo.com/video/${vimeoMatch[3]}` };
  }
  
  // Standard video file
  if (url.match(/\.(mp4|webm|ogg)$/i) || url.includes("drive.google.com/file")) {
    // If it is google drive link, replace standard view link with preview link
    let finalUrl = url;
    if (url.includes("drive.google.com/file/d/")) {
      const match = url.match(/\/file\/d\/([^\/]+)/);
      if (match && match[1]) {
        finalUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
        return { type: 'iframe', url: finalUrl };
      }
    }
    return { type: 'video', url: finalUrl };
  }
  
  // Fallback as iframe
  return { type: 'iframe', url };
}

function getThumbnailUrl(url) {
  if (!url) return null;
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return `https://img.youtube.com/vi/${ytMatch[2]}/mqdefault.jpg`;
  }
  return null;
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

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesFiliere = !selectedFiliereId || course.filiere_id === selectedFiliereId || !course.filiere_id
    const matchesClasse = !selectedClasseId || course.classe_id === selectedClasseId || !course.classe_id
    
    return matchesSearch && matchesFiliere && matchesClasse
  })

  const videoInfo = activeVideo ? getEmbedInfo(activeVideo.video_url) : null;

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
              {filteredCourses.map((course) => (
                <div 
                  key={course.id} 
                  className="group cursor-pointer rounded-2xl border border-border bg-card hover:bg-card/85 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between overflow-hidden"
                  onClick={() => setActiveVideo(course)}
                >
                  {/* Card visual header */}
                  <div className="relative aspect-video bg-muted flex items-center justify-center border-b border-border/50 overflow-hidden">
                    {getThumbnailUrl(course.video_url) ? (
                      <img 
                        src={getThumbnailUrl(course.video_url)} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        alt={course.title}
                      />
                    ) : course.video_url.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video 
                        src={course.video_url} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        preload="metadata"
                        muted
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/15 flex items-center justify-center">
                        <Video className="size-8 text-primary/30" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                    
                    <div className="size-12 rounded-full bg-primary/95 text-primary-foreground shadow-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-accent transition-all duration-300 z-10">
                      <Play className="size-5 fill-current ml-0.5" />
                    </div>
                    
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
                    </div>
                  </div>

                  {/* Card contents */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="mt-2 text-xs text-muted-foreground font-medium leading-relaxed line-clamp-3">
                        {course.description || "Consultez cette vidéo de formation en ligne."}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                      <span>Formation ESFPP</span>
                      <span>{new Date(course.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {activeVideo && videoInfo && (
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
              <button 
                onClick={() => setActiveVideo(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                aria-label="Close player"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Video Player Box */}
            <div className="relative aspect-video w-full bg-black">
              {videoInfo.type === 'iframe' ? (
                <iframe
                  src={videoInfo.url}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  src={videoInfo.url}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full"
                />
              )}
            </div>

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
