<script setup>
defineProps({
  uni: { type: Object, required: true },
})

const emit = defineEmits(['set-uni'])

import { GraduationCap, BookOpen, Briefcase } from 'lucide-vue-next'

function setField(key, e) {
  emit('set-uni', { key, value: e?.target?.value || '' })
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="p-6 rounded-3xl bg-white/40 border border-white/60 shadow-inner space-y-3">
      <label class="label flex items-center gap-2">
        <GraduationCap class="h-4 w-4 text-brand" />
        Qualification
      </label>
      <select :value="uni?.qualification || ''" class="input" @change="(e) => setField('qualification', e)">
        <option value="">Select Qualification</option>
        <option>Certificate</option><option>Diploma</option><option>Bachelor's</option><option>Master's</option>
      </select>
    </div>
    
    <div class="p-6 rounded-3xl bg-white/40 border border-white/60 shadow-inner space-y-3">
      <label class="label flex items-center gap-2">
        <Briefcase class="h-4 w-4 text-brand" />
        Current Status
      </label>
      <select :value="uni?.current_status || ''" class="input" @change="(e) => setField('current_status', e)">
        <option value="">Select Status</option>
        <option>Still Studying</option><option>Graduate</option><option>Job Seeking</option><option>Employed</option>
      </select>
    </div>

    <div class="md:col-span-2 p-6 rounded-3xl bg-white/40 border border-white/60 shadow-inner space-y-3">
      <label class="label flex items-center gap-2">
        <BookOpen class="h-4 w-4 text-brand" />
        Field of Study
      </label>
      <input :value="uni?.field_of_study || ''" class="input" placeholder="e.g. Computer Science" @input="(e) => setField('field_of_study', e)" />
    </div>
  </div>
</template>
