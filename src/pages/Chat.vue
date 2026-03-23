<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { convGetSession, convPostMessage, convDeleteSession, convGetRecommendations, catalogStatus, convStreamMessage, catalogGetProgramDetail, catalogGetProgramCareers } from '../lib/api'
import { Plus, Trash2, RefreshCw, Send, ChevronDown, Sparkles, ChevronLeft, ChevronRight, BookOpen, Info } from 'lucide-vue-next'
import CareerPath from '../components/CareerPath.vue'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'
import { subjectByCode } from './onboarding/kcseSubjects'

const _KCSE_SUBJECT_BY_CODE = subjectByCode()

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

// ─── Program Details Tab ──────────────────────────────────────────────────────
const rightTab = ref('recommendations')   // 'recommendations' | 'details'
const selectedProgram = ref(null)
const programLoading = ref(false)
const programError = ref('')
const careerPath = ref(null)
const careerPathLoading = ref(false)

async function openProgramDetails (r) {
  const code = r?.program_code || r?.program_id
  if (!code) return
  rightTab.value = 'details'
  programLoading.value = true
  programError.value = ''
  careerPath.value = null
  selectedProgram.value = null
  if (mobilePanelOpen.value) closeMobilePanel()
  
  try {
    // Attempt load by code/id
    const detail = await catalogGetProgramDetail(code, idToken.value)
    selectedProgram.value = detail
    
    // Once we have the detail, we might have a stable DB id for careers
    const dbId = detail.id || code
    const careers = await catalogGetProgramCareers(dbId)
    careerPath.value = careers?.career_path || null
  } catch (e) {
    programError.value = e?.message || 'Failed to load program details'
  } finally {
    programLoading.value = false
  }
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

const sidebarCollapsed = ref(false)
const sourcesOpen = ref(false)
const mobilePanelOpen = ref(false)

const showPanel = computed(() => {
  return mobilePanelOpen.value || !sidebarCollapsed.value
})

function openMobilePanel() {
  mobilePanelOpen.value = true
}

function closeMobilePanel() {
  mobilePanelOpen.value = false
}

watch(mobilePanelOpen, (open) => {
  try {
    document.body.style.overflow = open ? 'hidden' : ''
  } catch (_) {}
})

onBeforeUnmount(() => {
  try {
    document.body.style.overflow = ''
  } catch (_) {}
})

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

function splitByProgramCodes (text) {
  // Parses [P1] citation tokens AND [CODE: 1263131] or [CODE: MED001] program code tokens.
  const s = String(text || '')
  const re = /\[P(\d+)\]|\[CODE:\s*([a-zA-Z0-9_-]+)\]/g
  const parts = []
  let last = 0
  let m
  while ((m = re.exec(s)) !== null) {
    const start = m.index
    const end = m.index + m[0].length
    if (start > last) parts.push({ type: 'text', value: s.slice(last, start) })
    if (m[1] !== undefined) {
      parts.push({ type: 'cite', value: m[1] })
    } else {
      parts.push({ type: 'program_code', value: m[2] })
    }
    last = end
  }
  if (last < s.length) parts.push({ type: 'text', value: s.slice(last) })
  return parts
}

function segmentsForMessage (msg) {
  if (!msg || msg.role !== 'assistant') return [{ type: 'text', value: msg?.content || '' }]
  return splitByProgramCodes(msg.content)
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
  
  // optimistic append user message
  conversation.value.messages.push({ role: 'user', content: text, created_at: new Date().toISOString() })
  
  // placeholder for the assistant stream
  const assistantMsg = { role: 'assistant', content: '', created_at: new Date().toISOString() }
  conversation.value.messages.push(assistantMsg)
  
  await nextTick(); scrollToBottom()
  input.value = ''

  return new Promise((resolve) => {
    let currentText = ''
    convStreamMessage(
      idToken.value, 
      sessionId.value, 
      { text, idempotencyKey: `${Date.now()}`, nlpProvider: nlpProvider.value },
      {
        onDelta: (chunk) => {
          currentText += chunk
          assistantMsg.content = currentText
          scrollToBottom()
        },
        onDone: async (resp) => {
          if (!resp || !resp.session) {
            error.value = 'Received invalid response format from server.'
            if (!currentText) conversation.value.messages.pop()
            sending.value = false
            resolve()
            return
          }
          conversation.value = resp.session
          const tr = resp?.turn_recommendations
          if (tr && typeof tr === 'object') {
            const k = Number(tr.k || 0)
            if (k > 0) recsK.value = Math.min(recsMax, Math.max(1, k))
            recs.value = Array.isArray(tr.recommendations) ? tr.recommendations : []
            stretchRecs.value = Array.isArray(tr.stretch_recommendations) ? tr.stretch_recommendations : []
          } else {
            await loadRecommendations()
          }
          sending.value = false
          inputEl.value?.focus?.()
          await nextTick(); scrollToBottom()
          resolve()
        },
        onError: (errMsg) => {
          error.value = errMsg || 'Failed to send message'
          // Pop the failed assistant message placeholder if it's empty
          if (!currentText) conversation.value.messages.pop()
          sending.value = false
          resolve()
        },
        onAbort: () => {
          sending.value = false
          resolve()
        }
      }
    )
  })
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
  <main class="h-[100dvh] w-full app-bg overflow-hidden flex flex-col relative">
    <!-- background decor -->
    <div class="absolute top-0 right-0 -z-10 w-1/3 h-1/3 bg-brand/5 blur-[120px] rounded-full"></div>
    <div class="absolute bottom-10 left-10 -z-10 w-1/4 h-1/4 bg-brand/5 blur-[100px] rounded-full"></div>

    <header class="w-full bg-white/40 backdrop-blur-md border-b border-white/80 px-4 py-2 sm:px-6 flex items-center justify-between gap-4 shrink-0 min-h-[56px]">
      <div class="min-w-0">
        <h1 class="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
          Gemini Assistant
          <span class="inline-flex h-2 w-2 rounded-full bg-brand animate-pulse"></span>
        </h1>
        <div class="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest truncate">
          <span class="bg-gray-100/80 px-1.5 py-0.5 rounded">{{ sessionShort }}</span>
          <span class="mx-0.5 opacity-30">/</span>
          <span class="text-brand">{{ requestedMode }}</span>
          <span class="mx-0.5 opacity-30">/</span>
          <span class="text-slate-600">{{ mode }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Providers Toggle -->
        <label class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 border border-white shadow-sm cursor-pointer hover:bg-white transition-colors">
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-400" :class="!useGemini ? 'text-brand' : ''">Local</span>
          <div class="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-200 transition-colors" @click.stop="useGemini = !useGemini">
            <span :class="['inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', useGemini ? 'translate-x-5' : 'translate-x-1']"></span>
          </div>
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-400" :class="useGemini ? 'text-brand' : ''">Gemini</span>
        </label>

        <button 
          class="btn-outline btn-sm h-9 border-slate-200 bg-white shadow-sm lg:hidden"
          @click="openMobilePanel"
        >
          <ChevronLeft class="h-4 w-4" />
          <span class="hidden sm:inline">Panel</span>
        </button>

        <div class="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

        <button 
          class="btn-outline btn-sm h-9 px-3 border-transparent hover:bg-white/50"
          title="New session"
          @click="newSession"
        >
          <Plus class="h-4 w-4" />
        </button>

        <button 
          v-if="sidebarCollapsed"
          class="btn-outline btn-sm h-9 px-3 border-transparent hover:bg-white/50 text-brand animate-in fade-in slide-in-from-right-2"
          title="Open Intelligence"
          @click="sidebarCollapsed = false"
        >
          <ChevronLeft class="h-4 w-4 mr-1" />
          <span class="text-[10px] font-black uppercase tracking-widest">Intelligence</span>
        </button>

        <button 
          class="btn-outline btn-sm h-9 px-3 border-transparent hover:bg-red-50 hover:text-red-600"
          title="Clear session"
          @click="clearSession"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
    </header>

    <div class="flex-1 flex min-h-0 overflow-hidden">
      <!-- Chat Main -->
      <section :class="['flex-1 flex flex-col min-w-0 h-full transition-all duration-300', sidebarCollapsed ? 'lg:pr-0' : 'lg:pr-0']">
        <!-- Messages Area -->
        <div ref="scroller" class="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-2">
          <div v-for="(m, idx) in conversation.messages" :key="idx" class="flex flex-col" :class="m.role === 'user' ? 'items-end' : 'items-start'">
            
            <!-- Message Label -->
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5 px-2">
              {{ m.role === 'user' ? 'You' : 'Assistant' }}
            </span>

            <div
              :class="[
                'max-w-[85%] sm:max-w-[70%] p-2 px-4 shadow-sm relative group transition-all duration-300',
                m.role === 'user'
                  ? 'bg-brand text-white rounded-2xl rounded-tr-sm shadow-brand/10'
                  : 'glass-card bg-white/80 text-gray-900 rounded-2xl rounded-tl-sm border-white/60'
              ]"
            >
              <div class="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                <template v-for="(seg, sidx) in segmentsForMessage(m)" :key="sidx">
                  <span v-if="seg.type === 'text'">{{ seg.value }}</span>
                  <button
                    v-else-if="seg.type === 'cite'"
                    type="button"
                    :class="[
                      'inline-flex items-center font-black text-[10px] px-1.5 py-0.5 rounded-lg border transition-all mx-0.5',
                      m.role === 'user'
                        ? 'bg-white/20 border-white/20 text-white hover:bg-white/30'
                        : 'bg-brand/5 border-brand/10 text-brand hover:bg-brand/10'
                    ]"
                    @click="selectCitation(seg.value)"
                  >{{ seg.value }}</button>
                  <button
                    v-else-if="seg.type === 'program_code'"
                    type="button"
                    class="inline-flex items-center font-black text-[10px] px-2 py-0.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors mx-0.5"
                    @click="openProgramDetails({ program_id: seg.value })"
                  >{{ seg.value }}</button>
                </template>
              </div>

              <!-- Time display on hover -->
              <div class="absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-white/40 pointer-events-none" :class="m.role === 'user' ? '-left-12' : '-right-12'">
                {{ new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </div>
            </div>
          </div>

          <div v-if="error" class="mx-auto max-w-md p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3">
             <div class="h-2 w-2 rounded-full bg-red-500"></div>
             {{ error }}
          </div>
        </div>

        <!-- Input Bar Area -->
        <div class="px-4 py-3 sm:px-6 sm:pb-6 shrink-0">
          <div class="max-w-3xl mx-auto flex flex-col gap-3">
            
            <!-- Suggestions Chip Carousel -->
            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Suggested:</span>
              <button
                v-for="sug in [activeTry]"
                :key="sug"
                type="button"
                class="whitespace-nowrap bg-white/60 border border-white px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:bg-brand hover:text-white hover:border-brand transition-all shadow-sm"
                @click="applyHint(sug)"
              >
                {{ sug }}
              </button>
            </div>

            <!-- Main Input Floating Bar -->
            <form class="relative group" @submit.prevent="sendMessage">
              <input 
                ref="inputEl" 
                v-model="input" 
                type="text" 
                class="w-full h-14 pl-6 pr-32 rounded-3xl bg-white/80 backdrop-blur-xl border-2 border-white/60 shadow-xl shadow-slate-200/50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand/30 focus:ring-4 focus:ring-brand/5 transition-all text-[15px] font-medium" 
                placeholder="Ask your career advisor..." 
              />
              <button
                class="absolute right-2 top-2 bottom-2 px-6 rounded-2xl bg-brand text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20 hover:shadow-brand/30 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                type="submit"
                :disabled="sending"
              >
                <span v-if="!sending">Send</span>
                <RefreshCw v-else class="h-3.5 w-3.5 animate-spin" />
                <Send v-if="!sending" class="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </section>

      <!-- Side Panel -->
      <aside
        v-if="showPanel"
        :class="[
          'z-50 lg:z-auto transition-all duration-300 ease-in-out h-full overflow-hidden flex flex-col shrink-0',
          'fixed inset-y-0 right-0 w-full sm:w-[460px] max-w-full bg-white/95 backdrop-blur-3xl shadow-2xl lg:shadow-none lg:bg-transparent lg:static lg:w-[400px]',
          mobilePanelOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
          sidebarCollapsed ? 'hidden' : 'block'
        ]"
      >
        <div class="h-full flex flex-col bg-white/40 border-l border-white/80 lg:rounded-3xl lg:border-2 lg:shadow-xl lg:shadow-slate-200/50 m-1 lg:m-2 overflow-hidden text-sm">
          
          <!-- Panel Header -->
          <div class="p-4 border-b border-white/60 flex items-center justify-between shrink-0">
             <div class="flex items-center gap-2">
                <div class="h-2 w-2 rounded-full bg-brand"></div>
                <h2 class="text-sm font-black text-gray-900 uppercase tracking-widest">Intelligence</h2>
             </div>
             <div class="flex items-center gap-2">
                <button
                  class="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-500 transition-all shadow-sm group"
                  title="View sources"
                  @click="sourcesOpen = true"
                >
                  <BookOpen class="h-4 w-4" />
                </button>
                <button
                  class="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-gray-400 hover:text-brand hover:border-brand transition-all shadow-sm group"
                  @click="sidebarCollapsed = true; closeMobilePanel()"
                >
                  <ChevronRight class="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
             </div>
          </div>

          <!-- Tab Bar -->
          <div class="flex p-1 bg-gray-100/30 shrink-0 mx-4 mt-4 rounded-2xl border border-white">
            <button
              v-for="t in ['recommendations', 'details']"
              :key="t"
              :class="[
                'flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all',
                rightTab === t ? 'bg-white text-brand shadow-sm shadow-slate-200' : 'text-gray-400 hover:text-gray-600'
              ]"
              @click="rightTab = t"
            >
              {{ t }}
            </button>
          </div>

          <!-- Content Area -->
          <div class="flex-1 overflow-y-auto custom-scrollbar">
            <!-- RECOMMENDATIONS TAB -->
            <div v-show="rightTab === 'recommendations'" class="p-4 sm:p-6 space-y-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-2xl bg-brand/5 text-brand flex items-center justify-center shrink-0">
                    <Sparkles class="h-6 w-6" />
                  </div>
                  <div>
                    <h3 class="text-base font-black text-gray-900">Program Matches</h3>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{{ recs.length }} results identified</p>
                  </div>
                </div>
                <button
                  class="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-gray-400 hover:text-brand hover:border-brand transition-all shadow-sm"
                  @click="loadRecommendations"
                >
                  <RefreshCw class="h-4 w-4" :class="recsLoading ? 'animate-spin' : ''" />
                </button>
              </div>

              <p v-if="recsError" class="p-3 rounded-xl bg-red-50 text-xs text-red-600 font-medium">{{ recsError }}</p>

              <div v-if="recsLoading && !recs.length" class="space-y-4">
                <div v-for="i in 3" :key="i" class="glass-card p-5 animate-pulse">
                  <div class="h-4 bg-slate-200 rounded-full w-3/4 mb-3"></div>
                  <div class="h-3 bg-slate-100 rounded-full w-1/2"></div>
                </div>
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="r in recs"
                  :key="recKey(r)"
                  class="glass-card p-4 hover:shadow-premium transition-all duration-300 group border-white/60"
                >
                  <h4 class="font-bold text-gray-900 leading-tight group-hover:text-brand transition-colors mb-4">{{ r.program_name }}</h4>
                  
                  <div class="space-y-1.5">
                    <div 
                      v-for="(inst, instIdx) in r.institutions" 
                      :key="inst.program_id || instIdx"
                      class="flex items-center justify-between p-2 rounded-xl hover:bg-brand/5 cursor-pointer transition-colors"
                      @click="() => inst.program_id && openProgramDetails({...r, ...inst})"
                    >
                      <div class="min-w-0 flex-1 flex items-center gap-2">
                        <div class="h-1.5 w-1.5 rounded-full bg-brand/30"></div>
                        <span class="text-xs font-bold text-gray-600 truncate uppercase tracking-tight">{{ inst.institution_name }}</span>
                      </div>
                      <span
                        v-if="inst.eligibility?.eligible"
                        class="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100"
                      >Qualified</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Stretch Matches -->
              <div v-if="stretchRecs.length" class="pt-6 border-t border-white/80">
                 <h4 class="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">Aspirational Paths</h4>
                 <div class="space-y-3">
                   <div v-for="r in stretchRecs" :key="`s-${recKey(r)}`" class="p-3 rounded-2xl bg-orange-50/50 border border-orange-100 text-xs font-bold text-orange-800">
                     {{ r.program_name }}
                   </div>
                 </div>
               </div>
             </div>
 
             <!-- DETAILS TAB -->
            <div v-show="rightTab === 'details'" class="p-4 sm:p-6 h-full flex flex-col">
              <div v-if="programLoading" class="flex flex-col items-center justify-center py-20 gap-4">
                <div class="h-12 w-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
                <p class="text-xs font-black text-gray-400 uppercase tracking-widest">Analyzing Program...</p>
              </div>

              <div v-else-if="selectedProgram" class="space-y-6">
                <div>
                   <span class="inline-flex px-2 py-0.5 rounded-lg bg-brand/10 text-brand text-[9px] font-black uppercase tracking-widest mb-2">{{ selectedProgram.program_code }}</span>
                   <h3 class="text-xl font-black text-gray-900 leading-tight">{{ selectedProgram.program_name }}</h3>
                   <p class="text-sm font-bold text-gray-500 mt-1 uppercase tracking-tight">{{ selectedProgram.institution_name }}</p>
                </div>

                <div v-if="selectedProgram.description" class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                   <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">About</h4>
                   <p class="text-xs text-gray-600 leading-relaxed">{{ selectedProgram.description }}</p>
                </div>

                <!-- Eligibility & Requirements -->
                <div v-if="selectedProgram.requirement_groups?.length" class="space-y-3">
                  <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">KCSE Requirements</h4>
                  <div class="space-y-2">
                    <div 
                      v-for="(grp, gidx) in selectedProgram.requirement_groups" 
                      :key="gidx"
                      class="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">{{ grp.name || `Subject Group ${gidx + 1}` }}</span>
                        <span class="text-[9px] font-black text-brand bg-brand/5 px-2 py-0.5 rounded-lg">Pick {{ grp.pick }}</span>
                      </div>
                      <div class="flex flex-wrap gap-2">
                         <div 
                           v-for="(opt, oidx) in grp.options" 
                           :key="oidx"
                           class="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"
                         >
                            <span class="text-[10px] font-black text-gray-700">{{ opt.subject_code }}</span>
                            <span class="text-[10px] font-black text-indigo-600">{{ opt.min_grade }}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Cutoffs -->
                <div v-if="selectedProgram.cutoffs?.length" class="space-y-3">
                  <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">KUCCPS Cutoff History</h4>
                  <div class="grid grid-cols-2 gap-2">
                    <div 
                      v-for="c in selectedProgram.cutoffs.slice(0, 4)" 
                      :key="c.year"
                      class="p-3 rounded-2xl bg-indigo-50/30 border border-indigo-100/50 flex flex-col gap-1"
                    >
                      <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{{ c.year }}</span>
                      <span class="text-base font-black text-indigo-700">{{ c.cutoff }}</span>
                    </div>
                  </div>
                </div>

                <!-- Costs (conditional) -->
                <div v-if="selectedProgram.costs?.length" class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <h4 class="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Estimated Annual Fee</h4>
                  <p class="text-xl font-black text-emerald-700">
                    {{ selectedProgram.costs[0].currency }} {{ selectedProgram.costs[0].amount?.toLocaleString() }}
                  </p>
                  <p v-if="selectedProgram.costs[0].updated_at" class="text-[8px] text-emerald-600/40 font-bold uppercase tracking-widest mt-1">Source: {{ selectedProgram.costs[0].source_id || 'Institutional Data' }}</p>
                </div>

                <!-- Career Path Visualization -->
                <div v-if="careerPath" class="space-y-4">
                  <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Career Progression</h4>
                  <div class="bg-white/40 rounded-3xl p-4 border border-white">
                    <CareerPath :path="careerPath" />
                  </div>
                </div>
              </div>

              <div v-else-if="programError" class="p-6 text-center space-y-4">
                 <div class="h-16 w-16 mx-auto rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <Info class="h-8 w-8" />
                 </div>
                 <div>
                    <h4 class="text-sm font-black text-gray-900">Failed to load details</h4>
                    <p class="text-xs text-red-500 mt-1">{{ programError }}</p>
                 </div>
                 <button 
                    class="btn-outline btn-sm w-full"
                    @click="selectedProgram = null; programError = ''"
                 >Try again</button>
              </div>

              <div v-else class="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-40">
                 <div class="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Plus class="h-8 w-8 rotate-45" />
                 </div>
                 <div>
                    <h4 class="text-sm font-black text-gray-900 uppercase tracking-widest">No Details Selected</h4>
                    <p class="text-[10px] text-gray-500 mt-1 font-bold">Select a program to view depth analysis</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
    <!-- Sources Bottom Drawer -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div v-if="sourcesOpen" class="fixed inset-0 z-[60] flex items-end justify-center sm:p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="sourcesOpen = false"></div>
        
        <div class="relative w-full max-w-4xl bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border-t border-white overflow-hidden max-h-[80vh] flex flex-col">
          <!-- Drawer Header -->
          <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div class="flex items-center gap-4">
              <div class="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                <BookOpen class="h-7 w-7" />
              </div>
              <div>
                <h3 class="text-xl font-black text-gray-900">Information Sources</h3>
                <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">{{ citedSources.length }} references utilized in response</p>
              </div>
            </div>
            <button 
              @click="sourcesOpen = false" 
              class="h-10 w-10 rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all flex items-center justify-center"
            >
              <ChevronDown class="h-6 w-6" />
            </button>
          </div>

          <!-- Drawer Content -->
          <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <!-- Citations -->
              <div class="lg:col-span-2 space-y-6">
                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Knowledge Citations</h4>
                <div v-if="!citedSources.length" class="flex flex-col items-center justify-center py-20 text-center opacity-30">
                   <Info class="h-12 w-12 mb-4" />
                   <p class="text-sm font-bold">No active citations for this message</p>
                </div>
                <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div 
                     v-for="s in citedSources" 
                     :key="s.citation" 
                     class="glass-card p-5 border-white shadow-sm hover:shadow-md transition-all duration-300"
                   >
                      <div class="flex items-center gap-2 mb-3">
                         <span class="px-2.5 py-1 rounded-xl bg-brand text-white text-[10px] font-black shadow-brand/20">{{ s.citation }}</span>
                         <h5 class="text-xs font-black text-gray-900 truncate">{{ s.title || 'Institutional Dataset' }}</h5>
                      </div>
                      <p class="text-xs text-gray-600 leading-relaxed italic line-clamp-4">"{{ s.snippet || 'Referenced institutional overview, eligibility criteria, and program specifications.' }}"</p>
                   </div>
                </div>
              </div>

              <!-- Context -->
              <div class="space-y-6">
                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Internal Context</h4>
                <div class="p-6 rounded-[2rem] bg-slate-900 text-[11px] font-mono text-emerald-400/80 leading-relaxed shadow-xl border border-slate-800">
                  <div class="flex items-center justify-between border-b border-emerald-900/50 pb-3 mb-4">
                     <span class="opacity-50">FSM_STATE</span>
                     <span class="font-black text-emerald-300 text-sm tracking-wider">{{ conversation.fsm_state || 'IDLE' }}</span>
                  </div>
                  
                  <div class="space-y-3">
                    <p class="text-[9px] opacity-40 font-bold uppercase tracking-widest mb-2">Collected Slots</p>
                    <div v-if="Object.keys(conversation.slots || {}).length" class="space-y-2">
                       <div v-for="(v, k) in conversation.slots" :key="k" class="flex flex-col gap-1">
                          <span class="opacity-50 text-[10px]">{{ k }}</span>
                          <span class="text-emerald-300 font-bold bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-900/50">{{ v }}</span>
                       </div>
                    </div>
                    <div v-else class="opacity-30 italic py-4 text-center">No active slots.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
</style>
