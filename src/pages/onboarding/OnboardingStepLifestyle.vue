<script setup>
const props = defineProps({
  lifestyle: { type: Object, required: true },
  preferences: { type: Object, required: true },
})

const emit = defineEmits(['back', 'next', 'set-lifestyle', 'set-preferences'])

function setLifestyle(key, value) {
  emit('set-lifestyle', { key, value })
}

function setPreferences(key, value) {
  emit('set-preferences', { key, value })
}
</script>

<template>
  <section class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="label">Preferred work environment</label>
      <select
        class="input input-lg w-full"
        :value="lifestyle.workEnvironment || ''"
        @change="(e) => setLifestyle('workEnvironment', e?.target?.value || '')"
      >
        <option value="">Select</option>
        <option>Office</option><option>Hybrid</option><option>Remote</option><option>Field / Outdoors</option>
      </select>
    </div>
    <div>
      <label class="label">Preferred work schedule</label>
      <select
        class="input input-lg w-full"
        :value="lifestyle.workSchedule || ''"
        @change="(e) => setLifestyle('workSchedule', e?.target?.value || '')"
      >
        <option value="">Select</option>
        <option>Full-time</option><option>Part-time</option><option>Flexible</option><option>Shift-based</option>
      </select>
    </div>
    <div>
      <label class="label">Willing to relocate?</label>
      <select
        class="input input-lg w-full"
        :value="lifestyle.relocation || ''"
        @change="(e) => setLifestyle('relocation', e?.target?.value || '')"
      >
        <option value="">Select</option>
        <option>Yes</option><option>No</option><option>Maybe</option>
      </select>
    </div>
    <div>
      <label class="label">Budget considerations</label>
      <select
        class="input input-lg w-full"
        :value="preferences.budget || ''"
        @change="(e) => setPreferences('budget', e?.target?.value || '')"
      >
        <option value="">Select</option>
        <option>Low-cost options</option><option>Balanced</option><option>Not sure</option>
      </select>
    </div>
    <div class="md:col-span-2">
      <label class="label">Additional notes</label>
      <input
        class="input input-lg w-full"
        placeholder="e.g., Prefer institutions near home"
        :value="preferences.notes || ''"
        @input="(e) => setPreferences('notes', e?.target?.value || '')"
      />
    </div>
    <div class="md:col-span-2 mt-4 flex gap-3">
      <button class="btn btn-secondary btn-lg" @click="emit('back')">Back</button>
      <button class="btn btn-primary btn-lg" @click="emit('next')">Continue</button>
    </div>
  </section>
</template>
