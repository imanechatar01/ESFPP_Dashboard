import express from "express"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import cors from "cors"

dotenv.config()

const app = express()

const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required")
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Admin invitation APIs will fail until it is configured.")
}

app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json())

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

function getRole(user) {
  return user?.user_metadata?.role === "admin" ? "admin" : "student"
}

function requireServiceRole(req, res, next) {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" })
  }

  next()
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" })
  }

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid session" })
  }

  req.user = data.user
  req.role = getRole(data.user)
  next()
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.role !== role) {
      return res.status(403).json({ error: "Forbidden" })
    }

    next()
  }
}

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

  // Generate invitation link instead of sending email
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${FRONTEND_URL}/complete-account`,
      data: { role },
    },
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const userId = data.user?.id
  const inviteLink = data?.properties?.action_link

  if (!inviteLink) {
    return res.status(500).json({ error: "Supabase did not return an invitation link" })
  }

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
    inviteLink,
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

  // Generate a fresh invitation link (always fresh, never trust old links)
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: targetUser.email,
    options: {
      redirectTo: `${FRONTEND_URL}/complete-account`,
      data: { role: getRole(targetUser) },
    },
  })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const inviteLink = data?.properties?.action_link

  if (!inviteLink) {
    return res.status(500).json({ error: "Supabase did not return an invitation link" })
  }

  res.json({ inviteLink })
})

// ---------------------------------------------------------------------------
// Admin — complete account from backend (used by /complete-account page)
// This ensures status changes go through the backend, not directly from
// the frontend anon client.
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

app.listen(PORT, () => {
  console.log(`Backend started on http://localhost:${PORT}`)
})
