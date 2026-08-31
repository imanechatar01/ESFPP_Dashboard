import { useEffect, useMemo, useRef, useState } from "react"
import Swal from "sweetalert2"
import { apiRequest } from "@/lib/api"
import {
  Activity,
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Edit3,
  FileQuestion,
  GraduationCap,
  Link2,
  Lock,
  Plus,
  Save,
  Stethoscope,
  Trash2,
  Unlock,
  X,
} from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"

const STORAGE_KEY = "esfpp-admin-exams"
const DURATIONS = [30, 45, 60, 90, 120]
const QUESTION_TYPES = [
  { value: "qcu", label: "QCU (Choix Unique)" },
  { value: "qcm", label: "QCM (Choix Multiple)" },
  { value: "liaison", label: "Liaison (Associer des éléments)" },
]

const DEMO_EXAMS = [
  {
    id: "exam-demo-1",
    title: "Évaluation des soins fondamentaux",
    date: "2026-08-12",
    duration: 60,
    locked: false,
    createdAt: "2026-07-24T09:30:00.000Z",
    questions: [
      {
        id: "question-demo-1",
        statement: "Quelle est la première étape avant tout soin au patient ?",
        options: [
          "Vérifier son identité",
          "Préparer sa sortie",
          "Contacter sa famille",
          "Administrer un traitement",
        ],
        correctAnswer: 0,
      },
      {
        id: "question-demo-2",
        statement: "Quel paramètre permet d'évaluer l'oxygénation du patient ?",
        options: [
          "La glycémie",
          "La saturation en oxygène",
          "L'indice de masse corporelle",
          "La diurèse",
        ],
        correctAnswer: 1,
      },
    ],
  },
  {
    id: "exam-demo-2",
    title: "Pharmacologie générale",
    date: "2026-08-22",
    duration: 90,
    locked: true,
    createdAt: "2026-07-18T14:15:00.000Z",
    questions: [
      {
        id: "question-demo-3",
        statement: "La voie sublinguale permet principalement :",
        options: [
          "Une action rapide",
          "Une action retardée",
          "Une absorption intestinale",
          "Une élimination rénale",
        ],
        correctAnswer: 0,
      },
    ],
  },
]

const EMPTY_EXAM = {
  title: "",
  date: "",
  duration: 60,
  questions: [],
}

function createEmptyQuestion(type = "qcu") {
  if (type === "liaison") {
    return {
      type,
      statement: "",
      options: [
        { left: "", right: "" },
        { left: "", right: "" },
      ],
      correctAnswers: [0, 1],
    }
  }

  return {
    type,
    statement: "",
    options: ["", "", "", ""],
    correctAnswers: type === "qcu" ? [0] : [],
  }
}

function normalizeQuestion(question) {
  const type = QUESTION_TYPES.some((item) => item.value === question?.type) ? question.type : "qcu"
  const legacyCorrectAnswers = Array.isArray(question?.correctAnswers)
    ? question.correctAnswers.map(Number)
    : question?.correctAnswer == null ? [] : [Number(question.correctAnswer)]
  const { correctAnswer: _legacyCorrectAnswer, ...rest } = question || {}

  if (type === "liaison") {
    const options = Array.isArray(question?.options)
      ? question.options.map((pair) => ({ left: pair?.left || "", right: pair?.right || "" }))
      : []
    const normalizedOptions = options.length ? options : createEmptyQuestion("liaison").options
    return {
      ...rest,
      type,
      statement: question?.statement || "",
      options: normalizedOptions,
      correctAnswers: legacyCorrectAnswers.length
        ? legacyCorrectAnswers
        : normalizedOptions.map((_, index) => index),
    }
  }

  return {
    ...rest,
    type,
    statement: question?.statement || "",
    options: Array.isArray(question?.options) ? [...question.options] : ["", "", "", ""],
    correctAnswers: legacyCorrectAnswers.length ? legacyCorrectAnswers : type === "qcu" ? [0] : [],
  }
}

