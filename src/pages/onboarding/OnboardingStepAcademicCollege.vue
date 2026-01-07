<script setup>
const props = defineProps({
  uni: { type: Object, required: true },
})

const emit = defineEmits(['back', 'next', 'set-uni'])

function setUni(key, value) {
  emit('set-uni', { key, value })
}
</script>

<template>
  <section class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="label">Qualification</label>
      <select
        class="input input-lg w-full"
        :value="uni.qualification || ''"
        @change="(e) => setUni('qualification', e?.target?.value || '')"
      >
        <option value="">Select</option>
        <option>Certificate</option><option>Diploma</option><option>Bachelor's</option><option>Master's</option>
      </select>
    </div>
    <div>
      <label class="label">Field of Study</label>
      <input
        class="input input-lg w-full"
        :value="uni.field_of_study || ''"
        @input="(e) => setUni('field_of_study', e?.target?.value || '')"
      />
    </div>
    <div>
      <label class="label">Current Status</label>
      <select
        class="input input-lg w-full"
        :value="uni.current_status || ''"
        @change="(e) => setUni('current_status', e?.target?.value || '')"
      >
        <option value="">Select</option>
        <option>Still Studying</option><option>Graduate</option><option>Job Seeking</option><option>Employed</option>
      </select>
    </div>
    <div class="md:col-span-2 mt-4 flex gap-3">
      <button class="btn btn-secondary btn-lg" @click="emit('back')">Back</button>
      <button class="btn btn-primary btn-lg" @click="emit('next')">Continue</button>
    </div>
  </section>
</template>
