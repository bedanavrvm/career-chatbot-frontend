<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ExternalLink } from 'lucide-vue-next'
import { catalogGetProgram, catalogGetProgramCareers, etlCheckEligibility, onboardingMe } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'
import { subjectByCode } from './onboarding/kcseSubjects'

const _KCSE_SUBJECT_BY_CODE = subjectByCode()

const route = useRoute()
const router = useRouter()

const { user, getIdToken } = useAuth()
const { loading, error, run } = useApiCall({ toastErrors: true })

const program = ref(null)

const eligibilityLoading = ref(false)
const eligibilityError = ref('')
const eligibilityResult = ref(null)
const savedGrades = ref(null)

const careersLoading = ref(false)
const careersError = ref('')
const careers = ref([])

const careersSorted = computed(() => {
  const rows = Array.isArray(careers.value) ? careers.value.slice() : []
  rows.sort((a, b) => {
    const aw = a?.weight
    const bw = b?.weight
    const an = aw == null ? -Infinity : Number(aw)
    const bn = bw == null ? -Infinity : Number(bw)
    if (Number.isNaN(an) && Number.isNaN(bn)) return 0
    if (Number.isNaN(an)) return 1
    if (Number.isNaN(bn)) return -1
    if (bn !== an) return bn - an
    const ac = String(a?.onetsoc_code || '')
    const bc = String(b?.onetsoc_code || '')
    return ac.localeCompare(bc)
  })
  return rows
})

const programId = computed(() => {
  const v = route.params?.id
  const n = Number(v)
  return Number.isFinite(n) ? n : null
})

async function load() {
  program.value = null
  careers.value = []
  careersError.value = ''
  if (!programId.value) {
    run(() => Promise.reject(new Error('Invalid program id')), { fallbackMessage: 'Invalid program id', silent: true })
    return
  }

  const data = await run(async () => {
    const u = user.value
    const token = u ? await getIdToken(true) : ''
    return catalogGetProgram(token, programId.value)
  }, { fallbackMessage: 'Failed to load program' })

  if (data) program.value = data

  // Load possible careers (public endpoint)
  careersLoading.value = true
  try {
    const c = await catalogGetProgramCareers(programId.value)
    careers.value = Array.isArray(c?.results) ? c.results : []
  } catch (e) {
    careersError.value = e?.message || 'Failed to load careers'
    careers.value = []
  } finally {
    careersLoading.value = false
  }

  // Load saved KCSE grades (optional; only if logged in)
  try {
    const u = user.value
    if (!u) {
      savedGrades.value = null
      return
    }
    const token = await getIdToken(true)
    const me = await onboardingMe(token)
    const grades = me?.high_school?.subject_grades
    savedGrades.value = grades && typeof grades === 'object' ? grades : null
  } catch {
    savedGrades.value = null
  }
}

onMounted(load)

const title = computed(() => {
  const p = program.value
  if (!p) return 'Program'
  return p.program_name || p.normalized_name || 'Program'
})

function back() {
  if (window.history.length > 1) router.back()
  else router.push('/chat')
}

function fmtNumber(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return String(n)
}

const clusterPointsLabel = computed(() => {
  const p = program.value
  const v = p?.estimated_cluster_points
  if (v == null || Number.isNaN(Number(v))) return '—'
  return String(v)
})

const clusterPointsHint = computed(() => {
  const p = program.value
  const b = p?.cluster_points_breakdown
  const reason = b?.reason
  if (!reason) {
    if (b?.requirements_incomplete) return 'Estimated using partial programme subject data + your best remaining subjects.'
    if (p?.estimated_cluster_points != null) return 'Estimated from this programme’s subject requirements and your KCSE grades.'
    return 'Not available yet.'
  }
  if (reason === 'need_at_least_7_subjects') return 'Add at least 7 KCSE subject grades in your profile to compute this.'
  if (reason === 'missing_required_subjects') return 'You are missing one or more required cluster subjects for this programme.'
  if (reason === 'insufficient_program_subject_data') return 'This programme’s KUCCPS subject requirements are incomplete in our dataset.'
  if (reason === 'need_at_least_4_cluster_subjects') return 'Add more KCSE subjects to compute the 4 cluster subjects used for this programme.'
  return ''
})