function validateQuestion(question) {
  const normalized = normalizeQuestion(question)
  const statement = normalized.statement.trim()

  if (!statement) return { error: "Saisissez l'énoncé de la question." }

  if (normalized.type === "liaison") {
    const options = normalized.options.map((pair) => ({
      left: pair.left.trim(),
      right: pair.right.trim(),
    }))
    const uniqueLeft = new Set(options.map((pair) => pair.left.toLowerCase())).size === options.length
    const uniqueRight = new Set(options.map((pair) => pair.right.toLowerCase())).size === options.length
    if (
      options.length < 2 ||
      options.some((pair) => !pair.left || !pair.right) ||
      !uniqueLeft ||
      !uniqueRight
    ) {
      return { error: "Ajoutez au moins deux paires complètes pour la question de liaison." }
    }
    return {
      value: {
        ...normalized,
        statement,
        options,
        correctAnswers: options.map((_, index) => index),
      },
    }
  }

  const options = normalized.options.map((option) => String(option || "").trim())
  const correctAnswers = [...new Set(normalized.correctAnswers.map(Number))]
  const validCorrectAnswers = correctAnswers.every(
    (answer) => Number.isInteger(answer) && answer >= 0 && answer < options.length,
  )
  if (options.length !== 4 || options.some((option) => !option)) {
    return { error: "Complétez les quatre options de réponse." }
  }
  if (!validCorrectAnswers || (normalized.type === "qcu" && correctAnswers.length !== 1)) {
    return { error: "Sélectionnez une seule bonne réponse pour la question QCU." }
  }
  if (normalized.type === "qcm" && correctAnswers.length < 2) {
    return { error: "Sélectionnez au moins deux bonnes réponses pour la question QCM." }
  }

  return { value: { ...normalized, statement, options, correctAnswers } }
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatDate(value, withTime = false) {
  if (!value) return "Non définie"

  const date = value.includes?.("T")
    ? new Date(value)
    : new Date(`${value}T12:00:00`)

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date)
}

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-2 block text-xs font-semibold text-foreground">
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
  )
}

