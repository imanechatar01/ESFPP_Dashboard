import { BookOpenCheck, CalendarDays, ClipboardList, UserRound } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { useAuth } from "@/contexts/auth-context"

const navItems = [
  { label: "Mon espace", path: "/student/dashboard", icon: BookOpenCheck },
]

export function StudentDashboard({ path, navigate }) {
  const { user } = useAuth()
  const firstName = user?.user_metadata?.first_name || user?.user_metadata?.prenom || "Etudiant"

  return (
    <DashboardShell
      title="Espace etudiant"
      subtitle="Votre suivi personnel et vos prochaines etapes."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
      accent="student"
    >
      <section className="rounded-lg border border-[oklch(0.86_0.04_145)] bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-[oklch(0.42_0.09_145)]">Bienvenue</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{firstName}, votre espace est pret.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Retrouvez ici vos informations de profil, vos cours, vos stages et les prochaines annonces de l'ecole.
        </p>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserRound className="size-5 text-[oklch(0.55_0.14_145)]" />
            <h2 className="text-base font-semibold">Profil</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-right font-medium">{user?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium">student</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Statut</dt>
              <dd className="font-medium text-[oklch(0.45_0.12_145)]">Actif</dd>
            </div>
          </dl>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Cours", icon: BookOpenCheck, value: "A venir" },
            { label: "Planning", icon: CalendarDays, value: "A configurer" },
            { label: "Evaluations", icon: ClipboardList, value: "A venir" },
          ].map(({ label, icon: Icon, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <Icon className="size-5 text-[oklch(0.55_0.14_145)]" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p>
              <p className="mt-2 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </section>
      </div>
    </DashboardShell>
  )
}
