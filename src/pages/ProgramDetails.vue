<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ExternalLink } from 'lucide-vue-next'
import { auth } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'
import { catalogGetProgram } from '../lib/api'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const program = ref(null)

const programId = computed(() => {
  const v = route.params?.id
  const n = Number(v)
  return Number.isFinite(n) ? n : null
})

async function load() {
  error.value = ''
  program.value = null
  if (!programId.value) {
    error.value = 'Invalid program id'
    return
  }

  try {
    loading.value = true
    const u = auth.currentUser
    const token = u ? await getIdToken(u, true) : ''
    const data = await catalogGetProgram(token, programId.value)
    program.value = data
  } catch (e) {
    error.value = e?.message || 'Failed to load program'
  } finally {
    loading.value = false
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
    <div v-else-if="loading" class="mt-4 text-sm text-gray-600">Loading…</div>

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
                  <span class="font-mono">{{ o.subject_code || 'SUBJ' }}</span>
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
