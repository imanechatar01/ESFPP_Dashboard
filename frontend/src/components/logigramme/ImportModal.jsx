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
  const [successData, setSuccessData] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchAcademicYears()
      setFile(null)
      setError(null)
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
      } else {
        setError("Seuls les fichiers Excel au format .xls sont supportés.")
      }
    }
  }

  const handleUpload = async () => {
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
    setSuccessData(null)

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      const formData = new FormData()
      formData.append("academic_year_id", selectedYearId)
      formData.append("file", file)

      const response = await fetch(`${API_URL}/api/logigramme/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
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
        {!successData ? (
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
                  file && "border-emerald-500/50 bg-emerald-500/5"
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
                    <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 animate-in zoom-in-95">
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
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
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
