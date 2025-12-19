<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { convGetSession, convPostMessage, convDeleteSession } from '../lib/api'

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
  localStorage.setItem('conv_session_id', sessionId.value)
  conversation.value = { id: '', fsm_state: '', messages: [], slots: {} }
  await loadSession()
}

async function clearSession () {
  try {
    await convDeleteSession(sessionId.value)
  } catch (_) {}
  // Recreate the same session id for continuity
  conversation.value = { id: '', fsm_state: '', messages: [], slots: {} }
  await loadSession()
}

const sessionId = ref(localStorage.getItem('conv_session_id') || uuidv4())
const input = ref('')
const sending = ref(false)
const error = ref('')
const conversation = ref({ id: '', fsm_state: '', messages: [], slots: {} })
const scroller = ref(null)

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

async function loadSession () {
  try {
    const data = await convGetSession(sessionId.value)
    conversation.value = data
    localStorage.setItem('conv_session_id', sessionId.value)
    await nextTick(); scrollToBottom()
  } catch (e) {
    error.value = e?.message || 'Failed to load session'
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
    const resp = await convPostMessage(sessionId.value, { text, idempotencyKey: `${Date.now()}` })
    conversation.value = resp.session
    input.value = ''
    await nextTick(); scrollToBottom()
  } catch (e) {
    error.value = e?.message || 'Failed to send message'
  } finally {
    sending.value = false
  }
}

onMounted(loadSession)
</script>

<template>
  <main class="container-page py-6">
    <div class="max-w-3xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-900">Conversation</h1>
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-1">
        <p class="text-sm text-gray-600">
          Session: <span class="font-mono">{{ sessionId }}</span>
          · State: <span class="font-mono">{{ conversation.fsm_state }}</span>
          · LLM: <span class="font-semibold">{{ mode }}</span>
          <span v-if="modeError" class="text-red-600"> (provider error: {{ modeError }})</span>
        </p>
        <div class="flex gap-2">
          <button class="btn btn-outline btn-sm" @click="newSession">New session</button>
          <button class="btn btn-outline btn-sm" @click="clearSession">Clear session</button>
        </div>
      </div>

      <div ref="scroller" class="mt-4 h-[60vh] overflow-y-auto border rounded-xl p-4 bg-white/60">
        <div v-for="(m, idx) in conversation.messages" :key="idx" class="mb-3">
          <div :class="['text-xs mb-1', m.role === 'assistant' ? 'text-brand-dark' : 'text-gray-500']">{{ m.role }}</div>
          <div :class="['rounded-2xl px-4 py-2 whitespace-pre-wrap', m.role === 'assistant' ? 'bg-brand/10' : 'bg-gray-100']">{{ m.content }}</div>
        </div>
      </div>

      <form class="mt-4 flex gap-2" @submit.prevent="sendMessage">
        <input v-model="input" type="text" class="input flex-1" placeholder="Type a message... e.g., Math A-, English B+" />
        <button class="btn btn-primary" :disabled="sending">{{ sending ? 'Sending…' : 'Send' }}</button>
      </form>

      <p v-if="error" class="text-sm text-red-600 mt-2">{{ error }}</p>

      <div class="mt-4 text-xs text-gray-500">
        Tips: Share some grades (e.g., "Math A-, English B+"), then your interests (e.g., "I enjoy coding").
      </div>
    </div>
  </main>
</template>
