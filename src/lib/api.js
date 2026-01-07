const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

class ApiError extends Error {
  constructor (message, { status = 0, data = null, url = '', method = '', code = '', fields = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.url = url
    this.method = method
    this.code = code
    this.fields = fields
  }
}

function normalizeErrorEnvelope (data) {
  if (!data) return { detail: 'Request failed', code: '', fields: null }

  if (typeof data === 'string') {
    return { detail: data || 'Request failed', code: '', fields: null }
  }

  if (Array.isArray(data)) {
    return { detail: 'Invalid request', code: 'validation_error', fields: { non_field_errors: data } }
  }

  const detail = data?.detail ?? data?.message
  const code = typeof data?.code === 'string' ? data.code : ''
  const fields = data?.fields && typeof data.fields === 'object' ? data.fields : null

  if (typeof detail === 'string' && detail.trim()) {
    return { detail: detail.trim(), code, fields }
  }

  // Legacy DRF ValidationError often returns a dict of field -> [errors]
  if (!fields && data && typeof data === 'object' && Object.keys(data).length) {
    return { detail: 'Invalid request', code: code || 'validation_error', fields: data }
  }

  return { detail: 'Request failed', code, fields }
}

export function formatApiError (err) {
  if (!err) return 'Request failed'

  const data = err?.data
  const env = normalizeErrorEnvelope(data)
  const baseMsg = (env?.detail && typeof env.detail === 'string') ? env.detail : (err?.message || 'Request failed')

  const fields = err?.fields || env?.fields
  if (fields && typeof fields === 'object') {
    const keys = Object.keys(fields)
    if (keys.length) {
      const firstKey = keys[0]
      const v = fields[firstKey]
      const msg = Array.isArray(v) ? String(v[0] || '').trim() : String(v || '').trim()
      if (msg) return `${baseMsg} (${firstKey}: ${msg})`
    }
  }
  return baseMsg
}

async function parseBody (res) {
  if (!res) return {}
  if (res.status === 204) return {}
  const ct = String(res.headers?.get('content-type') || '').toLowerCase()
  if (ct.includes('application/json')) {
    return res.json().catch(() => ({}))
  }
  const text = await res.text().catch(() => '')
  return text ? { detail: text } : {}
}

async function parseJson (res, { url = '', method = '' } = {}) {
  const data = await parseBody(res)
  if (!res.ok) {
    const env = normalizeErrorEnvelope(data)
    const msg = env?.detail || 'Request failed'
    throw new ApiError(`${res.status} ${msg}`, {
      status: res.status,
      data,
      url,
      method,
      code: env.code,
      fields: env.fields,
    })
  }
  return data
}

async function request (url, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 30000)
  const { timeoutMs: _timeoutIgnored, ...fetchOptions } = options || {}
  const method = fetchOptions.method || 'GET'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Math.max(0, timeoutMs))
  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
    return await parseJson(res, { url, method })
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new ApiError('Request timed out', { status: 0, data: null, url, method })
    }
    if (e instanceof ApiError) throw e
    throw new ApiError(e?.message || 'Network error', { status: 0, data: null, url, method })
  } finally {
    clearTimeout(timer)
  }
}

export async function securePing(idToken) {
  const url = `${base}/api/secure-ping/`
  return request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
    timeoutMs: 15000,
  })
}

export async function registerProfile(idToken) {
  const url = `${base}/api/auth/register/`
  return request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({}),
    timeoutMs: 15000,
  })
}

export async function loginProfile(idToken) {
  const url = `${base}/api/auth/login/`
  return request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({}),
    timeoutMs: 15000,
  })
}

export async function meProfile(idToken) {
  const url = `${base}/api/auth/me/`
  return request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
    timeoutMs: 15000,
  })
}

// Conversations API
export async function convGetSession(idToken, sessionId) {
  const url = `${base}/api/conversations/sessions/${sessionId}`
  return request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
    timeoutMs: 20000,
  })
}

export async function convPostMessage(idToken, sessionId, { text, idempotencyKey = '', nlpProvider = '' }) {
  const url = `${base}/api/conversations/sessions/${sessionId}/messages`
  const payload = { text, idempotency_key: idempotencyKey }
  if (nlpProvider) payload.nlp_provider = nlpProvider
  return request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
    timeoutMs: 60000,
  })
}

export async function convPostProfile(idToken, { sessionId, traits = {}, grades = {}, preferences = {}, version = 'v1' }) {
  const url = `${base}/api/conversations/profile`
  return request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ session_id: sessionId, traits, grades, preferences, version }),
    timeoutMs: 20000,
  })
}

export async function convDeleteSession(idToken, sessionId) {
  const url = `${base}/api/conversations/sessions/${sessionId}/delete`
  const out = await request(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    timeoutMs: 20000,
  })
  // delete returns 204; parseJson will return {} on empty body
  return out
}

export async function convGetRecommendations(idToken, sessionId, { k = 10 } = {}) {
  const qs = new URLSearchParams()
  if (k) qs.set('k', String(k))
  const url = `${base}/api/conversations/sessions/${sessionId}/recommendations${qs.toString() ? `?${qs}` : ''}`
  return request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
    timeoutMs: 45000,
  })
}

// Catalog API
export async function catalogGetProgram(idToken, programId) {
  const url = `${base}/api/catalog/programs/${programId}`
  const headers = {}
  if (idToken) headers.Authorization = `Bearer ${idToken}`
  return request(url, {
    method: 'GET',
    headers,
    timeoutMs: 20000,
  })
}

export async function catalogGetInstitution(idToken, institutionCode) {
  const code = encodeURIComponent(String(institutionCode || '').trim())
  const url = `${base}/api/catalog/institutions/${code}`
  const headers = {}
  if (idToken) headers.Authorization = `Bearer ${idToken}`
  return request(url, {
    method: 'GET',
    headers,
    timeoutMs: 20000,
  })
}

export async function catalogStatus() {
  const url = `${base}/api/catalog/status`
  return request(url, { method: 'GET', timeoutMs: 15000 })
}

// Onboarding API
export async function onboardingMe(idToken) {
  const url = `${base}/api/auth/onboarding/me/`
  return request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
    timeoutMs: 20000,
  })
}

export async function onboardingSave(idToken, payload) {
  const url = `${base}/api/auth/onboarding/save/`
  return request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload || {}),
    timeoutMs: 30000,
  })
}

export async function onboardingDashboard(idToken) {
  const url = `${base}/api/auth/onboarding/dashboard/`
  return request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
    timeoutMs: 30000,
  })
}

export async function etlGetPrograms(params = {}) {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', String(params.q))
  if (params.field) qs.set('field', String(params.field))
  if (params.level) qs.set('level', String(params.level))
  if (params.region) qs.set('region', String(params.region))
  if (params.page) qs.set('page', String(params.page))
  if (params.page_size) qs.set('page_size', String(params.page_size))
  const url = `${base}/api/etl/programs${qs.toString() ? `?${qs}` : ''}`
  return request(url, { method: 'GET', timeoutMs: 30000 })
}

export async function etlGetInstitutions(params = {}) {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', String(params.q))
  if (params.region) qs.set('region', String(params.region))
  if (params.county) qs.set('county', String(params.county))
  const url = `${base}/api/etl/institutions${qs.toString() ? `?${qs}` : ''}`
  return request(url, { method: 'GET', timeoutMs: 30000 })
}
