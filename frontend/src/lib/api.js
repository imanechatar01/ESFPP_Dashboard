import { supabase } from "@/supabaseClient"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"
const TOKEN_REFRESH_MARGIN_SECONDS = 60

async function getAccessToken(forceRefresh = false) {
  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) return null
    return data.session?.access_token || null
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) return null

  const session = data.session
  if (!session) return null

  const expiresSoon = session.expires_at
    ? session.expires_at <= Math.floor(Date.now() / 1000) + TOKEN_REFRESH_MARGIN_SECONDS
    : false

  if (expiresSoon) return getAccessToken(true)
  return session.access_token || null
}

async function sendRequest(path, options, token) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

async function readResponse(response, authenticated = false) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (authenticated && response.status === 401) {
      throw new Error("Votre session n'est plus valide. Déconnectez-vous puis reconnectez-vous.")
    }
    throw new Error(payload.error || payload.erreur || "Request failed")
  }

  return payload
}

// Public endpoints such as password recovery must work without an active session.
export async function publicApiRequest(path, options = {}) {
  const response = await sendRequest(path, options, null)
  return readResponse(response)
}

export async function apiRequest(path, options = {}) {
  let token = await getAccessToken()

  if (!token) {
    throw new Error("Votre session a expiré. Veuillez vous reconnecter.")
  }

  let response = await sendRequest(path, options, token)

  if (response.status === 401) {
    token = await getAccessToken(true)
    if (token) response = await sendRequest(path, options, token)
  }

  return readResponse(response, true)
}
