import { useState, useEffect } from "react"
import { supabase } from "@/supabaseClient"
import { API_URL, apiRequest } from "@/lib/api"
import { X, Upload, FileSpreadsheet, Loader2, Check, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const [academicYears, setAcademicYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState("")
  const [files, setFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)

  const [loadingYears, setLoadingYears] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null) // null = not done yet, Array = done

  useEffect(() => {
    if (isOpen) {
      fetchAcademicYears()
      setFiles([])
      setError(null)
      setResults(null)
    }
  }, [isOpen])

  const fetchAcademicYears = async () => {
    setLoadingYears(true)
    try {
      const res = await apiRequest("/api/years")
      setAcademicYears(res)
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

  const addFiles = (newFiles) => {
    const xlsFiles = Array.from(newFiles).filter(f => f.name.endsWith(".xls"))
    const rejected = Array.from(newFiles).filter(f => !f.name.endsWith(".xls"))
    if (rejected.length > 0) {
      setError(`${rejected.length} fichier(s) ignoré(s) : seuls les .xls sont acceptés.`)
    } else {
      setError(null)
    }
    if (xlsFiles.length === 0) return
    // Deduplicate by name
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name))
      const toAdd = xlsFiles.filter(f => !existingNames.has(f.name))
      return [...prev, ...toAdd]
    })
  }

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name))
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      // Reset input so the same file can be re-added after removal
      e.target.value = ""
    }
  }

  const handleUpload = async () => {
    if (!selectedYearId) {
      setError("Veuillez sélectionner une année académique.")
      return
    }
    if (files.length === 0) {
      setError("Veuillez sélectionner au moins un fichier.")
      return
    }

    setImporting(true)
    setError(null)
    setResults(null)

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      const formData = new FormData()
      formData.append("academic_year_id", selectedYearId)
      files.forEach(f => formData.append("files", f))

      const response = await fetch(`${API_URL}/api/logigramme/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || "L'importation a échoué.")
      }

      setResults(payload.results || [])
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

  const successCount = results ? results.filter(r => r.status === "success").length : 0
  const hasAnySuccess = successCount > 0

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Importer des logigrammes
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Importez un ou plusieurs fichiers d'organisation horaire au format .xls.
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

        {/* Results screen */}
        {results ? (
          <div className="space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center py-2">
              <div className="size-14 rounded-full bg-status-done/10 text-accent flex items-center justify-center mb-3 shadow-sm">
                <Check className="size-7" />
              </div>
              <h4 className="text-base font-bold text-foreground">Traitement terminé</h4>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                {successCount}/{results.length} fichier(s) importé(s) avec succès.
              </p>
            </div>

            <div className="max-h-[240px] overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background/50 custom-scrollbar">
              {results.map((r, i) => (
                <div key={i} className="p-3 text-[11px] font-semibold">
                  {/* File name */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground truncate max-w-[260px]">{r.fileName}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md uppercase text-[9px] font-black tracking-wide",
                      r.status === "success" && "bg-accent/10 text-accent",
                      r.status === "conflict" && "bg-amber-500/10 text-amber-700",
                      r.status === "error" && "bg-destructive/10 text-destructive",
                    )}>
                      {r.status === "success" && "Succès"}
                      {r.status === "conflict" && "Conflit"}
                      {r.status === "error" && "Erreur"}
                    </span>
                  </div>

                  {/* Success: list programmes */}
                  {r.status === "success" && r.importedLogs?.length > 0 && (
                    <div className="mt-1.5 space-y-1 pl-1 border-l-2 border-accent/30">
                      {r.importedLogs.map((log, j) => (
                        <div key={j} className="flex items-center justify-between">
                          <span className="text-foreground/80">{log.filiere} — <span className="text-muted-foreground/60">{log.classe}</span></span>
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] rounded font-bold">{log.unitsCount} unités</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Conflict: show filiere/classe */}
                  {r.status === "conflict" && (
                    <p className="text-amber-700/80 mt-1 pl-1 border-l-2 border-amber-400/40">
                      Planning existant pour <strong>{r.filiere}</strong> / {r.classe}. Réimportez ce fichier seul pour remplacer ou fusionner.
                    </p>
                  )}

                  {/* Error: show message */}
                  {r.status === "error" && (
                    <p className="text-destructive/80 mt-1 pl-1 border-l-2 border-destructive/30 break-words">{r.error}</p>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={onClose} className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px]">
              Fermer
            </Button>
          </div>
        ) : (
          /* Upload form */
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
                Fichiers de planification (.xls uniquement)
              </Label>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background/50",
                  files.length > 0 && "border-accent/50 bg-status-done/5"
                )}
              >
                <input
                  type="file"
                  id="excel-file-upload"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept=".xls"
                  multiple
                  onChange={handleFileChange}
                  disabled={importing}
                />

                <div className="size-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/40">
                  <Upload className="size-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-foreground">
                    Glissez-déposez vos fichiers ici, ou cliquez pour parcourir
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-1">
                    Plusieurs fichiers .xls acceptés (10 max, 50 MB chacun)
                  </p>
                </div>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="border border-border rounded-xl divide-y divide-border bg-background/50 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileSpreadsheet className="size-3.5 text-accent shrink-0" />
                        <span className="text-[11px] font-semibold text-foreground truncate">{f.name}</span>
                        <span className="text-[9px] text-muted-foreground/60 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button
                        onClick={() => removeFile(f.name)}
                        disabled={importing}
                        className="ml-2 p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Warning Message */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/40 text-muted-foreground text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-primary/70 mt-0.5" />
              <span>
                Si un fichier contient des couleurs ambiguës ou des cellules à 0 heure, des avertissements peuvent apparaître après l'import.
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
                disabled={importing || files.length === 0 || !selectedYearId}
              >
                {importing ? (
                  <>
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                    Importation...
                  </>
                ) : (
                  `Importer ${files.length > 1 ? `${files.length} fichiers` : "le fichier"}`
                )}
              </Button>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
