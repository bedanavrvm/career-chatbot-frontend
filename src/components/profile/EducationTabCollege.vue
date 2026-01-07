<script setup>
defineProps({
  uni: { type: Object, required: true },
})

const emit = defineEmits(['set-uni'])

function setField(key, e) {
  emit('set-uni', { key, value: e?.target?.value || '' })
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div>
      <label class="label">Qualification</label>
      <select :value="uni?.qualification || ''" class="input input-md w-full" @change="(e) => setField('qualification', e)">
        <option value="">Select</option>
        <option>Certificate</option><option>Diploma</option><option>Bachelor's</option><option>Master's</option>
      </select>
    </div>
    <div>
      <label class="label">Current Status</label>
      <select :value="uni?.current_status || ''" class="input input-md w-full" @change="(e) => setField('current_status', e)">
        <option value="">Select</option>
        <option>Still Studying</option><option>Graduate</option><option>Job Seeking</option><option>Employed</option>
      </select>
    </div>
    <div class="md:col-span-2">
      <label class="label">Field of Study</label>
      <input :value="uni?.field_of_study || ''" class="input input-md w-full" @input="(e) => setField('field_of_study', e)" />
    </div>
  </div>
</template>
