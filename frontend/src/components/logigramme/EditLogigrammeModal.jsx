import { useState, useEffect } from 'react'
import { apiRequest } from '@/lib/api'
import { useLogigrammeContext } from '@/contexts/logigramme-context'
import { X, Save, Loader2, Pencil, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function EditLogigrammeModal({ isOpen, onClose, logigrammeData, onSaveSuccess }) {
  const { formateurs } = useLogigrammeContext()
  const [editedUnites, setEditedUnites] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    if (isOpen && logigrammeData?.unites) {
      setEditedUnites(
        logigrammeData.unites.map(u => ({
          id: u.id,
          nom: u.nom,
          vhg: u.vhg,
          formateur_id: u.formateur?.id || u.formateur_id || '',
          _original_nom: u.nom,
          _original_vhg: u.vhg,
          _original_formateur_id: u.formateur?.id || u.formateur_id || '',
        }))
      )
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, logigrammeData])

  const updateUnit = (index, field, value) => {
    setEditedUnites(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const hasChanges = editedUnites.some(u =>
    u.nom !== u._original_nom ||
    Number(u.vhg) !== Number(u._original_vhg) ||
    (u.formateur_id || '') !== (u._original_formateur_id || '')
  )

  const getChangedUnites = () => {
    return editedUnites
      .filter(u =>
        u.nom !== u._original_nom ||
        Number(u.vhg) !== Number(u._original_vhg) ||
        (u.formateur_id || '') !== (u._original_formateur_id || '')
      )
      .map(u => ({
        id: u.id,
        nom: u.nom,
        vhg: Number(u.vhg),
        formateur_id: u.formateur_id || null,
      }))
  }

  const handleSave = async () => {
    const changedUnites = getChangedUnites()
    if (changedUnites.length === 0) return

    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      await apiRequest(`/api/logigramme/${logigrammeData.id}/unites`, {
        method: 'PUT',
        body: JSON.stringify({ unites: changedUnites }),
      })

      setSuccessMsg(`${changedUnites.length} unité(s) modifiée(s) avec succès.`)
      if (onSaveSuccess) onSaveSuccess()

      // Update the _original values so hasChanges resets
      setEditedUnites(prev =>
        prev.map(u => ({
          ...u,
          _original_nom: u.nom,
          _original_vhg: u.vhg,
          _original_formateur_id: u.formateur_id,
        }))
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const title = logigrammeData
    ? `${logigrammeData.filiere?.name || '?'} — ${logigrammeData.classe?.label || '?'}`
    : 'Modifier le logigramme'

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl medical-glass animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Modifier les unités
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            disabled={saving}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar mb-4">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/80 backdrop-blur-sm">
                <th className="text-left p-2 font-black uppercase tracking-widest text-[9px] text-muted-foreground w-10">#</th>
                <th className="text-left p-2 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Nom de l'unité</th>
                <th className="text-left p-2 font-black uppercase tracking-widest text-[9px] text-muted-foreground w-20">VHG</th>
                <th className="text-left p-2 font-black uppercase tracking-widest text-[9px] text-muted-foreground w-48">Formateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {editedUnites.map((unit, idx) => {
                const isModified =
                  unit.nom !== unit._original_nom ||
                  Number(unit.vhg) !== Number(unit._original_vhg) ||
                  (unit.formateur_id || '') !== (unit._original_formateur_id || '')

                return (
                  <tr
                    key={unit.id}
                    className={cn(
                      'transition-colors',
                      isModified ? 'bg-primary/5' : 'hover:bg-muted/30'
                    )}
                  >
                    <td className="p-2 text-muted-foreground font-bold">{idx + 1}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={unit.nom}
                        onChange={e => updateUnit(idx, 'nom', e.target.value)}
                        className={cn(
                          'w-full bg-transparent border-b border-transparent focus:border-primary outline-none py-1 px-1 font-medium transition-colors rounded-md',
                          isModified && unit.nom !== unit._original_nom && 'border-primary/30 bg-primary/5'
                        )}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={unit.vhg}
                        onChange={e => updateUnit(idx, 'vhg', e.target.value)}
                        className={cn(
                          'w-full bg-transparent border-b border-transparent focus:border-primary outline-none py-1 px-1 font-bold text-center transition-colors rounded-md',
                          isModified && Number(unit.vhg) !== Number(unit._original_vhg) && 'border-primary/30 bg-primary/5'
                        )}
                        min={0}
                        step={1}
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={unit.formateur_id || ''}
                        onChange={e => updateUnit(idx, 'formateur_id', e.target.value)}
                        className={cn(
                          'w-full bg-transparent border-b border-transparent focus:border-primary outline-none py-1 px-1 font-medium transition-colors rounded-md',
                          isModified && (unit.formateur_id || '') !== (unit._original_formateur_id || '') && 'border-primary/30 bg-primary/5'
                        )}
                      >
                        <option value="">— Aucun —</option>
                        {formateurs.map(f => (
                          <option key={f.id} value={f.id}>{f.nom}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {editedUnites.length === 0 && (
            <div className="p-8 text-center text-muted-foreground/40">
              <p className="text-[10px] font-bold uppercase tracking-widest">Aucune unité à modifier</p>
            </div>
          )}
        </div>

        {/* Error / Success */}
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2 mb-4 animate-in slide-in-from-top-2 shrink-0">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-status-done/10 border border-accent/20 text-accent text-xs font-bold flex items-center gap-2 mb-4 animate-in slide-in-from-top-2 shrink-0">
            <Save className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
            disabled={saving}
          >
            Fermer
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="size-3.5 mr-2" />
                {hasChanges ? `Sauvegarder (${getChangedUnites().length})` : 'Aucune modification'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
