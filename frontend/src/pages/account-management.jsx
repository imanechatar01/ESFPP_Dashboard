import { useEffect, useState, useRef } from "react"
import { Activity, Check, ClipboardCopy, ExternalLink, Loader2, Link2, MailPlus, RefreshCw, Users, X } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest } from "@/lib/api"

const navItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: Activity },
  { label: "Comptes", path: "/admin/accounts", icon: Users },
]

const statusConfig = {
  active: { label: "Actif", className: "bg-emerald-100 text-emerald-700 ring-emerald-600/20" },
  invited: { label: "Invité", className: "bg-amber-100 text-amber-700 ring-amber-600/20" },
  pending: { label: "En attente", className: "bg-blue-100 text-blue-700 ring-blue-600/20" },
  blocked: { label: "Bloqué", className: "bg-red-100 text-red-700 ring-red-600/20" },
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.invited
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}>
      {config.label}
    </span>
  )
}

function CopyButton({ text, label = "Copier" }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <ClipboardCopy className="size-3.5" />}
      {copied ? "Copié !" : label}
    </Button>
  )
}

function InviteLinkDisplay({ inviteLink, onClose }) {
  if (!inviteLink) return null

  return (
    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-primary" />
          <p className="text-sm font-medium text-foreground">Lien d'invitation généré</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="rounded-md border border-input bg-background px-3 py-2">
        <p className="break-all text-xs font-mono text-muted-foreground select-all">{inviteLink}</p>
      </div>

      <div className="flex items-center gap-2">
        <CopyButton text={inviteLink} label="Copier le lien" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.open(inviteLink, "_blank")}
        >
          <ExternalLink className="size-3.5" />
          Ouvrir
        </Button>
      </div>
    </div>
  )
}

export function AccountManagement({ path, navigate }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [inviteLink, setInviteLink] = useState("")
  const [regenerating, setRegenerating] = useState(null)
  const [rowInviteLinks, setRowInviteLinks] = useState({})
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
    setInviteLink("")

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get("email") || "").trim()
    const role = String(formData.get("role") || "student")

    try {
      const result = await apiRequest("/api/admin/invitations", {
        method: "POST",
        body: JSON.stringify({ email, role }),
      })
      formRef.current?.reset()
      setInviteLink(result.inviteLink || "")
      setMessage(`Invitation créée pour ${email}.`)
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
      const result = await apiRequest(`/api/admin/invitations/${userId}/regenerate`, {
        method: "POST",
      })
      setRowInviteLinks((prev) => ({ ...prev, [userId]: result.inviteLink }))
    } catch (err) {
      setRowInviteLinks((prev) => ({ ...prev, [userId]: null }))
      setError(err.message)
    } finally {
      setRegenerating(null)
    }
  }

  return (
    <DashboardShell
      title="Gestion des comptes"
      subtitle="Invitations, rôles et statut des utilisateurs."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Create invitation */}
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <MailPlus className="size-5 text-primary" />
            <h2 className="text-base font-semibold">Créer une invitation</h2>
          </div>

          <form ref={formRef} onSubmit={handleCreateAccount} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" name="email" type="email" placeholder="personne@ecole.edu" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Rôle</Label>
              <select
                id="invite-role"
                name="role"
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue="student"
              >
                <option value="student">student</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Créer l'invitation
            </Button>
          </form>

          {(message || error) && !inviteLink && (
            <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-foreground"}`}>
              {error || message}
            </p>
          )}

          <InviteLinkDisplay
            inviteLink={inviteLink}
            onClose={() => {
              setInviteLink("")
              setMessage("")
            }}
          />
        </section>

        {/* Users table */}
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <h2 className="text-base font-semibold">Utilisateurs</h2>
            </div>
            <Button type="button" variant="outline" onClick={loadUsers} disabled={loadingUsers}>
              <RefreshCw className={`size-4 ${loadingUsers ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Rôle</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan="4">Chargement...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan="4">Aucun utilisateur trouvé.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-t border-border">
                      <td className="px-3 py-2">{user.email}</td>
                      <td className="px-3 py-2 capitalize">{user.role}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-3 py-2">
                        {user.status !== "active" && user.status !== "blocked" && (
                          <div className="space-y-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => handleRegenerate(user.id)}
                              disabled={regenerating === user.id}
                            >
                              {regenerating === user.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <RefreshCw className="size-3" />
                              )}
                              Générer le lien
                            </Button>

                            {rowInviteLinks[user.id] && (
                              <div className="rounded-md border border-input bg-background p-2 space-y-1.5">
                                <p className="break-all text-[10px] font-mono text-muted-foreground select-all leading-relaxed">
                                  {rowInviteLinks[user.id]}
                                </p>
                                <div className="flex gap-1">
                                  <CopyButton text={rowInviteLinks[user.id]} label="Copier" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {user.status === "active" && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {user.status === "blocked" && (
                          <span className="text-xs text-muted-foreground italic">Débloquer d'abord</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {error && !inviteLink && (
            <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>
      </div>
    </DashboardShell>
  )
}
