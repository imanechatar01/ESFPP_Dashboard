import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { apiRequest } from "@/lib/api"
import { 
  BookOpen, 
  Plus, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  X, 
  Loader2,
  CheckCircle2,
  CalendarDays,
  Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: BookOpen },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Filières", path: "/admin/filieres", icon: BookOpen },
]

export default function FilieresManagement({ path, navigate }) {
  const [filieres, setFilieres] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingFiliere, setEditingFiliere] = useState(null)
  const [filiereToDelete, setFiliereToDelete] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    niveau: "Technicien Spécialisé",
    nb_annees: 3
  })

  const fetchFilieres = async () => {
    setLoading(true)
    try {
      const data = await apiRequest("/api/filieres")
      setFilieres(data)
    } catch (err) {
      console.error("Failed to fetch filieres:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFilieres()
  }, [])

  const handleOpenModal = (filiere = null) => {
    if (filiere) {
      setEditingFiliere(filiere)
      setFormData({
        name: filiere.name,
        code: filiere.code,
        niveau: filiere.niveau,
        nb_annees: filiere.classes?.length || 0
      })
    } else {
      setEditingFiliere(null)
      setFormData({
        name: "",
        code: "",
        niveau: "Technicien Spécialisé",
        nb_annees: 3
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingFiliere(null)
  }

  const handleSubmit = async () => {
    try {
      if (editingFiliere) {
        await apiRequest(`/api/filieres/${editingFiliere.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: formData.name,
            code: formData.code,
            niveau: formData.niveau
          })
        })
      } else {
        await apiRequest("/api/filieres", {
          method: "POST",
          body: JSON.stringify(formData)
        })
      }
      handleCloseModal()
      fetchFilieres()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  const handleDelete = async () => {
    if (!filiereToDelete) return
    try {
      await apiRequest(`/api/filieres/${filiereToDelete.id}`, {
        method: "DELETE"
      })
      setIsDeleteModalOpen(false)
      setFiliereToDelete(null)
      fetchFilieres()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  const suggestCode = (name) => {
    if (!name) return ""
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 5)
  }

  // Filter filieres based on search query
  const filteredFilieres = filieres.filter((filiere) => {
    const query = searchQuery.toLowerCase()
    return (
      filiere.name.toLowerCase().includes(query) ||
      filiere.code.toLowerCase().includes(query) ||
      filiere.niveau.toLowerCase().includes(query)
    )
  })

  return (
    <DashboardShell
      title="Gestion des Filières"
      subtitle="Configurez les programmes de formation et leurs cycles."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par nom, code ou niveau..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold uppercase tracking-widest text-xs">
          <Plus className="size-4 mr-2" />
          Nouvelle filière
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto custom-scrollbar shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Code</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom de la filière</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Niveau</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <Loader2 className="size-6 animate-spin text-primary/40 mx-auto" />
                </td>
              </tr>
            ) : filieres.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Aucune filière configurée
                </td>
              </tr>
            ) : filteredFilieres.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Aucune filière ne correspond à votre recherche
                </td>
              </tr>
            ) : (
              filteredFilieres.map((filiere) => (
                <tr key={filiere.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-black tracking-wider">
                      {filiere.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-foreground">{filiere.name}</p>
                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{filiere.classes?.length || 0} années de formation</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-muted-foreground">{filiere.niveau}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(filiere)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setFiliereToDelete(filiere)
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
                {editingFiliere ? "Modifier la filière" : "Nouvelle filière"}
              </h3>
              <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nom complet</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => {
                    const name = e.target.value
                    setFormData(prev => ({ 
                      ...prev, 
                      name, 
                      code: prev.code || suggestCode(name) 
                    }))
                  }}
                  placeholder="ex: Aide-Soignant"
                  className="rounded-xl font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Code (court)</Label>
                <Input 
                  id="code" 
                  value={formData.code} 
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="ex: AS"
                  className="rounded-xl font-black uppercase tracking-wider"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Niveau</Label>
                <select 
                  value={formData.niveau}
                  onChange={(e) => setFormData(prev => ({ ...prev, niveau: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="QUALIFICATION">QUALIFICATION</option>
                  <option value="Technicien Spécialisé">Technicien Spécialisé</option>
                </select>
              </div>

              {!editingFiliere && (
                <div className="space-y-2">
                  <Label htmlFor="years" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cycle de formation (années)</Label>
                  <Input 
                    id="years" 
                    type="number"
                    min="1"
                    max="4"
                    value={formData.nb_annees} 
                    onChange={(e) => setFormData(prev => ({ ...prev, nb_annees: parseInt(e.target.value) }))}
                    className="rounded-xl font-bold"
                  />
                  <p className="text-[9px] font-medium text-muted-foreground/60 mt-1 italic">
                    Note: Cela créera automatiquement les classes (1ère année, etc.)
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={handleCloseModal} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Annuler
              </Button>
              <Button onClick={handleSubmit} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                {editingFiliere ? "Enregistrer" : "Créer la filière"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="size-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">Supprimer la filière ?</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Supprimer <span className="font-bold text-foreground">{filiereToDelete?.name}</span> supprimera également tous les logigrammes associés. Cette action est irréversible.
              </p>
            </div>

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
