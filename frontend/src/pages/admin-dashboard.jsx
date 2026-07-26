import { useState, useEffect } from "react"
import { apiRequest } from "@/lib/api"
import { 
  Activity, 
  CalendarCheck, 
  GraduationCap, 
  Users, 
  UserPlus,
  ClipboardCheck, 
  ArrowUpRight, 
  CalendarDays, 
  FileSpreadsheet,
  BookOpen,
  Loader2
} from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: Activity },
  { label: "Gestion des comptes", path: "/admin/accounts", icon: Users },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Gestion des contrôles", path: "/admin/controls", icon: FileSpreadsheet },
  { label: "Filières", path: "/admin/filieres", icon: GraduationCap },
  { label: "Cours & Vidéos", path: "/admin/courses", icon: BookOpen },
  { label: "Formateurs", path: "/admin/formateurs", icon: UserPlus },
  { label: "Années", path: "/admin/academic-years", icon: CalendarDays },
]

export function AdminDashboard({ path, navigate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const result = await apiRequest("/api/dashboard/stats")
        setData(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <DashboardShell title="Tableau de bord" navItems={navItems} activePath={path} navigate={navigate}>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell title="Tableau de bord" navItems={navItems} activePath={path} navigate={navigate}>
        <div className="p-4 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm">
          Erreur de chargement: {error}
        </div>
      </DashboardShell>
    )
  }

  const { stats, recentActivity } = data

  const statCards = [
    { label: "Comptes actifs", value: stats.activeAccounts, helper: "Admins et étudiants", icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Invitations", value: stats.pendingInvitations, helper: "En attente d'activation", icon: UserPlus, color: "text-accent", bg: "bg-accent/10" },
    { label: "Contrôles", value: stats.pendingControles, helper: "Programmé(s)", icon: CalendarCheck, color: "text-secondary-foreground", bg: "bg-secondary" },
    { label: "Cours en ligne", value: stats.totalCourses, helper: "Disponibles", icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
  ]

  // Helper to format dates
  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <DashboardShell
      title="Tableau de bord"
      subtitle="Bienvenue sur votre espace de pilotage ESFPP."
      activePath={path}
      navigate={navigate}
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <section key={stat.label} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className={cn("flex size-12 items-center justify-center rounded-xl transition-colors", stat.bg)}>
                <stat.icon className={cn("size-6", stat.color)} />
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground/30 transition-colors group-hover:text-primary" />
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground/70">{stat.helper}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="size-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">Suivi académique</h2>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Filières", count: stats.totalFilieres, desc: "Total des filières" },
              { title: "Évaluations", count: stats.totalControles, desc: "Total des contrôles" },
              { title: "Étudiants", count: stats.totalStudents, desc: "Inscrits" }
            ].map((item) => (
              <div key={item.title} className="group cursor-pointer rounded-xl border border-border bg-background/50 p-5 transition-all hover:border-primary/50 hover:bg-primary/[0.02]">
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <p className="mt-2 text-xl font-black text-primary">{item.count}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-8 p-6 rounded-xl bg-muted/30 border border-dashed border-border flex flex-col items-center text-center">
            <Activity className="size-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">Espace réservé aux futurs modules métier</p>
            <p className="text-xs text-muted-foreground/60 mt-1">La gestion des notes et plannings détaillés sera disponible prochainement.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <CalendarCheck className="size-5 text-accent" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Activité récente</h2>
          </div>
          
          <div className="space-y-4">
            {recentActivity.length > 0 ? recentActivity.map((item, i) => {
              const icon = item.type === 'controle' ? CalendarCheck : (item.type === 'invitation' ? UserPlus : ClipboardCheck);
              const color = item.type === 'controle' ? "text-secondary-foreground" : (item.type === 'invitation' ? "text-accent" : "text-primary");
              const IconComp = icon;

              return (
                <div key={`${item.type}-${item.id}-${i}`} className="flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-muted/50">
                  <div className={cn("mt-1 p-1.5 rounded-md bg-muted", color)}>
                    <IconComp className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold truncate">{item.title}</p>
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{formatTime(item.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                </div>
              )
            }) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune activité récente</p>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}