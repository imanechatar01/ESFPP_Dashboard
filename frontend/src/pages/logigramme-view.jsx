import { useState, useEffect, useCallback } from "react"
import Swal from 'sweetalert2'
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { FilterBar } from "@/components/logigramme/FilterBar"
import { KpiBar } from "@/components/logigramme/KpiBar"
import { ProgrammeTree } from "@/components/logigramme/ProgrammeTree"
import { FormateurVue } from "@/components/logigramme/FormateurVue"
import { LogigrammeGrid } from "@/components/logigramme/LogigrammeGrid"
import { useLogigrammeContext } from "@/contexts/logigramme-context"
import { useLogigramme } from "@/hooks/useLogigramme"
import { apiRequest } from "@/lib/api"
import { CalendarDays, FileSpreadsheet, Loader2, AlertCircle, LayoutGrid, Upload, Pencil, PanelLeftClose, PanelLeftOpen, Activity, Printer, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ImportModal } from "@/components/logigramme/ImportModal"
import { EditLogigrammeModal } from "@/components/logigramme/EditLogigrammeModal"
import { DuplicateYearModal } from "@/components/logigramme/DuplicateYearModal"

const navItems = [
  { label: "Tableau de bord", path: "/admin/dashboard", icon: LayoutGrid },
  { label: "Logigrammes", path: "/admin/logigrammes", icon: CalendarDays },
  { label: "Gestion des comptes", path: "/admin/accounts", icon: FileSpreadsheet },
]

