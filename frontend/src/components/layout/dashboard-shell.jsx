import { HeartPulse, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

export function DashboardShell({ title, subtitle, navItems, activePath, navigate, accent = "admin", children }) {
  const { user, signOut } = useAuth()
  const isStudent = accent === "student"

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <main className={cn("min-h-screen bg-background text-foreground", isStudent && "bg-[oklch(0.985_0.012_145)]")}>
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className={cn("border-r border-border bg-sidebar px-4 py-5", isStudent && "bg-white")}>
          <div className="flex items-center gap-2 px-2">
            <div className={cn("flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground", isStudent && "bg-[oklch(0.55_0.14_145)]")}>
              <HeartPulse className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">ESI Portal</p>
              <p className="text-xs text-muted-foreground">{isStudent ? "Espace etudiant" : "Administration"}</p>
            </div>
          </div>

          <nav className="mt-8 flex flex-col gap-1">
            {navItems.map(({ label, icon: Icon, path }) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  activePath === path && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex min-h-16 flex-col gap-3 border-b border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">{isStudent ? "Student" : "Admin"}</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="size-4" />
                Sortir
              </Button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl px-5 py-6">{children}</div>
        </section>
      </div>
    </main>
  )
}