const canCheckEligibility = computed(() => {
  const code = String(program.value?.program_code || '').trim()
  const g = savedGrades.value
  return !!code && g && typeof g === 'object' && Object.keys(g).length > 0
})

const eligibilityStatus = computed(() => {
  const r = eligibilityResult.value?.result
  if (!r || typeof r !== 'object') return null
  if (r.eligible === true) return 'eligible'
  if (r.eligible === false) return 'not_eligible'
  return null
})

const eligibilityReasons = computed(() => {
  const reasons = eligibilityResult.value?.result?.reasons
  if (!Array.isArray(reasons)) return []
  return reasons.filter(Boolean).map(r => String(r))
})

const eligibilityUsedPoints = computed(() => {
  const rows = eligibilityResult.value?.result?.used_points
  if (!Array.isArray(rows)) return []
  // rows are tuples: [subject, grade, points]
  return rows
    .map((t) => {
      if (!Array.isArray(t) || t.length < 3) return null
      return { subject: String(t[0] || ''), grade: String(t[1] || ''), points: Number(t[2] || 0) }
    })
    .filter(Boolean)
})

async function checkEligibility () {
  eligibilityError.value = ''
  eligibilityResult.value = null
  const code = String(program.value?.program_code || '').trim()
  if (!code) {
    eligibilityError.value = 'Missing program code'
    return
  }
  const grades = savedGrades.value
  if (!grades || typeof grades !== 'object' || !Object.keys(grades).length) {
    eligibilityError.value = 'Add your KCSE grades in onboarding to check eligibility.'
    return
  }
  eligibilityLoading.value = true
  try {
    eligibilityResult.value = await etlCheckEligibility({ programCode: code, grades })
  } catch (e) {
    eligibilityError.value = e?.message || 'Eligibility check failed'
  } finally {
    eligibilityLoading.value = false
  }
}

function openCareer (socCode) {
  const code = String(socCode || '').trim()
  if (!code) return
  router.push({ name: 'career_details', params: { soc_code: code } })
}
</script>

