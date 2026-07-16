import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { supabase, supabaseAdmin } from "./lib/supabase.js"
import { requireAuth, requireRole, requireServiceRole, getRole } from "./lib/auth.js"

// Routes
import logigrammesRouter from "./routes/logigrammes.js"
import completionRouter from "./routes/completion.js"
import filieresRouter from "./routes/filieres.js"
import formateursRouter from "./routes/formateurs.js"
import yearsRouter from "./routes/academic-years.js"
import coursesRouter from "./routes/courses.js"

dotenv.config()

const app = express()

const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"

app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json())

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.role,
    },
  })
})

// ---------------------------------------------------------------------------
// Admin — Logigramme & Completion
// ---------------------------------------------------------------------------

app.use("/api/logigramme", requireAuth, requireRole("admin"), logigrammesRouter)
app.use("/api/completion", requireAuth, requireRole("admin"), completionRouter)
app.use("/api/filieres", requireAuth, filieresRouter)
app.use("/api/formateurs", requireAuth, requireRole("admin"), formateursRouter)
app.use("/api/years", requireAuth, requireRole("admin"), yearsRouter)
app.use("/api/courses", requireAuth, coursesRouter)

// ---------------------------------------------------------------------------
// Student — Read-only Logigramme
// ---------------------------------------------------------------------------

app.get("/api/student/logigramme", requireAuth, async (req, res) => {
  // Students can see logigrammes for their own filiere
  // For now, let's just return what's available
  try {
    const { data, error } = await supabaseAdmin
      .from('logigrammes')
      .select(`
                id,
                filiere:filieres (id, code, name),
                classe:classes (id, label, annee),
                academic_year:academic_years (label)
            `)
      .eq('academic_years.is_current', true);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Admin — list users (with profile status from DB)
// ---------------------------------------------------------------------------

app.get("/api/admin/users", requireServiceRole, requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (error) {
      console.error("listUsers error:", error.message)
      return res.status(500).json({ error: error.message })
    }

    // Fetch all profiles in one query to get the real status from the DB
    const profileMap = {}
    const userIds = data.users.map((u) => u.id)

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, status, first_name, last_name")
        .in("id", userIds)

      if (profilesError) {
        console.error("profiles query error:", profilesError.message)
        // Continue without profiles — fall back to defaults
      }

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p
        }
      }
    }

    const users = data.users.map((user) => {
      const profile = profileMap[user.id]
      return {
        id: user.id,
        email: user.email,
        role: getRole(user),
        status: profile?.status || "invited",
        firstName: profile?.first_name || user.user_metadata?.first_name || "",
        lastName: profile?.last_name || user.user_metadata?.last_name || "",
      }
    })

    res.json({ users })
  } catch (err) {
    console.error("Unexpected error in /api/admin/users:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// ---------------------------------------------------------------------------
// Admin — delete user
// ---------------------------------------------------------------------------

app.delete("/api/admin/users/:userId", requireServiceRole, requireAuth, requireRole("admin"), async (req, res) => {
  const { userId } = req.params

  if (userId === req.user.id) {
    return res.status(400).json({ error: "Vous ne pouvez pas vous supprimer vous-même" })
  }

  try {
    // Due to ON DELETE CASCADE on public.profiles references auth.users(id),
    // deleting the auth user will automatically delete their profile.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error

    res.json({ message: "Utilisateur supprimé avec succès" })
  } catch (err) {
    console.error("deleteUser error:", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// Admin — create invitation (generates link, does NOT send email)
// ---------------------------------------------------------------------------

app.post("/api/admin/invitations", requireServiceRole, requireAuth, requireRole("admin"), async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase()
  const role = String(req.body.role || "student")

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" })
  }

  if (!["admin", "student"].includes(role)) {
    return res.status(400).json({ error: "Role must be admin or student" })
  }

  // Send invitation email using Supabase Auth Admin API
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${FRONTEND_URL}/complete-account`,
    data: { role },
  })

  if (error) {
    console.error("inviteUserByEmail error:", JSON.stringify(error, null, 2))
    return res.status(400).json({ error: error.message })
  }

  const userId = data.user?.id

  // Create profile row with status and role
  if (userId) {
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      status: "invited",
      role,
    })
  }

  res.status(201).json({
    userId,
    email: data.user?.email || email,
    role,
    status: "invited",
  })
})

// ---------------------------------------------------------------------------
// Admin — regenerate invitation link
// ---------------------------------------------------------------------------

app.post("/api/admin/invitations/:userId/regenerate", requireServiceRole, requireAuth, requireRole("admin"), async (req, res) => {
  const { userId } = req.params

  // Look up the target user in Supabase Auth
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

  if (userError || !userData.user) {
    return res.status(404).json({ error: "User not found" })
  }

  const targetUser = userData.user

  // Look up profile status from DB (source of truth)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .single()

  if (profileError && profileError.code !== "PGRST116") {
    // PGRST116 = no rows returned — that's OK, means no profile yet
    return res.status(500).json({ error: "Could not look up profile" })
  }

  const status = profile?.status || "invited"

  // Rule 1: active users cannot get new invitations
  if (status === "active") {
    return res.status(409).json({ error: "Account already activated" })
  }

  // Rule 2: blocked users must be unblocked first
  if (status === "blocked") {
    return res.status(403).json({ error: "Account is blocked. Unblock the account before regenerating an invitation." })
  }

  // Send a fresh invitation email to the user
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(targetUser.email, {
    redirectTo: `${FRONTEND_URL}/complete-account`,
    data: { role: getRole(targetUser) },
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  res.json({ message: "Invitation email resent successfully" })
})

// ---------------------------------------------------------------------------
// Admin — delete user
// ---------------------------------------------------------------------------
app.delete("/api/admin/users/:userId", requireServiceRole, requireAuth, requireRole("admin"), async (req, res) => {
  const { userId } = req.params

  try {
    // Delete profile first to clean up foreign keys safely
    await supabaseAdmin.from("profiles").delete().eq("id", userId)

    // Delete user from Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error("deleteUser error:", error.message)
      return res.status(500).json({ error: error.message })
    }

    res.json({ message: "User deleted successfully" })
  } catch (err) {
    console.error("Unexpected error in DELETE /api/admin/users:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// ---------------------------------------------------------------------------

app.post("/api/complete-account", requireAuth, async (req, res) => {
  const userId = req.user.id
  const firstName = String(req.body.firstName || "").trim()
  const lastName = String(req.body.lastName || "").trim()
  const password = String(req.body.password || "")

  if (!firstName || !lastName) {
    return res.status(400).json({ error: "First name and last name are required" })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" })
  }

  // Check current profile status — only invited/pending users may complete
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .single()

  if (profile?.status === "active") {
    return res.status(409).json({ error: "Account already activated" })
  }

  if (profile?.status === "blocked") {
    return res.status(403).json({ error: "Account is blocked" })
  }

  // Update auth user: set password + user_metadata
  const role = getRole(req.user)
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      nom: lastName,
      prenom: firstName,
      role,
    },
  })

  if (updateError) {
    return res.status(400).json({ error: updateError.message })
  }

  // Update profile to active
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    first_name: firstName,
    last_name: lastName,
    status: "active",
    role,
  })

  if (profileError) {
    return res.status(500).json({ error: profileError.message })
  }

  res.json({ message: "Account activated", role })
})

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({ error: "Internal server error" })
})

const server = app.listen(PORT);

server.on('listening', () => {
  console.log(`Backend started on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error(`Failed to start server:`, err);
  process.exit(1);
});

