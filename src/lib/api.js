const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

class ApiError extends Error {
  constructor(message, { status = 0, data = null, url = '', method = '', code = '', fields = null } = {}) {
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

function normalizeErrorEnvelope(data) {
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

export function formatApiError(err) {
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

async function parseBody(res) {
  if (!res) return {}
  if (res.status === 204) return {}
  const ct = String(res.headers?.get('content-type') || '').toLowerCase()
  if (ct.includes('application/json')) {
    return res.json().catch(() => ({}))
  }
  const text = await res.text().catch(() => '')
  return text ? { detail: text } : {}
}

async function parseJson(res, { url = '', method = '' } = {}) {
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))))
}

async function request(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 30000)
  const retries = Number(options.retries || 0)
  const retryDelayMs = Number(options.retryDelayMs || 400)
  const retryStatus = Array.isArray(options.retryStatus) ? options.retryStatus : [502, 503, 504]
  const { timeoutMs: _timeoutIgnored, retries: _retriesIgnored, retryDelayMs: _retryDelayIgnored, retryStatus: _retryStatusIgnored, ...fetchOptions } = options || {}
  const method = fetchOptions.method || 'GET'

  let lastErr = null
  for (let attempt = 0; attempt <= Math.max(0, retries); attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.max(0, timeoutMs))
    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
      return await parseJson(res, { url, method })
    } catch (e) {
      lastErr = e

      const isTimeout = e?.name === 'AbortError'
      const isApi = e instanceof ApiError
      const status = isApi ? Number(e.status || 0) : 0
      const canRetry = attempt < Math.max(0, retries) && !isTimeout && (
        (isApi && retryStatus.includes(status)) || (!isApi)
      )

      if (isTimeout) {
        throw new ApiError('Request timed out', { status: 0, data: null, url, method })
      }
      if (!canRetry) {
        if (isApi) throw e
        throw new ApiError(e?.message || 'Network error', { status: 0, data: null, url, method })
      }
    } finally {
      clearTimeout(timer)
    }

    await sleep(retryDelayMs * Math.max(1, attempt + 1))
  }

  if (lastErr instanceof ApiError) throw lastErr
  throw new ApiError('Network error', { status: 0, data: null, url, method })
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

export async function etlCheckEligibility({ programCode, grades }) {
  const url = `${base}/api/etl/eligibility`
  return request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      program_code: String(programCode || '').trim(),
      grades: grades && typeof grades === 'object' ? grades : {},
    }),
    timeoutMs: 30000,
  })
}

export async function onetGetRecommendations(params = {}) {
  const qs = new URLSearchParams()
  const keys = ['R', 'I', 'A', 'S', 'E', 'C', 'top_n']
  for (const k of keys) {
    if (params[k] != null && String(params[k]).trim() !== '') qs.set(k, String(params[k]))
  }
  const url = `${base}/api/onet/recommendations${qs.toString() ? `?${qs}` : ''}`
  return request(url, { method: 'GET', timeoutMs: 30000 })
}

export async function onetGetOccupationDetail(socCode) {
  const code = String(socCode || '').trim()
  const url = `${base}/api/onet/occupations/${encodeURIComponent(code)}`
  return request(url, { method: 'GET', timeoutMs: 30000 })
}

export async function catalogGetProgramCareers(programId) {
  const id = String(programId || '').trim()
  const url = `${base}/api/catalog/programs/${encodeURIComponent(id)}/careers`
  return request(url, { method: 'GET', timeoutMs: 30000 })
}

// Async message API (P1.1) — dispatches to Celery, returns task_id immediately.
// Falls back to normal convPostMessage when no broker is configured (dev mode).
export async function convPostMessageAsync(idToken, sessionId, { text, idempotencyKey = '', nlpProvider = '' }) {
  const url = `${base}/api/conversations/sessions/${sessionId}/messages/async`
  const payload = { text, idempotency_key: idempotencyKey }
  if (nlpProvider) payload.nlp_provider = nlpProvider
  return request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
    timeoutMs: 15000, // should return fast — just dispatches the task
  })
}

export async function convGetTaskStatus(idToken, taskId) {
  const url = `${base}/api/conversations/tasks/${taskId}/status`
  return request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
    timeoutMs: 10000,
  })
}

/**
 * Helper: Post a message via async endpoint, then poll until resolved.
 *
 * @param {string}   idToken    - Firebase ID token
 * @param {string}   sessionId  - Session UUID
 * @param {object}   msgOpts    - { text, idempotencyKey, nlpProvider }
 * @param {object}   [options]  - { pollIntervalMs, maxPollAttempts, onPending }
 * @returns {Promise<object>}   The task result object once ready
 */
