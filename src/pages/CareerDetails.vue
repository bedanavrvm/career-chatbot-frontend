<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

import { onetGetOccupationDetail } from '../lib/api'
import { useApiCall } from '../utils/useApiCall'

const route = useRoute()
const router = useRouter()
const { loading, error, run } = useApiCall({ toastErrors: true })

const detail = ref(null)

const socCode = computed(() => String(route.params?.soc_code || '').trim())

async function load () {
  detail.value = null
  if (!socCode.value) return
  const data = await run(() => onetGetOccupationDetail(socCode.value), { fallbackMessage: 'Failed to load occupation' })
  if (data) detail.value = data
}

function back () {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'career_matches' })
}

onMounted(load)
</script>

<template>
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <button class="btn btn-outline btn-sm gap-2" type="button" @click="back">
          <ArrowLeft class="h-4 w-4" />
          <span>Back</span>
        </button>
        <h1 class="mt-4 text-2xl font-bold text-gray-900">{{ detail?.title || socCode || 'Career' }}</h1>
        <p class="text-sm text-gray-600 mt-1">{{ detail?.onetsoc_code || '' }}</p>
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <div v-if="loading" class="mt-6 space-y-3 animate-pulse">
      <div class="card p-4">
        <div class="h-4 w-1/2 bg-gray-200 rounded"></div>
        <div class="mt-3 h-3 w-5/6 bg-gray-100 rounded"></div>
        <div class="mt-2 h-3 w-4/6 bg-gray-100 rounded"></div>
      </div>
      <div class="card p-4">
        <div class="h-4 w-1/3 bg-gray-200 rounded"></div>
        <div class="mt-3 h-3 w-3/4 bg-gray-100 rounded"></div>
      </div>
    </div>

    <div v-else-if="detail" class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section class="lg:col-span-2 space-y-6">
        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Overview</h2>
          <p class="mt-2 text-sm text-gray-700">{{ detail.description || '—' }}</p>
        </div>

        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Tasks</h2>
          <ul v-if="(detail.tasks || []).length" class="mt-3 space-y-2 text-sm text-gray-700 list-disc pl-5">
            <li v-for="t in detail.tasks" :key="t.task_id">{{ t.task }}</li>
          </ul>
          <p v-else class="mt-2 text-sm text-gray-600">No tasks available.</p>
        </div>
      </section>

      <aside class="space-y-6">
        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">RIASEC</h2>
          <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div v-for="k in ['R','I','A','S','E','C']" :key="k" class="flex items-center justify-between">
              <div class="text-gray-600">{{ k }}</div>
              <div class="font-medium text-gray-900">{{ detail.riasec?.[k] ?? 0 }}</div>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Top skills</h2>
          <ul v-if="(detail.top_skills || []).length" class="mt-3 space-y-2 text-sm text-gray-700">
            <li v-for="s in detail.top_skills" :key="s.element_id" class="flex items-start justify-between gap-3">
              <div>
                <div class="font-medium text-gray-900">{{ s.name }}</div>
                <div class="text-xs text-gray-500">{{ s.element_id }}</div>
              </div>
              <div class="text-xs text-gray-600 shrink-0">{{ s.importance }}</div>
            </li>
          </ul>
          <p v-else class="mt-2 text-sm text-gray-600">No skills available.</p>
        </div>

        <div class="card p-4">
          <h2 class="text-lg font-semibold text-gray-900">Related careers</h2>
          <div class="mt-3 space-y-2">
            <div
              v-for="r in (detail.related || [])"
              :key="r.soc_code"
              class="border rounded-lg p-3 bg-white/60 cursor-pointer"
              role="button"
              tabindex="0"
              @click="router.push({ name: 'career_details', params: { soc_code: r.soc_code } })"
              @keydown.enter.prevent="router.push({ name: 'career_details', params: { soc_code: r.soc_code } })"
            >
              <div class="text-sm font-medium text-gray-900">{{ r.title }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ r.soc_code }} · {{ r.tier }}</div>
            </div>
            <p v-if="!(detail.related || []).length" class="text-sm text-gray-600">No related careers.</p>
          </div>
        </div>
      </aside>
    </div>
  </main>
</template>
