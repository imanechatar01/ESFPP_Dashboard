// frontend/src/components/layout/dashboard-shell.jsx
import { useState, useRef, useEffect } from "react"
import {
  HeartPulse,
  LogOut,
  UserCircle,
  Settings,
  User,
  Shield,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,  // ✅ AJOUTER CET IMPORT
  Users,
  CalendarDays,
  BookOpen,
  GraduationCap,
  Calendar,
  Menu,
  X,
  ChevronDown,
  FileSpreadsheet  // ✅ AJOUTER CET IMPORT
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

export function DashboardShell({ title, subtitle, navItems, activePath, navigate, accent = "admin", children }) {
  const { user, role, signOut } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef(null)

  const userRole = role || (accent === "student" ? "student" : "admin")
  const isStudent = userRole === "student"

  // Utiliser navItems passé en props, sinon utiliser les items par défaut
  const defaultNavItems = isStudent
    ? [
        { label: "Mon espace", path: "/student/dashboard", icon: BookOpen },
        { label: "Cours & Vidéos", path: "/student/courses", icon: BookOpen },
      ]
    : [
        { label: "Tableau de bord", path: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Comptes", path: "/admin/accounts", icon: Users },
        { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
        { label: "Gestion des contrôles", path: "/admin/controls", icon: FileSpreadsheet },
        { label: "Filières", path: "/admin/filieres", icon: BookOpen },
        { label: "Cours & Vidéos", path: "/admin/courses", icon: BookOpen },
        { label: "Formateurs", path: "/admin/formateurs", icon: GraduationCap },
        { label: "Années", path: "/admin/academic-years", icon: Calendar },
      ]

  // Utiliser navItems s'il est passé, sinon les items par défaut
  const itemsToUse = navItems && navItems.length > 0 ? navItems : defaultNavItems

  // Organiser les items en sections
  const menuSections = isStudent
    ? [
        {
          title: "Espace Étudiant",
          items: itemsToUse,
        },
      ]
    : [
        {
           title: "Gestion",
          items: [
          { label: "Tableau de bord", path: "/admin/dashboard", icon: LayoutDashboard },
          { label: "Comptes", path: "/admin/accounts", icon: Users },
          { label: "Gestion des contrôles", path: "/admin/controls", icon: FileSpreadsheet }
          ],
        },
        {
          title: "Pédagogie",
          items: itemsToUse.filter(item => 
            ['Logigrammes', 'Filières', 'Cours & Vidéos', 'Formateurs', 'Années'].includes(item.label)
          ),
        },
      ]

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
      <div
        className={cn(
          "grid min-h-screen transition-all duration-300 ease-in-out grid-cols-1",
          isCollapsed ? "md:grid-cols-[64px_1fr]" : "md:grid-cols-[200px_1fr]"
        )}
      >
        {/* Sidebar Drawer Mobile Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar/95 backdrop-blur-2xl px-2 py-4 transform transition-all duration-300 ease-in-out shadow-2xl md:static md:translate-x-0 md:bg-sidebar/50 md:shadow-none md:overflow-hidden",
            isMobileOpen ? "translate-x-0" : "-translate-x-full",
            isCollapsed ? "md:w-16" : "md:w-[200px]"
          )}
        >
          <div className="flex items-center gap-2 px-2 mb-6 transition-all">
            <div className={cn("flex items-center gap-2 flex-1", isCollapsed && "md:justify-center")}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <HeartPulse className="size-4" />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <p className="text-sm font-bold tracking-tight leading-none">ESFPP</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5 whitespace-nowrap">
                    {isStudent ? "Étudiant" : "Admin"}
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors ml-auto"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          </div>

          <nav className="flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
            {menuSections.map((section) => (
              <div key={section.title} className="flex flex-col gap-1">
                {(!isCollapsed || isMobileOpen) && section.items.length > 0 && (
                  <p className="px-2 mb-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 animate-in fade-in duration-300">
                    {section.title}
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {section.items.map(({ label, icon: Icon, path }) => {
                    const isActive = activePath === path;
                    return (
                      <button
                        key={path}
                        type="button"
                        onClick={() => {
                          navigate(path);
                          setIsMobileOpen(false);
                        }}
                        title={isCollapsed && !isMobileOpen ? label : ""}
                        className={cn(
                          "flex h-9 items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold transition-all duration-200 group relative",
                          isActive
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isActive && (!isCollapsed || isMobileOpen) && "border-l-3 border-accent rounded-l-none pl-1.5",
                          isCollapsed && !isMobileOpen && "justify-center px-0"
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", isActive ? "text-accent" : "text-muted-foreground group-hover:text-primary")} />
                        {(!isCollapsed || isMobileOpen) && <span className="animate-in fade-in duration-300 truncate">{label}</span>}
                        {isCollapsed && !isMobileOpen && isActive && (
                          <div className="absolute left-0 w-0.5 h-5 bg-accent rounded-r-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto px-1">
            {(!isCollapsed || isMobileOpen) ? (
              <div className="p-2 rounded-xl bg-muted/50 border border-border/50 animate-in zoom-in-95 duration-300">
                <p className="text-[10px] font-semibold text-muted-foreground">Support</p>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="size-8 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground text-xs" title="Support">
                  ?
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <section className="min-w-0 flex flex-col">
          {/* Compact header */}
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-100 bg-white px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all shrink-0 cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </button>

              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-800 font-heading leading-tight">{title}</h1>
                {subtitle && <p className="text-[11px] font-medium text-slate-500 hidden sm:block mt-0.5 leading-normal">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors relative cursor-pointer">
                <Bell className="size-4" />
                <span className="absolute top-2 right-2 size-2 bg-accent rounded-full ring-2 ring-white" />
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1.5" />

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100/50 transition-all text-slate-700 shadow-sm group cursor-pointer"
                >
                  <div className="size-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-105 transition-transform">
                    <User className="size-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 hidden sm:inline max-w-[150px] truncate">
                    {[
                      user?.user_metadata?.first_name || user?.user_metadata?.prenom,
                      user?.user_metadata?.last_name || user?.user_metadata?.nom
                    ].filter(Boolean).join(" ") || user?.email || "Utilisateur"}
                  </span>
                  <ChevronDown className="size-3.5 text-slate-400 shrink-0" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-card p-1.5 shadow-2xl shadow-primary/10 animate-in fade-in zoom-in-95 duration-200 z-50 medical-glass">
                    <div className="px-2 py-2 border-b border-border/50 mb-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Connecté</p>
                      <p className="text-xs font-bold text-foreground mt-0.5 truncate">{user?.email}</p>
                    </div>

                    <div className="space-y-0.5">
                      <button className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                        <User className="size-3" />
                        Profil
                      </button>
                      <button className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                        <Settings className="size-3" />
                        Paramètres
                      </button>
                    </div>

                    <div className="h-px bg-border/50 my-1" />

                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="size-3" />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="w-full px-4 md:px-6 py-6 flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}