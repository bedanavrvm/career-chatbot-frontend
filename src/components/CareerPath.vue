<script setup>
import { computed } from 'vue'
import { Briefcase, TrendingUp, Trophy, HelpCircle } from 'lucide-vue-next'

const props = defineProps({
  path: {
    type: Object,
    required: true,
    default: () => ({ entry: [], mid: [], senior: [], unknown: [] })
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const stages = computed(() => [
  {
    key: 'entry',
    label: 'Entry-level',
    icon: Briefcase,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    dotColor: 'bg-blue-500',
    items: props.path?.entry || []
  },
  {
    key: 'mid',
    label: 'Mid-level',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    dotColor: 'bg-purple-500',
    items: props.path?.mid || []
  },
  {
    key: 'senior',
    label: 'Senior-level',
    icon: Trophy,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    dotColor: 'bg-amber-500',
    items: props.path?.senior || []
  }
])

const hasUnknown = computed(() => (props.path?.unknown || []).length > 0)
const unknownItems = computed(() => props.path?.unknown || [])
</script>

<template>
  <div class="career-path-container mt-6">
    <h4 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
      <TrendingUp class="w-4 h-4 text-brand" />
      Career Trajectory
    </h4>

    <div v-if="loading" class="space-y-6">
      <div v-for="i in 3" :key="i" class="flex gap-4 animate-pulse">
        <div class="relative flex flex-col items-center">
          <div class="w-3 h-3 rounded-full bg-gray-200"></div>
          <div class="w-0.5 h-full bg-gray-100 mt-1"></div>
        </div>
        <div class="flex-1 pb-6">
          <div class="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div class="h-3 bg-gray-100 rounded w-3/4"></div>
        </div>
      </div>
    </div>

    <div v-else class="relative">
      <div v-for="(stage, idx) in stages" :key="stage.key" class="flex gap-4 group">
        <!-- Connector line & Dot -->
        <div class="relative flex flex-col items-center shrink-0">
          <div 
            :class="[
              'w-3 h-3 rounded-full z-10 transition-transform group-hover:scale-125 shadow-sm', 
              stage.items.length ? stage.dotColor : 'bg-gray-200'
            ]"
          ></div>
          <div 
            v-if="idx < stages.length - 1" 
            class="w-0.5 flex-1 bg-gray-200 my-1 group-hover:bg-gray-300 transition-colors"
          ></div>
        </div>

        <!-- Content -->
        <div :class="['flex-1 pb-8', idx === stages.length - 1 ? 'pb-2' : '']">
          <div class="flex items-center gap-2 mb-2">
            <component :is="stage.icon" :class="['w-3.5 h-3.5', stage.items.length ? stage.color : 'text-gray-400']" />
            <span :class="['text-xs font-bold uppercase tracking-wider', stage.items.length ? 'text-gray-700' : 'text-gray-400']">
              {{ stage.label }}
            </span>
          </div>

          <div v-if="stage.items.length" class="flex flex-wrap gap-1.5">
            <div 
              v-for="item in stage.items" 
              :key="item.onetsoc_code"
              class="px-2 py-1 rounded-md bg-white border border-gray-100 shadow-sm text-[11px] text-gray-700 hover:border-brand/30 hover:bg-brand/[0.02] transition-all cursor-default"
              :title="item.description"
            >
              {{ item.title }}
            </div>
          </div>
          <div v-else class="text-[11px] italic text-gray-400">
            No specific data for this level
          </div>
        </div>
      </div>

      <!-- Unknown / General -->
      <div v-if="hasUnknown" class="mt-4 pt-4 border-t border-dashed border-gray-200">
        <div class="flex items-center gap-2 mb-2">
          <HelpCircle class="w-3.5 h-3.5 text-gray-400" />
          <span class="text-xs font-bold uppercase tracking-wider text-gray-400">Other Roles</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <div 
            v-for="item in unknownItems" 
            :key="item.onetsoc_code"
            class="px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-[11px] text-gray-500"
            :title="item.description"
          >
            {{ item.title }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.career-path-container {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
