<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Building2, ExternalLink, MapPin } from 'lucide-vue-next'
import { etlGetInstitutions } from '../lib/api'
import { useApiCall } from '../utils/useApiCall'

const router = useRouter()

const { loading, error, run, clearError } = useApiCall({ toastErrors: true })
const q = ref('')
const region = ref('')
const county = ref('')
const data = ref({ count: 0, results: [] })

const searchDelayMs = 250
let searchTimer = null
let activeRequestId = 0

async function load ({ clearResults = false } = {}) {
  const requestId = ++activeRequestId
  clearError()
  if (clearResults) {
    data.value = { count: 0, results: [] }
  }
  const res = await run(async () => {
    return etlGetInstitutions({
      q: (q.value || '').trim(),
      region: (region.value || '').trim(),
      county: (county.value || '').trim(),
    })
  }, { fallbackMessage: 'Failed to load institutions', silent: true })
  if (requestId !== activeRequestId) return
  if (!res) return
  data.value = res || { count: 0, results: [] }
}

function scheduleLoad () {
  if (searchTimer) clearTimeout(searchTimer)
  const requestId = ++activeRequestId
  clearError()
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
  <main class="min-h-screen bg-slate-50/50 pb-20 relative">
    <!-- background decor -->
    <div class="absolute top-0 right-0 -z-10 w-1/3 h-1/3 bg-brand/5 blur-[120px] rounded-full"></div>
    <div class="absolute bottom-10 left-10 -z-10 w-1/4 h-1/4 bg-brand/5 blur-[100px] rounded-full"></div>

    <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6">
      <div class="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-black text-gray-900 tracking-tight">Institutions</h1>
          <p class="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">KUCCPS Academic Network</p>
        </div>
        <button 
          class="h-11 px-6 rounded-2xl bg-white border border-slate-200 font-black text-slate-600 text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm hover:border-brand hover:text-brand transition-all"
          @click="openChat"
        >
          <Building2 class="h-4 w-4" />
          Ask in Chat
        </button>
      </div>

      <!-- Filters -->
      <div class="glass-card-premium p-6 sm:p-8 mb-8">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div class="md:col-span-6">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Search Database</label>
            <div class="relative group">
              <Search class="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand transition-colors" />
              <input 
                v-model="q" 
                class="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/60 border border-white focus:outline-none focus:border-brand/30 focus:ring-4 focus:ring-brand/5 transition-all text-sm font-bold text-gray-900 placeholder:text-gray-400 shadow-sm" 
                placeholder="e.g., Kenyatta, Kabarak" 
              />
            </div>
          </div>

          <div class="md:col-span-3">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Region</label>
            <div class="relative group">
              <MapPin class="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand transition-colors" />
              <input 
                v-model="region" 
                class="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/60 border border-white focus:outline-none focus:border-brand/30 focus:ring-4 focus:ring-brand/5 transition-all text-sm font-bold text-gray-900 placeholder:text-gray-400 shadow-sm" 
                placeholder="Region" 
              />
            </div>
          </div>

          <div class="md:col-span-3">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">County</label>
            <div class="relative group">
              <MapPin class="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand transition-colors" />
              <input 
                v-model="county" 
                class="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/60 border border-white focus:outline-none focus:border-brand/30 focus:ring-4 focus:ring-brand/5 transition-all text-sm font-bold text-gray-900 placeholder:text-gray-400 shadow-sm" 
                placeholder="County" 
              />
            </div>
          </div>
        </div>

        <div class="mt-6 flex items-center gap-3">
          <div class="h-px flex-1 bg-brand/5"></div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span v-if="loading" class="flex items-center gap-2">
              <div class="h-1.5 w-1.5 rounded-full bg-brand animate-pulse"></div>
              Querying...
            </span>
            <span v-else>{{ data?.count || 0 }} Results Identified</span>
          </div>
          <div class="h-px flex-1 bg-brand/5"></div>
        </div>
      </div>

      <p v-if="error" class="mb-6 p-4 rounded-2xl bg-red-50 text-xs text-red-600 font-medium border border-red-100">{{ error }}</p>

      <!-- Results Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-if="loading && !(data?.results || []).length" v-for="i in 9" :key="i" class="glass-card p-6 animate-pulse border-white/60">
          <div class="h-4 bg-slate-200 rounded-full w-3/4 mb-4"></div>
          <div class="h-3 bg-slate-100 rounded-full w-1/2 mb-6"></div>
          <div class="flex justify-between items-end">
             <div class="h-8 w-8 bg-slate-100 rounded-xl"></div>
             <div class="h-8 w-24 bg-slate-200 rounded-xl"></div>
          </div>
        </div>

        <div
          v-for="(inst, idx) in (data?.results || [])"
          :key="`${inst.code || ''}:${inst.name || ''}:${idx}`"
          class="glass-card p-6 hover:shadow-premium transition-all duration-300 group border-white/60 cursor-pointer flex flex-col items-stretch"
          @click="openInstitution(inst)"
        >
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="h-10 w-10 rounded-2xl bg-brand/5 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-all">
               <Building2 class="h-5 w-5" />
            </div>
            <span v-if="inst.code" class="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 font-mono text-[10px] font-black tracking-tighter">{{ inst.code }}</span>
          </div>

          <h3 class="font-black text-gray-900 leading-tight group-hover:text-brand transition-colors mb-3 h-10 line-clamp-2">
            {{ inst.name }}
          </h3>

          <div class="mt-auto space-y-3">
            <div class="flex flex-wrap gap-1.5">
               <span v-if="inst.region" class="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-500 text-[9px] font-black uppercase tracking-widest">{{ inst.region }}</span>
               <span v-if="inst.county" class="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-500 text-[9px] font-black uppercase tracking-widest">{{ inst.county }}</span>
               <span v-if="inst.alias" class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">AKA: {{ inst.alias }}</span>
            </div>

            <div class="pt-3 border-t border-brand/5 flex items-center justify-between">
               <div class="flex items-center gap-1.5 text-slate-400 group-hover:text-brand transition-colors">
                  <span class="text-[10px] font-black uppercase tracking-widest">Explore details</span>
                  <ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
               </div>
               <a
                 v-if="inst.website"
                 :href="inst.website"
                 target="_blank"
                 rel="noopener"
                 class="h-8 px-4 rounded-xl bg-slate-50 text-slate-400 hover:bg-brand hover:text-white transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest shadow-sm"
                 @click.stop
               >
                 <ExternalLink class="h-3.5 w-3.5" />
                 Open
               </a>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!loading && !(data?.results || []).length" class="text-center py-20 glass-card border-dashed">
         <div class="h-16 w-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Search class="h-8 w-8" />
         </div>
         <h4 class="text-lg font-black text-gray-900 uppercase tracking-widest">No Matches Found</h4>
         <p class="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Try refining your search terms</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.glass-card-premium {
  @apply bg-white/70 backdrop-blur-2xl border-2 border-white rounded-[2rem] shadow-xl shadow-slate-200/50;
}
</style>
