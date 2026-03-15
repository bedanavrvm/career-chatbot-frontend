<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Brain, Search } from 'lucide-vue-next'

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
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Career Matches</h1>
        <p class="text-sm text-gray-600 mt-1">
          Based on your RIASEC interests.
        </p>
      </div>
      <button class="btn btn-outline btn-md gap-2" type="button" :disabled="loading || !hasAnyInput" @click="search">
        <Search class="h-4 w-4" />
        <span>Find matches</span>
      </button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-6 card p-4">
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <Brain class="h-4 w-4" />
        <span>RIASEC inputs</span>
      </div>

      <div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <label class="text-sm text-gray-700">
          R
          <input v-model.number="inputs.R" type="number" min="0" class="input mt-1" />
        </label>
        <label class="text-sm text-gray-700">
          I
          <input v-model.number="inputs.I" type="number" min="0" class="input mt-1" />
        </label>
        <label class="text-sm text-gray-700">
          A
          <input v-model.number="inputs.A" type="number" min="0" class="input mt-1" />
        </label>
        <label class="text-sm text-gray-700">
          S
          <input v-model.number="inputs.S" type="number" min="0" class="input mt-1" />
        </label>
        <label class="text-sm text-gray-700">
          E
          <input v-model.number="inputs.E" type="number" min="0" class="input mt-1" />
        </label>
        <label class="text-sm text-gray-700">
          C
          <input v-model.number="inputs.C" type="number" min="0" class="input mt-1" />
        </label>
      </div>

      <p v-if="!user" class="mt-3 text-xs text-gray-500">
        Log in and complete onboarding to auto-fill these values.
      </p>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-3">
      <div v-if="loading" class="grid grid-cols-1 gap-3">
        <div v-for="i in 6" :key="i" class="card p-4 animate-pulse">
          <div class="h-4 w-2/3 bg-gray-200 rounded"></div>
          <div class="mt-2 h-3 w-1/2 bg-gray-100 rounded"></div>
        </div>
      </div>

      <div
        v-for="(r, idx) in results"
        :key="r.onetsoc_code || idx"
        class="card p-4 cursor-pointer"
        role="button"
        tabindex="0"
        @click="openCareer(r.onetsoc_code)"
        @keydown.enter.prevent="openCareer(r.onetsoc_code)"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="font-semibold text-gray-900">{{ r.title }}</div>
            <div class="text-xs text-gray-500 mt-1">{{ r.onetsoc_code }}</div>
            <div class="text-sm text-gray-700 mt-2 line-clamp-3">{{ r.description }}</div>
          </div>
          <div class="text-xs text-gray-600 shrink-0">Score: {{ r.score }}</div>
        </div>
      </div>

      <div v-if="!loading && hasAnyInput && !results.length" class="text-sm text-gray-600">
        No matches yet.
      </div>
    </div>
  </main>
</template>
