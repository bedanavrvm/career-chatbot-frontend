<script setup>
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Search, GraduationCap, MapPin } from 'lucide-vue-next'
import { etlGetPrograms } from '../lib/api'
import { useApiCall } from '../utils/useApiCall'

const router = useRouter()

const { loading, error, run, clearError } = useApiCall({ toastErrors: true })
const q = ref('')
const level = ref('bachelor')
const region = ref('')
const page = ref(1)
const pageSize = ref(20)

const searchDelayMs = 250
let searchTimer = null
let activeRequestId = 0

const data = ref({ count: 0, page: 1, page_size: 20, results: [] })

const totalPages = computed(() => {
  const c = Number(data.value?.count || 0)
  const ps = Number(data.value?.page_size || pageSize.value || 20)
  return Math.max(1, Math.ceil(c / Math.max(1, ps)))
})

async function load ({ requestId = ++activeRequestId } = {}) {
  clearError()
  const res = await run(async () => {
    return etlGetPrograms({
      q: (q.value || '').trim(),
      level: level.value,
      region: (region.value || '').trim(),
      page: page.value,
      page_size: pageSize.value,
    })
  }, { fallbackMessage: 'Failed to load programs', silent: true })
  if (requestId !== activeRequestId) return
  if (!res) return
  data.value = res || { count: 0, page: page.value, page_size: pageSize.value, results: [] }
}

function scheduleLoad ({ resetPage = false } = {}) {
  if (searchTimer) clearTimeout(searchTimer)
  if (resetPage) page.value = 1
  const requestId = ++activeRequestId
  clearError()
  data.value = { count: 0, page: page.value, page_size: pageSize.value, results: [] }
  searchTimer = setTimeout(() => {
    load({ requestId })
  }, searchDelayMs)
}

function openChat () {
  router.push({ name: 'chat' })
}

function goPrev () {
  if (searchTimer) clearTimeout(searchTimer)
  page.value = Math.max(1, Number(page.value || 1) - 1)
  load()
}

function goNext () {
  if (searchTimer) clearTimeout(searchTimer)
  page.value = Math.min(totalPages.value, Number(page.value || 1) + 1)
  load()
}

watch(q, () => scheduleLoad({ resetPage: true }))
watch([level, region], () => scheduleLoad({ resetPage: true }))

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

onMounted(load)
</script>

<template>
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Programmes</h1>
        <p class="text-sm text-gray-600">Browse KUCCPS programmes from the processed catalog.</p>
      </div>
      <button class="btn btn-outline btn-md gap-2" type="button" title="Go to chat" aria-label="Go to chat" @click="openChat">
        <GraduationCap class="h-4 w-4" />
        <span class="hidden sm:inline">Ask in Chat</span>
        <span class="sr-only sm:hidden">Ask in Chat</span>
      </button>
    </div>

    <div class="mt-6 card p-4">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div class="md:col-span-6">
          <label class="label">Search</label>
          <div class="mt-1 relative">
            <Search class="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input v-model="q" class="input input-md pl-9" placeholder="e.g., nursing, engineering, architecture" />
          </div>
        </div>

        <div class="md:col-span-3">
          <label class="label">Level</label>
          <select v-model="level" class="input input-md mt-1">
            <option value="">Any</option>
            <option value="bachelor">Bachelor</option>
            <option value="diploma">Diploma</option>
            <option value="certificate">Certificate</option>
          </select>
        </div>

        <div class="md:col-span-3">
          <label class="label">Region</label>
          <div class="mt-1 relative">
            <MapPin class="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input v-model="region" class="input input-md pl-9" placeholder="e.g., Nairobi, Rift Valley" />
          </div>
        </div>

        <div class="md:col-span-12 flex items-center gap-3 pt-1">
          <div class="text-sm text-gray-600">
            <span v-if="loading">Loading…</span>
            <span v-else>Showing {{ (data?.results || []).length }} of {{ data?.count || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-6 grid grid-cols-1 gap-3">
      <div v-if="loading && !(data?.results || []).length" class="grid grid-cols-1 gap-3">
        <div v-for="i in 6" :key="i" class="card p-4 animate-pulse">
          <div class="h-4 w-2/3 bg-gray-200 rounded"></div>
          <div class="mt-2 h-3 w-1/2 bg-gray-200 rounded"></div>
          <div class="mt-3 h-3 w-3/4 bg-gray-100 rounded"></div>
        </div>
      </div>

      <div v-for="(p, idx) in (data?.results || [])" :key="(p.source_index ?? `${p.program_code || ''}:${p.institution_name || ''}:${idx}`)" class="card p-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="font-semibold text-gray-900">{{ p.normalized_name || p.name }}</div>
            <div class="text-sm text-gray-600">{{ p.institution_name }}</div>
            <div class="text-xs text-gray-500 mt-1">
              <span v-if="p.field_name">{{ p.field_name }}</span>
              <span v-if="p.field_name && (p.level || p.region)"> · </span>
              <span v-if="p.level">{{ p.level }}</span>
              <span v-if="p.level && p.region"> · </span>
              <span v-if="p.region">{{ p.region }}</span>
            </div>
          </div>
          <div class="text-right text-xs text-gray-600">
            <div v-if="p.program_code" class="font-mono">{{ p.program_code }}</div>
            <div v-if="p.award" class="mt-1">Award: {{ p.award }}</div>
          </div>
        </div>
      </div>

      <div v-if="!loading && !(data?.results || []).length" class="text-sm text-gray-600">
        No programmes found. Try a different query.
      </div>
    </div>

    <div class="mt-6 flex items-center justify-between">
      <button class="btn btn-outline btn-md" type="button" :disabled="loading || page <= 1" @click="goPrev">Prev</button>
      <div class="text-sm text-gray-600">Page {{ data?.page || page }} of {{ totalPages }}</div>
      <button class="btn btn-outline btn-md" type="button" :disabled="loading || (data?.page || page) >= totalPages" @click="goNext">Next</button>
    </div>
  </main>
</template>