export function LogigrammeView({ path, navigate }) {
  const { filters, highlightLogigrammeId } = useLogigrammeContext()
  const [list, setList] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [activeLogId, setActiveLogId] = useState(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (highlightLogigrammeId) {
      setActiveLogId(highlightLogigrammeId)
    }
  }, [highlightLogigrammeId])

  const {
    data: activeLog,
    loading: loadingGrid,
    toggleCell,
    actionCell,
    actionWeek,
    refresh: refreshGrid
  } = useLogigramme(activeLogId)

  // Find the label for the active logigramme to show as breadcrumb
  const activeLogEntry = list.find(l => l.id === activeLogId)
  const activeLabel = activeLogEntry
    ? `${activeLogEntry.filiere?.name || '???'} — ${activeLogEntry.classe?.label || '???'}`
    : null

  const handleDelete = async (logId, label) => {
    const result = await Swal.fire({
      title: 'Supprimer ce logigramme ?',
      html: `
        <p style="font-size:0.85rem;color:var(--color-muted-foreground);margin-bottom:6px">Vous êtes sur le point de supprimer :</p>
        <p style="font-weight:800;font-size:0.95rem;margin:8px 0;color:var(--color-foreground)">"${label}"</p>
        <p style="font-size:0.8rem;color:var(--color-destructive);margin-top:6px">
          Cette action est irréversible et supprimera toutes les unités,
          cellules et données de progression associées.
        </p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      customClass: {
        confirmButton: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-2 font-bold mx-2 transition-colors',
        cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/80 rounded-md px-4 py-2 font-bold mx-2 transition-colors'
      },
      buttonsStyling: false,
      reverseButtons: true,
      focusCancel: true,
    })

    if (!result.isConfirmed) return

    try {
      await apiRequest(`/api/logigramme/${logId}`, { method: 'DELETE' })
      if (activeLogId === logId) setActiveLogId(null)
      fetchList()
      Swal.fire({
        title: 'Supprimé !',
        text: `Le logigramme "${label}" a été supprimé avec succès.`,
        icon: 'success',
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: false,
      })
    } catch (err) {
      console.error('[LogigrammeView] Delete failed:', err)
      Swal.fire({
        title: 'Erreur',
        text: `La suppression a échoué : ${err.message}`,
        icon: 'error',
        customClass: {
          confirmButton: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-2 font-bold mx-2 transition-colors'
        },
        buttonsStyling: false,
      })
    }
  }

  const fetchList = useCallback(async () => {
    setLoadingList(true)
    try {
      const query = new URLSearchParams()
      if (filters.year_id) query.append('year_id', filters.year_id)
      if (filters.filiere_id) query.append('filiere_id', filters.filiere_id)
      if (filters.classe_id) query.append('classe_id', filters.classe_id)
      if (filters.formateur_id) query.append('formateur_id', filters.formateur_id)

      const url = `/api/logigramme/list?${query.toString()}`
      console.log('[LogigrammeView] Fetching list with filters:', { ...filters }, 'URL:', url)
      const res = await apiRequest(url)
      console.log(`[LogigrammeView] List response: ${res.length} logigramme(s)`, res.map(l => ({
        id: l.id,
        filiere: l.filiere?.name,
        classe: l.classe?.label,
        annee: l.classe?.annee,
        total_unites: l.total_unites,
        vhg_total: l.vhg_total
      })))
      setList(res)

      const activeLogStillVisible = res.some(log => log.id === activeLogId)
      if (res.length > 0 && !activeLogStillVisible) {
        console.log('[LogigrammeView] Auto-selecting first logigramme:', res[0].id)
        setActiveLogId(res[0].id)
      } else if (res.length === 0) {
        console.warn('[LogigrammeView] ⚠ List is EMPTY for these filters — no logigramme found in DB')
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
      
      activePath={path}
      navigate={navigate}
    >
      <div className="no-print">
        <KpiBar />
      </div>

      {/* Toolbar: Filters + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-2 no-print">
        <FilterBar className="mb-0 flex-1 min-w-0" />
        <div className="flex items-center gap-2 lg:flex-shrink-0 w-full lg:w-auto justify-end">
          <Button
            variant="default"
            onClick={() => setIsImportModalOpen(true)}
            className="rounded-lg font-bold uppercase tracking-widest text-[10px] h-[34px] px-3 flex-1 sm:flex-initial shadow-sm hover:shadow-md transition-shadow"
          >
            <Upload className="size-3.5 mr-1.5" />
            Importer
          </Button>

          {activeLogId && activeLog && (
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              className="rounded-lg font-bold uppercase tracking-widest text-[10px] h-[34px] px-3 flex-1 sm:flex-initial shadow-sm hover:shadow-md transition-shadow"
            >
              <Pencil className="size-3.5 mr-1.5" />
              Éditer
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => setIsDuplicateModalOpen(true)}
            className="rounded-lg font-bold uppercase tracking-widest text-[10px] h-[34px] px-3 flex-1 sm:flex-initial shadow-sm hover:shadow-md transition-shadow"
            title="Dupliquer tous les logigrammes vers une autre année"
          >
            <Copy className="size-3.5 mr-1.5" />
            Dupliquer →
          </Button>

          {filters.formateur_id && (
            <Button
              variant="secondary"
              onClick={() => window.print()}
              className="rounded-lg font-bold uppercase tracking-widest text-[10px] h-[34px] px-3 flex-1 sm:flex-initial shadow-sm hover:shadow-md transition-shadow"
            >
              <Printer className="size-3.5 mr-1.5" />
              Imprimer
            </Button>
          )}
        </div>
      </div>

      {filters.formateur_id ? (
        <FormateurVue
          formateurId={filters.formateur_id}
        />
      ) : (
        <div className="flex gap-3 relative">
          {/* Sidebar Toggle Button — always visible */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "absolute top-0 z-40 flex items-center gap-1.5 h-8 px-2 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:bg-muted/50 transition-all group",
              sidebarOpen ? "left-[236px]" : "left-0"
            )}
            title={sidebarOpen ? "Masquer la liste" : "Afficher la liste"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
              <>
                <PanelLeftOpen className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">
                  {list.length}
                </span>
              </>
            )}
          </button>

          {/* Sidebar List — collapsible */}
          <aside
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0",
              sidebarOpen ? "w-[260px] opacity-100" : "w-0 opacity-0"
            )}
          >
            <div className="w-[260px] space-y-3">
              <div className="flex items-center justify-between px-1 pt-1">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Programmes ({list.length})</h3>
              </div>

              <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
                {loadingList ? (
                  // Loading Skeletons
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-full p-2.5 rounded-lg border border-border bg-card/50 animate-pulse">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-3 w-10 bg-muted rounded" />
                        <div className="h-3 flex-1 bg-muted rounded" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-muted rounded-full" />
                        <div className="h-3 w-8 bg-muted rounded" />
                      </div>
                    </div>
                  ))
                ) : list.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center bg-muted/20">
                    <AlertCircle className="size-5 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-tight">Aucun logigramme ne correspond aux filtres</p>
                  </div>
                ) : (
                  <ProgrammeTree
                    list={list}
                    activeLogId={activeLogId}
                    onSelect={setActiveLogId}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            </div>
          </aside>

          {/* Main Content: Grid */}
          <main className="flex-1 min-w-0">
            {/* Active programme breadcrumb when sidebar is collapsed */}
            {!sidebarOpen && activeLabel && (
              <div className="flex items-center gap-2 mb-2 pl-10">
                <Activity className="size-3 text-primary" />
                <span className="text-[10px] font-bold text-foreground truncate">{activeLabel}</span>
              </div>
            )}

            {activeLogId ? (
              <LogigrammeGrid
                data={activeLog}
                loading={loadingGrid}
                onToggleCell={toggleCell}
                onActionCell={actionCell}
                onActionWeek={actionWeek}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-32 bg-card rounded-2xl border border-dashed border-border medical-glass">
                <div className="size-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-5">
                  <FileSpreadsheet className="size-7 text-primary/20" />
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
      <EditLogigrammeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        logigrammeData={activeLog}
        onSaveSuccess={() => {
          refreshGrid()
          fetchList()
        }}
      />
      <DuplicateYearModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        onSuccess={() => {
          fetchList()
        }}
      />
    </DashboardShell>
  )
}
