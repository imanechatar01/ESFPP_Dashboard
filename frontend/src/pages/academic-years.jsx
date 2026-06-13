import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { apiRequest } from "@/lib/api"
import { 
  Calendar, 
  Plus, 
  CheckCircle2, 
  X, 
  Loader2,
  CalendarDays,
  Copy,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: Calendar },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Filières", path: "/admin/filieres", icon: Calendar },
]

export default function AcademicYears({ path, navigate }) {
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCloning, setIsCloning] = useState(false)
  
  const [formData, setFormData] = useState({
    label: "",
    start_date: "",
    clone_from_year_id: ""
  })

  const fetchYears = async () => {
    setLoading(true)
    try {
      const data = await apiRequest("/api/years")
      setYears(data)
    } catch (err) {
      console.error("Failed to fetch years:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchYears()
  }, [])

  const handleOpenModal = () => {
    setFormData({
      label: "",
      start_date: "",
      clone_from_year_id: ""
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    if (formData.clone_from_year_id) {
        setIsCloning(true)
    }
    try {
      await apiRequest("/api/years", {
        method: "POST",
        body: JSON.stringify(formData)
      })
      setIsModalOpen(false)
      fetchYears()
    } catch (err) {
      alert("Erreur: " + err.message)
    } finally {
      setIsCloning(false)
    }
  }

  const handleSetCurrent = async (id) => {
    try {
      await apiRequest(`/api/years/${id}/set-current`, {
        method: "PUT"
      })
      fetchYears()
    } catch (err) {
      alert("Erreur: " + err.message)
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <DashboardShell
      title="Années Académiques"
      subtitle="Gérez les cycles annuels et la structure des calendriers."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <div className="flex justify-end mb-6">
        <Button onClick={handleOpenModal} className="rounded-xl font-bold uppercase tracking-widest text-xs">
          <Plus className="size-4 mr-2" />
          Nouvelle année
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Année</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Début</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fin</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Statut</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <Loader2 className="size-6 animate-spin text-primary/40 mx-auto" />
                </td>
              </tr>
            ) : years.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Aucune année configurée
                </td>
              </tr>
            ) : (
              years.map((year) => (
                <tr key={year.id} className={cn("group hover:bg-muted/30 transition-colors", year.is_current && "bg-primary/[0.02]")}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-foreground">{year.label}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-muted-foreground">{formatDate(year.start_date)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-muted-foreground">{formatDate(year.end_date)}</p>
                  </td>
                  <td className="px-6 py-4">
                    {year.is_current ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 className="size-3" />
                        Actuelle
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Archive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!year.is_current && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSetCurrent(year.id)}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
                      >
                        Définir comme actuelle
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold tracking-tight">Nouvelle année académique</h3>
              <button onClick={() => !isCloning && setIsModalOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="size-4" />
              </button>
            </div>

            {isCloning ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="size-12 animate-spin text-primary/30 mb-4" />
                    <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">Clonage en cours...</h4>
                    <p className="text-xs text-muted-foreground mt-2 max-w-[250px]">
                        Nous dupliquons la structure des logigrammes et recalculons toutes les dates. Merci de patienter.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="label" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Label de l'année</Label>
                    <Input 
                    id="label" 
                    value={formData.label} 
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="ex: 2026-2027"
                    className="rounded-xl font-bold"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Date de début (Lundi)</Label>
                    <Input 
                    id="start_date" 
                    type="date"
                    value={formData.start_date} 
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="rounded-xl font-bold"
                    />
                    <p className="text-[9px] font-medium text-muted-foreground/60 mt-1">
                        Note: Le système s'alignera automatiquement sur le lundi le plus proche.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cloner la structure (Optionnel)</Label>
                    <select 
                    value={formData.clone_from_year_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, clone_from_year_id: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none"
                    >
                    <option value="">Ne pas cloner (Année vide)</option>
                    {years.map(y => <option key={y.id} value={y.id}>Cloner de {y.label}</option>)}
                    </select>
                    {formData.clone_from_year_id && (
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3 mt-2">
                            <AlertCircle className="size-4 text-primary mt-0.5" />
                            <p className="text-[10px] font-medium text-primary/80 leading-relaxed">
                                Les unités et semaines seront copiées. Les données de complétion (séances terminées) seront réinitialisées.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-8">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                        Créer l'année
                    </Button>
                </div>
                </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
