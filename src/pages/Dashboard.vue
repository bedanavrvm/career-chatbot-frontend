<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'
import { onboardingDashboard } from '../lib/api'

// Inline: User dashboard showing RIASEC summary; redirects to onboarding if incomplete.
const router = useRouter()
const loading = ref(false)
const error = ref('')
const profile = ref(null)
const riasec = ref({ scores: {}, top: [], narrative: '' })

async function load() {
  try {
    loading.value = true
    const u = auth.currentUser
    if (!u) { router.replace('/login'); return }
    const token = await getIdToken(u, true)
    const data = await onboardingDashboard(token)
    profile.value = data?.profile || {}
    riasec.value = data?.riasec || { scores: {}, top: [], narrative: '' }
    if ((profile.value?.status || '') !== 'complete') { router.replace('/onboarding'); return }
  } catch (e) {
    error.value = e?.message || 'Failed to load dashboard'
  } finally { loading.value = false }
}

onMounted(load)

function keys() { return Object.keys(riasec.value.scores || {}) }
function pct(v) { const max = 8; const s = Number(v || 0); return Math.min(100, Math.round((s / max) * 100)) }
</script>

<template>
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Your Dashboard</h1>
        <p class="text-gray-600">Personalized summary based on your onboarding</p>
      </div>
      <router-link to="/onboarding" class="btn btn-outline">Update Profile</router-link>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <section class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 card p-4">
        <h2 class="text-lg font-semibold">RIASEC Profile</h2>
        <p class="text-sm text-gray-600">Top types: <span class="font-medium">{{ (riasec.top || []).join(', ') || '—' }}</span></p>
        <div class="mt-4 space-y-3">
          <div v-for="k in keys()" :key="k">
            <div class="flex items-center justify-between text-sm">
              <div class="font-medium">{{ k }}</div>
              <div class="text-gray-500">{{ riasec.scores[k] }}</div>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-2 bg-brand rounded-full" :style="{ width: pct(riasec.scores[k]) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-4">
        <h2 class="text-lg font-semibold">Summary</h2>
        <p class="text-gray-700 mt-1">{{ riasec.narrative || 'Complete your onboarding to see your RIASEC summary.' }}</p>
        <div class="mt-4 text-sm text-gray-600 space-y-1">
          <div><span class="font-medium">Name:</span> {{ profile?.universal?.fullName || profile?.user?.display_name || '—' }}</div>
          <div><span class="font-medium">Education:</span> {{ profile?.education_level || '—' }}</div>
          <div><span class="font-medium">Region:</span> {{ profile?.universal?.region || '—' }}</div>
        </div>
      </div>
    </section>
  </main>
</template>
