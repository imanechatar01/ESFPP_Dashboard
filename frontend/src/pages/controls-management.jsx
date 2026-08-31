// frontend/src/pages/controls-management.jsx
import { useState, useEffect, useCallback } from "react"
import Swal from 'sweetalert2'
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { useLogigrammeContext } from "@/contexts/logigramme-context"
import { apiRequest } from "@/lib/api"
import { 
  CalendarDays, 
  FileSpreadsheet, 
  LayoutGrid, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  XCircle,
  Search,
  Activity,
  Users,
  BookOpen,
  UserPlus,
  Filter,
  ChevronDown,
  School,
  GraduationCap,
  Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: Activity },
   { label: "Gestion des comptes", path: "/admin/accounts", icon: Users },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Gestion des contrôles", path: "/admin/controls", icon: FileSpreadsheet },
   { label: "Filières", path: "/admin/filieres", icon: GraduationCap },
  { label: "Cours & Vidéos", path: "/admin/courses", icon: BookOpen },
  { label: "Formateurs", path: "/admin/formateurs", icon: UserPlus },
  { label: "Années", path: "/admin/academic-years", icon: CalendarDays },
]


// Modal pour ajouter/modifier un contrôle
function ControlFormModal({ 
  isOpen, 
  onClose, 
  onSaved, 
  logigrammes = [],
  controle = null 
}) {
  const [loading, setLoading] = useState(false)
  const [unites, setUnites] = useState([])
  const [loadingUnites, setLoadingUnites] = useState(false)
  
  // États du formulaire
  const [selectedLogigrammeId, setSelectedLogigrammeId] = useState("")
  const [selectedUniteId, setSelectedUniteId] = useState("")
  const [type, setType] = useState("examen")
  const [dateControle, setDateControle] = useState("")
  const [label, setLabel] = useState("")
  const [statut, setStatut] = useState("pending")
  const [error, setError] = useState(null)

  // Charger les unités quand le logigramme change
  useEffect(() => {
    async function loadUnites() {
      if (!selectedLogigrammeId) {
        setUnites([])
        return
      }
      
      setLoadingUnites(true)
      try {
        const res = await apiRequest(`/api/logigramme/${selectedLogigrammeId}`)
        setUnites(res.unites || [])
        if (res.unites && res.unites.length > 0) {
          setSelectedUniteId(res.unites[0].id)
        }
      } catch (err) {
        console.error('Erreur chargement unités:', err)
        setUnites([])
      } finally {
        setLoadingUnites(false)
      }
    }
    loadUnites()
  }, [selectedLogigrammeId])

  // Réinitialiser le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setError(null)
      
      if (controle) {
        setSelectedLogigrammeId(controle.logigramme_id || "")
        setSelectedUniteId(controle.unite_id || "")
        setType(controle.type || "examen")
        setDateControle(controle.date_controle || "")
        setLabel(controle.label || "")
        setStatut(controle.statut || "pending")
      } else {
        setSelectedLogigrammeId(logigrammes[0]?.id || "")
        setSelectedUniteId("")
        setType("examen")
        setDateControle("")
        setLabel("")
        setStatut("pending")
      }
    }
  }, [controle, isOpen, logigrammes])

  if (!isOpen) return null

  const selectedLogigramme = logigrammes.find(l => l.id === selectedLogigrammeId)
  const selectedUnite = unites.find(u => u.id === selectedUniteId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!selectedLogigrammeId) {
        setError("Veuillez sélectionner une classe")
        setLoading(false)
        return
      }
      if (!selectedUniteId) {
        setError("Veuillez sélectionner un module")
        setLoading(false)
        return
      }
      if (!dateControle) {
        setError("Veuillez sélectionner une date")
        setLoading(false)
        return
      }

      const body = { 
        logigramme_id: selectedLogigrammeId,
        unite_id: selectedUniteId, 
        type, 
        date_controle: dateControle, 
        label, 
        statut
      }

      let response
      if (controle) {
        response = await apiRequest(`/api/controles/${controle.id}`, {
          method: "PUT",
          body: JSON.stringify(body)
        })
      } else {
        response = await apiRequest("/api/controles", {
          method: "POST",
          body: JSON.stringify(body)
        })
      }

      if (onSaved) await onSaved()
      onClose()
      
    } catch (err) {
      console.error('[ControlFormModal] Error:', err)
      setError(err.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const getLogigrammeLabel = (log) => {
    if (!log) return ""
    const filiereName = log.filiere?.name || ""
    const classeLabel = log.classe?.label || ""
    return `${filiereName} - ${classeLabel}`
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-lg p-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-4">
          {controle ? "✏️ Modifier le contrôle" : "➕ Ajouter un contrôle"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Classe / Logigramme */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Formation & Classe <span className="text-destructive">*</span>
            </label>
            <select
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={selectedLogigrammeId}
              onChange={(e) => setSelectedLogigrammeId(e.target.value)}
              required
              disabled={!!controle}
            >
              <option value="">Sélectionner une classe...</option>
              {logigrammes.map(log => (
                <option key={log.id} value={log.id}>
                  {getLogigrammeLabel(log)}
                </option>
              ))}
            </select>
            {selectedLogigramme && (
              <p className="mt-1 text-[8px] text-muted-foreground">
                <span className="font-semibold">{selectedLogigramme.filiere?.name}</span> - {selectedLogigramme.classe?.label} ({selectedLogigramme.academic_year?.label})
              </p>
            )}
          </div>

          {/* Module */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Module <span className="text-destructive">*</span>
            </label>
            <select
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={selectedUniteId}
              onChange={(e) => setSelectedUniteId(e.target.value)}
              required
              disabled={!selectedLogigrammeId || loadingUnites}
            >
              <option value="">
                {loadingUnites ? "Chargement des modules..." : "Sélectionner un module..."}
              </option>
              {unites.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nom} {u.vhg ? `(${u.vhg}h)` : ''}
                </option>
              ))}
            </select>
            {selectedUnite && (
              <p className="mt-1 text-[8px] text-muted-foreground">
                {selectedUnite.nom} - {selectedUnite.vhg || 0}h
              </p>
            )}
          </div>

          {/* Type de contrôle */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Type de contrôle <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'examen', label: 'Examen' },
                { value: 'controle_continu', label: 'Contrôle continu' },
                { value: 'rattrapage', label: 'Rattrapage' }
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`py-2.5 px-2 text-[10px] font-bold uppercase border rounded-lg transition-all ${
                    type === t.value 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                      : "bg-background text-muted-foreground border-border hover:bg-muted hover:border-primary/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Date du contrôle <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={dateControle}
              onChange={(e) => setDateControle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Description (optionnel)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Ex: Session principale, Salle 4, Coefficient 2..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {controle && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Statut
              </label>
              <select
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
              >
                <option value="pending">🕐 Programmé</option>
                <option value="done">✅ Passé (Fait)</option>
                <option value="missed">❌ Non passé / Manqué</option>
              </select>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-[10px] font-bold text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              className="h-9 text-xs font-bold uppercase tracking-wider"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="h-9 text-xs font-bold uppercase tracking-wider px-6"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Enregistrement...
                </>
              ) : (
                controle ? "Mettre à jour" : "Ajouter"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Composant principal
export function ControlsManagement({ path, navigate }) {
  const [controles, setControles] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedControle, setSelectedControle] = useState(null)
  const [logigrammes, setLogigrammes] = useState([])
  
  // Filtres
  const [filterFiliere, setFilterFiliere] = useState('all') // ✅ Changé de filterClasse à filterFiliere
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('search') || ''
  })

  // Synchroniser la recherche si l'URL change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlSearch = params.get('search')
    if (urlSearch !== null) {
      setSearchTerm(urlSearch)
    }
  }, [path])

  // Charger les logigrammes
  const loadLogigrammes = useCallback(async () => {
    try {
      const res = await apiRequest('/api/logigramme/list')
      setLogigrammes(res)
    } catch (err) {
      console.error('Erreur chargement logigrammes:', err)
    }
  }, [])

  useEffect(() => {
    loadLogigrammes()
  }, [loadLogigrammes])

  // Charger tous les contrôles
  const loadControles = useCallback(async () => {
    setLoading(true)
    try {
      const allControles = []
      for (const log of logigrammes) {
        try {
          const res = await apiRequest(`/api/controles?logigramme_id=${log.id}`)
          const enriched = res.map(c => ({
            ...c,
            classeLabel: log.classe?.label || '',
            filiereName: log.filiere?.name || '',
            academicYear: log.academic_year?.label || ''
          }))
          allControles.push(...enriched)
        } catch (err) {
          console.error(`Erreur chargement contrôles pour ${log.id}:`, err)
        }
      }
      setControles(allControles)
    } catch (err) {
      console.error('Erreur chargement contrôles:', err)
      setControles([])
    } finally {
      setLoading(false)
    }
  }, [logigrammes])

  useEffect(() => {
    if (logigrammes.length > 0) {
      loadControles()
    }
  }, [logigrammes, loadControles])

  // ✅ Obtenir la liste unique des filières pour le filtre
  const filiereOptions = [...new Set(controles.map(c => c.filiereName).filter(Boolean))]

  // Filtrer les contrôles
  const filteredControles = controles.filter(c => {
    const statusMatch = filterStatus === 'all' || c.statut === filterStatus || c.computed_status === filterStatus
    const filiereMatch = filterFiliere === 'all' || c.filiereName === filterFiliere // ✅ Filtrer par filière
    const searchMatch = 
      c.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.unite?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.filiereName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.classeLabel?.toLowerCase().includes(searchTerm.toLowerCase())
    return statusMatch && filiereMatch && searchMatch
  })

  // Statistiques
  const stats = {
    total: controles.length,
    urgent: controles.filter(c => c.computed_status === 'urgent').length,
    done: controles.filter(c => c.statut === 'done').length,
    pending: controles.filter(c => c.statut === 'pending' && c.computed_status !== 'urgent').length,
    missed: controles.filter(c => c.statut === 'missed').length
  }

  // Gestionnaires
  const handleOpenModal = (controle = null) => {
    setSelectedControle(controle)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedControle(null)
  }

  const handleSave = async () => {
    await loadControles()
  }

  const handleDelete = async (controle) => {
    const result = await Swal.fire({
      title: 'Supprimer ce contrôle ?',
      html: `
        <p><strong>${controle.label || controle.type}</strong></p>
        <p class="text-muted-foreground text-xs">${controle.filiereName} - ${controle.classeLabel}</p>
        <p class="text-muted-foreground text-xs">${new Date(controle.date_controle).toLocaleDateString('fr-FR')}</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#ef4444',
    })

    if (!result.isConfirmed) return

    try {
      await apiRequest(`/api/controles/${controle.id}`, { method: 'DELETE' })
      await loadControles()
      Swal.fire({
        title: 'Supprimé !',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (err) {
      Swal.fire({
        title: 'Erreur',
        text: err.message,
        icon: 'error',
      })
    }
  }

  const handleMarkDone = async (controle) => {
    try {
      await apiRequest(`/api/controles/${controle.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...controle,
          statut: 'done'
        })
      })
      await loadControles()
      Swal.fire({
        title: '✅ Marqué comme passé',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (err) {
      Swal.fire({
        title: 'Erreur',
        text: err.message,
        icon: 'error',
      })
    }
  }

  // Obtenir le statut visuel
  const getStatusBadge = (controle) => {
    const status = controle.computed_status || controle.statut
    
    const config = {
      'done': { color: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 shadow-sm shadow-emerald-100/50', icon: CheckCircle, label: 'Passé' },
      'missed': { color: 'bg-rose-50 text-rose-600 border-rose-200/60 shadow-sm shadow-rose-100/50', icon: XCircle, label: 'Manqué' },
      'urgent': { color: 'bg-amber-50 text-amber-600 border-amber-200/60 shadow-sm shadow-amber-100/50', icon: AlertTriangle, label: 'Urgent' },
      'pending': { color: 'bg-sky-50 text-sky-600 border-sky-200/60 shadow-sm shadow-sky-100/50', icon: Clock, label: 'Programmé' }
    }
    
    const c = config[status] || config.pending
    const Icon = c.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${c.color}`}>
        <Icon className="size-3" strokeWidth={2.5} />
        {c.label}
      </span>
    )
  }

  // Formater la date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // Statut options
  const statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'pending', label: 'Programmé' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'done', label: 'Passé' },
    { value: 'missed', label: 'Manqué' }
  ]

  return (
    <DashboardShell
      title="Gestion des contrôles"
      subtitle="Planifier, suivre et gérer tous les contrôles et examens."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Total</p>
          <p className="text-xl font-black text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">🔴 Urgent</p>
          <p className="text-xl font-black text-orange-500">{stats.urgent}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">✅ Passé</p>
          <p className="text-xl font-black text-emerald-500">{stats.done}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">🕐 Programmé</p>
          <p className="text-xl font-black text-blue-500">{stats.pending}</p>
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          {/* ✅ Filtre par FORMATION (Filière) */}
          <div className="relative">
            <select
              className="pl-8 pr-8 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none min-w-[180px]"
              value={filterFiliere}
              onChange={(e) => setFilterFiliere(e.target.value)}
            >
              <option value="all">🏫 Toutes les formations</option>
              {filiereOptions.map(filiere => (
                <option key={filiere} value={filiere}>{filiere}</option>
              ))}
            </select>
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          </div>

          {/* Filtre par statut */}
          <div className="relative">
            <select
              className="pl-8 pr-8 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none min-w-[120px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {statusOptions.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          </div>

          {/* Recherche */}
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un contrôle..."
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
          disabled={logigrammes.length === 0}
        >
          <Plus className="size-3.5 mr-1.5" />
          Nouveau contrôle
        </Button>
      </div>

      {/* Tableau des contrôles */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : logigrammes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-card rounded-2xl border border-dashed border-border">
          <School className="size-12 text-muted-foreground/20 mb-4" />
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-2">Aucune classe disponible</h3>
          <p className="text-xs text-muted-foreground/60 max-w-sm text-center">
            Créez d'abord des classes et des logigrammes pour pouvoir gérer les contrôles.
          </p>
        </div>
      ) : filteredControles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-card rounded-2xl border border-dashed border-border">
          <FileSpreadsheet className="size-12 text-muted-foreground/20 mb-4" />
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-2">Aucun contrôle</h3>
          <p className="text-xs text-muted-foreground/60 max-w-sm text-center mb-4">
            {searchTerm || filterFiliere !== 'all' || filterStatus !== 'all' 
              ? "Aucun contrôle ne correspond aux filtres sélectionnés."
              : "Aucun contrôle n'a été programmé. Cliquez sur 'Nouveau contrôle' pour en ajouter."}
          </p>
          {(searchTerm || filterFiliere !== 'all' || filterStatus !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setFilterFiliere('all')
                setFilterStatus('all')
              }}
              className="text-[10px] font-bold uppercase tracking-widest"
            >
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-[9px] text-muted-foreground">Formation</th>
                  <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-[9px] text-muted-foreground">Classe</th>
                  <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-[9px] text-muted-foreground">Module</th>
                  <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-[9px] text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-[9px] text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-[9px] text-muted-foreground">Description</th>
                  <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-[9px] text-muted-foreground">Statut</th>
                  <th className="px-4 py-2.5 text-right font-black uppercase tracking-widest text-[9px] text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredControles.map((c) => (
                  <tr 
                    key={c.id} 
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/20 transition-colors",
                      c.computed_status === 'urgent' ? 'bg-orange-50/50' : '',
                      c.statut === 'done' ? 'bg-emerald-50/30' : ''
                    )}
                  >
                    <td className="px-4 py-2.5 font-semibold text-foreground">
                      {c.filiereName || '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 bg-muted/50 rounded-full text-[8px] font-bold">
                        {c.classeLabel || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {c.unite?.nom || '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 bg-muted/50 rounded-full text-[8px] font-bold uppercase">
                        {c.type?.replace('_', ' ') || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      {formatDate(c.date_controle)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[150px] truncate">
                      {c.label || '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      {getStatusBadge(c)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.statut !== 'done' && (
                          <button
                            onClick={() => handleMarkDone(c)}
                            className="p-1 rounded hover:bg-emerald-100 transition-colors"
                            title="Marquer comme passé"
                          >
                            <CheckCircle className="size-4 text-emerald-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="p-1 rounded hover:bg-blue-100 transition-colors"
                          title="Modifier"
                        >
                          <Edit className="size-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1 rounded hover:bg-red-100 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="size-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Résumé */}
          <div className="px-4 py-2.5 bg-muted/20 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[9px] text-muted-foreground">
            <span>
              {filteredControles.length} contrôle(s) sur {controles.length} total
              {filterFiliere !== 'all' && ` - Formation: ${filterFiliere}`}
              {filterStatus !== 'all' && ` - Statut: ${statusOptions.find(s => s.value === filterStatus)?.label}`}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span>🔴 Urgent: {stats.urgent}</span>
              <span>✅ Passé: {stats.done}</span>
              <span>🕐 Programmé: {stats.pending}</span>
              <span>❌ Manqué: {stats.missed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <ControlFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaved={handleSave}
        logigrammes={logigrammes}
        controle={selectedControle}
      />
    </DashboardShell>
  )
}
