// frontend/src/components/layout/dashboard-shell.jsx (compact version with toggle in header)
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
  LayoutDashboard,
  Users,
  CalendarDays,
  BookOpen,
  GraduationCap,
  Calendar,
  Menu,
  X
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

  const menuSections = isStudent
  ? [
    {
      title: "Espace Étudiant",
      items: [
        { label: "Mon espace", path: "/student/dashboard", icon: BookOpen },
      ],
    },
  ]
  : [
    {
      title: "Gestion",
      items: [
        { label: "Tableau de bord", path: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Comptes", path: "/admin/accounts", icon: Users },
      ],
    },
    {
      title: "Pédagogie",
      items: [
        { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
        { label: "Filières", path: "/admin/filieres", icon: BookOpen },
        { label: "Formateurs", path: "/admin/formateurs", icon: GraduationCap },
        { label: "Années", path: "/admin/academic-years", icon: Calendar },
      ],
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
      {(!isCollapsed || isMobileOpen) && (
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
    {/* OLD TOGGLE BUTTON REMOVED FROM HERE */}
    </div>
    </aside>

    {/* Main Content */}
    <section className="min-w-0 flex flex-col">
    {/* Compact header */}
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4">
    <div className="flex items-center gap-2">
    {/* NEW TOGGLE BUTTON (desktop only) */}
    <button
    type="button"
    onClick={() => setIsCollapsed(!isCollapsed)}
    className="hidden md:flex p-1.5 -ml-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
    {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
    </button>

    {/* Mobile menu button */}
    <button
    type="button"
    onClick={() => setIsMobileOpen(true)}
    className="md:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0"
    aria-label="Open menu"
    >
    <Menu className="size-4" />
    </button>

    {/* Title and subtitle */}
    <div>
    <h1 className="text-base font-bold tracking-tight text-foreground">{title}</h1>
    {subtitle && <p className="text-[10px] font-medium text-muted-foreground hidden sm:block">{subtitle}</p>}
    </div>
    </div>

    <div className="flex items-center gap-2">
    <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors relative">
    <Bell className="size-4" />
    <span className="absolute top-1 right-1 size-1.5 bg-accent rounded-full ring-1 ring-card" />
    </button>

    <div className="h-5 w-px bg-border mx-0.5" />

    <div className="relative" ref={dropdownRef}>
    <button
    onClick={() => setIsProfileOpen(!isProfileOpen)}
    className="flex items-center gap-2 p-0.5 pr-2 rounded-full hover:bg-muted transition-all border border-transparent hover:border-border/50 group"
    >
    <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
    <UserCircle className="size-4" />
    </div>
    <div className="hidden text-left sm:block">
    <p className="text-[11px] font-bold leading-tight max-w-[100px] truncate">{user?.email}</p>
    <p className="text-[8px] font-bold uppercase tracking-wider text-accent leading-tight mt-0.5">
    {isStudent ? "Étudiant" : "Admin"}
    </p>
    </div>
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

    {/* Reduced padding for content area */}
    <div className="w-full px-3 py-3 flex-1 overflow-y-auto">
    {children}
    </div>
    </section>
    </div>
    </main>
  )
}
