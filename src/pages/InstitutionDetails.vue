<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  GraduationCap, 
  MapPin, 
  Building2, 
  Layers, 
  History,
  Globe,
  Compass,
  ArrowRight
} from 'lucide-vue-next'
import { catalogGetInstitution } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'

const route = useRoute()
const router = useRouter()

const { user, getIdToken } = useAuth()
const { loading, error, run } = useApiCall({ toastErrors: true })

const inst = ref(null)

const institutionCode = computed(() => {
  const v = route.params?.code
  return String(v || '').trim()
})

async function load() {
  inst.value = null
  if (!institutionCode.value) return

  const data = await run(async () => {
    const u = user.value
    const token = u ? await getIdToken(true) : ''
    return catalogGetInstitution(token, institutionCode.value)
  }, { fallbackMessage: 'Failed to load institution' })

  if (data) inst.value = data
}

onMounted(load)

const title = computed(() => inst.value?.name || 'Institution Detail')

const campuses = computed(() => {
  const c = inst.value?.campuses
  return Array.isArray(c) ? c : []
})

const mainCampus = computed(() => {
  const c = campuses.value
  return c.find((x) => x?.is_main) || c[0] || null
})

const branchCampuses = computed(() => {
  const c = campuses.value
  const main = mainCampus.value
  return c.filter((x) => x && x !== main)
})

function mapsLinkForCampus(c) {
  const q = String(c?.map_query || c?.campus || '').trim()
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : ''
}

