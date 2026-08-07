import express from "express"
import { randomUUID } from "node:crypto"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireRole } from "../lib/auth.js"

const router = express.Router()
const PASSING_PERCENTAGE = 60

function formatAttempt(row) {
  const percentage = Number(row.percentage || 0)

  return {
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    score: row.score,
    totalQuestions: row.total_questions,
    percentage,
    passed: Boolean(row.passed),
    attemptNumber: row.attempt_number || 1,
    submittedAt: row.submitted_at,
  }
}

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

// Student: every scheduled exam, with answer keys removed.
router.get("/available", requireRole("student"), async (req, res) => {
  try {
    const [{ data: exams, error: examsError }, { data: attempts, error: attemptsError }] =
      await Promise.all([
        supabaseAdmin
          .from("exams")
          .select("*")
          .order("exam_date", { ascending: true }),
        supabaseAdmin
          .from("exam_attempts")
          .select("id, exam_id, student_id, score, total_questions, percentage, passed, attempt_number, submitted_at")
          .eq("student_id", req.user.id)
          .order("attempt_number", { ascending: false }),
      ])

    if (examsError) throw examsError
    if (attemptsError) throw attemptsError

    const latestAttempts = new Map()
    for (const attempt of attempts || []) {
      if (!latestAttempts.has(attempt.exam_id)) latestAttempts.set(attempt.exam_id, attempt)
    }

    res.json(
      (exams || []).map((exam) => {
        const latestAttempt = latestAttempts.get(exam.id)
        return {
          ...mapExam(exam, false),
          completed: Boolean(latestAttempt && (latestAttempt.passed || latestAttempt.attempt_number >= 2)),
          canRetry: Boolean(latestAttempt && !latestAttempt.passed && latestAttempt.attempt_number < 2),
          result: latestAttempt ? formatAttempt(latestAttempt) : null,
          passingPercentage: PASSING_PERCENTAGE,
        }
      }),
    )
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Admin: consult every student's exam results.
router.get("/results", requireRole("admin"), async (_req, res) => {
  try {
    const [{ data: attempts, error: attemptsError }, { data: usersData, error: usersError }] =
      await Promise.all([
        supabaseAdmin
          .from("exam_attempts")
          .select(`
            id,
            exam_id,
            student_id,
            score,
            total_questions,
            percentage,
            passed,
            attempt_number,
            submitted_at,
            exam:exams (id, title, exam_date)
          `)
          .order("attempt_number", { ascending: false })
          .order("submitted_at", { ascending: false }),
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ])

    if (attemptsError) throw attemptsError
    if (usersError) throw usersError

    const usersById = new Map((usersData?.users || []).map((user) => [user.id, user]))
    const finalAttempts = new Map()
    for (const attempt of attempts || []) {
      const key = `${attempt.student_id}-${attempt.exam_id}`
      if (!finalAttempts.has(key)) finalAttempts.set(key, attempt)
    }

    const results = [...finalAttempts.values()]
      .filter((attempt) => attempt.passed || attempt.attempt_number >= 2)
      .map((attempt) => {
        const user = usersById.get(attempt.student_id)
        const metadata = user?.user_metadata || {}
        const fullName = [metadata.first_name || metadata.prenom, metadata.last_name || metadata.nom]
          .filter(Boolean)
          .join(" ")

        return {
          ...formatAttempt(attempt),
          studentName: fullName || user?.email?.split("@")[0] || "Étudiant",
          studentEmail: user?.email || "",
          examTitle: attempt.exam?.title || "Examen supprimé",
          examDate: attempt.exam?.exam_date || null,
          passingPercentage: PASSING_PERCENTAGE,
        }
      })

    res.json(results)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Admin: remove a student's exam results without deleting their account.
router.delete("/results/students/:studentId", requireRole("admin"), async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("exam_attempts")
      .delete()
      .eq("student_id", req.params.studentId)

    if (error) throw error
    res.status(204).send()
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

    const { data: existingAttempt, error: attemptsError } = await supabaseAdmin
      .from("exam_attempts")
      .select("id, answers, score, total_questions, percentage, passed, attempt_number, submitted_at")
      .eq("exam_id", exam.id)
      .eq("student_id", req.user.id)
      .maybeSingle()

    if (attemptsError) throw attemptsError
    if (existingAttempt?.passed) {
      return res.status(409).json({ error: "Cet examen est déjà validé" })
    }
    if (existingAttempt && existingAttempt.attempt_number >= 2) {
      return res.status(409).json({ error: "Les deux tentatives autorisées ont déjà été utilisées" })
    }

    const answers = req.body.answers && typeof req.body.answers === "object" ? req.body.answers : {}
    const questions = Array.isArray(exam.questions) ? exam.questions : []
    const score = questions.reduce(
      (total, question) =>
        Number(answers[question.id]) === Number(question.correctAnswer) ? total + 1 : total,
      0,
    )
    const percentage = questions.length
      ? Number(((score * 100) / questions.length).toFixed(2))
      : 0
    const passed = percentage >= PASSING_PERCENTAGE
    const attemptNumber = (existingAttempt?.attempt_number || 0) + 1
    const submittedAt = new Date().toISOString()
    const newResultIsBetter = !existingAttempt || percentage > Number(existingAttempt.percentage || 0)
    const bestResult = newResultIsBetter
      ? { answers, score, total_questions: questions.length, percentage, passed }
      : {
          answers: existingAttempt.answers,
          score: existingAttempt.score,
          total_questions: existingAttempt.total_questions,
          percentage: Number(existingAttempt.percentage || 0),
          passed: Boolean(existingAttempt.passed),
        }

    const query = existingAttempt
      ? supabaseAdmin
          .from("exam_attempts")
          .update({
            ...bestResult,
            attempt_number: attemptNumber,
            submitted_at: submittedAt,
          })
          .eq("id", existingAttempt.id)
          .eq("attempt_number", existingAttempt.attempt_number)
      : supabaseAdmin
          .from("exam_attempts")
          .insert({
            exam_id: exam.id,
            student_id: req.user.id,
            ...bestResult,
            attempt_number: attemptNumber,
            submitted_at: submittedAt,
          })

    const { data, error } = await query
      .select("id, exam_id, student_id, score, total_questions, percentage, passed, attempt_number, submitted_at")
      .single()

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Un résultat existe déjà pour cet examen" })
      }
      throw error
    }

    res.status(201).json({ ...formatAttempt(data), passingPercentage: PASSING_PERCENTAGE })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
