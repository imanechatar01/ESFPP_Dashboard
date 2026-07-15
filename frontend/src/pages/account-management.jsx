import { useEffect, useState, useRef } from "react"
import {
  Activity,
  Check,
  Loader2,
  Mail,
  MailPlus,
  RefreshCw,
  Users,
  UserPlus,
  Shield,
  User,
  CalendarDays,
  Trash2,
  ChevronDown,
  Search
} from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest } from "@/lib/api"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"
import { useAuth } from "@/contexts/auth-context"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: Activity },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Gestion des comptes", path: "/admin/accounts", icon: Users },
]

const statusConfig = {
  active: {
    label: "Actif",
    className: "bg-emerald-100/80 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400"
  },
  invited: {
    label: "Invité",
    className: "bg-amber-100/80 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400"
  },
  pending: {
    label: "En attente",
    className: "bg-blue-100/80 text-blue-800 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400"
  },
  blocked: {
    label: "Bloqué",
    className: "bg-rose-100/80 text-rose-800 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400"
  },
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.invited
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset",
        config.className
      )}
    >
      {config.label}
    </span>
  )
}

export function AccountManagement({ path, navigate }) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [regenerating, setRegenerating] = useState(null)
  const [rowInviteLinks, setRowInviteLinks] = useState({})
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [deletingUser, setDeletingUser] = useState(null)
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
      }, 4500)
    } catch (err) {
      setRowInviteLinks((prev) => ({ ...prev, [userId]: null }))
      setError(err.message)
    } finally {
      setRegenerating(null)
    }
  }

  async function handleDeleteUser(userId, userEmail) {
    Swal.fire({
      title: "Supprimer l'utilisateur ?",
      text: `Le compte de ${userEmail} sera définitivement supprimé !`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer !",
      cancelButtonText: "Annuler"
    }).then(async (result) => {
      if (result.isConfirmed) {
        setDeletingUser(userId)

        try {
          await apiRequest(`/api/admin/users/${userId}`, {
            method: "DELETE"
          })
          setUsers(prev => prev.filter(u => u.id !== userId))
          Swal.fire({
            title: "Supprimé !",
            text: "L'utilisateur a été supprimé avec succès.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false
          })
        } catch (err) {
          Swal.fire("Erreur", err.message, "error")
        } finally {
          setDeletingUser(null)
        }
      }
    })
  }

  // Filter users based on search query and role filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch = searchQuery ? (
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.status.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true

    const matchesRole = filterRole ? user.role === filterRole : true

    return matchesSearch && matchesRole
  })

  return (
    <DashboardShell
      title="Gestion des comptes"
      subtitle="Gerez les acces et surveillez l'onboarding des utilisateurs."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="grid gap-8 lg:grid-cols-[380px_1fr] items-start">
        {/* Panel 1: Nouvelle invitation */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
              <UserPlus className="size-5" />
            </div>
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Nouvelle invitation</h2>
          </div>

          <form ref={formRef} onSubmit={handleCreateAccount} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Adresse Email
              </Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="nom.prenom@esfpp.ma"
                required
                className="h-11 rounded-xl bg-slate-50/50 border border-slate-200/80 px-4 text-sm focus:bg-white focus:border-[#1e3e72] focus:ring-4 focus:ring-[#1e3e72]/5 transition-all outline-none w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Rôle assigné
              </Label>
              <div className="relative flex items-center w-full group">
                <div className="absolute left-3.5 text-slate-400 group-hover:text-slate-500 pointer-events-none transition-colors">
                  <Shield className="size-4" />
                </div>
                <select
                  id="invite-role"
                  name="role"
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm font-semibold outline-none focus:bg-white focus:border-[#1e3e72] focus:ring-4 focus:ring-[#1e3e72]/5 appearance-none group-hover:border-slate-300 transition-all cursor-pointer text-slate-700"
                  defaultValue="student"
                >
                  <option value="student">Étudiant (Accès restreint)</option>
                  <option value="admin">Administrateur (Accès complet)</option>
                </select>
                <div className="absolute right-3.5 pointer-events-none text-slate-400">
                  <ChevronDown className="size-4" />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs bg-[#1e3e72] hover:bg-[#152e56] text-white shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
              Envoyer l'invitation
            </Button>
          </form>

          {(message || error) && (
            <div className={cn(
              "p-4 rounded-xl text-xs font-bold border animate-in fade-in zoom-in-95 duration-200",
              error ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
            )}>
              {error || message}
            </div>
          )}
        </section>

        {/* Panel 2: Annuaire des comptes */}
        <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-500/10 border border-emerald-100">
                <Users className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Annuaire des comptes</h2>
                <p className="text-xs text-slate-400 font-semibold">{filteredUsers.length} utilisateurs affichés</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex items-center group">
                <select
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3 pr-8 text-xs font-semibold outline-none focus:bg-white focus:border-[#1e3e72] transition-all appearance-none cursor-pointer text-slate-700"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="">Tous les rôles</option>
                  <option value="admin">Administrateurs</option>
                  <option value="student">Étudiants</option>
                </select>
                <div className="absolute right-2.5 pointer-events-none text-slate-400">
                  <ChevronDown className="size-3.5" />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="rounded-xl font-bold h-10 px-4 hover:bg-slate-50 border border-slate-200/80 text-slate-700 text-xs shrink-0 cursor-pointer"
                onClick={loadUsers}
                disabled={loadingUsers}
              >
                <RefreshCw className={cn("size-3.5 mr-2 text-slate-500", loadingUsers && "animate-spin")} />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
            <Input
              type="text"
              placeholder="Rechercher par email, rôle ou statut..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl h-11 bg-slate-50/50 border border-slate-200/80 focus:bg-white focus:border-[#1e3e72] transition-all outline-none w-full"
            />
          </div>

          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar rounded-xl border border-slate-100 bg-slate-50/20 min-h-0">
            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {loadingUsers && filteredUsers.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Loader2 className="size-8 animate-spin mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-400">Synchronisation des données...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Users className="size-8 mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-400">Aucun compte trouvé</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const firstLetter = user.email.charAt(0).toUpperCase();
                  const colors = [
                    "bg-blue-50 text-blue-600 border-blue-100",
                    "bg-emerald-50 text-emerald-600 border-emerald-100",
                    "bg-purple-50 text-purple-600 border-purple-100",
                    "bg-amber-50 text-amber-600 border-amber-100",
                    "bg-indigo-50 text-indigo-600 border-indigo-100",
                    "bg-rose-50 text-rose-600 border-rose-100",
                  ];
                  const charCode = user.email.charCodeAt(0) || 0;
                  const colorClass = colors[charCode % colors.length];

                  return (
                    <div key={user.id} className="p-4 space-y-3 transition-colors hover:bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={cn("size-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0", colorClass)}>
                            {firstLetter}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate max-w-[180px]">{user.email}</p>
                            {(user.firstName || user.lastName) && (
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                {user.firstName} {user.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={user.status} />
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-1">
                        <span className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border",
                          user.role.toLowerCase() === 'admin'
                            ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                            : "bg-slate-50 text-slate-600 border-slate-100"
                        )}>
                          {user.role.toUpperCase()}
                        </span>

                        <div className="flex items-center gap-2">
                          {user.status !== "active" && (
                            <div className="flex flex-col items-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-lg h-8 px-2.5 border border-slate-200 hover:border-[#1e3e72] hover:bg-slate-50 text-slate-700 hover:text-[#1e3e72] font-black text-[9px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                onClick={() => handleRegenerate(user.id)}
                                disabled={regenerating === user.id}
                              >
                                {regenerating === user.id ? (
                                  <Loader2 className="size-3 animate-spin text-slate-400" />
                                ) : (
                                  <Mail className="size-3" />
                                )}
                                Renvoyer
                              </Button>

                              {rowInviteLinks[user.id] === 'sent' && (
                                <span className="text-[9px] font-bold text-emerald-600 animate-in fade-in duration-300">
                                  Envoyée !
                                </span>
                              )}
                            </div>
                          )}

                          {user.id !== currentUser?.id && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="size-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              disabled={deletingUser === user.id}
                            >
                              {deletingUser === user.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Utilisateur</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Rôle</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right pr-12">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingUsers && filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan="4">
                      <Loader2 className="size-8 animate-spin mx-auto text-slate-300" />
                      <p className="mt-2 text-sm font-bold text-slate-400">Synchronisation des données...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan="4">
                      <Users className="size-8 mx-auto text-slate-300" />
                      <p className="mt-2 text-sm font-bold text-slate-400">Aucun compte trouvé</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const firstLetter = user.email.charAt(0).toUpperCase();
                    const colors = [
                      "bg-blue-50 text-blue-600 border-blue-100",
                      "bg-emerald-50 text-emerald-600 border-emerald-100",
                      "bg-purple-50 text-purple-600 border-purple-100",
                      "bg-amber-50 text-amber-600 border-amber-100",
                      "bg-indigo-50 text-indigo-600 border-indigo-100",
                      "bg-rose-50 text-rose-600 border-rose-100",
                    ];
                    const charCode = user.email.charCodeAt(0) || 0;
                    const colorClass = colors[charCode % colors.length];

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/40 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("size-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0", colorClass)}>
                              {firstLetter}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-slate-700 truncate">{user.email}</span>
                              {(user.firstName || user.lastName) && (
                                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  {user.firstName} {user.lastName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border",
                            user.role.toLowerCase() === 'admin'
                              ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                              : "bg-slate-50 text-slate-600 border-slate-100"
                          )}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 pr-6">
                            {user.status !== "active" && (
                              <div className="flex flex-col items-end gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-lg h-8 px-3 border border-slate-200 hover:border-[#1e3e72] hover:bg-slate-50 text-slate-700 hover:text-[#1e3e72] font-black text-[9px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                                  onClick={() => handleRegenerate(user.id)}
                                  disabled={regenerating === user.id}
                                >
                                  {regenerating === user.id ? (
                                    <Loader2 className="size-3 animate-spin text-slate-400" />
                                  ) : (
                                    <Mail className="size-3" />
                                  )}
                                  Renvoyer l'invitation
                                </Button>

                                {rowInviteLinks[user.id] === 'sent' && (
                                  <span className="text-[9px] font-bold text-emerald-600 animate-in fade-in duration-300">
                                    Invitation envoyée !
                                  </span>
                                )}
                              </div>
                            )}

                            {user.id !== currentUser?.id && (
                              <Button
                                type="button"
                                variant="ghost"
                                className="size-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                disabled={deletingUser === user.id}
                              >
                                {deletingUser === user.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
