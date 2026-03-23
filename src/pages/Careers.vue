<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Brain, Search, TrendingUp, ArrowRight, Info, Briefcase } from 'lucide-vue-next'

import { onetGetRecommendations, onboardingMe } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'

const router = useRouter()
const { user, getIdToken } = useAuth()
const { loading, error, run } = useApiCall({ toastErrors: true })

const inputs = ref({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })
const results = ref([])

const hasAnyInput = computed(() => {
  const v = inputs.value || {}
  return Object.values(v).some((x) => Number(x || 0) !== 0)
})

function toLetterScoresFromProfile(profile) {
  const scores = profile?.riasec_scores || {}
  return {
    R: Number(scores?.Realistic || 0),
    I: Number(scores?.Investigative || 0),
    A: Number(scores?.Artistic || 0),
    S: Number(scores?.Social || 0),
    E: Number(scores?.Enterprising || 0),
    C: Number(scores?.Conventional || 0),
  }
}

async function loadFromOnboardingIfAvailable () {
  const u = user.value
  if (!u) return
  try {
    const token = await getIdToken(true)
    const me = await onboardingMe(token)
    const next = toLetterScoresFromProfile(me)
    inputs.value = next
  } catch {}
}

async function search () {
  results.value = []
  const params = { ...inputs.value, top_n: 20 }
  const data = await run(() => onetGetRecommendations(params), { fallbackMessage: 'Failed to load career matches' })
  results.value = data?.results || []
}

function openCareer (soc) {
  const code = String(soc || '').trim()
  if (!code) return
  router.push({ name: 'career_details', params: { soc_code: code } })
}

onMounted(async () => {
  await loadFromOnboardingIfAvailable()
  if (hasAnyInput.value) {
    await search()
  }
})
</script>

