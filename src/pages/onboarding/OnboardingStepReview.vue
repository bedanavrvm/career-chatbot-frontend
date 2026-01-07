<script setup>
const props = defineProps({
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['back', 'submit'])
</script>

<template>
  <section class="mt-6 space-y-4">
    <p class="text-gray-700">Review complete. Submit to see your dashboard.</p>
    <div class="flex gap-3">
      <button class="btn btn-secondary btn-lg" @click="emit('back')">Back</button>
      <button class="btn btn-primary btn-lg" :disabled="loading" @click="emit('submit')">Submit</button>
    </div>
  </section>
</template>
