<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ExternalLink, GraduationCap, MapPin } from 'lucide-vue-next'
import { catalogGetInstitution } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'

const route = useRoute()
const router = useRouter()

const { user, getIdToken } = useAuth()
const { loading, error, run } = useApiCall({ toastErrors: true })

const inst = ref(null)

const institutionCode = computed(() => {
  const v = route.params?.code
  return String(v || '').trim()
})

async function load() {
  inst.value = null
  if (!institutionCode.value) {
    run(() => Promise.reject(new Error('Invalid institution code')), { fallbackMessage: 'Invalid institution code', silent: true })
    return
  }

  const data = await run(async () => {
    const u = user.value
    const token = u ? await getIdToken(true) : ''
    return catalogGetInstitution(token, institutionCode.value)
  }, { fallbackMessage: 'Failed to load institution' })

  if (data) inst.value = data
}

onMounted(load)

const title = computed(() => {
  const i = inst.value
  return i?.name || 'Institution'
})

const campuses = computed(() => {
  const c = inst.value?.campuses
  return Array.isArray(c) ? c : []
})

const mainCampus = computed(() => {
  const c = campuses.value
  return c.find((x) => x?.is_main) || c[0] || null
})

const branchCampuses = computed(() => {
  const c = campuses.value
  const main = mainCampus.value
  if (!c.length) return []
  return c.filter((x) => x && x !== main)
})

function mapsLinkForCampus(c) {
  const q = String(c?.map_query || c?.campus || '').trim()
  if (!q) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

const embeddedMapUrl = computed(() => {
  const c = mainCampus.value
  const q = String(c?.map_query || '').trim()
  if (!q) return ''
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`
})

const hasAside = computed(() => {
  const m = inst.value?.metadata
  return !!(m && typeof m === 'object' && Object.keys(m || {}).length)
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

function campusLabel(c) {
  const raw = [
    String(c?.campus || '').trim(),
    String(c?.town || '').trim(),
    String(c?.county || '').trim(),
    String(c?.region || '').trim(),
  ].filter(Boolean)
  const seen = new Set()
  const parts = []
  for (const p of raw) {
    const k = String(p || '').trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    parts.push(p)
  }
  return parts.join(' · ')
}
</script>

<template>
  <main class="w-full px-4 sm:px-6 lg:px-8 py-6">
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

    <div
      v-else-if="inst"
      :class="['mt-6 grid gap-6', hasAside ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1']"
    >
      <section :class="[hasAside ? 'lg:col-span-2' : 'lg:col-span-3', 'space-y-6']">
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
              <h2 class="text-lg font-semibold text-gray-900">Campuses</h2>
              <div v-if="campuses.length" class="text-xs text-gray-500">{{ campuses.length }} total</div>
            </div>

            <div v-if="mainCampus" class="mt-3">
              <div class="text-sm font-medium text-gray-900">Main campus</div>
              <div class="mt-2 border rounded-lg p-3 bg-white/60">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-sm text-gray-900">{{ campusLabel(mainCampus) }}</div>
                    <a
                      v-if="mapsLinkForCampus(mainCampus)"
                      class="mt-2 inline-flex items-center gap-2 text-sm text-brand-dark hover:underline"
                      :href="mapsLinkForCampus(mainCampus)"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Google Maps"
                      aria-label="Open in Google Maps"
                    >
                      <MapPin class="h-4 w-4" />
                      <span>Open in Google Maps</span>
                    </a>
                  </div>
                </div>

                <div v-if="embeddedMapUrl" class="mt-3 overflow-hidden rounded-lg border">
                  <iframe
                    :src="embeddedMapUrl"
                    class="w-full h-56"
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                    title="Main campus map"
                  />
                </div>
              </div>
            </div>

            <div v-if="branchCampuses.length" class="mt-4">
              <div class="text-sm font-medium text-gray-900">Branch campuses</div>
              <div class="mt-2 space-y-2">
                <div v-for="(c, idx) in branchCampuses" :key="`${c.campus || ''}:${idx}`" class="border rounded-lg p-3 bg-white/60">
                  <div class="flex items-start justify-between gap-3">
                    <div class="text-sm text-gray-900">{{ campusLabel(c) }}</div>
                    <a
                      v-if="mapsLinkForCampus(c)"
                      class="inline-flex items-center gap-2 text-sm text-brand-dark hover:underline shrink-0"
                      :href="mapsLinkForCampus(c)"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Google Maps"
                      aria-label="Open in Google Maps"
                    >
                      <MapPin class="h-4 w-4" />
                      <span class="hidden sm:inline">Maps</span>
                      <span class="sr-only sm:hidden">Maps</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <p v-if="!campuses.length" class="mt-2 text-sm text-gray-600">No campus location data available yet.</p>
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

      <aside v-if="hasAside" class="space-y-6">
        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Additional details</h2>
          <pre class="mt-3 text-xs text-gray-700 whitespace-pre-wrap break-words">{{ inst.metadata }}</pre>
        </div>
      </aside>
    </div>
  </main>
</template>
