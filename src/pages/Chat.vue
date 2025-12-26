<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { convGetSession, convPostMessage, convDeleteSession, convGetRecommendations } from '../lib/api'
import { Plus, Trash2, RefreshCw, Send } from 'lucide-vue-next'
import { auth } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'

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

function openProgramDetails (r) {
  const id = r?.program_id
  if (!id) return
  router.push({ name: 'program_details', params: { id: String(id) } })
}
const idToken = ref('')
const storageKey = computed(() => {
  const uid = auth.currentUser?.uid || ''
  return uid ? `conv_session_id:${uid}` : 'conv_session_id'
})

const providerStorageKey = computed(() => {
  const uid = auth.currentUser?.uid || ''
  return uid ? `conv_nlp_provider:${uid}` : 'conv_nlp_provider'
})

const sessionId = ref(localStorage.getItem(storageKey.value) || uuidv4())
const nlpProvider = ref(localStorage.getItem(providerStorageKey.value) || 'local')
const input = ref('')
const sending = ref(false)
const error = ref('')
const conversation = ref({ id: '', fsm_state: '', messages: [], slots: {} })
const recs = ref([])
const recsError = ref('')
const scroller = ref(null)
const activeCitation = ref('')

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

async function loadRecommendations () {
  recsError.value = ''
  try {
    const data = await convGetRecommendations(idToken.value, sessionId.value, { k: 10 })
    recs.value = data?.recommendations || []
  } catch (e) {
    // Do not hard-fail the chat if recommendations endpoint is unavailable
    recsError.value = e?.message || 'Failed to load recommendations'
    recs.value = []
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
    await loadRecommendations()
  } catch (e) {
    error.value = e?.message || 'Failed to send message'
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  const u = auth.currentUser
  if (!u) {
    router.replace('/login')
    return
  }
  idToken.value = await getIdToken(u, true)
  sessionId.value = localStorage.getItem(storageKey.value) || sessionId.value
  nlpProvider.value = localStorage.getItem(providerStorageKey.value) || nlpProvider.value
  await loadSession()
})
</script>

<template>
  <main class="py-6 px-4 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-screen-2xl">
      <h1 class="text-2xl font-bold text-gray-900">Conversation</h1>
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-1">
        <p class="text-sm text-gray-600">
          Session: <span class="font-mono">{{ sessionId }}</span>
          · State: <span class="font-mono">{{ conversation.fsm_state }}</span>
          · Requested: <span class="font-semibold">{{ requestedMode }}</span>
          · LLM: <span class="font-semibold">{{ mode }}</span>
          <span v-if="modeError" class="text-red-600"> (provider error: {{ modeError }})</span>
        </p>
        <div class="flex gap-2">
          <label class="inline-flex items-center gap-2 text-sm text-gray-700 border rounded-lg px-3 py-2 bg-white/70">
            <span class="text-gray-600">Local</span>
            <input type="checkbox" v-model="useGemini" class="h-4 w-4" />
            <span class="text-gray-900">Gemini</span>
          </label>
          <button
            class="btn btn-outline btn-sm gap-2 transition-all hover:bg-gray-50 hover:shadow-sm active:scale-[0.99]"
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
            class="btn btn-outline btn-sm gap-2 transition-all hover:bg-red-50 hover:text-red-700 hover:border-red-200 hover:shadow-sm active:scale-[0.99]"
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

      <div class="mt-5 grid grid-cols-1 lg:grid-cols-5 gap-8">
        <section class="lg:col-span-3">
          <div class="border rounded-xl p-4 bg-white/60 flex flex-col h-[72vh]">
            <div ref="scroller" class="flex-1 overflow-y-auto pr-2">
              <div v-for="(m, idx) in conversation.messages" :key="idx" class="mb-3">
                <div :class="['text-xs mb-1', m.role === 'assistant' ? 'text-brand-dark' : 'text-gray-500']">{{ m.role }}</div>
                <div :class="['rounded-2xl px-4 py-2 whitespace-pre-wrap', m.role === 'assistant' ? 'bg-brand/10' : 'bg-gray-100']">
                  <template v-for="(seg, sidx) in segmentsForMessage(m)" :key="sidx">
                    <span v-if="seg.type === 'text'">{{ seg.value }}</span>
                    <button
                      v-else
                      type="button"
                      class="inline-flex items-center font-mono text-xs px-1 rounded bg-white/60 border border-gray-200 transition-all hover:bg-white hover:shadow-sm active:scale-95"
                      @click="selectCitation(seg.value)"
                    >[{{ seg.value }}]</button>
                  </template>
                </div>
              </div>
            </div>

            <form class="mt-4 flex gap-2" @submit.prevent="sendMessage">
              <input v-model="input" type="text" class="input flex-1" placeholder="Type a message... e.g., Math A-, English B+" />
              <button
                class="btn btn-primary gap-2 transition-all hover:shadow-sm active:scale-[0.99] disabled:opacity-60"
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

            <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>
          </div>

          <div class="mt-4 text-xs text-gray-500">
            Tips: Share some grades (e.g., "Math A-, English B+"), then your interests (e.g., "I enjoy coding").
          </div>
        </section>

        <aside class="lg:col-span-2">
          <div class="border rounded-xl p-4 bg-white/60 h-[72vh] overflow-y-auto lg:sticky lg:top-24">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Recommendations</h2>
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
            <p v-if="recsError" class="text-sm text-red-600 mt-2">{{ recsError }}</p>
            <div v-if="!recs.length" class="text-sm text-gray-600 mt-2">
              No recommendations yet. Share your grades and interests to personalize results.
            </div>
            <div v-else class="mt-3 grid grid-cols-1 gap-3">
              <div
                v-for="r in recs"
                :key="r.program_id || r.program_code || r.program_name"
                :class="['card p-4', r.program_id ? 'cursor-pointer transition-all hover:bg-white/70 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-brand/30' : '']"
                :role="r.program_id ? 'button' : null"
                :tabindex="r.program_id ? 0 : -1"
                @click="openProgramDetails(r)"
                @keydown.enter="openProgramDetails(r)"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="font-semibold text-gray-900">{{ r.program_name }}</div>
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
                <div class="mt-2 text-sm">
                  <span v-if="r.eligibility && r.eligibility.eligible === true" class="text-green-700">Eligible</span>
                  <span v-else-if="r.eligibility && r.eligibility.eligible === false" class="text-red-700">Not eligible</span>
                  <span v-else class="text-gray-600">Eligibility unknown</span>
                  <span v-if="r.eligibility && r.eligibility.missing && r.eligibility.missing.length" class="text-gray-600">
                    · Missing: {{ r.eligibility.missing.join(', ') }}
                  </span>
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