<template>
  <main class="flex-1 overflow-y-auto relative">
    <!-- background decor -->
    <div class="fixed top-0 left-0 w-full h-full pointer-events-none">
      <div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full animate-pulse"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full delay-1000 animate-pulse"></div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 relative z-10">
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div class="space-y-1">
          <h1 class="text-3xl font-black text-gray-900 tracking-tight sm:text-4xl">Career Discovery</h1>
          <p class="text-sm font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
            AI-Powered Path Mapping
            <span class="inline-flex h-2 w-2 rounded-full bg-brand animate-ping"></span>
          </p>
        </div>

        <button 
          class="btn-primary px-8 py-3 rounded-2xl shadow-xl shadow-brand/20 font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all hover:-translate-y-0.5" 
          :disabled="loading || !hasAnyInput" 
          @click="search"
        >
          <Search class="h-4 w-4" />
          Update Recommendations
        </button>
      </header>

      <div v-if="error" class="mb-8 p-4 rounded-2xl bg-red-50 border border-red-100 text-sm font-bold text-red-600 flex items-center gap-3">
        <Info class="h-5 w-5" />
        {{ error }}
      </div>

      <!-- Interests Input Panel -->
      <section class="glass-card-premium p-6 sm:p-8 mb-12 relative overflow-hidden">
        <div class="absolute top-0 right-0 h-32 w-32 bg-brand/5 blur-3xl -mr-16 -mt-16 rounded-full"></div>
        
        <div class="flex items-center gap-3 mb-8 relative z-10">
          <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
            <Brain class="h-6 w-6" />
          </div>
          <div>
            <h2 class="text-xs font-black text-gray-600 uppercase tracking-widest">RIASEC Interest Profile</h2>
            <p class="text-base text-gray-900 font-bold tracking-tight">Fine-tune your personality scores</p>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-6 gap-6 relative z-10">
          <div v-for="(val, key) in inputs" :key="key" class="space-y-3">
            <label class="text-[10px] font-black text-gray-700 uppercase tracking-widest block px-1">
              {{ {R:'Realistic', I:'Investigative', A:'Artistic', S:'Social', E:'Enterprising', C:'Conventional'}[key] }}
            </label>
            <div class="relative group">
              <input 
                v-model.number="inputs[key]" 
                type="number" 
                min="0" 
                max="100"
                class="input h-12 text-center font-black group-focus-within:border-brand transition-all" 
              />
              <div class="absolute inset-0 rounded-xl bg-brand/5 scale-0 group-hover:scale-100 transition-transform -z-10"></div>
            </div>
          </div>
        </div>

        <div v-if="!user" class="mt-8 pt-8 border-t border-slate-100 flex items-center justify-center">
          <p class="text-[10px] text-gray-600 font-black uppercase tracking-widest flex items-center gap-2">
            <Info class="h-4 w-4 text-brand" />
            Log in to automatically sync your profile interests
          </p>
        </div>
      </section>

    <!-- Results List -->
    <div class="space-y-6">
      <div class="flex items-center gap-3 mb-2 px-2">
         <TrendingUp class="h-4 w-4 text-brand" />
         <h3 class="text-xs font-black text-gray-600 uppercase tracking-widest">Recommended Career Paths</h3>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 gap-6">
        <div v-for="i in 4" :key="i" class="glass-card-premium h-32 animate-pulse p-6"></div>
      </div>

      <!-- Result Cards -->
      <div class="grid grid-cols-1 gap-6">
        <div
          v-for="(r, idx) in results"
          :key="r.onetsoc_code || idx"
          class="glass-card-premium p-6 group cursor-pointer hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
          @click="openCareer(r.onetsoc_code)"
        >
          <div class="flex items-start gap-6 relative z-10">
            <div class="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white group-hover:border-brand group-hover:rotate-6 transition-all duration-500 shadow-inner">
              <TrendingUp class="h-8 w-8" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-4">
                <h3 class="text-xl font-black text-gray-900 group-hover:text-brand transition-colors truncate">
                  {{ r.title }}
                </h3>
                <div class="flex flex-col items-end shrink-0">
                  <span class="text-[9px] font-black text-gray-700 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 mb-1">
                    {{ r.onetsoc_code }}
                  </span>
                  <span class="text-xs font-black text-brand uppercase tracking-widest">Match Score: {{ Math.round(r.score * 100) }}%</span>
                </div>
              </div>

              <p class="mt-3 text-sm font-bold text-gray-600 leading-relaxed max-w-3xl line-clamp-2">
                {{ r.description }}
              </p>

              <div class="mt-6 flex items-center gap-6">
                <div class="flex items-center gap-2">
                  <span class="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-glow shadow-emerald-200"></span>
                  <span class="text-[10px] font-black text-gray-700 uppercase tracking-widest">High Growth</span>
                </div>
                <div class="flex items-center gap-2">
                  <Briefcase class="h-4 w-4 text-gray-400" />
                  <span class="text-[10px] font-black text-gray-700 uppercase tracking-widest">Professional Tier</span>
                </div>
              </div>
            </div>

            <div class="hidden sm:flex self-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <ArrowRight class="h-6 w-6 text-brand" />
            </div>
          </div>

          <!-- Ghost Background Icon -->
          <div class="absolute -right-6 -bottom-6 opacity-[0.03] rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 select-none">
            <TrendingUp class="h-40 w-40" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && hasAnyInput && !results.length" class="text-center py-24 glass-card-premium">
        <div class="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-6 shadow-inner">
          <TrendingUp class="h-10 w-10" />
        </div>
        <h3 class="text-xl font-black text-gray-900 mb-2">No Path Found</h3>
        <p class="text-sm font-bold text-gray-600 uppercase tracking-widest">Try adjusting your interest profile</p>
      </div>
    </div>
  </div>
  </main>
</template>

<style scoped>
.glass-card-premium {
  @apply bg-white/70 backdrop-blur-2xl border-2 border-white rounded-[2.5rem] shadow-xl shadow-slate-200/50;
}
.shadow-glow {
  box-shadow: 0 0 20px rgba(var(--brand-rgb, 99, 102, 241), 0.2);
}
</style>
