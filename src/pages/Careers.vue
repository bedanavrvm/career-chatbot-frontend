<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Brain, Search, TrendingUp, ArrowRight } from 'lucide-vue-next'

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
  <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/60 relative">
    <!-- background decor -->
    <div class="absolute top-0 right-0 -z-10 w-1/3 h-1/3 bg-brand/5 blur-[120px] rounded-full"></div>
    <div class="absolute bottom-10 left-10 -z-10 w-1/4 h-1/4 bg-brand/5 blur-[100px] rounded-full"></div>

    <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <div>
        <h1 class="text-3xl font-black text-gray-900 tracking-tight sm:text-4xl">Career Matches</h1>
        <p class="text-gray-500 mt-1 flex items-center gap-2">
          Discover paths aligned with your interests
          <span class="inline-flex h-2 w-2 rounded-full bg-brand/40"></span>
        </p>
      </div>

      <button 
        class="btn-primary btn-md gap-2 shadow-xl shadow-brand/20 px-8" 
        :disabled="loading || !hasAnyInput" 
        @click="search"
      >
        <Search class="h-4 w-4" />
        <span>Update Results</span>
      </button>
    </header>

    <p v-if="error" class="mb-6 p-4 rounded-xl bg-red-50 text-sm text-red-600 border border-red-100">{{ error }}</p>

    <!-- Interests Input Panel -->
    <section class="glass-card p-6 shadow-lg shadow-slate-200/50 mb-8">
      <div class="flex items-center gap-3 mb-6">
        <div class="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
          <Brain class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-sm font-black text-gray-900 tracking-widest uppercase">RIASEC Profile</h2>
          <p class="text-[10px] text-gray-500 font-bold">Adjust scores to fine-tune your recommendations</p>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div v-for="(val, key) in inputs" :key="key" class="space-y-1.5">
          <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest block ml-1">{{ key }}</label>
          <input 
            v-model.number="inputs[key]" 
            type="number" 
            min="0" 
            max="100"
            class="block w-full rounded-xl border-2 border-gray-100 bg-white/50 px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all shadow-inner" 
          />
        </div>
      </div>

      <div v-if="!user" class="mt-6 pt-6 border-t border-gray-100 flex items-center justify-center">
        <p class="text-xs text-gray-500 font-medium">Log in to automatically sync your profile interests.</p>
      </div>
    </section>

    <!-- Results List -->
    <div class="grid grid-cols-1 gap-4">
      <!-- Loading State -->
      <div v-if="loading" class="contents">
        <div v-for="i in 4" :key="i" class="glass-card p-6 animate-pulse">
          <div class="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
          <div class="h-10 bg-slate-100 rounded w-full"></div>
        </div>
      </div>

      <!-- Result Cards -->
      <div
        v-for="(r, idx) in results"
        :key="r.onetsoc_code || idx"
        class="glass-card p-6 group cursor-pointer hover:shadow-premium hover:-translate-y-1 transition-all duration-300 border-none relative overflow-hidden"
        @click="openCareer(r.onetsoc_code)"
      >
        <div class="flex items-start gap-6 relative z-10">
          <div class="h-14 w-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-all duration-500 shadow-inner">
            <TrendingUp class="h-8 w-8" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-4">
              <h3 class="text-xl font-black text-gray-900 group-hover:text-brand transition-colors">
                {{ r.title }}
              </h3>
              <div class="flex flex-col items-end">
                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md border border-gray-100 mb-1">
                  {{ r.onetsoc_code }}
                </span>
                <span class="text-xs font-bold text-brand">Confidence: {{ Math.round(r.score * 100) }}%</span>
              </div>
            </div>

            <p class="mt-3 text-sm text-gray-600 leading-relaxed max-w-2xl line-clamp-2">
              {{ r.description }}
            </p>

            <div class="mt-6 flex items-center gap-3">
              <span class="text-xs font-black text-gray-400 uppercase tracking-widest">Typical path:</span>
              <div class="flex items-center gap-2">
                <span class="inline-flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
                <span class="text-xs font-bold text-gray-700">High Growth</span>
              </div>
            </div>
          </div>

          <div class="hidden sm:flex self-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
            <ArrowRight class="h-6 w-6 text-brand" />
          </div>
        </div>

        <!-- Ghost Background -->
        <div class="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform duration-700 select-none">
          <TrendingUp class="h-32 w-32" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && hasAnyInput && !results.length" class="text-center py-20 glass-card">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-4">
          <TrendingUp class="h-8 w-8" />
        </div>
        <h3 class="text-lg font-bold text-gray-900">No matches found</h3>
        <p class="text-sm text-gray-500 mt-1">Try adjusting your interest scores above.</p>
      </div>
    </div>
  </main>
</template>
