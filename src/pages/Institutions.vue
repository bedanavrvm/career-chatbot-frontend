<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Building2, ExternalLink, MapPin } from 'lucide-vue-next'
import { etlGetInstitutions } from '../lib/api'

const router = useRouter()

const loading = ref(false)
const error = ref('')
const q = ref('')
const region = ref('')
const county = ref('')
const data = ref({ count: 0, results: [] })

const searchDelayMs = 250
let searchTimer = null
let activeRequestId = 0

async function load ({ clearResults = false } = {}) {
  const requestId = ++activeRequestId
  try {
    loading.value = true
    error.value = ''
    if (clearResults) {
      data.value = { count: 0, results: [] }
    }
    const res = await etlGetInstitutions({
      q: (q.value || '').trim(),
      region: (region.value || '').trim(),
      county: (county.value || '').trim(),
    })
    if (requestId !== activeRequestId) return
    data.value = res || { count: 0, results: [] }
  } catch (e) {
    if (requestId !== activeRequestId) return
    error.value = e?.message || 'Failed to load institutions'
  } finally {
    if (requestId === activeRequestId) loading.value = false
  }
}

function scheduleLoad () {
  if (searchTimer) clearTimeout(searchTimer)
  const requestId = ++activeRequestId
  error.value = ''
  loading.value = true
  data.value = { count: 0, results: [] }
  searchTimer = setTimeout(() => {
    load({ clearResults: false, requestId })
  }, searchDelayMs)
}

function openChat () {
  router.push({ name: 'chat' })
}

function openInstitution (inst) {
  const code = String(inst?.code || '').trim()
  if (!code) return
  router.push({ name: 'institution_details', params: { code } })
}

watch([q, region, county], scheduleLoad)

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

onMounted(load)
</script>

<template>
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Institutions</h1>
        <p class="text-sm text-gray-600">Browse institutions in the KUCCPS catalog database.</p>
      </div>
      <button class="btn btn-outline btn-md gap-2" type="button" title="Go to chat" aria-label="Go to chat" @click="openChat">
        <Building2 class="h-4 w-4" />
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
            <input v-model="q" class="input input-md pl-9" placeholder="e.g., Kenyatta, Kabarak" />
          </div>
        </div>

        <div class="md:col-span-3">
          <label class="label">Region</label>
          <div class="mt-1 relative">
            <MapPin class="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input v-model="region" class="input input-md pl-9" placeholder="e.g., Nairobi" />
          </div>
        </div>

        <div class="md:col-span-3">
          <label class="label">County</label>
          <div class="mt-1 relative">
            <MapPin class="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input v-model="county" class="input input-md pl-9" placeholder="e.g., Kiambu" />
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
      <div
        v-for="(inst, idx) in (data?.results || [])"
        :key="`${inst.code || ''}:${inst.name || ''}:${idx}`"
        class="card p-4 cursor-pointer"
        role="button"
        tabindex="0"
        @click="openInstitution(inst)"
        @keydown.enter.prevent="openInstitution(inst)"
        @keydown.space.prevent="openInstitution(inst)"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="font-semibold text-gray-900">{{ inst.name }}</div>
            <div class="text-sm text-gray-600">
              <span v-if="inst.code" class="font-mono">{{ inst.code }}</span>
              <span v-if="inst.code && (inst.region || inst.county)"> · </span>
              <span v-if="inst.region">{{ inst.region }}</span>
              <span v-if="inst.region && inst.county"> · </span>
              <span v-if="inst.county">{{ inst.county }}</span>
            </div>
            <div v-if="inst.alias" class="text-xs text-gray-500 mt-1">Alias: {{ inst.alias }}</div>
          </div>
          <a
            v-if="inst.website"
            class="btn btn-outline btn-sm gap-2 shrink-0"
            :href="inst.website"
            target="_blank"
            rel="noopener"
            title="Open website"
            aria-label="Open website"
            @click.stop
          >
            <ExternalLink class="h-4 w-4" />
            <span class="hidden sm:inline">Website</span>
            <span class="sr-only sm:hidden">Website</span>
          </a>
        </div>
      </div>

      <div v-if="!loading && !(data?.results || []).length" class="text-sm text-gray-600">
        No institutions found. Try a different query.
      </div>
    </div>
  </main>
</template>
