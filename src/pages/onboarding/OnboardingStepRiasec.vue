<script setup>
const props = defineProps({
  idx: { type: Number, default: 0 },
  total: { type: Number, default: 1 },
  question: { type: Object, default: null },
  selectedOptionId: { type: String, default: null },
})

const emit = defineEmits(['back', 'next', 'choose'])
</script>

<template>
  <section class="mt-6 space-y-6">
    <div class="card p-6">
      <div class="flex items-center justify-between gap-4">
        <div class="text-sm text-gray-600">Question {{ (idx + 1) }} of {{ (total || 1) }}</div>
        <div class="text-sm text-gray-500">Pick the option you would most likely do</div>
      </div>
      <div class="mt-4 text-lg font-semibold text-gray-900">{{ question?.text || '' }}</div>
      <div class="mt-6 grid grid-cols-1 gap-3">
        <button
          v-for="opt in (question?.options || [])"
          :key="opt.id"
          class="btn btn-outline btn-lg text-left justify-start"
          :class="selectedOptionId === opt.id ? 'btn-primary' : ''"
          @click="emit('choose', opt)"
        >{{ opt.text }}</button>
      </div>
      <div class="mt-6 flex gap-3">
        <button class="btn btn-secondary btn-lg" @click="emit('back')">Back</button>
        <button class="btn btn-primary btn-lg" @click="emit('next')">Next</button>
      </div>
    </div>
  </section>
</template>
