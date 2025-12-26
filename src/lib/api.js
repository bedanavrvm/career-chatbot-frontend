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
export async function convGetSession(idToken, sessionId) {
  const url = `${base}/api/conversations/sessions/${sessionId}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  return parseJson(res)
}

export async function convPostMessage(idToken, sessionId, { text, idempotencyKey = '', nlpProvider = '' }) {
  const url = `${base}/api/conversations/sessions/${sessionId}/messages`
  const payload = { text, idempotency_key: idempotencyKey }
  if (nlpProvider) payload.nlp_provider = nlpProvider
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function convPostProfile(idToken, { sessionId, traits = {}, grades = {}, preferences = {}, version = 'v1' }) {
  const url = `${base}/api/conversations/profile`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ session_id: sessionId, traits, grades, preferences, version }),
  })
  return parseJson(res)
}

export async function convDeleteSession(idToken, sessionId) {
  const url = `${base}/api/conversations/sessions/${sessionId}/delete`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  // delete returns 204; parseJson will return {} on empty body
  return parseJson(res)
}

export async function convGetRecommendations(idToken, sessionId, { k = 10 } = {}) {
  const qs = new URLSearchParams()
  if (k) qs.set('k', String(k))
  const url = `${base}/api/conversations/sessions/${sessionId}/recommendations${qs.toString() ? `?${qs}` : ''}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
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
