import { Activity, CalendarCheck, GraduationCap, Users } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"

const navItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: Activity },
  { label: "Comptes", path: "/admin/accounts", icon: Users },
]

const cards = [
  { label: "Comptes actifs", value: "128", helper: "Admins et etudiants" },
  { label: "Invitations", value: "12", helper: "En attente d'activation" },
  { label: "Stages planifies", value: "34", helper: "Cette session" },
  { label: "Taux de completion", value: "86%", helper: "Profils finalises" },
]

export function AdminDashboard({ path, navigate }) {
  return (
    <DashboardShell
      title="Dashboard admin"
      subtitle="Vue d'ensemble operationnelle de la plateforme."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <section key={card.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.helper}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" />
            <h2 className="text-base font-semibold">Suivi academique</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {["Inscriptions", "Evaluations", "Documents"].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-medium">{item}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Espace reserve aux futurs modules metier.</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-primary" />
            <h2 className="text-base font-semibold">Activite recente</h2>
          </div>
          <div className="mt-4 space-y-3">
            {["Invitation envoyee", "Profil etudiant complete", "Acces admin verifie"].map((event) => (
              <div key={event} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span>{event}</span>
                <span className="text-xs text-muted-foreground">Aujourd'hui</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
