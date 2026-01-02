<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ExternalLink, GraduationCap } from 'lucide-vue-next'
import { auth } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'
import { catalogGetInstitution } from '../lib/api'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const inst = ref(null)

const institutionCode = computed(() => {
  const v = route.params?.code
  return String(v || '').trim()
})

async function load() {
  error.value = ''
  inst.value = null
  if (!institutionCode.value) {
    error.value = 'Invalid institution code'
    return
  }

  try {
    loading.value = true
    const u = auth.currentUser
    const token = u ? await getIdToken(u, true) : ''
    const data = await catalogGetInstitution(token, institutionCode.value)
    inst.value = data
  } catch (e) {
    error.value = e?.message || 'Failed to load institution'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const title = computed(() => {
  const i = inst.value
  return i?.name || 'Institution'
})

function back() {
  if (window.history.length > 1) router.back()
  else router.push('/institutions')
}

function programLabel(p) {
  const name = p?.name || p?.normalized_name || ''
  const level = (p?.level || '').trim()
  if (!level) return name
  return `${name} (${level})`
}
</script>

<template>
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1>
        <p v-if="inst" class="text-sm text-gray-600 mt-1">
          <span v-if="inst.code" class="font-mono">{{ inst.code }}</span>
          <span v-if="inst.code && (inst.region || inst.county)"> · </span>
          <span v-if="inst.region">{{ inst.region }}</span>
          <span v-if="inst.region && inst.county"> · </span>
          <span v-if="inst.county">{{ inst.county }}</span>
        </p>
        <p v-if="inst?.alias" class="text-xs text-gray-500 mt-1">Alias: {{ inst.alias }}</p>
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

    <div v-else-if="inst" class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section class="lg:col-span-2 space-y-6">
        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Overview</h2>
          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div class="text-gray-500">Region</div>
              <div class="text-gray-900">{{ inst.region || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">County</div>
              <div class="text-gray-900">{{ inst.county || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Code</div>
              <div class="font-mono text-gray-900">{{ inst.code || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Programs in catalog</div>
              <div class="text-gray-900 font-semibold">{{ inst.programs_count ?? (inst.programs?.length || 0) }}</div>
            </div>
          </div>

          <div v-if="inst.website" class="mt-4">
            <a
              class="inline-flex items-center gap-2 text-sm text-brand-dark hover:underline"
              :href="inst.website"
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
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-lg font-semibold text-gray-900">Programs</h2>
            <div class="text-xs text-gray-500">
              Showing {{ (inst.programs || []).length }} of {{ inst.programs_count ?? (inst.programs?.length || 0) }}
            </div>
          </div>

          <div v-if="inst.programs && inst.programs.length" class="mt-3 space-y-2">
            <router-link
              v-for="p in inst.programs"
              :key="p.id"
              class="block border rounded-lg p-3 bg-white/60 hover:bg-white transition"
              :to="{ name: 'program_details', params: { id: p.id } }"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ programLabel(p) }}</div>
                  <div class="text-xs text-gray-600 mt-1">
                    <span v-if="p.field_name">{{ p.field_name }}</span>
                    <span v-if="p.field_name && (p.campus || p.region)"> · </span>
                    <span v-if="p.campus">{{ p.campus }}</span>
                    <span v-if="p.campus && p.region"> · </span>
                    <span v-if="p.region">{{ p.region }}</span>
                  </div>
                </div>
                <div class="shrink-0 text-gray-400">
                  <GraduationCap class="h-4 w-4" />
                </div>
              </div>
            </router-link>
          </div>
          <p v-else class="mt-2 text-sm text-gray-600">No programs found for this institution.</p>
        </div>
      </section>

      <aside class="space-y-6">
        <div v-if="inst.metadata && Object.keys(inst.metadata || {}).length" class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Additional details</h2>
          <pre class="mt-3 text-xs text-gray-700 whitespace-pre-wrap break-words">{{ inst.metadata }}</pre>
        </div>
      </aside>
    </div>
  </main>
</template>
