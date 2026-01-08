<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { convGetSession, convPostMessage, convDeleteSession, convGetRecommendations, catalogStatus } from '../lib/api'
import { Plus, Trash2, RefreshCw, Send, ChevronDown, Sparkles } from 'lucide-vue-next'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'

function uuidv4 () {
  if (crypto?.randomUUID) return crypto.randomUUID()
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function newSession () {
  sessionId.value = uuidv4()
  localStorage.setItem(storageKey.value, sessionId.value)
  conversation.value = { id: '', fsm_state: '', messages: [], slots: {} }
  await loadSession()
}

async function clearSession () {
  try {
    await convDeleteSession(idToken.value, sessionId.value)
  } catch (_) {}
  // Recreate the same session id for continuity
  conversation.value = { id: '', fsm_state: '', messages: [], slots: {} }
  await loadSession()
}

const router = useRouter()

const { user, getIdToken, waitForAuthReady } = useAuth()
const { run } = useApiCall({ toastErrors: true })

function openProgramDetails (r) {
  const id = r?.program_id
  if (!id) return
  router.push({ name: 'program_details', params: { id: String(id) } })
}
const idToken = ref('')
const storageKey = computed(() => {
  const uid = user.value?.uid || ''
  return uid ? `conv_session_id:${uid}` : 'conv_session_id'
})

const providerStorageKey = computed(() => {
  const uid = user.value?.uid || ''
  return uid ? `conv_nlp_provider:${uid}` : 'conv_nlp_provider'
})

const sessionId = ref(localStorage.getItem(storageKey.value) || uuidv4())
const nlpProvider = ref(localStorage.getItem(providerStorageKey.value) || 'local')
const input = ref('')
const inputEl = ref(null)
const sending = ref(false)
const error = ref('')
const conversation = ref({ id: '', fsm_state: '', messages: [], slots: {} })
const recs = ref([])
const stretchRecs = ref([])
const recsError = ref('')
const recsLoading = ref(false)
const recsK = ref(10)
const recsMax = 50
const scroller = ref(null)
const activeCitation = ref('')
const systemStatus = ref(null)

const trySuggestions = [
  'Here are my grades: Math A-, English B+… What courses fit me?',
  'I like computers and design. Suggest programs and careers.',
  'Suggest programs near Nairobi for a B plain.',
]

const tryIndex = ref(0)
let tryIntervalId = null

const activeTry = computed(() => trySuggestions[tryIndex.value] || '')

function applyHint(text) {
  input.value = String(text || '')
  nextTick(() => {
    inputEl.value?.focus?.()
  })
}

function showMoreRecs() {
  if (recsK.value >= recsMax) return
  recsK.value = Math.min(recsMax, recsK.value + 10)
  loadRecommendations({ merge: true })
}

function resetRecsCount() {
  if (recsK.value === 10) return
  recsK.value = 10
  loadRecommendations()
}

const mode = computed(() => {
  // Prefer latest assistant message provider; fallback to any last message provider
  const msgs = conversation.value?.messages || []
  const rev = [...msgs].reverse()
  const asst = rev.find(m => m.role === 'assistant' && m.nlp && m.nlp.provider)
  const any = rev.find(m => m.nlp && m.nlp.provider)
  const p = (asst?.nlp?.provider || any?.nlp?.provider || '').toLowerCase()
  if (p === 'gemini') return 'Gemini'
  if (p) return p.charAt(0).toUpperCase() + p.slice(1)
  return 'Unknown'
})

const modeError = computed(() => {
  const msgs = conversation.value?.messages || []
  const rev = [...msgs].reverse()
  const withErr = rev.find(m => m.nlp && m.nlp.provider_error)
  return withErr?.nlp?.provider_error || ''
})

const requestedMode = computed(() => {
  const p = String(nlpProvider.value || '').toLowerCase()
  if (p === 'gemini') return 'Gemini'
  if (p === 'local') return 'Local'
  return 'Auto'
})

const sessionShort = computed(() => {
  const s = String(sessionId.value || '')
  if (!s) return ''
  if (s.length <= 14) return s
  return `${s.slice(0, 8)}…${s.slice(-4)}`
})

const useGemini = computed({
  get: () => String(nlpProvider.value || '').toLowerCase() === 'gemini',
  set: (v) => { nlpProvider.value = v ? 'gemini' : 'local' },
})

watch(nlpProvider, (v) => {
  const val = String(v || '').toLowerCase()
  if (!['local', 'gemini'].includes(val)) return
  localStorage.setItem(providerStorageKey.value, val)
})

function extractCitationIds (text) {
  const s = String(text || '')
  const re = /\[(P\d+)\]/g
  const out = []
  const seen = new Set()
  let m
  while ((m = re.exec(s)) !== null) {
    const id = m[1]
    if (!seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

function splitByCitations (text) {
  const s = String(text || '')
  const re = /\[(P\d+)\]/g
  const parts = []
  let last = 0
  let m
  while ((m = re.exec(s)) !== null) {
    const start = m.index
    const end = m.index + m[0].length
    if (start > last) parts.push({ type: 'text', value: s.slice(last, start) })
    parts.push({ type: 'cite', value: m[1] })
    last = end
  }
  if (last < s.length) parts.push({ type: 'text', value: s.slice(last) })
  return parts
}

function segmentsForMessage (msg) {
  if (!msg || msg.role !== 'assistant') return [{ type: 'text', value: msg?.content || '' }]
  return splitByCitations(msg.content)
}

const lastAssistantMessage = computed(() => {
  const msgs = conversation.value?.messages || []
  const rev = [...msgs].reverse()
  return rev.find(m => m.role === 'assistant') || null
})

const ragSources = computed(() => lastAssistantMessage.value?.nlp?.rag?.sources || [])

const retrievalMode = computed(() => {
  const m = String(systemStatus.value?.rag?.mode || '').toLowerCase()
  if (!m) return ''
  if (m === 'vector') return 'Vector'
  if (m === 'lexical') return 'Lexical'
  return m.charAt(0).toUpperCase() + m.slice(1)
})

const citedIds = computed(() => extractCitationIds(lastAssistantMessage.value?.content || ''))

const citedSources = computed(() => {
  const src = Array.isArray(ragSources.value) ? ragSources.value : []
  const by = new Map(src.map(s => [s?.citation, s]))
  return (citedIds.value || []).map(id => ({ citation: id, ...(by.get(id) || {}) }))
})

async function selectCitation (id) {
  activeCitation.value = String(id || '')
  await nextTick()
  const el = document.getElementById(`source-${activeCitation.value}`)
  if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function loadSession () {
  try {
    const data = await convGetSession(idToken.value, sessionId.value)
    conversation.value = data
    localStorage.setItem(storageKey.value, sessionId.value)
    await nextTick(); scrollToBottom()
    await loadRecommendations()
  } catch (e) {
    error.value = e?.message || 'Failed to load session'
  }
}

function recKey (r) {
  const k = r?.program_id || r?.program_code || r?.program_name || ''
  return String(k).trim().toLowerCase()
}

function mergeUnique (base, extra, limit) {
  const out = []
  const seen = new Set()
  const a = Array.isArray(base) ? base : []
  const b = Array.isArray(extra) ? extra : []

  for (const it of a) {
    const key = recKey(it)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(it)
    if (limit && out.length >= limit) return out
  }
  for (const it of b) {
    const key = recKey(it)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(it)
    if (limit && out.length >= limit) return out
  }
  return out
}

async function loadRecommendations ({ merge = false } = {}) {
  recsError.value = ''
  recsLoading.value = true
  try {
    const data = await convGetRecommendations(idToken.value, sessionId.value, { k: recsK.value })
    const nextRecs = data?.recommendations || []
    const nextStretch = data?.stretch_recommendations || []

    if (merge) {
      recs.value = mergeUnique(recs.value, nextRecs, recsK.value)
      stretchRecs.value = mergeUnique(stretchRecs.value, nextStretch, recsK.value)
    } else {
      recs.value = nextRecs
      stretchRecs.value = nextStretch
    }
  } catch (e) {
    // Do not hard-fail the chat if recommendations endpoint is unavailable
    recsError.value = e?.message || 'Failed to load recommendations'
    recs.value = []
    stretchRecs.value = []
  } finally {
    recsLoading.value = false
  }
}

function scrollToBottom () {
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
}

async function sendMessage () {
  const text = (input.value || '').trim()
  if (!text || sending.value) return
  sending.value = true
  error.value = ''
  try {
    // optimistic append user message
    conversation.value.messages.push({ role: 'user', content: text, created_at: new Date().toISOString() })
    await nextTick(); scrollToBottom()
    const resp = await convPostMessage(idToken.value, sessionId.value, { text, idempotencyKey: `${Date.now()}`, nlpProvider: nlpProvider.value })
    conversation.value = resp.session
    input.value = ''
    await nextTick(); scrollToBottom()

    const tr = resp?.turn_recommendations
    if (tr && typeof tr === 'object') {
      const k = Number(tr.k || 0)
      if (k > 0) recsK.value = Math.min(recsMax, Math.max(1, k))
      recs.value = Array.isArray(tr.recommendations) ? tr.recommendations : []
      stretchRecs.value = Array.isArray(tr.stretch_recommendations) ? tr.stretch_recommendations : []
    } else {
      await loadRecommendations()
    }
    inputEl.value?.focus?.()
  } catch (e) {
    error.value = e?.message || 'Failed to send message'
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await waitForAuthReady()
  const u = user.value
  if (!u) {
    router.replace('/login')
    return
  }
  idToken.value = await run(async () => getIdToken(true), { fallbackMessage: 'Not authenticated', silent: true })
  if (!idToken.value) {
    router.replace('/login')
    return
  }
  sessionId.value = localStorage.getItem(storageKey.value) || sessionId.value
  nlpProvider.value = localStorage.getItem(providerStorageKey.value) || nlpProvider.value
  await loadSession()

  try {
    systemStatus.value = await catalogStatus()
  } catch (_) {}

  tryIntervalId = setInterval(() => {
    if (trySuggestions.length <= 1) return
    tryIndex.value = (tryIndex.value + 1) % trySuggestions.length
  }, 10000)
})

onBeforeUnmount(() => {
  if (tryIntervalId) clearInterval(tryIntervalId)
  tryIntervalId = null
})
</script>

<template>
  <main class="h-full box-border overflow-hidden py-4 px-4 sm:px-6 lg:px-8 flex flex-col min-h-0">
    <div class="mx-auto max-w-screen-2xl flex flex-col min-h-0 flex-1">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div class="min-w-0">
          <h1 class="text-xl font-bold text-gray-900">Conversation</h1>
          <p class="text-xs text-gray-600 truncate">
            <span class="hidden sm:inline">Session:</span>
            <span class="font-mono" :title="sessionId">{{ sessionShort }}</span>
            <span class="mx-1">·</span>
            <span>State:</span> <span class="font-mono">{{ conversation.fsm_state }}</span>
            <span class="hidden md:inline">
              <span class="mx-1">·</span>
              <span>Requested:</span> <span class="font-semibold">{{ requestedMode }}</span>
              <span class="mx-1">·</span>
              <span>LLM:</span> <span class="font-semibold">{{ mode }}</span>
            </span>
            <span v-if="retrievalMode" class="hidden lg:inline"> <span class="mx-1">·</span>Retrieval: <span class="font-semibold">{{ retrievalMode }}</span></span>
            <span v-if="modeError" class="text-red-600"> (provider error: {{ modeError }})</span>
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2 shrink-0">
          <label class="inline-flex items-center gap-2 text-sm text-gray-700 border rounded-lg bg-white/70 px-2 py-1.5 md:px-3 md:py-2 shrink-0">
            <span class="text-gray-600 hidden sm:inline">Local</span>
            <input type="checkbox" v-model="useGemini" class="h-4 w-4" />
            <span class="text-gray-900 hidden sm:inline">Gemini</span>
            <span class="sr-only sm:hidden">Toggle Gemini</span>
          </label>
          <button
            class="btn btn-outline btn-sm gap-2 transition-all hover:bg-gray-50 hover:shadow-sm active:scale-[0.99] shrink-0"
            type="button"
            title="New session"
            aria-label="New session"
            @click="newSession"
          >
            <Plus class="h-4 w-4" />
            <span class="hidden sm:inline">New session</span>
            <span class="sr-only sm:hidden">New session</span>
          </button>
          <button
            class="btn btn-outline btn-sm gap-2 transition-all hover:bg-red-50 hover:text-red-700 hover:border-red-200 hover:shadow-sm active:scale-[0.99] shrink-0"
            type="button"
            title="Clear session"
            aria-label="Clear session"
            @click="clearSession"
          >
            <Trash2 class="h-4 w-4" />
            <span class="hidden sm:inline">Clear session</span>
            <span class="sr-only sm:hidden">Clear session</span>
          </button>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-1 lg:grid-cols-5 gap-8 min-h-0 flex-1">
        <section class="lg:col-span-3 min-h-0">
          <div class="border rounded-xl p-4 bg-white/60 flex flex-col h-full min-h-0">
            <div ref="scroller" class="flex-1 overflow-y-auto pr-2 min-h-0">
              <div v-for="(m, idx) in conversation.messages" :key="idx" class="mb-3">
                <div :class="['flex', m.role === 'user' ? 'justify-end' : 'justify-start']">
                  <div
                    :class="[
                      'max-w-[85%] sm:max-w-[75%] px-4 py-2 whitespace-pre-wrap break-words shadow-sm',
                      m.role === 'user'
                        ? 'bg-brand text-white rounded-2xl rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                    ]"
                  >
                    <template v-for="(seg, sidx) in segmentsForMessage(m)" :key="sidx">
                      <span v-if="seg.type === 'text'">{{ seg.value }}</span>
                      <button
                        v-else
                        type="button"
                        :class="[
                          'inline-flex items-center font-mono text-xs px-1.5 py-0.5 rounded border transition-all hover:shadow-sm active:scale-95',
                          m.role === 'user'
                            ? 'bg-white/15 border-white/25 text-white hover:bg-white/20'
                            : 'bg-white/60 border-gray-200 text-gray-700 hover:bg-white'
                        ]"
                        @click="selectCitation(seg.value)"
                      >[{{ seg.value }}]</button>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <form class="mt-4 flex gap-2" @submit.prevent="sendMessage">
              <input ref="inputEl" v-model="input" type="text" class="input flex-1" placeholder="Ask for programs, requirements, or career guidance…" />
              <button
                class="btn btn-primary rounded-2xl px-4 py-3 min-w-12 gap-2 shrink-0 transition-all hover:shadow-sm active:scale-[0.99] disabled:opacity-60"
                type="submit"
                :disabled="sending"
                title="Send"
                aria-label="Send"
              >
                <Send class="h-4 w-4" />
                <span class="hidden sm:inline">{{ sending ? 'Sending…' : 'Send' }}</span>
                <span class="sr-only sm:hidden">{{ sending ? 'Sending…' : 'Send' }}</span>
              </button>
            </form>

            <div class="mt-2 flex items-center gap-2">
              <div class="inline-flex items-center gap-1.5 text-[11px] text-gray-500 shrink-0">
                <span>Try:</span>
              </div>
              <button
                type="button"
                class="chip-btn"
                @click="applyHint(activeTry)"
              >{{ activeTry }}</button>
            </div>

            <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
          </div>
        </section>

        <aside class="lg:col-span-2 min-h-0">
          <div class="border rounded-xl p-4 bg-white/60 h-full min-h-0 overflow-y-auto">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Recommendations</h2>
              <div class="flex items-center gap-2">
                <button
                  v-if="recsK > 10"
                  class="btn btn-outline btn-sm"
                  type="button"
                  title="Show fewer"
                  aria-label="Show fewer"
                  @click="resetRecsCount"
                >Less</button>
                <button
                  class="btn btn-outline btn-sm gap-2 transition-all hover:bg-gray-50 hover:shadow-sm active:scale-[0.99]"
                  type="button"
                  title="Refresh"
                  aria-label="Refresh"
                  @click="loadRecommendations"
                >
                  <RefreshCw class="h-4 w-4" />
                  <span class="hidden sm:inline">Refresh</span>
                  <span class="sr-only sm:hidden">Refresh</span>
                </button>
              </div>
            </div>

            <div class="mt-2 text-xs text-gray-500">Showing up to {{ recsK }} results</div>
            <p v-if="recsError" class="text-sm text-red-600 mt-2">{{ recsError }}</p>
            <div v-if="recsLoading && !recs.length" class="mt-3 grid grid-cols-1 gap-3">
              <div v-for="i in 6" :key="i" class="card p-3 animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="mt-2 h-3 bg-gray-100 rounded w-2/3"></div>
                <div class="mt-2 h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
            <div v-else-if="!recs.length" class="text-sm text-gray-600 mt-3 flex items-start gap-2">
              <Sparkles class="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <div class="font-medium text-gray-800">No recommendations yet</div>
                <div class="text-xs text-gray-500 mt-0.5">Share your grades and interests to personalize results.</div>
              </div>
            </div>
            <div v-else class="mt-3 grid grid-cols-1 gap-3">
              <div
                v-for="r in recs"
                :key="r.program_id || r.program_code || r.program_name"
                :class="['card p-3', r.program_id ? 'clickable-card' : '']"
                :role="r.program_id ? 'button' : null"
                :tabindex="r.program_id ? 0 : -1"
                @click="openProgramDetails(r)"
                @keydown.enter="openProgramDetails(r)"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <div class="flex items-start gap-2 min-w-0">
                      <div class="font-semibold text-gray-900 leading-snug break-words">{{ r.program_name }}</div>
                      <span
                        v-if="r.eligibility && r.eligibility.eligible === true"
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 whitespace-nowrap"
                      >Eligible</span>
                      <span
                        v-else-if="r.eligibility && r.eligibility.eligible === false"
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 whitespace-nowrap"
                      >Not eligible</span>
                      <span
                        v-else
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 whitespace-nowrap"
                      >Unknown</span>
                    </div>
                    <div class="text-sm text-gray-600">
                      {{ r.institution_name }}
                      <span v-if="r.region"> · {{ r.region }}</span>
                      <span v-if="r.campus"> · {{ r.campus }}</span>
                    </div>
                    <div v-if="r.requirements_preview" class="text-xs text-gray-500 mt-1">Reqs: {{ r.requirements_preview }}</div>
                  </div>
                  <div class="text-right text-xs text-gray-600">
                    <div v-if="r.program_code" class="font-mono">{{ r.program_code }}</div>
                    <div>Score: {{ r.score }}</div>
                  </div>
                </div>
                <div v-if="r.eligibility && r.eligibility.missing && r.eligibility.missing.length" class="mt-1.5 text-xs text-gray-600">
                  Missing: {{ r.eligibility.missing.join(', ') }}
                </div>
                <div v-if="r.cost || r.latest_cutoff" class="mt-2 text-xs text-gray-600">
                  <span v-if="r.cost && r.cost.amount != null">Cost: {{ r.cost.amount }} {{ r.cost.currency }}</span>
                  <span v-else-if="r.cost && r.cost.raw_cost">Cost: {{ r.cost.raw_cost }}</span>
                  <span v-if="r.latest_cutoff && r.latest_cutoff.cutoff != null">
                    <span v-if="r.cost || (r.cost && r.cost.raw_cost)"> · </span>
                    Cutoff {{ r.latest_cutoff.year }}: {{ r.latest_cutoff.cutoff }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="recs.length && recs.length >= recsK && recsK < recsMax" class="mt-4">
              <button
                class="btn btn-outline btn-sm gap-2"
                type="button"
                title="Show more"
                aria-label="Show more"
                @click="showMoreRecs"
              >
                <ChevronDown class="h-4 w-4" />
                <span>Show more</span>
              </button>
            </div>

            <section v-if="stretchRecs.length" class="mt-6">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-semibold text-gray-900">Aspirational / Stretch</h3>
                <div class="text-xs text-gray-600">{{ stretchRecs.length }} suggested</div>
              </div>
              <p class="mt-1 text-xs text-gray-600">
                These match your goal, but you’re not eligible yet. Check missing subjects/grades or the cutoff gap.
              </p>

              <div class="mt-3 grid grid-cols-1 gap-3">
                <div
                  v-for="r in stretchRecs"
                  :key="`stretch:${r.program_id || r.program_code || r.program_name}`"
                  :class="['card p-3', r.program_id ? 'clickable-card' : '', 'border-amber-200 bg-amber-50/40']"
                  :role="r.program_id ? 'button' : null"
                  :tabindex="r.program_id ? 0 : -1"
                  @click="openProgramDetails(r)"
                  @keydown.enter="openProgramDetails(r)"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                      <div class="flex items-start gap-2 min-w-0">
                        <div class="font-semibold text-gray-900 leading-snug break-words">{{ r.program_name }}</div>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">Stretch</span>
                      </div>
                      <div class="text-sm text-gray-600">
                        {{ r.institution_name }}
                        <span v-if="r.region"> · {{ r.region }}</span>
                        <span v-if="r.campus"> · {{ r.campus }}</span>
                      </div>
                      <div v-if="r.requirements_preview" class="text-xs text-gray-500 mt-1">Reqs: {{ r.requirements_preview }}</div>
                    </div>
                    <div class="text-right text-xs text-gray-600">
                      <div v-if="r.program_code" class="font-mono">{{ r.program_code }}</div>
                      <div>Score: {{ r.score }}</div>
                    </div>
                  </div>

                  <div v-if="r.eligibility && r.eligibility.missing && r.eligibility.missing.length" class="mt-1.5 text-xs text-gray-700">
                    Missing: {{ r.eligibility.missing.join(', ') }}
                  </div>

                  <div v-if="r.latest_cutoff || (r.stretch_reason && r.stretch_reason.cutoff_gap != null)" class="mt-2 text-xs text-gray-700">
                    <span v-if="r.latest_cutoff && r.latest_cutoff.cutoff != null">Cutoff {{ r.latest_cutoff.year }}: {{ r.latest_cutoff.cutoff }}</span>
                    <span v-if="r.stretch_reason && r.stretch_reason.cutoff_gap != null">
                      <span v-if="r.latest_cutoff && r.latest_cutoff.cutoff != null"> · </span>
                      Gap: {{ r.stretch_reason.cutoff_gap }}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section v-if="citedSources.length" class="mt-6">
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900">Sources</h2>
                <div class="text-xs text-gray-600">Cited: <span class="font-mono">{{ citedIds.join(', ') }}</span></div>
              </div>
              <div class="mt-3 grid grid-cols-1 gap-3">
                <div
                  v-for="s in citedSources"
                  :key="s.citation"
                  :id="`source-${s.citation}`"
                  :class="['card p-4', activeCitation === s.citation ? 'ring-2 ring-brand/50' : '']"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <div class="font-semibold text-gray-900">
                        <span class="font-mono text-xs text-gray-600 mr-2">[{{ s.citation }}]</span>
                        {{ s.program_name || 'Program' }}
                      </div>
                      <div class="text-sm text-gray-600">
                        {{ s.institution_name || '' }}
                        <span v-if="s.level"> · {{ s.level }}</span>
                        <span v-if="s.region"> · {{ s.region }}</span>
                        <span v-if="s.campus"> · {{ s.campus }}</span>
                      </div>
                      <div v-if="s.requirements_preview" class="text-xs text-gray-500 mt-1">Reqs: {{ s.requirements_preview }}</div>
                    </div>
                    <div class="text-right text-xs text-gray-600">
                      <div v-if="s.program_code" class="font-mono">{{ s.program_code }}</div>
                      <div v-if="s.field_name">{{ s.field_name }}</div>
                    </div>
                  </div>
                  <div v-if="s.latest_cutoff || s.cost" class="mt-2 text-xs text-gray-600">
                    <span v-if="s.latest_cutoff && s.latest_cutoff.cutoff != null">Cutoff {{ s.latest_cutoff.year }}: {{ s.latest_cutoff.cutoff }}</span>
                    <span v-if="s.cost && s.cost.amount != null">
                      <span v-if="s.latest_cutoff && s.latest_cutoff.cutoff != null"> · </span>
                      Cost: {{ s.cost.amount }} {{ s.cost.currency }}
                    </span>
                    <span v-else-if="s.cost && s.cost.raw_cost">
                      <span v-if="s.latest_cutoff && s.latest_cutoff.cutoff != null"> · </span>
                      Cost: {{ s.cost.raw_cost }}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  </main>
</template>
