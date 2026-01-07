<script setup>
defineProps({
  hs: { type: Object, required: true },
  kcseGrades: { type: Array, required: true },
  subjectByCode: { type: Object, required: true },
  hsAvailableSubjects: { type: Array, required: true },
  hsValidation: { type: Object, required: true },
  hsSubjectQuery: { type: String, default: '' },
  knecMinSubjects: { type: Number, required: true },
  knecMaxSubjects: { type: Number, required: true },
})

const emit = defineEmits([
  'set-hs-kcse-mean-grade',
  'set-hs-subject-query',
  'add-subject',
  'remove-subject',
  'toggle-favorite',
  'set-hs-subject-grade',
  'drag-start',
  'drop',
])

function setMeanGrade(e) {
  emit('set-hs-kcse-mean-grade', e?.target?.value || '')
}

function setQuery(e) {
  emit('set-hs-subject-query', e?.target?.value || '')
}

function setSubjectGrade(code, e) {
  emit('set-hs-subject-grade', code, e?.target?.value || '')
}
</script>

<template>
  <div>
    <div>
      <label class="label">KCSE Mean Grade</label>
      <select :value="hs?.kcse_mean_grade || ''" class="input input-md w-full" @change="setMeanGrade">
        <option value="">Select</option>
        <option v-for="g in kcseGrades" :key="g">{{ g }}</option>
      </select>
    </div>

    <div class="card p-2 mt-3" @dragover.prevent @drop.prevent="(e) => emit('drop', e)">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-base font-semibold">KCSE subjects & grades</div>
          <div class="text-xs text-gray-600">Requirements: {{ knecMinSubjects }}–{{ knecMaxSubjects }} subjects, include Mathematics and at least one language.</div>
        </div>
        <input :value="hsSubjectQuery" class="input input-md" placeholder="Search…" @input="setQuery" />
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
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

      <div v-if="(hs?.subject_codes || []).length" class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div
          v-for="code in (hs?.subject_codes || [])"
          :key="code"
          class="flex h-full flex-col gap-1 rounded-xl border border-gray-100 p-2 md:flex-row md:items-center md:justify-between"
        >
          <div class="min-w-0">
            <div class="font-medium text-gray-900">{{ subjectByCode?.[code]?.name || code }}</div>
            <div class="text-xs text-gray-500">{{ code }} · {{ subjectByCode?.[code]?.group || 'Subject' }}</div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select
              class="input input-md"
              :value="hs?.subject_grades?.[code] || ''"
              @change="(e) => setSubjectGrade(code, e)"
            >
              <option value="">Grade</option>
              <option v-for="g in kcseGrades" :key="g" :value="g">{{ g }}</option>
            </select>

            <button
              type="button"
              class="px-3 py-1.5 rounded-lg border text-sm transition-all hover:shadow-sm active:scale-[0.99]"
              :class="(hs?.favorite_subjects || []).includes(subjectByCode?.[code]?.name) ? 'border-brand bg-brand text-white' : 'border-gray-200 bg-white text-gray-700'"
              @click="emit('toggle-favorite', code)"
            >Favourite</button>

            <button
              type="button"
              class="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm transition-all hover:bg-gray-50 hover:shadow-sm active:scale-[0.99]"
              @click="emit('remove-subject', code)"
            >Remove</button>
          </div>
        </div>
      </div>

      <div class="mt-3 text-xs" :class="hsValidation?.ok ? 'text-green-700' : 'text-gray-700'">
        <div>
          <span class="font-medium">Selected:</span> {{ hsValidation?.n || 0 }} / {{ knecMaxSubjects }}
          <span class="mx-2 text-gray-400">·</span>
          <span class="font-medium">Math:</span> {{ hsValidation?.hasMandatory ? 'OK' : 'Missing' }}
          <span class="mx-2 text-gray-400">·</span>
          <span class="font-medium">Language:</span> {{ hsValidation?.hasLanguage ? 'OK' : 'Missing' }}
        </div>
        <div v-if="(hsValidation?.missingGrades || []).length"><span class="font-medium">Grades missing for:</span> {{ (hsValidation?.missingGrades || []).join(', ') }}</div>
      </div>
    </div>
  </div>
</template>
