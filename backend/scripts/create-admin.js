import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_FIRST_NAME = "System",
  ADMIN_LAST_NAME = "Admin",
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env")
  process.exit(1)
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in backend/.env")
  process.exit(1)
}

if (ADMIN_PASSWORD.length < 8) {
  console.error("ADMIN_PASSWORD must contain at least 8 characters")
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase()
async function findUserByEmail(email) {
  const perPage = 1000

  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })

    if (error) {
      return { error }
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email)

    if (match) {
      return { user: match }
    }

    if (data.users.length < perPage) {
      return { user: null }
    }
  }

  return { user: null }
}

const existingLookup = await findUserByEmail(normalizedEmail)

if (existingLookup.error) {
  console.error(`Could not inspect existing users: ${existingLookup.error.message}`)
  process.exit(1)
}

const existingUser = existingLookup.user

const adminUserPayload = {
  email: normalizedEmail,
  password: ADMIN_PASSWORD,
}

let creationResult

if (existingUser) {
  creationResult = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, adminUserPayload)
} else {
  creationResult = await supabaseAdmin.auth.admin.createUser(adminUserPayload)

  if (creationResult.error) {
    const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        role: "admin",
      },
    })

    if (inviteResult.error) {
      console.error("Could not create admin")
      console.error(`Message: ${creationResult.error.message}`)
      if (creationResult.error.code) console.error(`Code: ${creationResult.error.code}`)
      if (creationResult.error.status) console.error(`Status: ${creationResult.error.status}`)
      if (creationResult.error.details) console.error(`Details: ${creationResult.error.details}`)
      if (creationResult.error.hint) console.error(`Hint: ${creationResult.error.hint}`)
      console.error("Fallback invite also failed")
      console.error(`Message: ${inviteResult.error.message}`)
      if (inviteResult.error.code) console.error(`Code: ${inviteResult.error.code}`)
      if (inviteResult.error.status) console.error(`Status: ${inviteResult.error.status}`)
      if (inviteResult.error.details) console.error(`Details: ${inviteResult.error.details}`)
      if (inviteResult.error.hint) console.error(`Hint: ${inviteResult.error.hint}`)
      process.exit(1)
    }

    creationResult = inviteResult
  }
}

const { data, error } = creationResult

if (error) {
  console.error("Could not create admin")
  console.error(`Message: ${error.message}`)
  if (error.code) console.error(`Code: ${error.code}`)
  if (error.status) console.error(`Status: ${error.status}`)
  if (error.details) console.error(`Details: ${error.details}`)
  if (error.hint) console.error(`Hint: ${error.hint}`)
  process.exit(1)
}

const userId = data.user?.id || existingUser?.id

if (!userId) {
  console.error("Admin user record was not returned by Supabase")
  process.exit(1)
}

const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
  email_confirm: true,
  user_metadata: {
    role: "admin",
    first_name: ADMIN_FIRST_NAME,
    last_name: ADMIN_LAST_NAME,
    prenom: ADMIN_FIRST_NAME,
    nom: ADMIN_LAST_NAME,
  },
})

if (metadataError) {
  console.error(`Admin auth user created, but metadata update failed: ${metadataError.message}`)
  if (metadataError.code) console.error(`Code: ${metadataError.code}`)
  if (metadataError.status) console.error(`Status: ${metadataError.status}`)
  if (metadataError.details) console.error(`Details: ${metadataError.details}`)
  if (metadataError.hint) console.error(`Hint: ${metadataError.hint}`)
  process.exit(1)
}

const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
  id: userId,
  first_name: ADMIN_FIRST_NAME,
  last_name: ADMIN_LAST_NAME,
  status: "active",
  completed_at: new Date().toISOString(),
})

if (profileError) {
  console.error(`Admin auth user created, but profile upsert failed: ${profileError.message}`)
  process.exit(1)
}

console.log(`Admin account ready: ${normalizedEmail}`)
