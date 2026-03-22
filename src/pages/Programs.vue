<script setup>
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Search, GraduationCap, MapPin, BookOpen, ChevronLeft, ChevronRight, MessageSquare, Sparkles } from 'lucide-vue-next'
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

function openProgram (p) {
  const id = Number(p?.id)
  if (!Number.isFinite(id) || id <= 0) return
  router.push({ name: 'program_details', params: { id: String(id) } })
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
  <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/60 relative">
    <!-- background decor -->
    <div class="absolute top-0 right-0 -z-10 w-1/3 h-1/3 bg-brand/5 blur-[120px] rounded-full"></div>
    <div class="absolute bottom-10 left-10 -z-10 w-1/4 h-1/4 bg-brand/5 blur-[100px] rounded-full"></div>

    <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <div>
        <h1 class="text-3xl font-black text-gray-900 tracking-tight sm:text-4xl">Programmes</h1>
        <p class="text-gray-500 mt-1 flex items-center gap-2">
          Discover your future in the KUCCPS catalog
          <span class="inline-flex h-2 w-2 rounded-full bg-brand/40"></span>
        </p>
      </div>

      <button
        class="btn-outline btn-md gap-2 border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm"
        @click="openChat"
      >
        <MessageSquare class="h-4 w-4 text-brand" />
        <span>Ask Gemini</span>
      </button>
    </header>

    <!-- Filters Section -->
    <section class="glass-card p-6 shadow-lg shadow-slate-200/50 mb-8">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div class="md:col-span-6">
          <label class="text-[11px] font-black text-brand uppercase tracking-widest ml-1">Search Keywords</label>
          <div class="mt-2 relative group">
            <Search class="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand transition-colors" />
            <input 
              v-model="q" 
              class="block w-full rounded-2xl border-2 border-gray-100 bg-white/50 px-4 py-3 pl-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all shadow-inner" 
              placeholder="e.g., Nursing, Software Engineering..." 
            />
          </div>
        </div>

        <div class="md:col-span-3">
          <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Academic Level</label>
          <select v-model="level" class="block w-full rounded-2xl border-2 border-gray-100 bg-white/50 px-4 py-3 mt-2 text-sm focus:outline-none focus:border-brand transition-all shadow-inner">
            <option value="">Any Level</option>
            <option value="bachelor">Bachelor's Degree</option>
            <option value="diploma">Diploma</option>
            <option value="certificate">Certificate</option>
          </select>
        </div>

        <div class="md:col-span-3">
          <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Region</label>
          <div class="mt-2 relative">
            <MapPin class="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input v-model="region" class="block w-full rounded-2xl border-2 border-gray-100 bg-white/50 px-4 py-3 pl-12 text-sm focus:outline-none focus:border-brand transition-all shadow-inner" placeholder="e.g., Nairobi" />
          </div>
        </div>
      </div>

      <div class="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
        <div class="text-sm font-medium text-gray-500">
          <span v-if="loading" class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-brand animate-ping"></span>
            Syncing catalog...
          </span>
          <span v-else class="text-gray-400">Found <span class="text-gray-900 font-bold">{{ data?.count || 0 }}</span> active programmes</span>
        </div>
      </div>
    </section>

    <p v-if="error" class="mb-6 p-4 rounded-xl bg-red-50 text-sm text-red-600 border border-red-100">{{ error }}</p>

    <!-- Results List -->
    <div class="grid grid-cols-1 gap-4">
      <!-- Loading State -->
      <div v-if="loading && !(data?.results || []).length" class="contents">
        <div v-for="i in 5" :key="i" class="glass-card p-6 animate-pulse border-none">
          <div class="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
          <div class="h-3 bg-slate-100 rounded w-1/4"></div>
        </div>
      </div>

      <!-- Programme Cards -->
      <div
        v-for="(p, idx) in (data?.results || [])"
        :key="(p.source_index ?? `${p.program_code || ''}:${p.institution_name || ''}:${idx}`)"
        class="glass-card p-5 group cursor-pointer hover:shadow-premium hover:-translate-y-1 transition-all duration-300 border-none relative overflow-hidden"
        @click="openProgram(p)"
      >
        <div class="flex items-start gap-5 relative z-10">
          <div class="h-12 w-12 rounded-2xl bg-brand/5 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-all duration-500 shadow-inner">
            <BookOpen v-if="p.level === 'bachelor'" class="h-6 w-6" />
            <GraduationCap v-else class="h-6 w-6" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-4">
              <h3 class="text-lg font-bold text-gray-900 truncate group-hover:text-brand transition-colors">
                {{ p.normalized_name || p.name }}
              </h3>
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                {{ p.program_code }}
              </span>
            </div>
            
            <p class="text-sm font-medium text-gray-600 mt-1 flex items-center gap-1.5 capitalize">
              {{ p.institution_name.toLowerCase() }}
            </p>

            <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div v-if="p.region" class="flex items-center gap-1.5 text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-lg">
                <MapPin class="h-3 w-3" />
                {{ p.region }}
              </div>
              <div v-if="p.level" class="flex items-center gap-1.5 text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-lg capitalize">
                <GraduationCap class="h-3 w-3" />
                {{ p.level }}
              </div>
              <div v-if="p.award" class="flex items-center gap-1.5 text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-lg">
                <Sparkles class="h-3 w-3" />
                {{ p.award }}
              </div>
            </div>
          </div>

          <div class="hidden sm:flex self-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
            <ChevronRight class="h-6 w-6 text-brand" />
          </div>
        </div>

        <!-- Ghost Background Text/Icon -->
        <div class="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform duration-700 select-none">
          <h4 class="text-8xl font-black italic">{{ p.program_code?.slice(-2) }}</h4>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && !(data?.results || []).length" class="text-center py-20 glass-card">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-4">
          <Search class="h-8 w-8" />
        </div>
        <h3 class="text-lg font-bold text-gray-900">No programmes matched</h3>
        <p class="text-sm text-gray-500 mt-1">Try adjusting your filters or search keywords.</p>
      </div>
    </div>

    <!-- Pagination -->
    <footer class="mt-12 flex items-center justify-between">
      <button 
        class="btn-outline btn-md gap-2 border-gray-200 bg-white/50 backdrop-blur-sm disabled:opacity-30" 
        :disabled="loading || page <= 1" 
        @click="goPrev"
      >
        <ChevronLeft class="h-4 w-4" />
        Prev
      </button>
      
      <div class="flex items-center gap-2">
        <div v-for="p_idx in 3" :key="p_idx" class="h-1.5 w-1.5 rounded-full" :class="p_idx === 1 ? 'bg-brand' : 'bg-gray-200'"></div>
        <span class="text-xs font-black text-gray-400 uppercase ml-2 tracking-widest">Page {{ data?.page || page }} of {{ totalPages }}</span>
      </div>

      <button 
        class="btn-outline btn-md gap-2 border-gray-200 bg-white/50 backdrop-blur-sm disabled:opacity-30 font-bold text-gray-900" 
        :disabled="loading || (data?.page || page) >= totalPages" 
        @click="goNext"
      >
        Next
        <ChevronRight class="h-4 w-4" />
      </button>
    </footer>
  </main>
</template>
