<script setup>
const props = defineProps({
  fields: { type: Object, default: null },
})

function firstMessage(v) {
  if (Array.isArray(v)) return String(v[0] || '').trim()
  if (typeof v === 'string') return v.trim()
  if (v && typeof v === 'object') return JSON.stringify(v)
  return String(v || '').trim()
}
</script>

<template>
  <div v-if="fields && Object.keys(fields).length" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
    <div class="text-sm font-semibold text-red-800">Please fix the following:</div>
    <ul class="mt-2 list-disc pl-5 text-sm text-red-700">
      <li v-for="k in Object.keys(fields)" :key="k">
        <span class="font-medium">{{ k }}</span>: {{ firstMessage(fields[k]) }}
      </li>
    </ul>
  </div>
</template>
