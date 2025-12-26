<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Gauge, Brain, GraduationCap, MapPin, UserRoundCog } from 'lucide-vue-next'
import { auth } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'
import { onboardingDashboard } from '../lib/api'

// Inline: User dashboard showing RIASEC summary; redirects to onboarding if incomplete.
const router = useRouter()
const loading = ref(false)
const error = ref('')
const profile = ref(null)
const riasec = ref({ scores: {}, top: [], narrative: '' })
const kcse = ref({ has_grades: false, cluster_score: null, subjects_provided: 0, top4_points: 0, top7_points: 0 })

async function load() {
  try {
    loading.value = true
    const u = auth.currentUser
    if (!u) { router.replace('/login'); return }
    const token = await getIdToken(u, true)
    const data = await onboardingDashboard(token)
    profile.value = data?.profile || {}
    riasec.value = data?.riasec || { scores: {}, top: [], narrative: '' }
    kcse.value = data?.kcse || { has_grades: false, cluster_score: null, subjects_provided: 0, top4_points: 0, top7_points: 0 }
    if ((profile.value?.status || '') !== 'complete') { router.replace('/onboarding'); return }
  } catch (e) {
    error.value = e?.message || 'Failed to load dashboard'
  } finally { loading.value = false }
}

onMounted(load)

function keys() { return Object.keys(riasec.value.scores || {}) }
function pct(v) {
  const vals = Object.values(riasec.value.scores || {})
    .map((x) => Number(x || 0))
    .filter((x) => !Number.isNaN(x))
  const max = Math.max(1, ...(vals.length ? vals : [1]))
  const s = Number(v || 0)
  return Math.min(100, Math.round((s / max) * 100))
}

const displayName = computed(() => {
  return profile.value?.universal?.fullName || profile.value?.user?.display_name || '—'
})

const educationLabel = computed(() => {
  return profile.value?.education_level || '—'
})

const regionLabel = computed(() => {
  return profile.value?.universal?.region || '—'
})

const clusterScoreLabel = computed(() => {
  const v = kcse.value?.cluster_score
  if (v == null || Number.isNaN(Number(v))) return '—'
  return String(v)
})

function openClusterScoreDetails () {
  router.push({ name: 'cluster_score_details' })
}

function openRiasecDetails () {
  router.push({ name: 'riasec_details' })
}
</script>

<template>
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-gray-600">Welcome, <span class="font-medium text-gray-900">{{ displayName }}</span></p>
      </div>
      <router-link
        to="/settings/profile"
        class="btn btn-outline btn-md gap-2"
        title="Update profile"
        aria-label="Update profile"
      >
        <UserRoundCog class="h-4 w-4" />
        <span class="hidden sm:inline">Update Profile</span>
        <span class="sr-only sm:hidden">Update Profile</span>
      </router-link>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <section class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        class="card p-4 cursor-pointer hover:bg-white/70 transition"
        role="button"
        tabindex="0"
        @click="openClusterScoreDetails"
        @keydown.enter="openClusterScoreDetails"
      >
        <div class="flex items-center gap-2 text-sm text-gray-600" title="KCSE Weighted Score (Generic)">
          <Gauge class="h-4 w-4" />
          <span>KCSE Weighted Score (Generic)</span>
        </div>
        <div class="mt-2 text-3xl font-bold text-gray-900">{{ clusterScoreLabel }}</div>
        <div class="mt-2 text-xs text-gray-500" v-if="kcse?.has_grades">Based on {{ kcse.subjects_provided }} subject grades</div>
        <div class="mt-2 text-xs text-gray-500" v-else>Complete your KCSE grades to compute this</div>
      </div>

      <div
        class="card p-4 cursor-pointer hover:bg-white/70 transition"
        role="button"
        tabindex="0"
        @click="openRiasecDetails"
        @keydown.enter="openRiasecDetails"
      >
        <div class="flex items-center gap-2 text-sm text-gray-600" title="Top RIASEC">
          <Brain class="h-4 w-4" />
          <span>Top RIASEC</span>
        </div>
        <div class="mt-2 text-xl font-semibold text-gray-900">{{ (riasec.top || []).join(' · ') || '—' }}</div>
        <div class="mt-2 text-xs text-gray-500">{{ riasec.narrative || '' }}</div>
      </div>

      <div class="card p-4">
        <div class="flex items-center gap-2 text-sm text-gray-600" title="Education Level">
          <GraduationCap class="h-4 w-4" />
          <span>Education Level</span>
        </div>
        <div class="mt-2 text-xl font-semibold text-gray-900">{{ educationLabel }}</div>
      </div>

      <div class="card p-4">
        <div class="flex items-center gap-2 text-sm text-gray-600" title="Region">
          <MapPin class="h-4 w-4" />
          <span>Region</span>
        </div>
        <div class="mt-2 text-xl font-semibold text-gray-900">{{ regionLabel }}</div>
      </div>
    </section>

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
          <div><span class="font-medium">Name:</span> {{ displayName }}</div>
          <div><span class="font-medium">Education:</span> {{ educationLabel }}</div>
          <div><span class="font-medium">Region:</span> {{ regionLabel }}</div>
        </div>
      </div>
    </section>
  </main>
</template>
