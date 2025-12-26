<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { auth } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'
import { onboardingDashboard } from '../lib/api'

const router = useRouter()

const loading = ref(false)
const error = ref('')
const kcse = ref({ has_grades: false, cluster_score: null, subjects_provided: 0, top4_points: 0, top7_points: 0, subjects: [], top4_subjects: [], top7_subjects: [], formula: null })

async function load() {
  try {
    loading.value = true
    const u = auth.currentUser
    if (!u) { router.replace('/login'); return }
    const token = await getIdToken(u, true)
    const data = await onboardingDashboard(token)
    kcse.value = data?.kcse || kcse.value
  } catch (e) {
    error.value = e?.message || 'Failed to load cluster score details'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const sortedSubjects = computed(() => {
  const rows = Array.isArray(kcse.value?.subjects) ? kcse.value.subjects : []
  return [...rows].sort((a, b) => {
    const ap = Number(a?.points || 0)
    const bp = Number(b?.points || 0)
    if (bp !== ap) return bp - ap
    return String(a?.subject_code || '').localeCompare(String(b?.subject_code || ''))
  })
})

const top4Set = computed(() => new Set((kcse.value?.top4_subjects || []).map(s => String(s || '').toUpperCase())))
const top7Set = computed(() => new Set((kcse.value?.top7_subjects || []).map(s => String(s || '').toUpperCase())))

function back() {
  if (window.history.length > 1) router.back()
  else router.push('/dashboard')
}

function fmt(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return String(n)
}
</script>

<template>
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">KCSE Weighted Score (Generic)</h1>
        <p class="text-sm text-gray-600 mt-1">A generic KCSE strength metric based on your best subjects (not per-program KUCCPS cluster points).</p>
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
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="card p-4">
          <div class="text-sm text-gray-600">KCSE weighted score</div>
          <div class="mt-2 text-3xl font-bold text-gray-900">{{ fmt(kcse.cluster_score) }}</div>
          <div class="mt-2 text-xs text-gray-500" v-if="kcse.has_grades">Based on {{ kcse.subjects_provided }} subject grades</div>
          <div class="mt-2 text-xs text-gray-500" v-else>Complete your KCSE grades to compute this</div>
        </div>
        <div class="card p-4">
          <div class="text-sm text-gray-600">Top 4 points (R)</div>
          <div class="mt-2 text-3xl font-bold text-gray-900">{{ fmt(kcse.top4_points) }}</div>
          <div class="mt-2 text-xs text-gray-500">Sum of your 4 highest subjects</div>
        </div>
        <div class="card p-4">
          <div class="text-sm text-gray-600">Top 7 points (T)</div>
          <div class="mt-2 text-3xl font-bold text-gray-900">{{ fmt(kcse.top7_points) }}</div>
          <div class="mt-2 text-xs text-gray-500">Sum of your 7 highest subjects</div>
        </div>
      </div>

      <div class="card p-4">
        <h2 class="text-lg font-semibold">Formula used</h2>
        <div class="mt-2 text-sm text-gray-700" v-if="kcse.formula">
          Cluster = sqrt((R / {{ kcse.formula.R }}) × (T / {{ kcse.formula.T }})) × 48
        </div>
        <div class="mt-2 text-xs text-gray-600" v-if="kcse.formula">
          Where R is your top-4 points sum, and T is your top-7 points sum.
        </div>
        <div v-else class="mt-2 text-sm text-gray-600">No formula details available.</div>
      </div>

      <div class="card p-4">
        <h2 class="text-lg font-semibold">Your subjects</h2>
        <p class="text-sm text-gray-600 mt-1">Highlighted: Top 4 (strong highlight) and Top 7 (light highlight).</p>

        <div v-if="sortedSubjects.length" class="mt-3 overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Subject</th>
                <th class="py-2 pr-4">Grade</th>
                <th class="py-2 pr-4">Points</th>
                <th class="py-2">Used in</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(s, idx) in sortedSubjects"
                :key="idx"
                :class="[
                  'border-b last:border-b-0',
                  top4Set.has(String(s.subject_code || '').toUpperCase()) ? 'bg-brand/10' : (top7Set.has(String(s.subject_code || '').toUpperCase()) ? 'bg-brand/5' : '')
                ]"
              >
                <td class="py-2 pr-4 font-mono">{{ s.subject_code }}</td>
                <td class="py-2 pr-4">{{ s.grade || '—' }}</td>
                <td class="py-2 pr-4">{{ fmt(s.points) }}</td>
                <td class="py-2">
                  <span v-if="top4Set.has(String(s.subject_code || '').toUpperCase())" class="text-xs font-medium text-gray-900">Top 4</span>
                  <span v-else-if="top7Set.has(String(s.subject_code || '').toUpperCase())" class="text-xs font-medium text-gray-700">Top 7</span>
                  <span v-else class="text-xs text-gray-500">Not used</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="mt-2 text-sm text-gray-600">No subjects available.</div>
      </div>
    </div>
  </main>
</template>
