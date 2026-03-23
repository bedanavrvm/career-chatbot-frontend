<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  Target, 
  Lightbulb, 
  Users2, 
  Rocket, 
  ClipboardList, 
  Search, 
  Briefcase, 
  ChevronRight,
  Info,
  CheckCircle2,
  Trophy,
  History
} from 'lucide-vue-next'

import { onetGetOccupationDetail } from '../lib/api'
import { useApiCall } from '../utils/useApiCall'

const route = useRoute()
const router = useRouter()
const { loading, error, run } = useApiCall({ toastErrors: true })

const detail = ref(null)

const socCode = computed(() => String(route.params?.soc_code || '').trim())

async function load () {
  detail.value = null
  if (!socCode.value) return
  const data = await run(() => onetGetOccupationDetail(socCode.value), { fallbackMessage: 'Failed to load occupation' })
  if (data) detail.value = data
}

function back () {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'career_matches' })
}

onMounted(load)
</script>

<template>
  <main class="min-h-screen bg-slate-100/60 pb-20 relative overflow-hidden">
    <!-- Background Decorations -->
    <div class="fixed top-0 left-0 w-full h-full pointer-events-none">
      <div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full animate-pulse"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full delay-1000 animate-pulse"></div>
    </div>

    <!-- Header -->
    <header class="bg-white/80 backdrop-blur-xl border-b border-white sticky top-0 z-30 px-4 py-4 sm:px-6">
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <button 
            @click="back" 
            class="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-gray-500 hover:text-brand hover:border-brand transition-all shadow-sm group"
          >
            <ArrowLeft class="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 class="text-xl font-black text-gray-900 leading-tight">{{ detail?.title || socCode || 'Career' }}</h1>
            <p class="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">Career Insight · {{ detail?.onetsoc_code || socCode }}</p>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 relative z-10">
      <div v-if="error" class="p-6 rounded-3xl bg-red-50 border border-red-100 text-red-600 flex items-center gap-3 mb-6">
        <Info class="h-5 w-5" />
        <span class="text-sm font-bold tracking-tight">{{ error }}</span>
      </div>

      <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
        <div class="lg:col-span-2 space-y-8">
           <div class="h-64 bg-white/40 rounded-3xl border border-white"></div>
           <div class="h-96 bg-white/40 rounded-3xl border border-white"></div>
        </div>
        <div class="space-y-8">
           <div class="h-48 bg-white/40 rounded-3xl border border-white"></div>
           <div class="h-64 bg-white/40 rounded-3xl border border-white"></div>
        </div>
      </div>

      <div v-else-if="detail" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content -->
        <section class="lg:col-span-2 space-y-8">
          <!-- Overview -->
          <div class="glass-card-premium p-6 sm:p-8">
             <div class="flex items-center gap-3 mb-6">
                <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                  <Info class="h-5 w-5" />
                </div>
                <h2 class="text-xs font-black text-gray-600 uppercase tracking-widest">Career Overview</h2>
             </div>
             <p class="text-base text-gray-800 leading-relaxed font-bold tracking-tight">
               {{ detail.description || '—' }}
             </p>
          </div>

          <!-- Tasks -->
          <div class="glass-card-premium p-6 sm:p-8">
             <div class="flex items-center gap-3 mb-8">
                <div class="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ClipboardList class="h-5 w-5" />
                </div>
                <h2 class="text-xs font-black text-gray-600 uppercase tracking-widest">Key Responsibilities & Tasks</h2>
             </div>
             
             <div v-if="(detail.tasks || []).length" class="space-y-4">
                <div 
                  v-for="t in detail.tasks" 
                  :key="t.task_id"
                  class="flex gap-4 p-4 rounded-2xl bg-white border border-slate-50 group hover:border-brand/20 transition-all"
                >
                  <div class="h-6 w-6 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                     <ChevronRight class="h-4 w-4" />
                  </div>
                  <p class="text-sm font-bold text-gray-700 leading-relaxed tracking-tight">{{ t.task }}</p>
                </div>
             </div>
             <div v-else class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p class="text-sm font-bold text-gray-500 uppercase tracking-widest">No detailed tasks available</p>
             </div>
          </div>
        </section>

        <!-- Sidebar Actions -->
        <aside class="space-y-8">
          <!-- RIASEC Visual -->
          <div class="glass-card-premium p-6 sm:p-8">
             <div class="flex items-center gap-3 mb-8">
                <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                  <Target class="h-5 w-5" />
                </div>
                <h2 class="text-xs font-black text-gray-600 uppercase tracking-widest">RIASEC Profile</h2>
             </div>

             <div class="space-y-4">
                <div v-for="k in ['R','I','A','S','E','C']" :key="k" class="space-y-1.5">
                   <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-600">
                      <span>{{ {R:'Realistic', I:'Investigative', A:'Artistic', S:'Social', E:'Enterprising', C:'Conventional'}[k] }}</span>
                      <span class="text-gray-900">{{ detail.riasec?.[k] ?? 0 }}</span>
                   </div>
                   <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        class="h-full bg-brand rounded-full shadow-glow-sm"
                        :style="{ width: `${Math.min(100, (detail.riasec?.[k] ?? 0) * 15)}%` }"
                      ></div>
                   </div>
                </div>
             </div>
          </div>

          <!-- Top Skills -->
          <div class="glass-card-premium p-6 sm:p-8">
             <div class="flex items-center gap-3 mb-8">
                <div class="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Trophy class="h-5 w-5" />
                </div>
                <h2 class="text-xs font-black text-gray-600 uppercase tracking-widest">Top Expert Skills</h2>
             </div>

             <div v-if="(detail.top_skills || []).length" class="space-y-4">
                <div v-for="s in detail.top_skills" :key="s.element_id" class="p-4 rounded-2xl bg-white border border-slate-50 group hover:shadow-lg transition-all">
                   <div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="text-sm font-black text-gray-900">{{ s.name }}</p>
                        <p class="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">{{ s.element_id }}</p>
                      </div>
                      <div class="h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                         <span class="text-[10px] font-black text-emerald-600 uppercase">{{ s.importance }} / 5</span>
                      </div>
                   </div>
                </div>
             </div>
             <p v-else class="text-xs font-bold text-gray-500 uppercase tracking-widest text-center py-4">No skills listed</p>
          </div>

          <!-- Related Careers -->
          <div class="glass-card-premium p-6 sm:p-8">
             <div class="flex items-center gap-3 mb-8">
                <div class="h-10 w-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Briefcase class="h-5 w-5" />
                </div>
                <h2 class="text-xs font-black text-gray-600 uppercase tracking-widest">Related Careers</h2>
             </div>

             <div v-if="(detail.related || []).length" class="space-y-3">
                <button
                  v-for="r in detail.related"
                  :key="r.soc_code"
                  @click="router.push({ name: 'career_details', params: { soc_code: r.soc_code } })"
                  class="w-full text-left p-4 rounded-2xl bg-white border border-slate-50 hover:border-brand/20 hover:shadow-md transition-all group"
                >
                  <p class="text-sm font-black text-gray-900 group-hover:text-brand transition-colors">{{ r.title }}</p>
                  <p class="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">{{ r.soc_code }} · Tier {{ r.tier }}</p>
                </button>
             </div>
             <p v-else class="text-xs font-bold text-gray-500 uppercase tracking-widest text-center py-4">No recommendations</p>
          </div>
        </aside>
      </div>
    </div>
  </main>
</template>

<style scoped>
.glass-card-premium {
  @apply bg-white/70 backdrop-blur-2xl border-2 border-white rounded-[2rem] shadow-xl shadow-slate-200/50;
}
.shadow-glow-sm {
  box-shadow: 0 0 10px rgba(var(--brand-rgb, 99, 102, 241), 0.3);
}
</style>
