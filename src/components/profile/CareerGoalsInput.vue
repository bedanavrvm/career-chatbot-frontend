<script setup>
defineProps({
  careerGoals: { type: Array, default: () => [] },
  draft: { type: String, default: '' },
})

const emit = defineEmits(['set-draft', 'add', 'remove'])

import { Plus, X, Target } from 'lucide-vue-next'

function onInput(e) {
  emit('set-draft', e?.target?.value || '')
}
</script>

<template>
  <div class="space-y-4">
    <label class="label flex items-center gap-2">
      <Target class="h-4 w-4 text-brand" />
      Career Goals & Aspirations
    </label>
    <div class="flex flex-col gap-4">
      <div class="flex gap-3">
        <div class="relative flex-1 group">
          <input
            :value="draft"
            class="input pr-12 group-focus-within:border-brand"
            placeholder="e.g. Senior Software Architect"
            @input="onInput"
            @keydown.enter.prevent="emit('add')"
          />
          <div class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest pointer-events-none group-focus-within:text-brand/40">
            Enter
          </div>
        </div>
        <button 
          type="button" 
          class="h-12 px-6 rounded-2xl bg-brand text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2"
          @click="emit('add')"
        >
          <Plus class="h-4 w-4" />
          Add
        </button>
      </div>
      
      <div class="flex flex-wrap gap-2 min-h-[40px] p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
        <div
          v-for="g in (careerGoals || [])"
          :key="g"
          class="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-100 px-3 py-1.5 shadow-sm animate-in zoom-in-95 duration-200"
        >
          <span class="text-xs font-black text-gray-700 tracking-tight">{{ g }}</span>
          <button 
            type="button" 
            class="h-5 w-5 rounded-md flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors" 
            @click="emit('remove', g)"
          >
            <X class="h-3 w-3" />
          </button>
        </div>
        <div v-if="!(careerGoals || []).length" class="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2 opacity-60">
           <Target class="h-3.5 w-3.5" />
           No goals defined yet
        </div>
      </div>
    </div>
  </div>
</template>
