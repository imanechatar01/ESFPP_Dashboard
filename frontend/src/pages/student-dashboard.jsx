import { BookOpenCheck, CalendarDays, ClipboardList, UserRound, GraduationCap, MapPin, Clock, ArrowRight, Video } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Mon espace", path: "/student/dashboard", icon: BookOpenCheck },
  { label: "Cours & Vidéos", path: "/student/courses", icon: Video },
]

export function StudentDashboard({ path, navigate }) {
  const { user } = useAuth()
  const firstName = user?.user_metadata?.first_name || user?.user_metadata?.prenom || user?.email?.split('@')[0] || "Étudiant"

  return (
    <DashboardShell
      title="Espace Étudiant"
      subtitle="Accédez à vos cours et à vos ressources pédagogiques."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
      accent="student"
    >
      <section className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-8 shadow-sm medical-glass">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
             <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
               Session {new Date().getFullYear()}
             </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
            Bonjour, {firstName}. <br className="hidden sm:block" />
            Votre portail est prêt.
          </h2>
          <p className="mt-4 max-w-2xl text-base font-medium text-muted-foreground leading-relaxed">
            Bienvenue sur votre espace personnel ESFPP. Retrouvez ici vos cours, vos affectations de stage et votre suivi administratif.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button 
              onClick={() => navigate('/student/courses')}
              className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 flex items-center gap-2 group"
            >
              Mes cours
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="h-11 px-6 rounded-xl border border-border bg-background/50 backdrop-blur-sm font-bold text-sm transition-all hover:bg-background">
              Mon planning
            </button>
          </div>
        </div>
        
        {/* Decorative background element */}
        <GraduationCap className="absolute -bottom-6 -right-6 size-48 text-primary/5 -rotate-12 pointer-events-none" />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.8fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <UserRound className="size-5 text-accent" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Mon Profil</h2>
          </div>
          
          <div className="space-y-1">
            {[
              { label: "Email académique", value: user?.email, icon: null },
              { label: "Rôle", value: "Étudiant ESFPP", icon: null },
              { label: "Statut du compte", value: "Vérifié & Actif", icon: null, color: "text-accent" },
              { label: "Dernière connexion", value: "Aujourd'hui", icon: null },
            ].map((item, i) => (
              <div key={i} className="flex flex-col py-3 border-b border-border/50 last:border-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">{item.label}</span>
                <span className={cn("text-sm font-bold mt-1", item.color || "text-foreground")}>{item.value}</span>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-6 py-3 rounded-xl bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors">
            Modifier mes informations
          </button>
        </section>

        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Cours", icon: BookOpenCheck, value: "Modules S1", helper: "4 documents", color: "text-primary", bg: "bg-primary/10", path: "/student/courses" },
              { label: "Stages", icon: MapPin, value: "Non affecté", helper: "Dossier en cours", color: "text-accent", bg: "bg-accent/10" },
              { label: "Examens", icon: ClipboardList, value: "Session Janv.", helper: "Calendrier à venir", color: "text-secondary-foreground", bg: "bg-secondary" },
            ].map((card) => (
              <div 
                key={card.label} 
                onClick={() => card.path && navigate(card.path)}
                className={cn(
                  "group cursor-pointer rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:-translate-y-1",
                  !card.path && "pointer-events-none opacity-90"
                )}
              >
                <div className={cn("flex size-10 items-center justify-center rounded-xl mb-4 transition-colors", card.bg)}>
                  <card.icon className={cn("size-5", card.color)} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-lg font-black text-foreground">{card.value}</p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground/70">{card.helper}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="size-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold tracking-tight">Prochainement</h2>
             </div>
             
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                   <CalendarDays className="size-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">Aucun événement prévu cette semaine</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[240px]">Les plannings de cours et de stages seront affichés ici dès leur publication.</p>
             </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  )
}

