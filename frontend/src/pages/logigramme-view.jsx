import { useState, useEffect, useCallback } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { FilterBar } from "@/components/logigramme/FilterBar"
import { KpiBar } from "@/components/logigramme/KpiBar"
import { ProgrammeTree } from "@/components/logigramme/ProgrammeTree"
import { HeatmapView } from "@/components/logigramme/HeatmapView"
import { FormateurVue } from "@/components/logigramme/FormateurVue"
import { LogigrammeGrid } from "@/components/logigramme/LogigrammeGrid"
import { useLogigrammeContext } from "@/contexts/logigramme-context"
import { useLogigramme } from "@/hooks/useLogigramme"
import { apiRequest } from "@/lib/api"
import { CalendarDays, ChevronRight, FileSpreadsheet, Loader2, AlertCircle, LayoutGrid, Grid3X3, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ImportModal } from "@/components/logigramme/ImportModal"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: LayoutGrid },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Gestion des comptes", path: "/admin/accounts", icon: FileSpreadsheet },
]

export function LogigrammeView({ path, navigate }) {
  const { filters } = useLogigrammeContext()
  const [list, setList] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [activeLogId, setActiveLogId] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'heatmap'
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  
  const { 
    data: activeLog, 
    loading: loadingGrid, 
    toggleCell, 
    markWeek 
  } = useLogigramme(activeLogId)

  const fetchList = useCallback(async () => {
    setLoadingList(true)
    try {
      const query = new URLSearchParams()
      if (filters.year_id) query.append('year_id', filters.year_id)
      if (filters.filiere_id) query.append('filiere_id', filters.filiere_id)
      if (filters.classe_id) query.append('classe_id', filters.classe_id)
      if (filters.formateur_id) query.append('formateur_id', filters.formateur_id)

      const res = await apiRequest(`/api/logigramme/list?${query.toString()}`)
      setList(res)
      
      if (res.length > 0 && !activeLogId) {
        setActiveLogId(res[0].id)
      } else if (res.length === 0) {
        setActiveLogId(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingList(false)
    }
  }, [filters, activeLogId])

  useEffect(() => {
    fetchList()
  }, [filters]) // Re-fetch list when filters change

  return (
    <DashboardShell
      title="Logigrammes"
      subtitle="Visualisation et suivi de l'avancement pédagogique."
      navItems={navItems}
      activePath={path}
      navigate={navigate}
    >
      <KpiBar />
      
      <div className="flex items-center justify-between mb-4">
        <FilterBar className="mb-0 flex-1" />
        <div className="flex items-center gap-3 ml-4">
          <Button 
            onClick={() => setIsImportModalOpen(true)}
            className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-[38px] px-4"
          >
            <Upload className="size-3.5 mr-2" />
            Importer Excel
          </Button>

          <div className="flex bg-muted/30 p-1 rounded-xl border border-border">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'grid' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid3X3 className="size-3.5" />
              Grille
            </button>
            <button 
              onClick={() => setViewMode('heatmap')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'heatmap' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-3.5" />
              Heatmap
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'heatmap' ? (
        <HeatmapView onSelectRow={(id) => {
          setActiveLogId(id);
          setViewMode('grid');
        }} />
      ) : filters.formateur_id ? (
        <FormateurVue 
          formateurId={filters.formateur_id} 
          onToggleCell={toggleCell}
          onMarkWeek={markWeek}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar List */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Programmes ({list.length})</h3>
          </div>
          
          <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
            {loadingList ? (
              // Loading Skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-full p-3 rounded-xl border border-border bg-card/50 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-4 w-10 bg-muted rounded" />
                    <div className="h-4 flex-1 bg-muted rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-muted rounded-full" />
                    <div className="h-3 w-8 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : list.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-border text-center bg-muted/20">
                <AlertCircle className="size-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-tight">Aucun logigramme ne correspond aux filtres</p>
              </div>
            ) : (
              <ProgrammeTree 
                list={list} 
                activeLogId={activeLogId} 
                onSelect={setActiveLogId} 
              />
            )}
          </div>
        </aside>

        {/* Main Content: Grid */}
        <main>
          {activeLogId ? (
            <LogigrammeGrid 
              data={activeLog} 
              loading={loadingGrid} 
              onToggleCell={toggleCell}
              onMarkWeek={markWeek}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-40 bg-card rounded-3xl border border-dashed border-border medical-glass">
              <div className="size-16 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
                <FileSpreadsheet className="size-8 text-primary/20" />
              </div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-2">Prêt à piloter</h3>
              <p className="text-xs font-medium text-muted-foreground/60 max-w-xs text-center">
                Sélectionnez un programme dans la liste de gauche pour visualiser et mettre à jour l'état d'avancement du logigramme.
              </p>
            </div>
          )}
        </main>
      </div>
      )}

      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={fetchList}
      />
    </DashboardShell>
  )
}
