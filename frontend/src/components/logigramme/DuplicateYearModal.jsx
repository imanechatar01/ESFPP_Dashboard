// frontend/src/components/logigramme/DuplicateYearModal.jsx
import { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Copy,
  X,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * DuplicateYearModal
 * Allows admin to duplicate all logigrammes from a source academic year to a target year.
 * - Supports existing target years OR auto-generating future academic years (e.g. 2027-2028, 2028-2029).
 * - ISO 8601 dates are recalculated server-side.
 * - No completion data is copied.
 * - Confirmation step before execution.
 */
export function DuplicateYearModal({ isOpen, onClose, onSuccess }) {
  const [years, setYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [sourceYearId, setSourceYearId] = useState('');
  const [targetValue, setTargetValue] = useState(''); // UUID or "NEW:2027-2028"
  const [step, setStep] = useState('select'); // 'select' | 'confirm' | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep('select');
    setSourceYearId('');
    setTargetValue('');
    setResult(null);
    setErrorMsg('');
    loadYears();
  }, [isOpen]);

  async function loadYears() {
    setLoadingYears(true);
    try {
      const data = await apiRequest('/api/years');
      setYears(data || []);
    } catch {
      setYears([]);
    } finally {
      setLoadingYears(false);
    }
  }

  // Compute future year options dynamically based on existing years
  const futureYearOptions = useMemo(() => {
    let maxStart = 2026;
    years.forEach(y => {
      const start = parseInt((y.label || '').split('-')[0], 10);
      if (!isNaN(start) && start > maxStart) {
        maxStart = start;
      }
    });

    const existingLabels = new Set(years.map(y => y.label));
    const future = [];
    for (let i = 1; i <= 6; i++) {
      const startYear = maxStart + i;
      const label = `${startYear}-${startYear + 1}`;
      if (!existingLabels.has(label)) {
        future.push(label);
      }
    }
    return future;
  }, [years]);

  const sourceYear = years.find(y => y.id === sourceYearId);
  const isTargetNew = targetValue.startsWith('NEW:');
  const targetLabel = isTargetNew
    ? targetValue.replace('NEW:', '')
    : years.find(y => y.id === targetValue)?.label;

  const canConfirm = sourceYearId && targetValue && (isTargetNew || targetValue !== sourceYearId);

  async function handleDuplicate() {
    setStep('loading');
    setErrorMsg('');
    try {
      const payload = {
        source_year_id: sourceYearId,
      };
      if (isTargetNew) {
        payload.target_year_label = targetLabel;
      } else {
        payload.target_year_id = targetValue;
      }

      const data = await apiRequest('/api/logigramme/duplicate-year', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResult(data);
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Erreur inconnue lors de la duplication.');
      setStep('error');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl medical-glass animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Copy className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-foreground">
                Dupliquer vers l'année suivante
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                Structure copiée · Dates recalculées ISO 8601 · États réinitialisés
              </p>
            </div>
          </div>
          {step !== 'loading' && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              title="Fermer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          {/* ── STEP: select ── */}
          {step === 'select' && (
            <div className="space-y-5">
              {loadingYears ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-primary/40" />
                </div>
              ) : (
                <>
                  {/* Source Year */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Année source (à copier)
                    </label>
                    <select
                      id="duplicate-source-year"
                      value={sourceYearId}
                      onChange={e => setSourceYearId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                    >
                      <option value="">— Sélectionner l'année source —</option>
                      {years.map(y => (
                        <option key={y.id} value={y.id}>
                          {y.label} {y.is_current ? '(en cours)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center py-1">
                    <div className="flex items-center gap-2 text-muted-foreground/40">
                      <div className="h-px w-16 bg-border" />
                      <ArrowRight className="size-4" />
                      <div className="h-px w-16 bg-border" />
                    </div>
                  </div>

                  {/* Target Year */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Année cible (existante ou nouvelle année future)
                    </label>
                    <select
                      id="duplicate-target-year"
                      value={targetValue}
                      onChange={e => setTargetValue(e.target.value)}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                    >
                      <option value="">— Sélectionner l'année cible —</option>
                      
                      {years.filter(y => y.id !== sourceYearId).length > 0 && (
                        <optgroup label="Années existantes dans la base">
                          {years
                            .filter(y => y.id !== sourceYearId)
                            .map(y => (
                              <option key={y.id} value={y.id}>
                                {y.label} {y.is_current ? '(en cours)' : ''}
                              </option>
                            ))}
                        </optgroup>
                      )}

                      <optgroup label="✨ Nouvelles années futures">
                        {futureYearOptions.map(label => (
                          <option key={label} value={`NEW:${label}`}>
                            {label} (Nouveau — Créer et dupliquer)
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <p className="text-[9px] font-medium text-muted-foreground/50 leading-relaxed">
                      {isTargetNew
                        ? `L'année ${targetLabel} sera créée automatiquement avec le calendrier de semaines ISO 8601.`
                        : "Sélectionnez une année existante ou une nouvelle année future dans la liste."}
                    </p>
                  </div>

                  {/* Info box */}
                  {canConfirm && (
                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2.5">
                        <CalendarDays className="size-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="space-y-1 text-[10px] font-medium text-primary/80 leading-relaxed">
                          {isTargetNew && (
                            <p className="font-black text-primary">
                              ✨ La nouvelle année académique "{targetLabel}" va être créée automatiquement.
                            </p>
                          )}
                          <p><span className="font-black">Structure copiée :</span> formateurs, VHG, types de cellules, positions de semaines.</p>
                          <p><span className="font-black">Dates recalculées :</span> chaque semaine est repositionnée sur le vrai lundi ISO 8601 de {targetLabel}.</p>
                          <p><span className="font-black">États réinitialisés :</span> aucun statut "fait" n'est copié — l'auto-mark s'applique selon la nouvelle date vs aujourd'hui.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Source same as target error */}
                  {!isTargetNew && sourceYearId && targetValue && sourceYearId === targetValue && (
                    <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-center gap-2 text-[10px] font-bold text-destructive">
                      <AlertTriangle className="size-4 flex-shrink-0" />
                      L'année source et l'année cible doivent être différentes.
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => setStep('confirm')}
                  disabled={!canConfirm}
                  className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                >
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP: confirm ── */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <ShieldAlert className="size-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-amber-800 mb-1">Confirmation requise</p>
                  <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
                    Vous êtes sur le point de dupliquer <span className="font-black">{sourceYear?.label}</span> vers{' '}
                    <span className="font-black">{targetLabel}</span>.
                    {isTargetNew && (
                      <span className="block mt-1 font-bold text-amber-900">
                        (L'année {targetLabel} sera automatiquement créée en base avec son calendrier ISO 8601).
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5">
                {[
                  { ok: true, text: `Toutes les unités de formation de "${sourceYear?.label}" seront copiées.` },
                  { ok: true, text: `Les dates seront recalculées (lundi ISO 8601 exact) pour "${targetLabel}".` },
                  { ok: true, text: 'Aucun statut "fait" ne sera copié — recalcul auto-mark selon la date.' },
                  { ok: true, text: `Les données de "${sourceYear?.label}" ne seront pas modifiées.` },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 text-accent mt-0.5 flex-shrink-0" />
                    <span className="text-[11px] font-medium text-foreground/80">{item.text}</span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('select')}
                  className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleDuplicate}
                  className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-primary"
                >
                  Dupliquer maintenant
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP: loading ── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <Loader2 className="size-12 animate-spin text-primary/30" />
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-foreground">
                  Duplication en cours...
                </p>
                <p className="text-xs text-muted-foreground mt-2 max-w-[280px]">
                  Création/génération du calendrier ISO 8601 et copie de la structure. Merci de patienter.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: success ── */}
          {step === 'success' && result && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center py-4">
                <div className="size-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="size-7 text-accent" />
                </div>
                <p className="text-base font-black tracking-tight text-foreground mb-1">
                  Duplication réussie !
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.source} → {result.target}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Logigrammes', value: result.logigrammes },
                  { label: 'Unités', value: result.unites },
                  { label: 'Cellules', value: result.cells },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                    <p className="text-xl font-black text-primary">{item.value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              {result.skipped_cells > 0 && (
                <p className="text-[10px] font-medium text-amber-600 text-center">
                  ⚠ {result.skipped_cells} cellule(s) ignorée(s) (semaine sans date dans l'année cible).
                </p>
              )}

              <Button
                onClick={onClose}
                className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px]"
              >
                Fermer
              </Button>
            </div>
          )}

          {/* ── STEP: error ── */}
          {step === 'error' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex items-start gap-3">
                <AlertTriangle className="size-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-destructive mb-1">Erreur lors de la duplication</p>
                  <p className="text-[11px] font-medium text-destructive/80 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('select')}
                  className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                >
                  Réessayer
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
