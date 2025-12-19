<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { convGetSession, convPostMessage } from '../lib/api'

function uuidv4 () {
  if (crypto?.randomUUID) return crypto.randomUUID()
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const sessionId = ref(localStorage.getItem('conv_session_id') || uuidv4())
const input = ref('')
const sending = ref(false)
const error = ref('')
const conversation = ref({ id: '', fsm_state: '', messages: [], slots: {} })
const scroller = ref(null)

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
      <p class="text-sm text-gray-600">Session: <span class="font-mono">{{ sessionId }}</span> · State: <span class="font-mono">{{ conversation.fsm_state }}</span></p>

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
