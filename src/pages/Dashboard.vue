<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Gauge, Brain, GraduationCap, MapPin, UserRoundCog, MessageSquare, ListChecks, Search, BookOpen } from 'lucide-vue-next'
import { onboardingDashboard } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'
import { useProfile } from '../utils/useProfile'

// Inline: User dashboard showing RIASEC summary; redirects to onboarding if incomplete.
const router = useRouter()
const { user, getIdToken } = useAuth()
const { loading, error, run } = useApiCall({ toastErrors: true })
const { set: setProfileCache } = useProfile()
const profile = ref(null)
const riasec = ref({ scores: {}, top: [], narrative: '' })
const kcse = ref({ has_grades: false, cluster_score: null, subjects_provided: 0, top4_points: 0, top7_points: 0 })

async function load() {
  const data = await run(async () => {
    const u = user.value
    if (!u) {
      router.replace('/login')
      return null
    }
    const token = await getIdToken(true)
    return onboardingDashboard(token)
  }, { fallbackMessage: 'Failed to load dashboard' })
  if (!data) return
  profile.value = data?.profile || {}
  setProfileCache(profile.value)
  riasec.value = data?.riasec || { scores: {}, top: [], narrative: '' }
  kcse.value = data?.kcse || { has_grades: false, cluster_score: null, subjects_provided: 0, top4_points: 0, top7_points: 0 }
  if ((profile.value?.status || '') !== 'complete') {
    router.replace('/onboarding')
  }
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

const isHighSchool = computed(() => {
  return profile.value?.education_level === 'high_school'
})

const isGraduate = computed(() => {
  return profile.value?.education_level === 'college_graduate' || profile.value?.education_level === 'college_student'
})

const getRiasecColor = (type) => {
  const colors = {
    Realistic: 'bg-red-500',
    Investigative: 'bg-blue-500',
    Artistic: 'bg-purple-500',
    Social: 'bg-teal-500',
    Enterprising: 'bg-orange-500',
    Conventional: 'bg-indigo-500'
  }
  return colors[type] || 'bg-brand'
}

const clusterScoreLabel = computed(() => {
  const v = kcse.value?.cluster_score
  if (v == null || Number.isNaN(Number(v))) return '—'
  return String(v)
})

const gradesProvidedLabel = computed(() => {
  const n = kcse.value?.subjects_provided
  if (n == null || Number.isNaN(Number(n))) return '—'
  return String(n)
})

const topSubjectsLabel = computed(() => {
  const arr = kcse.value?.top7_subjects || kcse.value?.top4_subjects || []
  const rows = Array.isArray(arr) ? arr.filter(Boolean) : []
  if (!rows.length) return '—'
  return rows.slice(0, 4).join(' · ')
})

const careerGoalsLabel = computed(() => {
  const uni = profile.value?.universal
  if (!uni || typeof uni !== 'object') return []
  const raw = uni.careerGoals || uni.career_goals || null
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
  return []
})

function openClusterScoreDetails () {
  router.push({ name: 'cluster_score_details' })
}

function openRiasecDetails () {
  router.push({ name: 'riasec_details' })
}
</script>

<template>
  <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f8fafc]/50 relative">
    <!-- background decor -->
    <div class="absolute top-0 right-0 -z-10 w-1/3 h-1/3 bg-brand/5 blur-[120px] rounded-full"></div>
    <div class="absolute bottom-10 left-10 -z-10 w-1/4 h-1/4 bg-brand/5 blur-[100px] rounded-full"></div>

    <header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-gray-900 tracking-tight sm:text-4xl">Dashboard</h1>
        <p class="text-gray-500 mt-1 flex items-center gap-2">
          Welcome back, <span class="text-brand font-bold">{{ displayName }}</span>
          <span class="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <router-link
          to="/chat"
          class="btn-primary btn-md shadow-xl shadow-brand/20 gap-2 px-6"
        >
          <MessageSquare class="h-4 w-4" />
          <span>Quick Chat</span>
        </router-link>

        <router-link
          to="/settings/profile"
          class="btn-outline btn-md gap-2 border-gray-200 bg-white/80 backdrop-blur-sm"
        >
          <UserRoundCog class="h-4 w-4" />
          <span class="hidden sm:inline">Settings</span>
        </router-link>
      </div>
    </header>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <div v-if="loading" class="mt-6 space-y-6 animate-pulse">
      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="card p-4">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="mt-3 h-8 bg-gray-100 rounded w-2/5"></div>
          <div class="mt-3 h-3 bg-gray-100 rounded w-2/3"></div>
        </div>
      </section>
      <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 card p-4">
          <div class="h-4 bg-gray-200 rounded w-40"></div>
          <div class="mt-4 space-y-3">
            <div v-for="i in 5" :key="i" class="h-10 bg-gray-100 rounded"></div>
          </div>
        </div>
        <div class="card p-4">
          <div class="h-4 bg-gray-200 rounded w-24"></div>
          <div class="mt-4 space-y-2">
            <div v-for="i in 4" :key="i" class="h-4 bg-gray-100 rounded"></div>
          </div>
        </div>
      </section>
    </div>

    <section v-else class="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- KCSE Score -->
      <div
        v-if="isHighSchool"
        class="stat-card glass-card group clickable-card"
        @click="openClusterScoreDetails"
      >
        <div class="stat-icon-soft bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white transition-all duration-300">
          <Gauge class="h-5 w-5" />
        </div>
        <Gauge class="stat-icon-bg text-brand" />
        <span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Weighted Score</span>
        <div class="text-3xl font-black text-gray-900 mt-1 leading-none">{{ clusterScoreLabel }}</div>
        <div class="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
          <ListChecks class="h-3 w-3" />
          {{ kcse?.has_grades ? `${kcse.subjects_provided} subjects graded` : 'Grades needed' }}
        </div>
      </div>

      <!-- Career Trajectory (Grad Only) -->
      <div
        v-else
        class="stat-card glass-card group bg-indigo-50/30 overflow-hidden"
      >
        <div class="stat-icon-soft bg-indigo-100 text-indigo-600">
          <TrendingUp class="h-5 w-5" />
        </div>
        <TrendingUp class="stat-icon-bg text-indigo-600" />
        <span class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.1em]">Focus</span>
        <div class="text-2xl font-black text-gray-900 mt-1">Career-First</div>
        <div class="mt-2 text-[10px] text-indigo-600 font-medium">Postgraduate & Pros</div>
      </div>

      <!-- RIASEC -->
      <div class="stat-card glass-card group clickable-card" @click="openRiasecDetails">
        <div class="stat-icon-soft bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
          <Brain class="h-5 w-5" />
        </div>
        <Brain class="stat-icon-bg text-purple-600" />
        <span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Top Interest</span>
        <div class="text-xl font-bold text-gray-900 mt-1 truncate">
          {{ (riasec.top || [])[0] || 'Analyzing...' }}
        </div>
        <div class="mt-2 text-[10px] text-gray-500 truncate">
          {{ (riasec.top || []).slice(1, 3).join(' · ') || 'Take assessment' }}
        </div>
      </div>

      <!-- Education -->
      <div class="stat-card glass-card group">
        <div class="stat-icon-soft bg-blue-100 text-blue-600">
          <GraduationCap class="h-5 w-5" />
        </div>
        <GraduationCap class="stat-icon-bg text-blue-600" />
        <span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Academic Level</span>
        <div class="text-xl font-bold text-gray-900 mt-1 capitalize truncate">
          {{ educationLabel.replace('_', ' ') }}
        </div>
        <div class="mt-2 text-[10px] text-gray-500 truncate">
          {{ profile?.universal?.qualification || 'General Education' }}
        </div>
      </div>

      <!-- Location -->
      <div class="stat-card glass-card group hover:shadow-orange-100/50">
        <div class="stat-icon-soft bg-orange-100 text-orange-600">
          <MapPin class="h-5 w-5" />
        </div>
        <MapPin class="stat-icon-bg text-orange-600" />
        <span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Preferred Town</span>
        <div class="text-xl font-bold text-gray-900 mt-1 truncate">
          {{ regionLabel }}
        </div>
        <div class="mt-2 text-[10px] text-gray-500">Kenya</div>
      </div>
    </section>

    <section v-if="!loading" class="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div class="h-8 w-1 bg-brand rounded-full"></div>
            Quick Launch
          </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <router-link to="/programmes" class="action-card">
            <div class="action-icon-soft">
              <BookOpen class="h-6 w-6" />
            </div>
            <div>
              <h3 class="font-bold text-gray-900">Browse Programmes</h3>
              <p class="text-sm text-gray-500 mt-1 leading-relaxed">Search degrees and check your current course eligibility.</p>
            </div>
          </router-link>

          <router-link to="/chat" class="action-card">
            <div class="action-icon-soft bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
              <Search class="h-6 w-6" />
            </div>
            <div>
              <h3 class="font-bold text-gray-900">Career Matches</h3>
              <p class="text-sm text-gray-500 mt-1 leading-relaxed">Explore occupations aligned to your personal interest profile.</p>
            </div>
          </router-link>

          <div class="action-card clickable-card" @click="openClusterScoreDetails">
            <div class="action-icon-soft bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <ListChecks class="h-6 w-6" />
            </div>
            <div>
              <h3 class="font-bold text-gray-900">Score Metrics</h3>
              <p class="text-sm text-gray-500 mt-1 leading-relaxed">Detailed breakdown of how your cluster scores are computed.</p>
            </div>
          </div>

          <div class="action-card clickable-card" @click="openRiasecDetails">
            <div class="action-icon-soft bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
              <Brain class="h-6 w-6" />
            </div>
            <div>
              <h3 class="font-bold text-gray-900">RIASEC Deep Dive</h3>
              <p class="text-sm text-gray-500 mt-1 leading-relaxed">Understand the core traits that drive your career choices.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-4">
        <h2 class="text-lg font-semibold">{{ isHighSchool ? 'KCSE snapshot' : 'Academic status' }}</h2>
        <div class="mt-3 text-sm text-gray-700 space-y-1">
          <div v-if="isHighSchool"><span class="font-medium">Grades provided:</span> {{ gradesProvidedLabel }}</div>
          <div v-if="isHighSchool"><span class="font-medium">Top subjects:</span> {{ topSubjectsLabel }}</div>
          <div v-if="isHighSchool && kcse?.has_grades"><span class="font-medium">Top 4 points:</span> {{ kcse.top4_points }}</div>
          <div v-if="isHighSchool && kcse?.has_grades"><span class="font-medium">Top 7 points:</span> {{ kcse.top7_points }}</div>
          
          <div v-if="!isHighSchool && profile?.universal?.qualification">
            <span class="font-medium">Qualification:</span> {{ profile.universal.qualification }}
          </div>
          <div v-if="!isHighSchool && profile?.universal?.field_of_study">
            <span class="font-medium">Field:</span> {{ profile.universal.field_of_study }}
          </div>
        </div>
        <div v-if="isHighSchool && !kcse?.has_grades" class="mt-3 text-xs text-gray-600">
          Add your grades to unlock eligibility and better recommendations.
        </div>
      </div>
    </section>

      <div class="lg:col-span-2 glass-card p-8 border-none shadow-premium">
        <h2 class="text-xl font-bold text-gray-900 tracking-tight">RIASEC Interest Profile</h2>
        <p class="text-sm text-gray-500 mt-1">Numerical breakdown of your core professional drivers.</p>
        
        <div class="mt-8 space-y-5">
          <div v-for="k in keys()" :key="k" class="group/bar">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="h-2 w-2 rounded-full" :class="getRiasecColor(k)"></div>
                <span class="text-sm font-bold text-gray-700 group-hover/bar:text-brand transition-colors">{{ k }}</span>
              </div>
              <span class="text-sm font-black text-gray-400 group-hover/bar:text-gray-900 transition-colors">{{ riasec.scores[k] }}</span>
            </div>
            <div class="riasec-bar-container bg-gray-50/50">
              <div 
                class="riasec-bar-fill shadow-sm"
                :class="getRiasecColor(k)"
                :style="{ width: pct(riasec.scores[k]) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-4">
        <h2 class="text-lg font-semibold">You</h2>
        <p class="text-gray-700 mt-1">{{ riasec.narrative || 'Complete your onboarding to see your RIASEC summary.' }}</p>
        <div class="mt-4 text-sm text-gray-600 space-y-1">
          <div><span class="font-medium">Name:</span> {{ displayName }}</div>
          <div><span class="font-medium">Education:</span> {{ educationLabel }}</div>
          <div><span class="font-medium">Region:</span> {{ regionLabel }}</div>
        </div>

        <div class="mt-4" v-if="careerGoalsLabel.length">
          <div class="text-sm font-semibold text-gray-900">Career goals</div>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="(g, idx) in careerGoalsLabel.slice(0, 6)"
              :key="idx"
              class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 border"
            >{{ g }}</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
