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

import { Search, Trophy, Trash2, Plus, Info, CheckCircle2, AlertCircle, GraduationCap, Sparkles, Heart } from 'lucide-vue-next'

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
  <div class="space-y-6">
    <div class="p-6 rounded-3xl bg-white/40 border border-white/60 shadow-inner">
      <label class="label mb-2 flex items-center gap-2">
        <GraduationCap class="h-4 w-4 text-brand" />
        KCSE Mean Grade
      </label>
      <select :value="hs?.kcse_mean_grade || ''" class="input group-focus-within:border-brand" @change="setMeanGrade">
        <option value="">Select Mean Grade</option>
        <option v-for="g in kcseGrades" :key="g">{{ g }}</option>
      </select>
    </div>

    <div class="glass-card p-6" @dragover.prevent @drop.prevent="(e) => emit('drop', e)">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div class="space-y-1">
          <h3 class="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            KCSE Subjects & Grades
          </h3>
          <p class="text-xs font-bold text-gray-700 uppercase tracking-widest">
            Reqs: {{ knecMinSubjects }}–{{ knecMaxSubjects }} subjects (incl. Math & Lang)
          </p>
        </div>
        <div class="relative w-full md:w-64">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            :value="hsSubjectQuery" 
            class="input pl-10 h-10" 
            placeholder="Search subjects..." 
            @input="setQuery" 
          />
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mb-8">
        <button
          v-for="s in hsAvailableSubjects"
          :key="s.code"
          type="button"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100 bg-white shadow-sm text-xs font-black text-gray-600 hover:border-brand/20 hover:text-brand transition-all active:scale-95"
          draggable="true"
          @dragstart="(e) => emit('drag-start', e, s.code)"
          @click="emit('add-subject', s.code)"
        >
          <Plus class="h-3 w-3" />
          {{ s.name }}
        </button>
      </div>

      <div v-if="(hs?.subject_codes || []).length" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          v-for="code in (hs?.subject_codes || [])"
          :key="code"
          class="group p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4"
        >
          <div class="flex items-start justify-between">
            <div class="min-w-0">
              <div class="text-sm font-black text-gray-900 truncate">{{ subjectByCode?.[code]?.name || code }}</div>
              <div class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{{ code }} · {{ subjectByCode?.[code]?.group || 'Regular' }}</div>
            </div>
            <button
              type="button"
              class="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              @click="emit('remove-subject', code)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
          
          <div class="flex items-center gap-3">
            <select
              class="input h-10 py-0 flex-1"
              :value="hs?.subject_grades?.[code] || ''"
              @change="(e) => setSubjectGrade(code, e)"
            >
              <option value="">Grade</option>
              <option v-for="g in kcseGrades" :key="g" :value="g">{{ g }}</option>
            </select>

            <button
              type="button"
              class="h-10 px-4 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
              :class="(hs?.favorite_subjects || []).includes(subjectByCode?.[code]?.name) 
                ? 'border-indigo-200 bg-indigo-50 text-indigo-600' 
                : 'border-gray-100 bg-gray-50 text-gray-400 hover:text-gray-600'"
              @click="emit('toggle-favorite', code)"
            >
              <Heart :class="['h-3.5 w-3.5', (hs?.favorite_subjects || []).includes(subjectByCode?.[code]?.name) ? 'fill-current' : '']" />
              Favorite
            </button>
          </div>
        </div>
      </div>

      <!-- Validation Footer -->
      <div class="mt-8 p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4"
           :class="hsValidation?.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-gray-100'">
        <div class="flex flex-wrap items-center gap-6">
          <div class="flex items-center gap-2">
            <div :class="['h-6 w-6 rounded-lg flex items-center justify-center', hsValidation?.ok ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-200 text-slate-600']">
              <CheckCircle2 class="h-4 w-4" />
            </div>
            <span class="text-xs font-black uppercase tracking-widest text-gray-700">Selected: {{ hsValidation?.n || 0 }}/{{ knecMaxSubjects }}</span>
          </div>
          
          <div class="flex items-center gap-2">
            <div :class="['h-6 w-6 rounded-lg flex items-center justify-center', hsValidation?.hasMandatory ? 'bg-emerald-200 text-emerald-700' : 'bg-amber-100 text-amber-600']">
              <GraduationCap class="h-4 w-4" />
            </div>
            <span class="text-xs font-black uppercase tracking-widest text-gray-700">Math: {{ hsValidation?.hasMandatory ? 'OK' : 'MISSING' }}</span>
          </div>

          <div class="flex items-center gap-2">
            <div :class="['h-6 w-6 rounded-lg flex items-center justify-center', hsValidation?.hasLanguage ? 'bg-emerald-200 text-emerald-700' : 'bg-amber-100 text-amber-600']">
              <Sparkles class="h-4 w-4" />
            </div>
            <span class="text-xs font-black uppercase tracking-widest text-gray-700">Language: {{ hsValidation?.hasLanguage ? 'OK' : 'MISSING' }}</span>
          </div>
        </div>

        <div v-if="(hsValidation?.missingGrades || []).length" class="flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-widest">
          <AlertCircle class="h-4 w-4" />
          Missing grades for: {{ (hsValidation?.missingGrades || []).join(', ') }}
        </div>
      </div>
    </div>
  </div>
</template>
