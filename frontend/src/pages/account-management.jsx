import { useEffect, useState, useRef } from "react"



import { Activity, Check, Loader2, Mail, MailPlus, RefreshCw, Users, UserPlus, Shield, User, CalendarDays } from "lucide-react"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest } from "@/lib/api"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: Activity },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Gestion des comptes", path: "/admin/accounts", icon: Users },
]

const statusConfig = {
  active: { label: "Actif", className: "bg-emerald-100/80 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400" },
  invited: { label: "Invité", className: "bg-amber-100/80 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400" },
  pending: { label: "En attente", className: "bg-blue-100/80 text-blue-800 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400" },
  blocked: { label: "Bloqué", className: "bg-rose-100/80 text-rose-800 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400" },
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.invited
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset", config.className)}>
      {config.label}
    </span>
  )
}

// CopyButton and InviteLinkDisplay components removed as invitations are sent automatically by email

export function AccountManagement({ path, navigate }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [regenerating, setRegenerating] = useState(null)
  const [rowInviteLinks, setRowInviteLinks] = useState({})
  const [searchQuery, setSearchQuery] = useState("")
  const formRef = useRef(null)

  async function loadUsers() {
    setLoadingUsers(true)
    setError("")
    try {
      const payload = await apiRequest("/api/admin/users")
      setUsers(payload.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleCreateAccount(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage("")
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get("email") || "").trim()
    const role = String(formData.get("role") || "student")

    try {
      await apiRequest("/api/admin/invitations", {
        method: "POST",
        body: JSON.stringify({ email, role }),
      })
      formRef.current?.reset()
      setMessage(`Invitation envoyée par email à ${email}.`)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegenerate(userId) {
    setRegenerating(userId)
    setRowInviteLinks((prev) => ({ ...prev, [userId]: undefined }))

    try {
      await apiRequest(`/api/admin/invitations/${userId}/regenerate`, {
        method: "POST",
      })
      setRowInviteLinks((prev) => ({ ...prev, [userId]: 'sent' }))
      setTimeout(() => {
        setRowInviteLinks((prev) => ({ ...prev, [userId]: undefined }))
      }, 4000)
    } catch (err) {
      setRowInviteLinks((prev) => ({ ...prev, [userId]: null }))
      setError(err.message)
    } finally {
      setRegenerating(null)
    }
  }

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase()
    return (
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.status.toLowerCase().includes(query)
    )
  })

  return (
    <DashboardShell
      title="Gestion des comptes"
      subtitle="Gérez les accès et surveillez l'onboarding des utilisateurs."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        {/* Create invitation */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass h-fit lg:sticky lg:top-28">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="size-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Nouvelle invitation</h2>
          </div>

          <form ref={formRef} onSubmit={handleCreateAccount} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adresse Email</Label>
              <Input 
                id="invite-email" 
                name="email" 
                type="email" 
                placeholder="nom.prenom@esfpp.ma" 
                required 
                className="h-11 rounded-xl bg-background/50 border-border/50 focus:bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rôle assigné</Label>
              <div className="relative group">
                <select
                  id="invite-role"
                  name="role"
                  className="flex h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm font-semibold outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 appearance-none group-hover:border-primary/50 transition-colors"
                  defaultValue="student"
                >
                  <option value="student">Étudiant (Accès restreint)</option>
                  <option value="admin">Administrateur (Accès complet)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/50">
                   <Activity className="size-4" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={submitting}>
              {submitting ? <Loader2 className="size-5 animate-spin mr-2" /> : <MailPlus className="size-5 mr-2" />}
              Envoyer l'invitation
            </Button>
          </form>

          {(message || error) && (
            <div className={cn(
              "mt-6 p-4 rounded-xl text-xs font-bold border animate-in fade-in zoom-in-95 duration-200",
              error ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-primary/5 border-primary/10 text-primary"
            )}>
              {error || message}
            </div>
          )}
        </section>

        {/* Users table */}

        <section className="min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm medical-glass">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Users className="size-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Annuaire des comptes</h2>
                <p className="text-xs text-muted-foreground font-medium">{users.length} utilisateurs enregistrés</p>

              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="rounded-xl font-bold h-10 px-4 hover:bg-muted"
                onClick={loadUsers} 
                disabled={loadingUsers}
              >
                <RefreshCw className={cn("size-4 mr-2", loadingUsers && "animate-spin")} />
                Actualiser
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher par email, rôle ou statut..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-border/50 bg-background/30 backdrop-blur-sm">
            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-border/50">
              {loadingUsers ? (
                <div className="px-6 py-12 text-center">
                  <Loader2 className="size-8 animate-spin mx-auto text-primary/20" />
                  <p className="mt-2 text-sm font-bold text-muted-foreground/50">Synchronisation des données...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Users className="size-8 mx-auto text-muted-foreground/20" />
                  <p className="mt-2 text-sm font-bold text-muted-foreground/50">Aucun compte trouvé</p>
                </div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="p-4 space-y-3 transition-colors hover:bg-muted/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground/60 border border-border/50 shrink-0">
                          <User className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate max-w-[180px]">{user.email}</p>
                          {(user.firstName || user.lastName) && (
                            <p className="text-xs text-muted-foreground font-semibold">
                              {user.firstName} {user.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={user.status} />
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <div className="flex items-center gap-1">
                        {user.role === 'admin' ? <Shield className="size-3.5 text-primary" /> : <User className="size-3.5 text-muted-foreground" />}
                        <span className={cn("text-[10px] font-black uppercase tracking-wider", user.role === 'admin' ? "text-primary" : "text-muted-foreground")}>
                          {user.role}
                        </span>
                      </div>

                      <div>
                        {user.status !== "active" && user.status !== "blocked" && (
                          <div className="flex flex-col items-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="rounded-lg h-8 font-bold text-[10px] uppercase tracking-wider hover:border-primary hover:text-primary transition-all"
                              onClick={() => handleRegenerate(user.id)}
                              disabled={regenerating === user.id}
                            >
                              {regenerating === user.id ? (
                                <Loader2 className="size-3 animate-spin mr-1" />
                              ) : (
                                <Mail className="size-3 mr-1" />
                              )}
                              Renvoyer l'invitation
                            </Button>

                            {rowInviteLinks[user.id] === 'sent' && (
                              <span className="text-[10px] font-bold text-emerald-600 animate-in fade-in duration-300">
                                Invitation envoyée !
                              </span>
                            )}
                          </div>
                        )}
                        {user.status === "active" && (
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600/60">
                            <Check className="size-3" />
                            Finalisé
                          </div>
                        )}
                        {user.status === "blocked" && (
                          <span className="text-xs font-bold italic text-rose-500/60">Restreint</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-left">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Utilisateur</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rôle</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loadingUsers ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan="4">
                       <Loader2 className="size-8 animate-spin mx-auto text-primary/20" />
                       <p className="mt-2 text-sm font-bold text-muted-foreground/50">Synchronisation des données...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan="4">
                       <Users className="size-8 mx-auto text-muted-foreground/20" />
                       <p className="mt-2 text-sm font-bold text-muted-foreground/50">Aucun compte trouvé</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan="4">
                       <Users className="size-8 mx-auto text-muted-foreground/20" />
                       <p className="mt-2 text-sm font-bold text-muted-foreground/50">Aucun compte ne correspond à votre recherche</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground/60 border border-border/50">
                             <User className="size-4" />
                          </div>
                          <span className="text-sm font-bold text-foreground truncate max-w-[200px]">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {user.role === 'admin' ? <Shield className="size-3 text-primary" /> : <User className="size-3 text-muted-foreground" />}
                          <span className={cn("text-xs font-bold uppercase tracking-wider", user.role === 'admin' ? "text-primary" : "text-muted-foreground")}>
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-6 py-4">
                        {user.status !== "active" && user.status !== "blocked" && (
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="rounded-lg h-8 font-bold text-[10px] uppercase tracking-wider hover:border-primary hover:text-primary transition-all"
                              onClick={() => handleRegenerate(user.id)}
                              disabled={regenerating === user.id}
                            >
                              {regenerating === user.id ? (
                                <Loader2 className="size-3 animate-spin mr-1" />
                              ) : (
                                <Mail className="size-3 mr-1" />
                              )}
                              Renvoyer l'invitation
                            </Button>

                            {rowInviteLinks[user.id] === 'sent' && (
                              <span className="text-[10px] font-bold text-emerald-600 animate-in fade-in duration-300">
                                Invitation envoyée !
                              </span>
                            )}
                          </div>
                        )}
                        {user.status === "active" && (
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600/60">
                            <Check className="size-3" />
                            Finalisé
                          </div>
                        )}
                        {user.status === "blocked" && (
                          <span className="text-xs font-bold italic text-rose-500/60">Restreint</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600">
              {error}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  )
}

