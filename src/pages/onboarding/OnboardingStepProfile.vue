<script setup>
const props = defineProps({
  universal: { type: Object, required: true },
  countries: { type: Array, default: () => [] },
  careerGoalDraft: { type: String, default: '' },
})

const emit = defineEmits(['next', 'set-universal', 'set-career-goal-draft', 'add-career-goal', 'remove-career-goal'])

function setUniversal(key, value) {
  emit('set-universal', { key, value })
}
</script>

<template>
  <section class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="label">Full Name</label>
      <input
        class="input input-lg w-full"
        :value="universal.fullName || ''"
        @input="(e) => setUniversal('fullName', e?.target?.value || '')"
      />
    </div>
    <div>
      <label class="label">Age</label>
      <input
        class="input input-lg w-full"
        type="number"
        min="10"
        max="100"
        :value="universal.age || ''"
        @input="(e) => setUniversal('age', e?.target?.value || '')"
      />
    </div>
    <div>
      <label class="label">Gender</label>
      <select
        class="input input-lg w-full"
        :value="universal.gender || ''"
        @change="(e) => setUniversal('gender', e?.target?.value || '')"
      >
        <option value="">Select</option>
        <option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option>
      </select>
    </div>
    <div>
      <label class="label">Country</label>
      <input
        class="input input-lg w-full"
        list="countries"
        :value="universal.country || ''"
        @input="(e) => setUniversal('country', e?.target?.value || '')"
      />
      <datalist id="countries">
        <option v-for="c in countries" :key="c" :value="c" />
      </datalist>
    </div>
    <div>
      <label class="label">County / Region</label>
      <input
        class="input input-lg w-full"
        :value="universal.region || ''"
        @input="(e) => setUniversal('region', e?.target?.value || '')"
      />
    </div>
    <div class="md:col-span-2">
      <label class="label">Career Goals</label>
      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <input
            class="input input-lg w-full"
            placeholder="e.g., ML Engineer"
            :value="careerGoalDraft"
            @input="(e) => emit('set-career-goal-draft', e?.target?.value || '')"
            @keydown.enter.prevent="emit('add-career-goal')"
          />
          <button type="button" class="btn btn-outline btn-lg" @click="emit('add-career-goal')">Add</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="g in (universal.careerGoals || [])"
            :key="g"
            class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm"
          >
            <span>{{ g }}</span>
            <button type="button" class="text-xs text-gray-600" @click="emit('remove-career-goal', g)">Remove</button>
          </span>
          <span v-if="!(universal.careerGoals || []).length" class="text-sm text-gray-500">—</span>
        </div>
      </div>
    </div>
    <div class="md:col-span-2 mt-4 flex gap-3">
      <button class="btn btn-primary btn-lg" @click="emit('next')">Save & Continue</button>
    </div>
  </section>
</template>
