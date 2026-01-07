<script setup>
defineProps({
  careerGoals: { type: Array, default: () => [] },
  draft: { type: String, default: '' },
})

const emit = defineEmits(['set-draft', 'add', 'remove'])

function onInput(e) {
  emit('set-draft', e?.target?.value || '')
}
</script>

<template>
  <div>
    <label class="label">Career Goals</label>
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <input
          :value="draft"
          class="input input-lg w-full"
          @input="onInput"
          @keydown.enter.prevent="emit('add')"
        />
        <button type="button" class="btn btn-outline btn-lg" @click="emit('add')">Add</button>
      </div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="g in (careerGoals || [])"
          :key="g"
          class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm"
        >
          <span>{{ g }}</span>
          <button type="button" class="text-xs text-gray-600" @click="emit('remove', g)">Remove</button>
        </span>
        <span v-if="!(careerGoals || []).length" class="text-sm text-gray-500">—</span>
      </div>
    </div>
  </div>
</template>
