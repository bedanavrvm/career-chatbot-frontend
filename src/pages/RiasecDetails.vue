<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { onboardingDashboard } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'

const router = useRouter()

const { user, getIdToken } = useAuth()
const { loading, error, run } = useApiCall({ toastErrors: true })

const profile = ref(null)
const riasec = ref({ scores: {}, top: [], narrative: '' })

const TRAIT_INFO = {
  Realistic: {
    label: 'Realistic (Doers)',
    description: 'Hands-on, practical, likes tools, machines, building, fixing, working outdoors or with tangible results.',
    careers: ['Engineering technician', 'Mechanic', 'Electrician', 'Surveyor', 'Agriculture', 'Construction', 'Logistics'],
  },
  Investigative: {
    label: 'Investigative (Thinkers)',
    description: 'Analytical, curious, enjoys problem-solving, research, science, data, and understanding how things work.',
    careers: ['Software developer', 'Data analyst', 'Doctor/Clinical roles', 'Laboratory scientist', 'Research', 'Engineering', 'Actuarial'],
  },
  Artistic: {
    label: 'Artistic (Creators)',
    description: 'Creative, expressive, enjoys design, writing, music, performance, and open-ended work with originality.',
    careers: ['Graphic/UI designer', 'Architectural design', 'Film/Media', 'Music/Performing arts', 'Content creator', 'Advertising'],
  },
  Social: {
    label: 'Social (Helpers)',
    description: 'People-oriented, enjoys teaching, helping, counseling, collaborating, and improving others’ wellbeing.',
    careers: ['Teacher', 'Counselor', 'Nursing', 'Community development', 'HR', 'Customer success', 'Public health'],
  },
  Enterprising: {
    label: 'Enterprising (Persuaders)',
    description: 'Leadership, business-minded, enjoys influencing, selling, debating, initiating projects, and taking risks.',
    careers: ['Entrepreneur', 'Sales/Marketing', 'Business management', 'Law', 'Politics/Public leadership', 'Product management'],
  },
  Conventional: {
    label: 'Conventional (Organizers)',
    description: 'Structured, detail-oriented, enjoys systems, planning, records, finance, process and reliable routines.',
    careers: ['Accounting', 'Administration', 'Banking', 'Procurement', 'Operations', 'Data entry/Clerical', 'Compliance'],
  },
}

async function load() {
  const data = await run(async () => {
    const u = user.value
    if (!u) {
      router.replace('/login')
      return null
    }
    const token = await getIdToken(true)
    return onboardingDashboard(token)
  }, { fallbackMessage: 'Failed to load RIASEC details' })
  if (!data) return
  profile.value = data?.profile || null
  riasec.value = data?.riasec || riasec.value
}

onMounted(load)

function back() {
  if (window.history.length > 1) router.back()
  else router.push('/dashboard')
}

const scoreRows = computed(() => {
  const scores = riasec.value?.scores || {}
  const keys = ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional']
  return keys.map(k => ({
    key: k,
    score: Number(scores?.[k] || 0),
    info: TRAIT_INFO[k],
  })).sort((a, b) => b.score - a.score)
})

const answersBreakdown = computed(() => {
  const ans = profile.value?.riasec_answers
  if (!ans || typeof ans !== 'object') return []
  const keys = ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional']
  const out = []
  for (const k of keys) {
    const arr = Array.isArray(ans[k]) ? ans[k] : []
    const sum = arr.reduce((acc, x) => acc + (Number.isFinite(Number(x)) ? Number(x) : 0), 0)
    out.push({ key: k, questions: arr.length, sum })
  }
  return out.sort((a, b) => b.sum - a.sum)
})
</script>

<template>
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">RIASEC Profile</h1>
        <p class="text-sm text-gray-600 mt-1">Understand what your top traits mean and how your scores were derived.</p>
      </div>
      <button
        class="btn btn-outline btn-md"
        type="button"
        title="Back"
        aria-label="Back"
        @click="back"
      >
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back</span>
      </button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <div v-else-if="loading" class="mt-4 text-sm text-gray-600">Loading…</div>

    <div v-else class="mt-6 space-y-6">
      <div class="card p-4">
        <h2 class="text-lg font-semibold">What is RIASEC?</h2>
        <p class="mt-2 text-sm text-gray-700">
          RIASEC (Holland Codes) is a career-interest model that groups interests into six themes:
          Realistic, Investigative, Artistic, Social, Enterprising, and Conventional.
          Your top themes suggest the kinds of activities and environments you naturally prefer.
        </p>
      </div>

      <div class="card p-4">
        <h2 class="text-lg font-semibold">Your top types</h2>
        <p class="mt-2 text-sm text-gray-700">
          <span class="font-medium">Top:</span> {{ (riasec.top || []).join(' · ') || '—' }}
        </p>
        <p class="mt-1 text-sm text-gray-600">{{ riasec.narrative || '' }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-4">
          <h2 class="text-lg font-semibold">Scores breakdown</h2>
          <div class="mt-3 space-y-3">
            <div v-for="r in scoreRows" :key="r.key" class="border rounded-lg p-3 bg-white/60">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-medium text-gray-900">{{ r.info?.label || r.key }}</div>
                  <div class="text-sm text-gray-600 mt-1">{{ r.info?.description || '' }}</div>
                </div>
                <div class="text-right">
                  <div class="text-xs text-gray-500">Score</div>
                  <div class="text-2xl font-bold text-gray-900">{{ r.score }}</div>
                </div>
              </div>
              <div class="mt-3">
                <div class="text-xs text-gray-500">Typical careers</div>
                <div class="mt-1 text-sm text-gray-700">{{ (r.info?.careers || []).join(' · ') }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <h2 class="text-lg font-semibold">How your score was calculated</h2>
          <p class="mt-2 text-sm text-gray-700">
            During onboarding you answered short scenario questions. Each answer contributes points to one of the six traits.
            We sum the points per trait to get your final scores, then take the top traits.
          </p>

          <div v-if="answersBreakdown.length" class="mt-4">
            <div class="text-sm text-gray-600">Contribution summary</div>
            <div class="mt-2 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left text-gray-500 border-b">
                    <th class="py-2 pr-4">Trait</th>
                    <th class="py-2 pr-4">Questions</th>
                    <th class="py-2">Total points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, idx) in answersBreakdown" :key="idx" class="border-b last:border-b-0">
                    <td class="py-2 pr-4 font-medium">{{ r.key }}</td>
                    <td class="py-2 pr-4">{{ r.questions }}</td>
                    <td class="py-2">{{ r.sum }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p v-else class="mt-3 text-sm text-gray-600">No answer details available yet.</p>
        </div>
      </div>
    </div>
  </main>
</template>
