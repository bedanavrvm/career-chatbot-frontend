const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function parseJson(res) {
  return res
    .json()
    .catch(() => ({}))
    .then((data) => {
      if (!res.ok) {
        const msg = data?.detail || 'Request failed'
        throw new Error(`${res.status} ${msg}`)
      }
      return data
    })
}

export async function securePing(idToken) {
  const url = `${base}/api/secure-ping/`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  return parseJson(res)
}

export async function registerProfile(idToken) {
  const url = `${base}/api/auth/register/`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })
  return parseJson(res)
}

export async function loginProfile(idToken) {
  const url = `${base}/api/auth/login/`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })
  return parseJson(res)
}

export async function meProfile(idToken) {
  const url = `${base}/api/auth/me/`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  return parseJson(res)
}

// Conversations API
export async function convGetSession(sessionId) {
  const url = `${base}/api/conversations/sessions/${sessionId}`
  const res = await fetch(url, { method: 'GET' })
  return parseJson(res)
}

export async function convPostMessage(sessionId, { text, idempotencyKey = '', userId = '' }) {
  const url = `${base}/api/conversations/sessions/${sessionId}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, idempotency_key: idempotencyKey, user_id: userId }),
  })
  return parseJson(res)
}

export async function convPostProfile({ sessionId, traits = {}, grades = {}, preferences = {}, version = 'v1' }) {
  const url = `${base}/api/conversations/profile`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, traits, grades, preferences, version }),
  })
  return parseJson(res)
}

export async function convDeleteSession(sessionId) {
  const url = `${base}/api/conversations/sessions/${sessionId}/delete`
  const res = await fetch(url, { method: 'POST' })
  // delete returns 204; parseJson will return {} on empty body
  return parseJson(res)
}

// Onboarding API
export async function onboardingMe(idToken) {
  const url = `${base}/api/auth/onboarding/me/`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  return parseJson(res)
}

export async function onboardingSave(idToken, payload) {
  const url = `${base}/api/auth/onboarding/save/`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload || {}),
  })
  return parseJson(res)
}

export async function onboardingDashboard(idToken) {
  const url = `${base}/api/auth/onboarding/dashboard/`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  return parseJson(res)
}
