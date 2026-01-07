<script setup>
import { ref, computed, onMounted } from 'vue'
import { catalogStatus } from '../lib/api'

const status = ref(null)
const error = ref('')
const dismissed = ref(false)

const warnings = computed(() => {
  const w = status.value?.warnings
  return Array.isArray(w) ? w : []
})

const lastRun = computed(() => status.value?.etl?.last_run || null)

const showCatalogEmpty = computed(() => warnings.value.includes('catalog_db_empty'))
const showRagLexical = computed(() => warnings.value.includes('rag_lexical_only'))

const ragEnabled = computed(() => !!status.value?.rag?.enabled)
const ragMode = computed(() => String(status.value?.rag?.mode || ''))

const show = computed(() => !dismissed.value && (!!error.value || showCatalogEmpty.value || showRagLexical.value))

function dismiss () {
  dismissed.value = true
}

async function loadStatus () {
  try {
    error.value = ''
    status.value = await catalogStatus()
  } catch (e) {
    error.value = e?.message || 'Failed to load system status'
  }
}

onMounted(async () => {
  await loadStatus()
})
</script>

<template>
  <div v-if="show" class="container-page pt-4">
    <div class="flex flex-col gap-3">
      <div v-if="error" class="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-800">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="font-semibold text-red-900">System status unavailable</div>
            <div class="mt-0.5">{{ error }}</div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" @click="dismiss">Dismiss</button>
        </div>
      </div>

      <div v-if="showCatalogEmpty" class="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="font-semibold text-amber-900">Catalog database is empty</div>
            <div class="mt-0.5">
              Programs and institutions may not load. Ask an admin to run the ETL load.
            </div>
            <div v-if="lastRun" class="mt-1 text-xs text-amber-700">
              Last ETL run:
              <span class="font-mono">{{ lastRun.action || 'unknown' }}</span>
              <span v-if="lastRun.created_at"> · {{ lastRun.created_at }}</span>
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" @click="dismiss">Dismiss</button>
        </div>
      </div>

      <div v-if="showRagLexical" class="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm text-sky-800">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="font-semibold text-sky-900">RAG is running in lexical-only mode</div>
            <div class="mt-0.5">
              Vector embeddings are missing. Retrieval quality may be lower until embeddings are backfilled.
            </div>
            <div class="mt-1 text-xs text-sky-700">
              Mode:
              <span class="font-mono">{{ ragEnabled ? (ragMode || 'lexical') : 'disabled' }}</span>
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" @click="dismiss">Dismiss</button>
        </div>
      </div>
    </div>
  </div>
</template>
