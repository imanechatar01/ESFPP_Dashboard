import { Activity, CalendarCheck, GraduationCap, Users, UserPlus, ClipboardCheck, ArrowUpRight, CalendarDays } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: Activity },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Gestion des comptes", path: "/admin/accounts", icon: Users },
]

const stats = [
  { label: "Comptes actifs", value: "128", helper: "Admins et étudiants", icon: Users, color: "text-primary", bg: "bg-primary/10" },
  { label: "Invitations", value: "12", helper: "En attente d'activation", icon: UserPlus, color: "text-accent", bg: "bg-accent/10" },
  { label: "Stages planifiés", value: "34", helper: "Session en cours", icon: CalendarCheck, color: "text-secondary-foreground", bg: "bg-secondary" },
  { label: "Taux de complétion", value: "86%", helper: "+2% depuis hier", icon: ClipboardCheck, color: "text-primary", bg: "bg-primary/10" },
]

export function AdminDashboard({ path, navigate }) {
  return (
    <DashboardShell
      title="Tableau de bord"
      subtitle="Bienvenue sur votre espace de pilotage ESFPP."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
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
            <button className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">Voir tout</button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Inscriptions", count: "45 nouvelles", desc: "Cette semaine" },
              { title: "Évaluations", count: "12 en cours", desc: "Modules cliniques" },
              { title: "Documents", count: "8 à valider", desc: "Stages S2" }
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
            {[
              { event: "Invitation envoyée", user: "m.amrani@esfpp.ma", time: "14:20", icon: UserPlus, color: "text-accent" },
              { event: "Profil complété", user: "s.benali@student.ma", time: "11:05", icon: ClipboardCheck, color: "text-primary" },
              { event: "Accès admin vérifié", user: "Admin Système", time: "Hier", icon: Activity, color: "text-muted-foreground" },
              { event: "Nouveau stage créé", user: "Dr. Hassan", time: "Hier", icon: CalendarCheck, color: "text-secondary-foreground" }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-muted/50">
                <div className={cn("mt-1 p-1.5 rounded-md bg-muted", item.color)}>
                  <item.icon className="size-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold truncate">{item.event}</p>
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.user}</p>
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-6 py-3 rounded-xl border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors">
            Consulter les logs
          </button>
        </section>
      </div>
    </DashboardShell>
  )
}

