<script setup>
const props = defineProps({
  hs: { type: Object, required: true },
  kcseGrades: { type: Array, default: () => [] },
  subjectByCode: { type: Object, default: () => ({}) },
  hsAvailableSubjects: { type: Array, default: () => [] },
  hsValidation: { type: Object, required: true },
  hsSubjectQuery: { type: String, default: '' },
  knecMinSubjects: { type: Number, default: 7 },
  knecMaxSubjects: { type: Number, default: 9 },
})

const emit = defineEmits([
  'back',
  'next',
  'set-hs-subject-query',
  'set-hs-kcse-mean-grade',
  'set-hs-subject-grade',
  'add-subject',
  'remove-subject',
  'toggle-favorite',
  'drag-start',
  'drop',
])
</script>

<template>
  <section class="mt-6 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="label">KCSE Mean Grade</label>
        <select
          class="input input-lg w-full"
          :value="hs.kcse_mean_grade || ''"
          @change="(e) => emit('set-hs-kcse-mean-grade', e?.target?.value || '')"
        >
          <option value="">Select</option>
          <option v-for="g in kcseGrades" :key="g">{{ g }}</option>
        </select>
      </div>
      <div>
        <label class="label">Favorite subjects</label>
        <div class="text-sm text-gray-600">Mark favorites from your selected subjects.</div>
        <div class="mt-2 flex flex-wrap gap-2">
          <span
            v-for="nm in (hs.favorite_subjects || [])"
            :key="nm"
            class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm"
          >{{ nm }}</span>
          <span v-if="!(hs.favorite_subjects || []).length" class="text-sm text-gray-500">—</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold">Available subjects</div>
            <div class="text-sm text-gray-600">Drag or click to add ({{ hsValidation.n }}/{{ knecMaxSubjects }})</div>
          </div>
          <input
            class="input input-md"
            placeholder="Search…"
            :value="hsSubjectQuery"
            @input="(e) => emit('set-hs-subject-query', e?.target?.value || '')"
          />
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="s in hsAvailableSubjects"
            :key="s.code"
            type="button"
            class="chip-btn"
            draggable="true"
            @dragstart="(e) => emit('drag-start', e, s.code)"
            @click="emit('add-subject', s.code)"
          >{{ s.name }}</button>
        </div>
      </div>

      <div class="card p-4" @dragover.prevent @drop.prevent="(e) => emit('drop', e)">
        <div class="text-lg font-semibold">Your subjects & grades</div>
        <div class="text-sm text-gray-600">Drop subjects here, then set grades. Requirements: {{ knecMinSubjects }}–{{ knecMaxSubjects }} subjects, include Mathematics and at least one language (English/Kiswahili/KSL).</div>

        <div v-if="(hs.subject_codes || []).length" class="mt-4 space-y-2">
          <div
            v-for="code in (hs.subject_codes || [])"
            :key="code"
            class="flex flex-col gap-2 rounded-xl border border-gray-100 p-3 md:flex-row md:items-center md:justify-between"
          >
            <div class="min-w-0">
              <div class="font-medium text-gray-900">{{ subjectByCode[code]?.name || code }}</div>
              <div class="text-xs text-gray-500">{{ code }} · {{ subjectByCode[code]?.group || 'Subject' }}</div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select
                class="input input-md"
                :value="hs.subject_grades?.[code] || ''"
                @change="(e) => emit('set-hs-subject-grade', code, e?.target?.value || '')"
              >
                <option value="">Grade</option>
                <option v-for="g in kcseGrades" :key="g" :value="g">{{ g }}</option>
              </select>

              <button
                type="button"
                class="px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-sm active:scale-[0.99]"
                :class="(hs.favorite_subjects || []).includes(subjectByCode[code]?.name) ? 'border-brand bg-brand text-white' : 'border-gray-200 bg-white text-gray-700'"
                @click="emit('toggle-favorite', code)"
              >Favourite</button>

              <button
                type="button"
                class="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm transition-all hover:bg-gray-50 hover:shadow-sm active:scale-[0.99]"
                @click="emit('remove-subject', code)"
              >Remove</button>
            </div>
          </div>
        </div>
        <div v-else class="mt-4 rounded-xl border border-dashed border-gray-200 p-6 text-gray-600">
          Drag subjects here (or click from the left).
        </div>

        <div class="mt-4 text-sm" :class="hsValidation.ok ? 'text-green-700' : 'text-gray-700'">
          <div><span class="font-medium">Selected:</span> {{ hsValidation.n }} / {{ knecMaxSubjects }}</div>
          <div><span class="font-medium">Math:</span> {{ hsValidation.hasMandatory ? 'OK' : 'Missing' }}</div>
          <div><span class="font-medium">Language:</span> {{ hsValidation.hasLanguage ? 'OK' : 'Missing' }}</div>
          <div v-if="hsValidation.missingGrades.length"><span class="font-medium">Grades missing for:</span> {{ hsValidation.missingGrades.join(', ') }}</div>
        </div>
      </div>
    </div>

    <div class="mt-2 flex gap-3">
      <button class="btn btn-secondary btn-lg" @click="emit('back')">Back</button>
      <button class="btn btn-primary btn-lg" :disabled="!hsValidation.ok" @click="emit('next')">Continue</button>
    </div>
  </section>
</template>