function QuestionComposer({
  value,
  onChange,
  onAdd,
  compact = false,
  actionLabel = "Ajouter la question",
  onCancel,
}) {
  const question = normalizeQuestion(value)

  const setOption = (index, optionValue) => {
    const nextOptions = [...question.options]
    nextOptions[index] = optionValue
    onChange({ ...question, options: nextOptions })
  }

  const toggleCorrectAnswer = (index) => {
    if (question.type === "qcu") {
      onChange({ ...question, correctAnswers: [index] })
      return
    }

    const selected = question.correctAnswers.includes(index)
    onChange({
      ...question,
      correctAnswers: selected
        ? question.correctAnswers.filter((answer) => answer !== index)
        : [...question.correctAnswers, index].sort((a, b) => a - b),
    })
  }

  const setPair = (index, field, fieldValue) => {
    const nextOptions = question.options.map((pair, pairIndex) =>
      pairIndex === index ? { ...pair, [field]: fieldValue } : pair,
    )
    onChange({
      ...question,
      options: nextOptions,
      correctAnswers: nextOptions.map((_, answerIndex) => answerIndex),
    })
  }

  const addPair = () => {
    const nextOptions = [...question.options, { left: "", right: "" }]
    onChange({
      ...question,
      options: nextOptions,
      correctAnswers: nextOptions.map((_, index) => index),
    })
  }

  const removePair = (index) => {
    if (question.options.length <= 2) return
    const nextOptions = question.options.filter((_, pairIndex) => pairIndex !== index)
    onChange({
      ...question,
      options: nextOptions,
      correctAnswers: nextOptions.map((_, answerIndex) => answerIndex),
    })
  }

  return (
    <div className={compact ? "space-y-4" : "rounded-xl border border-border bg-muted/40 p-4 sm:p-5"}>
      {!compact && (
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CircleHelp className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Nouvelle question</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Combinez librement des QCU, QCM et questions de liaison dans le même examen.
            </p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <FieldLabel required>Type de question</FieldLabel>
        <div className="relative">
          <select
            value={question.type}
            onChange={(event) => {
              const nextQuestion = createEmptyQuestion(event.target.value)
              onChange({ ...nextQuestion, statement: question.statement })
            }}
            className="h-11 w-full appearance-none rounded-lg border border-border bg-card px-3.5 pr-9 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div>
        <FieldLabel required>Énoncé de la question</FieldLabel>
        <textarea
          rows={compact ? 2 : 3}
          value={question.statement}
          onChange={(event) => onChange({ ...question, statement: event.target.value })}
          placeholder="Ex. Quelle est la première étape avant d'administrer un médicament ?"
          className="w-full resize-none rounded-lg border border-border bg-card px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
        />
      </div>

      {question.type === "liaison" ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Élément A</span>
            <span />
            <span>Élément B associé</span>
            <span />
          </div>
          {question.options.map((pair, index) => (
            <div key={index} className="grid items-center gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-[1fr_auto_1fr_auto]">
              <input
                type="text"
                value={pair.left}
                onChange={(event) => setPair(index, "left", event.target.value)}
                placeholder={`Élément A${index + 1}`}
                className="h-10 min-w-0 rounded-lg bg-muted/50 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Link2 className="mx-auto size-4 text-primary" />
              <input
                type="text"
                value={pair.right}
                onChange={(event) => setPair(index, "right", event.target.value)}
                placeholder={`Élément B${index + 1}`}
                className="h-10 min-w-0 rounded-lg bg-muted/50 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                disabled={question.options.length <= 2}
                onClick={() => removePair(index)}
                className="mx-auto flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Supprimer la paire ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPair}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 text-xs font-bold text-primary transition hover:bg-primary/10"
          >
            <Plus className="size-3.5" />
            Ajouter une paire
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground">
            {question.type === "qcu"
              ? "Sélectionnez une seule bonne réponse."
              : "Cochez toutes les bonnes réponses (au moins deux)."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {question.options.map((option, index) => {
              const selected = question.correctAnswers.includes(index)
              return (
                <label
                  key={index}
                  className={`group flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition ${
                    selected
                      ? "border-accent ring-2 ring-accent/15"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <input
                    type={question.type === "qcu" ? "radio" : "checkbox"}
                    name={question.type === "qcu" ? (compact ? "modal-correct-answer" : "create-correct-answer") : undefined}
                    checked={selected}
                    onChange={() => toggleCorrectAnswer(index)}
                    className="size-4 accent-[var(--accent)]"
                  />
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                    selected ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(event) => setOption(index, event.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                  />
                  {selected ? <Check className="size-4 shrink-0 text-accent" /> : null}
                </label>
              )
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20"
      >
        {onCancel ? <Save className="size-4" /> : <Plus className="size-4" />}
        {actionLabel}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="ml-2 mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-bold text-muted-foreground transition hover:bg-muted"
        >
          <X className="size-4" />
          Annuler la modification
        </button>
      )}
    </div>
  )
}

function QuestionList({ questions, onDelete, onEdit, dense = false }) {
  if (!questions.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
        <FileQuestion className="mx-auto size-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm font-semibold text-foreground">Aucune question ajoutée</p>
        <p className="mt-1 text-xs text-muted-foreground">Les questions apparaîtront ici.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {questions.map((rawQuestion, index) => {
        const question = normalizeQuestion(rawQuestion)
        const typeLabel = QUESTION_TYPES.find((type) => type.value === question.type)?.label || "QCU"
        const answerSummary = question.type === "liaison"
          ? `${question.options.length} paire${question.options.length !== 1 ? "s" : ""} à associer`
          : question.correctAnswers
              .map((answer) => String.fromCharCode(65 + answer))
              .join(", ")

        return (
          <div
            key={question.id}
            className={`group flex items-start gap-3 rounded-xl border border-border bg-card ${
              dense ? "p-3" : "p-4"
            } transition hover:border-primary/30 hover:shadow-sm`}
          >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <span className="mb-1.5 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              {typeLabel}
            </span>
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
              {question.statement}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-accent">
              <BadgeCheck className="size-3.5" />
              {question.type === "liaison"
                ? "Associations : "
                : question.type === "qcm"
                  ? "Bonnes réponses : "
                  : "Bonne réponse : "}
              {answerSummary}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(question)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                aria-label={`Modifier la question ${index + 1}`}
                title="Modifier la question"
              >
                <Edit3 className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(question.id)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Supprimer la question ${index + 1}`}
              title="Supprimer la question"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          </div>
        )
      })}
    </div>
  )
}

function ExamModal({ exam, onClose, onSave, notify }) {
  const [draft, setDraft] = useState(() => ({
    ...exam,
    questions: exam.questions.map(normalizeQuestion),
  }))
  const [question, setQuestion] = useState(createEmptyQuestion)
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const questionEditorRef = useRef(null)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose])

  const saveQuestion = () => {
    const validation = validateQuestion(question)
    if (validation.error) {
      notify(validation.error, "error")
      return
    }

    const savedQuestion = {
      ...validation.value,
      id: editingQuestionId || makeId("question"),
    }

    setDraft((current) => ({
      ...current,
      questions: editingQuestionId
        ? current.questions.map((item) =>
            item.id === editingQuestionId ? savedQuestion : item,
          )
        : [...current.questions, savedQuestion],
    }))
    setQuestion(createEmptyQuestion())
    setEditingQuestionId(null)
    notify(editingQuestionId ? "La question a été modifiée." : "La question a été ajoutée.")
  }

  const startEditingQuestion = (questionToEdit) => {
    setEditingQuestionId(questionToEdit.id)
    setQuestion(normalizeQuestion(questionToEdit))
    window.requestAnimationFrame(() => {
      questionEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const cancelQuestionEditing = () => {
    setEditingQuestionId(null)
    setQuestion(createEmptyQuestion())
  }

  const save = () => {
    if (editingQuestionId) {
      notify("Validez ou annulez la modification de la question avant d'enregistrer l'examen.", "error")
      return
    }
    if (!draft.title.trim() || !draft.date || !draft.duration) {
      notify("Renseignez le titre, la date et la durée de l'examen.", "error")
      return
    }
    if (!draft.questions.length) {
      notify("L'examen doit contenir au moins une question.", "error")
      return
    }
    onSave({ ...draft, title: draft.title.trim(), duration: Number(draft.duration) })
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-foreground/55 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-exam-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between bg-primary px-5 py-4 text-primary-foreground sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/15">
              <Edit3 className="size-5" />
            </div>
            <div>
              <h2 id="edit-exam-title" className="text-base font-bold sm:text-lg">
                Modifier l'examen
              </h2>
              <p className="mt-0.5 text-xs text-primary-foreground/75">Mettez à jour les informations et les questions.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-destructive"
            aria-label="Fermer la fenêtre"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto bg-background p-5 sm:p-7">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <BookOpenCheck className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Informations générales</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_190px_170px]">
              <div>
                <FieldLabel required>Titre de l'examen</FieldLabel>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  className="h-11 w-full rounded-lg border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </div>
              <div>
                <FieldLabel required>Date de l'examen</FieldLabel>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  className="h-11 w-full rounded-lg border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </div>
              <div>
                <FieldLabel required>Durée</FieldLabel>
                <div className="relative">
                  <select
                    value={draft.duration}
                    onChange={(event) => setDraft({ ...draft, duration: event.target.value })}
                    className="h-11 w-full appearance-none rounded-lg border border-border bg-card px-3.5 pr-9 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  >
                    {DURATIONS.map((duration) => (
                      <option key={duration} value={duration}>{duration} minutes</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Questions actuelles</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {draft.questions.length} question{draft.questions.length !== 1 ? "s" : ""} dans cet examen
                </p>
              </div>
            </div>
            <QuestionList
              questions={draft.questions}
              onEdit={startEditingQuestion}
              onDelete={(id) => {
                setDraft((current) => ({
                  ...current,
                  questions: current.questions.filter((item) => item.id !== id),
                }))
                if (editingQuestionId === id) cancelQuestionEditing()
              }}
              dense
            />
          </section>

          <section ref={questionEditorRef} className={`scroll-mt-4 rounded-xl border p-4 sm:p-5 ${
            editingQuestionId
              ? "border-accent/30 bg-accent/5"
              : "border-primary/20 bg-primary/5"
          }`}>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-foreground">
                {editingQuestionId ? "Modifier la question sélectionnée" : "Ajouter une nouvelle question"}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {editingQuestionId
                  ? "Modifiez l'énoncé, les réponses ou la bonne réponse, puis validez."
                  : "Elle sera ajoutée à la fin de l'examen."}
              </p>
            </div>
            <QuestionComposer
              value={question}
              onChange={setQuestion}
              onAdd={saveQuestion}
              compact
              actionLabel={editingQuestionId ? "Mettre à jour la question" : "Ajouter la question"}
              onCancel={editingQuestionId ? cancelQuestionEditing : undefined}
            />
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-card px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-border px-5 text-xs font-bold text-muted-foreground transition hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:ring-4 focus:ring-primary/20"
          >
            <Save className="size-4" />
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  )
}

function ExamCard({ exam, onEdit, onToggleLock, onDelete }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className={`h-1 ${exam.locked ? "bg-destructive" : "bg-accent"}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
              exam.locked ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
            }`}>
              <BookOpenCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-foreground">{exam.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Créé le {formatDate(exam.createdAt, true)}</p>
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            exam.locked ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
          }`}>
            {exam.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
            {exam.locked ? "Verrouillé" : "Déverrouillé"}
          </span>
        </div>

        <div className="my-5 grid grid-cols-3 divide-x divide-border rounded-xl bg-muted/40 py-3">
          <div className="px-3 text-center">
            <CalendarDays className="mx-auto size-4 text-primary" />
            <p className="mt-1.5 text-[11px] font-semibold text-foreground">{formatDate(exam.date)}</p>
          </div>
          <div className="px-3 text-center">
            <Clock3 className="mx-auto size-4 text-violet-500" />
            <p className="mt-1.5 text-[11px] font-semibold text-foreground">{exam.duration} min</p>
          </div>
          <div className="px-3 text-center">
            <FileQuestion className="mx-auto size-4 text-amber-500" />
            <p className="mt-1.5 text-[11px] font-semibold text-foreground">
              {exam.questions.length} question{exam.questions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 ${
          exam.locked ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent"
        }`}>
          <span className="relative flex size-2.5">
            {!exam.locked && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
            )}
            <span className={`relative inline-flex size-2.5 rounded-full ${
              exam.locked ? "bg-muted-foreground" : "bg-accent"
            }`} />
          </span>
          <p className="text-[11px] font-semibold">
            {exam.locked
              ? "Accès suspendu — les étudiants ne peuvent pas passer cet examen"
              : "En ligne — les étudiants peuvent passer cet examen"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => onEdit(exam)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-[11px] font-bold text-primary transition hover:bg-primary/15"
          >
            <Edit3 className="size-3.5" />
            Modifier
          </button>
          <button
            type="button"
            onClick={() => onToggleLock(exam.id)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition ${
              exam.locked
                ? "bg-accent/10 text-accent hover:bg-accent/15"
                : "bg-destructive/10 text-destructive hover:bg-destructive/15"
            }`}
          >
            {exam.locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
            {exam.locked ? "Déverrouiller" : "Verrouiller"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(exam)}
            className="ml-auto flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Supprimer ${exam.title}`}
            title="Supprimer l'examen"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </article>
  )
}

export function ExamsManagement({ path, navigate }) {
  const [exams, setExams] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : DEMO_EXAMS
    } catch {
      return DEMO_EXAMS
    }
  })
  const [showForm, setShowForm] = useState(false)
  const [examForm, setExamForm] = useState({ ...EMPTY_EXAM, questions: [] })
  const [questionForm, setQuestionForm] = useState(createEmptyQuestion)
  const [editingExam, setEditingExam] = useState(null)
  const [notice, setNotice] = useState(null)
  const [sharedBackend, setSharedBackend] = useState(false)

  useEffect(() => {
    let active = true

    apiRequest("/api/exams")
      .then((data) => {
        if (!active) return
        setExams(Array.isArray(data) ? data : [])
        setSharedBackend(true)
      })
      .catch(() => {
        if (active) setSharedBackend(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exams))
  }, [exams])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const stats = useMemo(
    () => ({
      total: exams.length,
      available: exams.filter((exam) => !exam.locked).length,
      locked: exams.filter((exam) => exam.locked).length,
      questions: exams.reduce((sum, exam) => sum + exam.questions.length, 0),
    }),
    [exams],
  )

  const notify = (message, type = "success") => setNotice({ message, type })

  const resetCreateForm = () => {
    setExamForm({ ...EMPTY_EXAM, questions: [] })
    setQuestionForm(createEmptyQuestion())
  }

  const addQuestion = () => {
    const validation = validateQuestion(questionForm)
    if (validation.error) {
      notify(validation.error, "error")
      return
    }
    setExamForm((current) => ({
      ...current,
      questions: [
        ...current.questions,
        {
          ...validation.value,
          id: makeId("question"),
        },
      ],
    }))
    setQuestionForm(createEmptyQuestion())
    notify("Question ajoutée à l'examen.")
  }

  const createExam = async () => {
    if (!examForm.title.trim() || !examForm.date || !examForm.duration) {
      notify("Renseignez le titre, la date et la durée de l'examen.", "error")
      return
    }
    if (!examForm.questions.length) {
      notify("Ajoutez au moins une question avant de créer l'examen.", "error")
      return
    }

    const newExam = {
      ...examForm,
      id: makeId("exam"),
      title: examForm.title.trim(),
      duration: Number(examForm.duration),
      createdAt: new Date().toISOString(),
      locked: true,
    }
    let savedExam = newExam
    if (sharedBackend) {
      try {
        savedExam = await apiRequest("/api/exams", {
          method: "POST",
          body: JSON.stringify(newExam),
        })
      } catch (error) {
        notify(error.message || "Impossible d'enregistrer l'examen sur le serveur.", "error")
        return
      }
    }

    setExams((current) => [savedExam, ...current])
    resetCreateForm()
    setShowForm(false)
    notify("L'examen a été créé et verrouillé par défaut.")
  }

  const toggleCreateForm = () => {
    if (showForm) resetCreateForm()
    setShowForm((current) => !current)
  }

  const toggleLock = async (id) => {
    const target = exams.find((exam) => exam.id === id)
    if (!target) return

    const nextLocked = !target.locked
    if (sharedBackend) {
      try {
        const updated = await apiRequest(`/api/exams/${id}/lock`, {
          method: "PATCH",
          body: JSON.stringify({ locked: nextLocked }),
        })
        setExams((current) => current.map((exam) => (exam.id === id ? updated : exam)))
      } catch (error) {
        notify(error.message || "Le statut de l'examen n'a pas pu être modifié.", "error")
        return
      }
    } else {
      setExams((current) =>
        current.map((exam) => (exam.id === id ? { ...exam, locked: nextLocked } : exam)),
      )
    }

    notify(nextLocked ? "L'examen a été verrouillé." : "L'examen est maintenant accessible aux étudiants.")
  }

  const deleteExam = async (exam) => {
    const result = await Swal.fire({
      icon: "warning",
      iconColor: "var(--destructive)",
      background: "var(--card)",
      color: "var(--foreground)",
      title: "Supprimer cet examen ?",
      text: `L'examen « ${exam.title} » et toutes ses questions seront supprimés définitivement.`,
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      reverseButtons: true,
      focusCancel: true,
      buttonsStyling: false,
      customClass: {
        popup: "rounded-2xl",
        title: "text-foreground",
        htmlContainer: "text-muted-foreground",
        actions: "gap-2",
        confirmButton:
          "inline-flex h-10 items-center justify-center rounded-lg bg-destructive px-5 text-xs font-bold text-white transition hover:opacity-90",
        cancelButton:
          "inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-5 text-xs font-bold text-muted-foreground transition hover:bg-muted",
      },
    })

    if (!result.isConfirmed) return
    if (sharedBackend) {
      try {
        await apiRequest(`/api/exams/${exam.id}`, { method: "DELETE" })
      } catch (error) {
        notify(error.message || "L'examen n'a pas pu être supprimé.", "error")
        return
      }
    }

    setExams((current) => current.filter((item) => item.id !== exam.id))
    await Swal.fire({
      icon: "success",
      iconColor: "var(--accent)",
      background: "var(--card)",
      color: "var(--foreground)",
      title: "Examen supprimé",
      text: "L'examen et ses questions ont bien été supprimés.",
      timer: 1800,
      showConfirmButton: false,
      customClass: {
        popup: "rounded-2xl",
        title: "text-foreground",
        htmlContainer: "text-muted-foreground",
      },
    })
  }

  const saveExam = async (updatedExam) => {
    let savedExam = updatedExam
    if (sharedBackend) {
      try {
        savedExam = await apiRequest(`/api/exams/${updatedExam.id}`, {
          method: "PUT",
          body: JSON.stringify(updatedExam),
        })
      } catch (error) {
        notify(error.message || "Les modifications n'ont pas pu être enregistrées.", "error")
        return
      }
    }

    setExams((current) => current.map((exam) => (exam.id === savedExam.id ? savedExam : exam)))
    setEditingExam(null)
    notify("Les modifications ont été enregistrées.")
  }

  return (
    <DashboardShell
      title="Gestion des Examens"
      subtitle="Plateforme de formation infirmière à distance"
      activePath={path}
      navigate={navigate}
    >
      {notice && (
        <div
          className={`fixed right-4 top-24 z-[100] flex max-w-sm items-start gap-3 rounded-xl border bg-card p-4 shadow-xl ${
            notice.type === "error" ? "border-destructive/30" : "border-accent/30"
          }`}
          role="status"
        >
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
            notice.type === "error" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
          }`}>
            {notice.type === "error" ? <X className="size-4" /> : <Check className="size-4" />}
          </div>
          <p className="pt-1 text-xs font-semibold leading-5 text-foreground">{notice.message}</p>
          <button type="button" onClick={() => setNotice(null)} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-2xl bg-primary px-5 py-6 text-primary-foreground shadow-sm sm:px-7">
          <div className="absolute -right-16 -top-20 size-56 rounded-full bg-accent/15 blur-2xl" />
          <div className="absolute -bottom-24 right-40 size-56 rounded-full bg-secondary/15 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-lg shadow-black/15">
                <Stethoscope className="size-6" />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-accent-foreground">
                    Espace administrateur
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Pilotez vos examens en ligne</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-primary-foreground/75 sm:text-sm">
                  Créez les questionnaires, contrôlez leur disponibilité et gérez les sessions depuis un seul espace.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[440px]">
              {[
                { label: "Examens", value: stats.total, color: "text-primary-foreground" },
                { label: "En ligne", value: stats.available, color: "text-accent-foreground" },
                { label: "Verrouillés", value: stats.locked, color: "text-primary-foreground" },
                { label: "Questions", value: stats.questions, color: "text-secondary" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
                  <p className={`text-lg font-extrabold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-primary-foreground/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Plus className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Créer un nouvel examen</h2>
                <p className="mt-1 text-xs text-muted-foreground">Configurez l'examen puis composez son questionnaire.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleCreateForm}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold transition focus:outline-none focus:ring-4 ${
                showForm
                  ? "border border-border bg-card text-muted-foreground hover:bg-muted focus:ring-muted"
                  : "bg-accent text-accent-foreground shadow-sm hover:-translate-y-0.5 hover:bg-accent/90 focus:ring-accent/20"
              }`}
            >
              {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
              {showForm ? "Annuler" : "Ajouter un examen"}
            </button>
          </div>

          {showForm ? (
            <div className="space-y-7 p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_200px_180px]">
                <div>
                  <FieldLabel required>Titre de l'examen</FieldLabel>
                  <input
                    type="text"
                    value={examForm.title}
                    onChange={(event) => setExamForm({ ...examForm, title: event.target.value })}
                    placeholder="Ex. Évaluation des soins fondamentaux"
                    className="h-11 w-full rounded-lg border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </div>
                <div>
                  <FieldLabel required>Date de l'examen</FieldLabel>
                  <input
                    type="date"
                    value={examForm.date}
                    onChange={(event) => setExamForm({ ...examForm, date: event.target.value })}
                    className="h-11 w-full rounded-lg border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </div>
                <div>
                  <FieldLabel required>Durée</FieldLabel>
                  <div className="relative">
                    <select
                      value={examForm.duration}
                      onChange={(event) => setExamForm({ ...examForm, duration: event.target.value })}
                      className="h-11 w-full appearance-none rounded-lg border border-border bg-card px-3.5 pr-9 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                    >
                      {DURATIONS.map((duration) => (
                        <option key={duration} value={duration}>{duration} minutes</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <QuestionComposer
                value={questionForm}
                onChange={setQuestionForm}
                onAdd={addQuestion}
              />

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Questions ajoutées</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Vérifiez le questionnaire avant de créer l'examen.</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                    {examForm.questions.length} question{examForm.questions.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <QuestionList
                  questions={examForm.questions}
                  onDelete={(id) =>
                    setExamForm((current) => ({
                      ...current,
                      questions: current.questions.filter((question) => question.id !== id),
                    }))
                  }
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={toggleCreateForm}
                  className="h-11 rounded-lg border border-border px-5 text-xs font-bold text-muted-foreground transition hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={createExam}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-xs font-bold text-accent-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-accent/90 focus:ring-4 focus:ring-accent/20"
                >
                  <BookOpenCheck className="size-4" />
                  Créer l'examen avec {examForm.questions.length} question{examForm.questions.length !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-muted/40 px-5 py-4 text-xs text-muted-foreground sm:px-6">
              <Activity className="size-4 text-accent" />
              Cliquez sur « Ajouter un examen » pour ouvrir le formulaire de création.
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Examens gérés</h2>
              <p className="mt-1 text-xs text-muted-foreground">Consultez et contrôlez tous les examens créés.</p>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              {exams.length} examen{exams.length !== 1 ? "s" : ""} au total
            </p>
          </div>

          {exams.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {exams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  onEdit={setEditingExam}
                  onToggleLock={toggleLock}
                  onDelete={deleteExam}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card px-5 py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <GraduationCap className="size-6" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-foreground">Aucun examen géré</h3>
              <p className="mt-1 text-xs text-muted-foreground">Créez votre premier examen pour le voir apparaître ici.</p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-xs font-bold text-accent-foreground transition hover:bg-accent/90"
              >
                <Plus className="size-4" />
                Créer un examen
              </button>
            </div>
          )}
        </section>
      </div>

      {editingExam && (
        <ExamModal
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSave={saveExam}
          notify={notify}
        />
      )}
    </DashboardShell>
  )
}
