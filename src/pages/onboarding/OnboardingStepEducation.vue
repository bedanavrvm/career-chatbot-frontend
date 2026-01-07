<script setup>
const props = defineProps({
  educationLevel: { type: String, default: '' },
})

const emit = defineEmits(['back', 'next', 'set-education-level'])
</script>

<template>
  <section class="mt-6 space-y-4">
    <label class="label">Highest education level</label>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <button
        :class="['btn','btn-outline','btn-lg', educationLevel==='high_school' && 'btn-primary']"
        @click="emit('set-education-level', 'high_school')"
      >High School</button>
      <button
        :class="['btn','btn-outline','btn-lg', educationLevel==='college_student' && 'btn-primary']"
        @click="emit('set-education-level', 'college_student')"
      >College Student</button>
      <button
        :class="['btn','btn-outline','btn-lg', educationLevel==='college_graduate' && 'btn-primary']"
        @click="emit('set-education-level', 'college_graduate')"
      >College Graduate</button>
    </div>
    <div class="mt-4 flex gap-3">
      <button class="btn btn-secondary btn-lg" @click="emit('back')">Back</button>
      <button class="btn btn-primary btn-lg" :disabled="!educationLevel" @click="emit('next')">Continue</button>
    </div>
  </section>
</template>