<template>
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1>
        <p v-if="program" class="text-sm text-gray-600 mt-1">
          {{ program.institution?.name || '' }}
          <span v-if="program.campus"> · {{ program.campus }}</span>
          <span v-if="program.region"> · {{ program.region }}</span>
        </p>
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
    <div v-else-if="loading" class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
      <section class="lg:col-span-2 space-y-6">
        <div class="card p-4">
          <div class="h-5 bg-gray-200 rounded w-40"></div>
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-for="i in 6" :key="i" class="h-12 bg-gray-100 rounded"></div>
          </div>
        </div>
        <div class="card p-4">
          <div class="h-5 bg-gray-200 rounded w-40"></div>
          <div class="mt-3 h-20 bg-gray-100 rounded"></div>
        </div>
      </section>
      <aside class="space-y-6">
        <div class="card p-4">
          <div class="h-5 bg-gray-200 rounded w-28"></div>
          <div class="mt-3 h-10 bg-gray-100 rounded"></div>
        </div>
        <div class="card p-4">
          <div class="h-5 bg-gray-200 rounded w-20"></div>
          <div class="mt-3 h-24 bg-gray-100 rounded"></div>
        </div>
      </aside>
    </div>

    <div v-else-if="program" class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section class="lg:col-span-2 space-y-6">
        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Overview</h2>
          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div class="text-gray-500">Program code</div>
              <div class="font-mono text-gray-900">{{ program.program_code || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Level</div>
              <div class="text-gray-900">{{ program.level || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Field</div>
              <div class="text-gray-900">{{ program.field_name || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Mode</div>
              <div class="text-gray-900">{{ program.mode || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Award</div>
              <div class="text-gray-900">{{ program.award || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Duration (years)</div>
              <div class="text-gray-900">{{ fmtNumber(program.duration_years) }}</div>
            </div>
            <div>
              <div class="text-gray-500">KUCCPS weighted cluster points (this programme)</div>
              <div class="text-gray-900 font-semibold">{{ clusterPointsLabel }}</div>
              <div v-if="clusterPointsHint" class="text-xs text-gray-500 mt-1">{{ clusterPointsHint }}</div>
            </div>
          </div>

          <div v-if="program.institution?.website" class="mt-4">
            <a
              class="inline-flex items-center gap-2 text-sm text-brand-dark hover:underline"
              :href="program.institution.website"
              target="_blank"
              rel="noopener noreferrer"
              title="Open institution website"
              aria-label="Open institution website"
            >
              <ExternalLink class="h-4 w-4" />
              <span>Institution website</span>
            </a>
          </div>
        </div>

        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Eligibility</h2>
          <p class="mt-2 text-sm text-gray-600">
            Check if your KCSE grades meet this programme’s requirements.
          </p>

          <div class="mt-4 flex flex-wrap items-center gap-3">
            <button
              class="btn btn-outline btn-md"
              type="button"
              :disabled="eligibilityLoading || !canCheckEligibility"
              @click="checkEligibility"
            >
              <span v-if="eligibilityLoading">Checking…</span>
              <span v-else>Check eligibility</span>
            </button>
            <div v-if="!user" class="text-xs text-gray-500">
              Log in and complete onboarding to save your grades.
            </div>
            <div v-else-if="!canCheckEligibility" class="text-xs text-gray-500">
              Add your KCSE subject grades in onboarding to enable this.
            </div>
          </div>

          <p v-if="eligibilityError" class="mt-3 text-sm text-red-600">{{ eligibilityError }}</p>

          <div v-if="eligibilityResult" class="mt-4">
            <div class="flex items-center justify-between gap-3">
              <div class="font-medium text-gray-900">Result</div>
              <span
                v-if="eligibilityStatus === 'eligible'"
                class="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-medium px-2 py-1"
              >
                Eligible
              </span>
              <span
                v-else-if="eligibilityStatus === 'not_eligible'"
                class="inline-flex items-center rounded-full bg-red-100 text-red-800 text-xs font-medium px-2 py-1"
              >
                Not eligible
              </span>
              <span
                v-else
                class="inline-flex items-center rounded-full bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1"
              >
                Unknown
              </span>
            </div>

            <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="border rounded-lg p-3 bg-white/60">
                <div class="text-xs text-gray-500">Programme</div>
                <div class="text-sm text-gray-900 font-medium">{{ eligibilityResult.program_name || program?.program_name || title }}</div>
                <div class="text-xs text-gray-600 mt-1">Code: {{ eligibilityResult.program_code }}</div>
              </div>
              <div class="border rounded-lg p-3 bg-white/60">
                <div class="text-xs text-gray-500">Estimated cluster points</div>
                <div class="text-sm text-gray-900 font-medium">{{ eligibilityResult.result?.cluster_points ?? '—' }}</div>
                <div class="text-xs text-gray-600 mt-1">Based on your provided KCSE grades</div>
              </div>
            </div>

            <div class="mt-4">
              <div class="text-sm font-medium text-gray-900">Reasons</div>
              <p v-if="!eligibilityReasons.length" class="mt-2 text-sm text-gray-600">No issues found.</p>
              <ul v-else class="mt-2 space-y-1 text-sm text-gray-700 list-disc pl-5">
                <li v-for="(r, idx) in eligibilityReasons" :key="idx">{{ r }}</li>
              </ul>
            </div>

            <div v-if="eligibilityUsedPoints.length" class="mt-4">
              <div class="text-sm font-medium text-gray-900">Subjects used</div>
              <div class="mt-2 overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="text-xs text-gray-500">
                    <tr>
                      <th class="text-left font-medium py-1 pr-3">Subject</th>
                      <th class="text-left font-medium py-1 pr-3">Grade</th>
                      <th class="text-left font-medium py-1 pr-3">Points</th>
                    </tr>
                  </thead>
                  <tbody class="text-gray-700">
                    <tr v-for="(row, idx) in eligibilityUsedPoints" :key="idx" class="border-t">
                      <td class="py-2 pr-3">{{ row.subject }}</td>
                      <td class="py-2 pr-3">{{ row.grade }}</td>
                      <td class="py-2 pr-3">{{ row.points }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Possible careers</h2>
          <p class="mt-2 text-sm text-gray-600">
            Career outcomes mapped from this programme’s field of study.
          </p>

          <p v-if="careersError" class="mt-3 text-sm text-red-600">{{ careersError }}</p>

          <div v-if="careersLoading" class="mt-4 grid grid-cols-1 gap-3">
            <div v-for="i in 3" :key="i" class="border rounded-lg p-3 bg-white/60 animate-pulse">
              <div class="h-4 w-2/3 bg-gray-200 rounded"></div>
              <div class="mt-2 h-3 w-1/2 bg-gray-100 rounded"></div>
            </div>
          </div>

          <div v-else class="mt-4 grid grid-cols-1 gap-3">
            <div
              v-for="(c, idx) in careersSorted"
              :key="c.onetsoc_code || idx"
              class="border rounded-lg p-3 bg-white/60 cursor-pointer"
              role="button"
              tabindex="0"
              @click="openCareer(c.onetsoc_code)"
              @keydown.enter.prevent="openCareer(c.onetsoc_code)"
            >
              <div class="text-sm font-medium text-gray-900">{{ c.title }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ c.onetsoc_code }}</div>
              <div class="text-sm text-gray-700 mt-2 line-clamp-3">{{ c.description }}</div>
            </div>

            <p v-if="!careers.length" class="text-sm text-gray-600">
              No careers mapped yet for this programme’s field.
            </p>
          </div>
        </div>

        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Requirements</h2>
          <p v-if="program.requirements_preview" class="mt-2 text-sm text-gray-700">{{ program.requirements_preview }}</p>
          <p v-else class="mt-2 text-sm text-gray-600">No requirements data available.</p>

          <div v-if="program.requirement_groups && program.requirement_groups.length" class="mt-4 space-y-4">
            <div v-for="(g, idx) in program.requirement_groups" :key="idx" class="border rounded-lg p-3 bg-white/60">
              <div class="flex items-center justify-between">
                <div class="font-medium text-gray-900">{{ g.name || `Group ${idx + 1}` }}</div>
                <div class="text-xs text-gray-600">Pick {{ g.pick || 1 }}</div>
              </div>
              <div v-if="g.options && g.options.length" class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div v-for="(o, oidx) in g.options" :key="oidx" class="text-sm text-gray-700">
                  <span 
                    class="font-mono cursor-help"
                    :title="_KCSE_SUBJECT_BY_CODE[o.subject_code]?.name || o.subject_code"
                  >
                    {{ o.subject_code || 'SUBJ' }}
                  </span>
                  <span v-if="o.subject_name" class="text-gray-600"> — {{ o.subject_name }}</span>
                  <span v-if="o.min_grade" class="text-gray-900"> (min {{ o.min_grade }})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Cutoff history</h2>
          <div v-if="program.cutoffs && program.cutoffs.length" class="mt-3 overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="text-left text-gray-500 border-b">
                  <th class="py-2 pr-4">Year</th>
                  <th class="py-2 pr-4">Cutoff</th>
                  <th class="py-2 pr-4">Capacity</th>
                  <th class="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(c, cidx) in program.cutoffs" :key="cidx" class="border-b last:border-b-0">
                  <td class="py-2 pr-4 font-mono">{{ c.year }}</td>
                  <td class="py-2 pr-4">{{ fmtNumber(c.cutoff) }}</td>
                  <td class="py-2 pr-4">{{ c.capacity ?? '—' }}</td>
                  <td class="py-2">{{ c.notes || '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-2 text-sm text-gray-600">No cutoff history available.</p>
        </div>
      </section>

      <aside class="space-y-6">
        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Institution</h2>
          <div class="mt-2 text-sm text-gray-700">
            <div class="font-medium text-gray-900">{{ program.institution?.name || '—' }}</div>
            <div class="text-gray-600">{{ program.institution?.region || '' }}<span v-if="program.institution?.county"> · {{ program.institution.county }}</span></div>
            <div v-if="program.institution?.code" class="mt-2 text-xs text-gray-600 font-mono">{{ program.institution.code }}</div>
          </div>
        </div>

        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Costs</h2>
          <div v-if="program.costs && program.costs.length" class="mt-2 space-y-2">
            <div v-for="(c, idx) in program.costs" :key="idx" class="text-sm text-gray-700">
              <div class="font-medium">
                <span v-if="c.amount != null">{{ fmtNumber(c.amount) }} {{ c.currency || '' }}</span>
                <span v-else>{{ c.raw_cost || '—' }}</span>
              </div>
              <div class="text-xs text-gray-500">
                <span v-if="c.source_id">Source: {{ c.source_id }}</span>
                <span v-if="c.updated_at"> · Updated: {{ c.updated_at.slice(0, 10) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="mt-2 text-sm text-gray-600">No cost data available.</p>
        </div>
      </aside>
    </div>
  </main>
</template>
