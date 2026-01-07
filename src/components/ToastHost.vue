<script setup>
import { computed } from 'vue'
import { toastState, dismissToast } from '../utils/toast'

const toasts = computed(() => {
  return Array.isArray(toastState.toasts) ? toastState.toasts : []
})

function tone(t) {
  const type = String(t?.type || 'info')
  if (type === 'success') return { ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-900', sub: 'text-emerald-800' }
  if (type === 'error') return { ring: 'ring-red-200', bg: 'bg-red-50', text: 'text-red-900', sub: 'text-red-800' }
  return { ring: 'ring-slate-200', bg: 'bg-white', text: 'text-slate-900', sub: 'text-slate-700' }
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(92vw,26rem)] flex-col gap-2">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="pointer-events-auto rounded-2xl border bg-white p-3 shadow-lg ring-4"
      :class="[tone(t).ring, tone(t).bg]"
      role="status"
      aria-live="polite"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div v-if="t.title" class="text-sm font-semibold" :class="tone(t).text">{{ t.title }}</div>
          <div class="text-sm" :class="tone(t).sub">{{ t.message }}</div>
        </div>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-black/5"
          aria-label="Dismiss"
          @click="dismissToast(t.id)"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
