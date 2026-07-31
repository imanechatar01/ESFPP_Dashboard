import express from "express"
import { randomUUID } from "node:crypto"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireRole } from "../lib/auth.js"

const router = express.Router()

function mapExam(row, includeCorrectAnswers = false) {
  const questions = Array.isArray(row.questions) ? row.questions : []

  return {
    id: row.id,
    title: row.title,
    date: row.exam_date,
    duration: row.duration_minutes,
    locked: row.locked,
    createdAt: row.created_at,
    questions: questions.map((question) => {
      const safeQuestion = {
        id: question.id,
        statement: question.statement,
        options: Array.isArray(question.options) ? question.options : [],
      }
      if (includeCorrectAnswers) safeQuestion.correctAnswer = question.correctAnswer
      return safeQuestion
    }),
  }
}

function validateExamPayload(body) {
  const title = String(body.title || "").trim()
  const date = String(body.date || "").trim()
  const duration = Number(body.duration)
  const questions = Array.isArray(body.questions) ? body.questions : []

  if (!title || !date || ![30, 45, 60, 90, 120].includes(duration)) {
    return { error: "Titre, date ou durée invalide" }
  }

  if (!questions.length) {
    return { error: "Un examen doit contenir au moins une question" }
  }

  const normalizedQuestions = []
  for (const question of questions) {
    const statement = String(question.statement || "").trim()
    const options = Array.isArray(question.options)
      ? question.options.map((option) => String(option || "").trim())
      : []
    const correctAnswer = Number(question.correctAnswer)

    if (
      !statement ||
      options.length !== 4 ||
      options.some((option) => !option) ||
      !Number.isInteger(correctAnswer) ||
      correctAnswer < 0 ||
      correctAnswer > 3
    ) {
      return { error: "Une ou plusieurs questions sont invalides" }
    }

    normalizedQuestions.push({
      id: String(question.id || randomUUID()),
      statement,
      options,
      correctAnswer,
    })
  }

  return {
    value: {
      title,
      exam_date: date,
      duration_minutes: duration,
      questions: normalizedQuestions,
    },
  }
}

// Admin: retrieve every exam, including answer keys.
router.get("/", requireRole("admin"), async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("exams")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    res.json((data || []).map((exam) => mapExam(exam, true)))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Student: only unlocked exams, with answer keys removed.
router.get("/available", requireRole("student"), async (req, res) => {
  try {
    const [{ data: exams, error: examsError }, { data: attempts, error: attemptsError }] =
      await Promise.all([
        supabaseAdmin
          .from("exams")
          .select("*")
          .eq("locked", false)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("exam_attempts")
          .select("exam_id, submitted_at")
          .eq("student_id", req.user.id),
      ])

    if (examsError) throw examsError
    if (attemptsError) throw attemptsError

    const completedExamIds = new Set((attempts || []).map((attempt) => attempt.exam_id))
    res.json(
      (exams || []).map((exam) => ({
        ...mapExam(exam, false),
        completed: completedExamIds.has(exam.id),
      })),
    )
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post("/", requireRole("admin"), async (req, res) => {
  const payload = validateExamPayload(req.body)
  if (payload.error) return res.status(400).json({ error: payload.error })

  try {
    const { data, error } = await supabaseAdmin
      .from("exams")
      .insert({
        ...payload.value,
        locked: req.body.locked !== false,
        created_by: req.user.id,
      })
      .select("*")
      .single()

    if (error) throw error
    res.status(201).json(mapExam(data, true))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put("/:id", requireRole("admin"), async (req, res) => {
  const payload = validateExamPayload(req.body)
  if (payload.error) return res.status(400).json({ error: payload.error })

  try {
    const { data, error } = await supabaseAdmin
      .from("exams")
      .update(payload.value)
      .eq("id", req.params.id)
      .select("*")
      .single()

    if (error) throw error
    res.json(mapExam(data, true))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.patch("/:id/lock", requireRole("admin"), async (req, res) => {
  if (typeof req.body.locked !== "boolean") {
    return res.status(400).json({ error: "Le statut de verrouillage est invalide" })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("exams")
      .update({ locked: req.body.locked })
      .eq("id", req.params.id)
      .select("*")
      .single()

    if (error) throw error
    res.json(mapExam(data, true))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("exams").delete().eq("id", req.params.id)
    if (error) throw error
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post("/:id/submit", requireRole("student"), async (req, res) => {
  try {
    const { data: exam, error: examError } = await supabaseAdmin
      .from("exams")
      .select("id, locked, questions")
      .eq("id", req.params.id)
      .single()

    if (examError || !exam) return res.status(404).json({ error: "Examen introuvable" })
    if (exam.locked) return res.status(423).json({ error: "Cet examen est verrouillé" })

    const { data: existing } = await supabaseAdmin
      .from("exam_attempts")
      .select("id")
      .eq("exam_id", exam.id)
      .eq("student_id", req.user.id)
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ error: "Vous avez déjà validé cet examen" })
    }

    const answers = req.body.answers && typeof req.body.answers === "object" ? req.body.answers : {}
    const questions = Array.isArray(exam.questions) ? exam.questions : []
    const score = questions.reduce(
      (total, question) =>
        Number(answers[question.id]) === Number(question.correctAnswer) ? total + 1 : total,
      0,
    )

    const { data, error } = await supabaseAdmin
      .from("exam_attempts")
      .insert({
        exam_id: exam.id,
        student_id: req.user.id,
        answers,
        score,
        total_questions: questions.length,
      })
      .select("exam_id, score, total_questions, submitted_at")
      .single()

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Vous avez déjà validé cet examen" })
      }
      throw error
    }

    res.status(201).json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
