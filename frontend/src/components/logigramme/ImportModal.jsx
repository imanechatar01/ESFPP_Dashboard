import { useState, useEffect } from "react"
import { supabase } from "@/supabaseClient"
import { apiRequest } from "@/lib/api"
import { X, Upload, FileSpreadsheet, Loader2, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const [academicYears, setAcademicYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState("")
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  
  const [loadingYears, setLoadingYears] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [successData, setSuccessData] = useState(null)
  const [confirmReplace, setConfirmReplace] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchAcademicYears()
      setFile(null)
      setError(null)
      setConflict(null)
      setConfirmReplace(false)
      setSuccessData(null)
    }
  }, [isOpen])

  const fetchAcademicYears = async () => {
    setLoadingYears(true)
    try {
      const res = await apiRequest("/api/years")
      setAcademicYears(res)
      
      // Auto-select current year if available
      const currentYear = res.find(y => y.is_current)
      if (currentYear) {
        setSelectedYearId(currentYear.id)
      } else if (res.length > 0) {
        setSelectedYearId(res[0].id)
      }
    } catch (err) {
      console.error("Failed to load academic years:", err)
      setError("Impossible de charger les années académiques.")
    } finally {
      setLoadingYears(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith(".xls")) {
        setFile(droppedFile)
        setError(null)
        setConflict(null)
        setConfirmReplace(false)
      } else {
        setError("Seuls les fichiers Excel au format .xls sont supportés.")
      }
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.name.endsWith(".xls")) {
        setFile(selectedFile)
        setError(null)
        setConflict(null)
        setConfirmReplace(false)
      } else {
        setError("Seuls les fichiers Excel au format .xls sont supportés.")
      }
    }
  }

  const handleUpload = async (flags = {}) => {
    if (!selectedYearId) {
      setError("Veuillez sélectionner une année académique.")
      return
    }
    if (!file) {
      setError("Veuillez sélectionner un fichier.")
      return
    }

    setImporting(true)
    setError(null)
    setConflict(null)
    setConfirmReplace(false)
    setSuccessData(null)

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      const formData = new FormData()
      formData.append("academic_year_id", selectedYearId)
      formData.append("file", file)
      
      if (flags.replace_schedule) formData.append("replace_schedule", "true")
      if (flags.allow_merge) formData.append("allow_merge", "true")

      const response = await fetch(`${API_URL}/api/logigramme/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (payload.error === "SCHEDULE_CONFLICT") {
          setConflict(payload)
          return
        }
        throw new Error(payload.error || "L'importation a échoué.")
      }

      setSuccessData(payload)
      if (onImportSuccess) {
        onImportSuccess()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Importer un logigramme
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Importez vos fichiers d'organisation horaire au format .xls.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-muted transition-colors"
            disabled={importing}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        {conflict ? (
          <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center text-center gap-3">
              <div className="size-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600">
                <AlertCircle className="size-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Un planning existe déjà
                </h4>
                <p className="text-xs font-semibold text-amber-800 mt-1">
                  {conflict.filiere} / {conflict.classe}
                </p>
                <p className="text-[11px] font-medium text-amber-700/80 mt-2">
                  Des unités de formation sont déjà enregistrées pour cette classe. Que souhaitez-vous faire des nouvelles données du fichier ?
                </p>
              </div>
            </div>

            {confirmReplace ? (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3 animate-in fade-in zoom-in-95">
                <p className="text-xs font-bold text-destructive text-center">
                  ⚠️ Cette action est irréversible et supprimera toutes les données actuelles de cette classe avant d'importer les nouvelles.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setConfirmReplace(false)}
                    className="flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border-destructive/20 hover:bg-destructive/10 text-destructive"
                    disabled={importing}
                  >
                    Retour
                  </Button>
                  <Button 
                    onClick={() => handleUpload({ replace_schedule: true })}
                    className="flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-destructive hover:bg-destructive/90 text-white"
                    disabled={importing}
                  >
                    {importing ? <Loader2 className="size-3.5 animate-spin" /> : "Confirmer le remplacement"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => handleUpload({ allow_merge: true })}
                  disabled={importing}
                  className="w-full text-left p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer"
                >
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    Fusionner avec l'existant
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-1">
                    Ajoute ou met à jour uniquement les semaines correspondantes. Ne supprime aucune donnée existante.
                  </p>
                </button>
                
                <button
                  onClick={() => setConfirmReplace(true)}
                  disabled={importing}
                  className="w-full text-left p-4 rounded-xl border border-border hover:border-destructive/50 hover:bg-destructive/5 transition-all group cursor-pointer"
                >
                  <p className="text-sm font-bold text-foreground group-hover:text-destructive transition-colors">
                    Remplacer le planning existant
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-1">
                    Écrase la totalité du planning actuel pour cette classe avec les données du fichier.
                  </p>
                </button>
              </div>
            )}

            {!confirmReplace && (
              <Button 
                variant="outline" 
                onClick={() => { setConflict(null); setError(null); }} 
                className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px]"
                disabled={importing}
              >
                Annuler
              </Button>
            )}
          </div>
        ) : !successData ? (
          <div className="space-y-4">
            
            {/* Year selector */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Année Académique
              </Label>
              {loadingYears ? (
                <div className="h-10 rounded-xl border border-border bg-background flex items-center px-3 gap-2">
                  <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground">Chargement des années...</span>
                </div>
              ) : (
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:border-primary transition-colors"
                >
                  <option value="">Sélectionner une année académique...</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label} {y.is_current ? "(Courante)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Drag & Drop Area */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Fichier de planification (.xls uniquement)
              </Label>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background/50",
                  file && "border-accent/50 bg-status-done/5"
                )}
              >
                <input
                  type="file"
                  id="excel-file-upload"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept=".xls"
                  onChange={handleFileChange}
                  disabled={importing}
                />
                
                {file ? (
                  <>
                    <div className="size-12 rounded-2xl bg-status-done/10 flex items-center justify-center text-accent animate-in zoom-in-95">
                      <FileSpreadsheet className="size-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground truncate max-w-[300px]">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                        {(file.size / 1024).toFixed(1)} KB — Prêt pour l'import
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="size-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/40">
                      <Upload className="size-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground">
                        Glissez-déposez votre fichier ici, ou cliquez pour parcourir
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-1">
                        Seuls les fichiers .xls sont acceptés (xls-files)
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Warning Message */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/40 text-muted-foreground text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-primary/70 mt-0.5" />
              <span>
                Si le fichier importé contient des couleurs ambiguës ou des cellules à 0 heure, certaines erreurs peuvent apparaître après l'import.
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-3 mt-8">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                disabled={importing}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleUpload} 
                className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                disabled={importing || !file || !selectedYearId}
              >
                {importing ? (
                  <>
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                    Importation...
                  </>
                ) : (
                  "Importer le planning"
                )}
              </Button>
            </div>

          </div>
        ) : (
          /* Success Screen */
          <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-200">
            <div className="size-16 rounded-full bg-status-done/10 text-accent flex items-center justify-center mx-auto shadow-sm">
              <Check className="size-8" />
            </div>
            
            <div>
              <h4 className="text-base font-bold text-foreground">Importation Réussie !</h4>
              <p className="text-xs text-muted-foreground font-medium mt-2">
                {successData.message}
              </p>
            </div>

            {successData.importedLogs && successData.importedLogs.length > 0 && (
              <div className="max-h-[160px] overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background/50 custom-scrollbar text-left">
                {successData.importedLogs.map((log, index) => (
                  <div key={index} className="p-3 text-[11px] font-semibold flex items-center justify-between">
                    <div>
                      <p className="text-foreground">{log.filiere}</p>
                      <p className="text-muted-foreground/60 text-[9px] mt-0.5">{log.classe}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] rounded-md uppercase font-bold">
                      {log.unitsCount} unités
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={onClose} 
              className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Fermer
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}