const embeddedMapUrl = computed(() => {
  const q = String(mainCampus.value?.map_query || '').trim()
  return q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed` : ''
})

const hasAside = computed(() => {
  const m = inst.value?.metadata
  return !!(m && typeof m === 'object' && Object.keys(m).length)
})

function programLabel(p) {
  const name = p?.name || p?.normalized_name || ''
  const level = (p?.level || '').trim()
  return level ? `${name} (${level})` : name
}

function campusLabel(c) {
  const raw = [
    String(c?.campus || '').trim(),
    String(c?.town || '').trim(),
    String(c?.county || '').trim(),
    String(c?.region || '').trim(),
  ].filter(Boolean)
  const seen = new Set()
  const parts = []
  for (const p of raw) {
    const k = p.toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    parts.push(p)
  }
  return parts.join(' · ')
}
</script>

<template>
  <main class="min-h-screen bg-slate-50/50 pb-20 relative">
    <!-- background decor -->
    <div class="absolute top-0 right-0 -z-10 w-1/3 h-1/3 bg-brand/5 blur-[120px] rounded-full"></div>
    <div class="absolute bottom-10 left-10 -z-10 w-1/4 h-1/4 bg-brand/5 blur-[100px] rounded-full"></div>

    <!-- Header -->
    <header class="bg-white/80 backdrop-blur-xl border-b border-white sticky top-0 z-30 px-4 py-4 sm:px-6">
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <button 
            @click="router.back()" 
            class="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-gray-500 hover:text-brand hover:border-brand transition-all shadow-sm group"
          >
            <ArrowLeft class="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-xl font-black text-gray-900 leading-tight">{{ title }}</h1>
              <span v-if="inst?.alias" class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase tracking-widest border border-emerald-100/50 shadow-sm">
                {{ inst.alias }}
              </span>
            </div>
            <p v-if="inst" class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
              {{ inst.code }} · {{ inst.region }} · {{ inst.county }}
            </p>
          </div>
        </div>
        <div v-if="inst?.website" class="hidden sm:block">
           <a :href="inst.website" target="_blank" class="h-10 px-6 rounded-2xl bg-brand font-black text-white text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand/20 hover:shadow-brand/30 transition-all">
             <Globe class="h-3.5 w-3.5" />
             Official Website
           </a>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6">
      <div v-if="loading" class="space-y-8 animate-pulse">
         <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="h-64 bg-white/40 rounded-3xl border border-white"></div>
            <div class="h-96 bg-white/40 rounded-3xl border border-white"></div>
         </div>
         <div class="h-96 bg-white/40 rounded-3xl border border-white"></div>
      </div>

      <div v-else-if="inst" class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div class="lg:col-span-2 space-y-8">
           <!-- Grid: Overview & Main Campus -->
           <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <!-- Overview -->
              <section class="glass-card-premium p-6 sm:p-8">
                 <div class="flex items-center gap-3 mb-8">
                    <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                      <Building2 class="h-6 w-6" />
                    </div>
                    <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Institutional Overview</h2>
                 </div>

                 <div class="grid grid-cols-1 gap-6">
                    <div class="flex items-center justify-between p-4 rounded-2xl bg-brand/[0.03] border border-brand/5">
                       <div class="space-y-0.5">
                          <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enrollment Scale</p>
                          <p class="text-2xl font-black text-gray-900 leading-none">{{ inst.programs_count ?? (inst.programs?.length || 0) }}</p>
                       </div>
                       <div class="text-[9px] font-black text-brand uppercase tracking-widest bg-brand/10 px-3 py-1 rounded-full">Active Programs</div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                       <div class="space-y-1">
                          <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Region</p>
                          <div class="flex items-center gap-2">
                             <MapPin class="h-3.5 w-3.5 text-orange-500" />
                             <span class="text-sm font-black text-gray-900">{{ inst.region || '—' }}</span>
                          </div>
                       </div>
                       <div class="space-y-1">
                          <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">County</p>
                          <div class="flex items-center gap-2">
                             <Compass class="h-3.5 w-3.5 text-indigo-500" />
                             <span class="text-sm font-black text-gray-900">{{ inst.county || '—' }}</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </section>

              <!-- Main Campus -->
              <section v-if="mainCampus" class="glass-card-premium p-6 sm:p-8 flex flex-col min-h-[320px]">
                 <div class="flex items-center justify-between gap-4 mb-6">
                    <div class="flex items-center gap-3">
                       <div class="h-10 w-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                         <MapPin class="h-6 w-6" />
                       </div>
                       <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">HQ Location</h2>
                    </div>
                    <a 
                      v-if="mapsLinkForCampus(mainCampus)"
                      :href="mapsLinkForCampus(mainCampus)" 
                      target="_blank"
                      class="h-8 px-4 rounded-xl bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-slate-100 transition-colors"
                    >
                      <ArrowRight class="h-3 w-3" /> Maps
                    </a>
                 </div>

                 <p class="text-sm font-black text-gray-900 mb-4">{{ campusLabel(mainCampus) }}</p>

                 <div v-if="embeddedMapUrl" class="mt-auto overflow-hidden rounded-3xl border-2 border-white shadow-xl shadow-slate-200/40 aspect-video lg:aspect-square xl:aspect-video">
                    <iframe
                      :src="embeddedMapUrl"
                      class="w-full h-full grayscale-[0.5] contrast-[1.1]"
                      loading="lazy"
                      referrerpolicy="no-referrer-when-downgrade"
                      title="Main campus map"
                    />
                 </div>
                 <div v-else class="mt-auto flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 aspect-video lg:aspect-square xl:aspect-video p-6 text-center">
                    <MapPin class="h-10 w-10 text-slate-200 mb-3" />
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Interactive Map Unavailable</p>
                    <p class="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">No geographic coordinates matched for this institution</p>
                 </div>
              </section>
           </div>

           <!-- Programs Catalog -->
           <section class="glass-card p-6 sm:p-8">
              <div class="flex items-center justify-between gap-4 mb-8">
                 <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                      <GraduationCap class="h-6 w-6" />
                    </div>
                    <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Available Programs</h2>
                 </div>
                 <span class="px-3 py-1 rounded-full bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                   {{ (inst.programs || []).length }} listings
                 </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <router-link
                   v-for="p in inst.programs"
                   :key="p.id"
                   class="p-5 rounded-3xl bg-white/40 border border-white hover:border-brand hover:shadow-premium transition-all group"
                   :to="{ name: 'program_details', params: { id: p.id } }"
                 >
                   <div class="flex items-start justify-between mb-3">
                      <span class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest group-hover:bg-emerald-500 group-hover:text-white transition-colors">Match found</span>
                      <ArrowRight class="h-4 w-4 text-slate-200 group-hover:text-brand transition-colors" />
                   </div>
                   <h4 class="text-sm font-black text-gray-900 group-hover:text-brand transition-colors leading-tight mb-2">{{ programLabel(p) }}</h4>
                   <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ p.field_name || 'General Field' }}</p>
                 </router-link>
              </div>
           </section>
        </div>

        <!-- Sidebar Branching -->
        <aside class="space-y-8">
           <!-- Branch Campuses -->
           <div v-if="branchCampuses.length" class="glass-card-premium p-6 sm:p-8">
              <div class="flex items-center gap-3 mb-6">
                 <div class="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                   <Layers class="h-6 w-6" />
                 </div>
                 <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Other Locations</h2>
              </div>
              
              <div class="space-y-3">
                 <div 
                   v-for="c in branchCampuses" 
                   :key="c.campus" 
                   class="flex items-center justify-between p-4 rounded-2xl bg-white/40 border border-white shadow-sm"
                 >
                    <div class="min-w-0">
                       <p class="text-xs font-black text-gray-900 truncate">{{ c.campus }}</p>
                       <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest truncate">{{ c.town || c.county }}</p>
                    </div>
                    <a v-if="mapsLinkForCampus(c)" :href="mapsLinkForCampus(c)" target="_blank" class="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors">
                       <MapPin class="h-4 w-4" />
                    </a>
                 </div>
              </div>
           </div>

           <!-- Meta Info -->
           <div v-if="hasAside" class="glass-card-premium p-6 sm:p-8">
              <div class="flex items-center gap-3 mb-6">
                 <div class="h-10 w-10 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                   <History class="h-6 w-6" />
                 </div>
                  <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">System Metadata</h2>
              </div>
              <div class="p-4 rounded-2xl bg-slate-900 text-[10px] font-mono text-emerald-400/80 leading-relaxed overflow-x-auto shadow-inner border border-slate-800">
                 <pre>{{ JSON.stringify(inst.metadata, null, 2) }}</pre>
              </div>
           </div>
        </aside>
      </div>
    </div>
  </main>
</template>

<style scoped>
.glass-card-premium {
  @apply bg-white/70 backdrop-blur-2xl border-2 border-white rounded-[2rem] shadow-xl shadow-slate-200/50;
}
</style>