export async function convPostMessageAndPoll(
  idToken, sessionId, msgOpts,
  { pollIntervalMs = 1500, maxPollAttempts = 40, onPending = null } = {}
) {
  const dispatched = await convPostMessageAsync(idToken, sessionId, msgOpts)

  // Eager mode (dev): full result already in the response
  if (dispatched?.state === 'SUCCESS') return dispatched.result

  const taskId = dispatched?.task_id
  if (!taskId) throw new Error('Missing task_id in async response')

  for (let i = 0; i < maxPollAttempts; i++) {
    await sleep(pollIntervalMs)
    const status = await convGetTaskStatus(idToken, taskId)
    if (status?.state === 'SUCCESS') return status.result
    if (status?.state === 'FAILURE') {
      throw new ApiError(status?.error || 'Task failed', { status: 500, code: 'task_failed' })
    }
    if (typeof onPending === 'function') onPending(status?.state, i)
  }

  throw new ApiError('Timed out waiting for chat response', { status: 408, code: 'timeout' })
}

/**
 * Send a message and stream the reply via SSE.
 *
 * The backend endpoint streams `event: delta` frames (text chunks) followed by
 * a single `event: done` frame (JSON with session + turn_recommendations).
 *
 * @param {string}   idToken    - Firebase ID token
 * @param {string}   sessionId  - Session UUID
 * @param {object}   msgOpts    - { text, idempotencyKey, nlpProvider }
 * @param {object}   callbacks  - { onDelta(chunk), onDone(result), onError(msg), onAbort() }
 * @returns {{ abort: () => void }}  Call abort() to cancel the stream mid-flight
 */
export function convStreamMessage(
  idToken,
  sessionId,
  { text, idempotencyKey = '', nlpProvider = '' } = {},
  { onDelta = null, onDone = null, onError = null, onAbort = null } = {}
) {
  const url = `${base}/api/conversations/sessions/${sessionId}/messages/stream`
  const payload = { text, idempotency_key: idempotencyKey }
  if (nlpProvider) payload.nlp_provider = nlpProvider

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const signal = controller?.signal

  async function run() {
    let res
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
        signal,
      })
    } catch (err) {
      if (err && err.name === 'AbortError') {
        if (typeof onAbort === 'function') onAbort()
        return
      }
      if (typeof onError === 'function') onError(err?.message || 'Network error')
      return
    }

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`
      try { const d = await res.json(); errMsg = d?.detail || d?.error || errMsg } catch (_) { }
      if (typeof onError === 'function') onError(errMsg)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let currentEvent = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        // SSE frames are separated by double newlines (\n\n)
        const frames = buf.split('\n\n')
        buf = frames.pop() ?? '' // keep incomplete frame in buffer

        for (const frame of frames) {
          let event = currentEvent || 'message'
          let data = ''
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) {
              event = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              data = line.slice(5).trim()
            }
          }
          currentEvent = ''

          if (event === 'delta') {
            // Restore newlines that were escaped as \\n by the backend
            const decoded = data.replace(/\\n/g, '\n')
            if (typeof onDelta === 'function') onDelta(decoded)
          } else if (event === 'done') {
            let parsed = null
            try { parsed = JSON.parse(data) } catch (_) { }
            if (typeof onDone === 'function') onDone(parsed)
          } else if (event === 'error') {
            const decoded = data.replace(/\\n/g, '\n')
            if (typeof onError === 'function') onError(decoded || 'Stream error')
          }
        }
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        if (typeof onAbort === 'function') onAbort()
        return
      }
      if (typeof onError === 'function') onError(err?.message || 'Stream read error')
    }
  }

  run()

  return {
    abort: () => controller?.abort(),
  }
}


export async function catalogGetProgramDetail(programId, token = '') {
  // GET /api/catalog/programs/{id}/ — public endpoint; token optional (enables cluster point calc)
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${base}/api/catalog/programs/${encodeURIComponent(programId)}/`, {
    method: 'GET',
    headers,
  })
  if (!res.ok) {
    let body = null
    try { body = await res.json() } catch (_) { }
    const env = normalizeErrorEnvelope(body)
    throw new ApiError(env.detail || `HTTP ${res.status}`, {
      status: res.status,
      data: body,
      url: res.url,
      method: 'GET',
      code: env.code,
    })
  }
  return res.json()
}

