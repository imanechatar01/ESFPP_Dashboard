import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { apiRequest } from "@/lib/api"
import { 
  GraduationCap, 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowRightLeft,
  X, 
  Loader2,
  CalendarDays,
  Search,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: GraduationCap },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Filières", path: "/admin/filieres", icon: GraduationCap },
]

export default function FormateursManagement({ path, navigate }) {
  const [formateurs, setFormateurs] = useState([])
  const [logigrammes, setLogigrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [editingFormateur, setEditingFormateur] = useState(null)
  const [formateurToDelete, setFormateurToDelete] = useState(null)
  const [formateurToReplace, setFormateurToReplace] = useState(null)

  const [formData, setFormData] = useState({
    nom: "",
    statut: "vacataire"
  })

  const [replaceData, setReplaceData] = useState({
    new_formateur_id: "",
    scope: "all",
    logigramme_id: ""
  })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [fData, lData] = await Promise.all([
        apiRequest("/api/formateurs"),
        apiRequest("/api/logigramme/list")
      ])
      setFormateurs(fData)
      setLogigrammes(lData)
    } catch (err) {
      console.error("Failed to fetch:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleOpenModal = (formateur = null) => {
    if (formateur) {
      setEditingFormateur(formateur)
      setFormData({
        nom: formateur.nom,
        statut: formateur.statut
      })
    } else {
      setEditingFormateur(null)
      setFormData({
        nom: "",
        statut: "vacataire"
      })
    }
    setIsModalOpen(true)
  }

  const handleOpenReplaceModal = (formateur) => {
    setFormateurToReplace(formateur)
    setReplaceData({
      new_formateur_id: "",
      scope: "all",
      logigramme_id: ""
    })
    setIsReplaceModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingFormateur) {
        await apiRequest(`/api/formateurs/${editingFormateur.id}`, {
          method: "PUT",
          body: JSON.stringify(formData)
        })
      } else {
        await apiRequest("/api/formateurs", {
          method: "POST",
          body: JSON.stringify(formData)
        })
      }
      setIsModalOpen(false)
      fetchAll()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  const handleReplace = async () => {
    if (!replaceData.new_formateur_id) return
    try {
      await apiRequest("/api/formateurs/replace", {
        method: "POST",
        body: JSON.stringify({
          old_formateur_id: formateurToReplace.id,
          ...replaceData
        })
      })
      setIsReplaceModalOpen(false)
      fetchAll()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  const handleDelete = async () => {
    if (!formateurToDelete) return
    try {
      await apiRequest(`/api/formateurs/${formateurToDelete.id}`, {
        method: "DELETE"
      })
      setIsDeleteModalOpen(false)
      fetchAll()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  // Filter formateurs based on search query
  const filteredFormateurs = formateurs.filter((formateur) => {
    const query = searchQuery.toLowerCase()
    return (
      formateur.nom.toLowerCase().includes(query) ||
      formateur.statut.toLowerCase().includes(query)
    )
  })

  return (
    <DashboardShell
      title="Gestion des Formateurs"
      subtitle="Gérez l'affectation des enseignants aux unités de formation."
      
      activePath={path}
      navigate={navigate}
    >
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par nom ou statut..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold uppercase tracking-widest text-xs">
          <Plus className="size-4 mr-2" />
          Nouveau formateur
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto custom-scrollbar shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom Complet</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Statut</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="3" className="px-6 py-12 text-center">
                  <Loader2 className="size-6 animate-spin text-primary/40 mx-auto" />
                </td>
              </tr>
            ) : formateurs.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-12 text-center text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Aucun formateur trouvé
                </td>
              </tr>
            ) : filteredFormateurs.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-12 text-center text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Aucun formateur ne correspond à votre recherche
                </td>
              </tr>
            ) : (
              filteredFormateurs.map((formateur) => (
                <tr key={formateur.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-foreground">{formateur.nom}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
                      formateur.statut === 'permanent' 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {formateur.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenReplaceModal(formateur)}
                        className="p-2 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                        title="Remplacer par un autre formateur"
                      >
                        <ArrowRightLeft className="size-4" />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(formateur)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setFormateurToDelete(formateur)
                          setIsDeleteModalOpen(true)
                        }}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold tracking-tight">
                {editingFormateur ? "Modifier le formateur" : "Nouveau formateur"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nom complet</Label>
                <Input 
                  id="nom" 
                  value={formData.nom} 
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="ex: ZOURARAH CHAFIA"
                  className="rounded-xl font-bold uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Statut</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['permanent', 'vacataire'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFormData(prev => ({ ...prev, statut: s }))}
                      className={cn(
                        "h-10 rounded-xl border px-4 text-xs font-bold uppercase tracking-widest transition-all",
                        formData.statut === s 
                          ? "bg-primary/10 border-primary text-primary shadow-sm" 
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Annuler
              </Button>
              <Button onClick={handleSubmit} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                {editingFormateur ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Modal */}
      {isReplaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-accent">Remplacer le formateur</h3>
                <p className="text-xs text-muted-foreground font-medium mt-1">Cession globale des unités de formation</p>
              </div>
              <button onClick={() => setIsReplaceModalOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 mb-6 flex items-center gap-4">
               <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent/60">Ancien</p>
                  <p className="text-sm font-black text-foreground truncate">{formateurToReplace?.nom}</p>
               </div>
               <ArrowRightLeft className="size-4 text-accent/30" />
               <div className="flex-1 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent/60">Nouveau</p>
                  <p className="text-sm font-black text-foreground truncate">
                    {formateurs.find(f => f.id === replaceData.new_formateur_id)?.nom || "Choisir..."}
                  </p>
               </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nouveau formateur</Label>
                <select 
                  value={replaceData.new_formateur_id}
                  onChange={(e) => setReplaceData(prev => ({ ...prev, new_formateur_id: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none"
                >
                  <option value="">Sélectionner un formateur...</option>
                  {formateurs
                    .filter(f => f.id !== formateurToReplace?.id)
                    .map(f => <option key={f.id} value={f.id}>{f.nom}</option>)
                  }
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Portée du remplacement</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'all', label: 'Tout le Dashboard' },
                    { id: 'logigramme', label: 'Logigramme spécifique' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setReplaceData(prev => ({ ...prev, scope: s.id }))}
                      className={cn(
                        "h-12 rounded-xl border px-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        replaceData.scope === s.id 
                          ? "bg-accent/10 border-accent text-accent shadow-sm" 
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {replaceData.scope === 'logigramme' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Choisir le logigramme</Label>
                  <select 
                    value={replaceData.logigramme_id}
                    onChange={(e) => setReplaceData(prev => ({ ...prev, logigramme_id: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none"
                  >
                    <option value="">Sélectionner un logigramme...</option>
                    {logigrammes.map(l => (
                      <option key={l.id} value={l.id}>{l.filiere.code} - {l.classe.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setIsReplaceModalOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Annuler
              </Button>
              <Button 
                onClick={handleReplace} 
                className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-accent hover:bg-accent/90"
                disabled={!replaceData.new_formateur_id || (replaceData.scope === 'logigramme' && !replaceData.logigramme_id)}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <h3 className="text-lg font-bold tracking-tight">Supprimer ?</h3>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              Voulez-vous vraiment supprimer <span className="text-foreground font-bold">{formateurToDelete?.nom}</span> ?
              Les unités associées n'auront plus de formateur assigné.
            </p>
            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDelete} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
