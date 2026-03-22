<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  Target, 
  Award, 
  Sigma, 
  HelpCircle,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileText,
  MousePointer2
} from 'lucide-vue-next'
import { onboardingDashboard } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'
import { subjectByCode } from './onboarding/kcseSubjects'

const _KCSE_SUBJECT_BY_CODE = subjectByCode()

const router = useRouter()

const { user, getIdToken } = useAuth()
const { loading, error, run } = useApiCall({ toastErrors: true })

const kcse = ref({ has_grades: false, cluster_score: null, subjects_provided: 0, top4_points: 0, top7_points: 0, subjects: [], top4_subjects: [], top7_subjects: [], formula: null })

async function load() {
  const data = await run(async () => {
    const u = user.value
    if (!u) {
      router.replace('/login')
      return null
    }
    const token = await getIdToken(true)
    return onboardingDashboard(token)
  }, { fallbackMessage: 'Failed to load scores' })
  if (!data) return
  kcse.value = data?.kcse || kcse.value
}

onMounted(load)

const sortedSubjects = computed(() => {
  const rows = Array.isArray(kcse.value?.subjects) ? kcse.value.subjects : []
  return [...rows].sort((a, b) => {
    const ap = Number(a?.points || 0)
    const bp = Number(b?.points || 0)
    if (bp !== ap) return bp - ap
    return String(a?.subject_code || '').localeCompare(String(b?.subject_code || ''))
  })
})

const top4Set = computed(() => new Set((kcse.value?.top4_subjects || []).map(s => String(s || '').toUpperCase())))
const top7Set = computed(() => new Set((kcse.value?.top7_subjects || []).map(s => String(s || '').toUpperCase())))

function fmt(v) {
  if (v == null) return '—'
  const n = Number(v)
  return Number.isNaN(n) ? String(v) : String(n)
}
</script>

<template>
  <main class="min-h-screen bg-slate-100/60 pb-20">
    <!-- Header -->
    <header class="bg-white/80 backdrop-blur-xl border-b border-white sticky top-0 z-30 px-4 py-4 sm:px-6">
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <button 
            @click="router.back()" 
            class="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-gray-500 hover:text-brand hover:border-brand transition-all shadow-sm group"
          >
            <ArrowLeft class="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 class="text-xl font-black text-gray-900 leading-tight">Academic Profile</h1>
            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">KCSE weighted performance</p>
          </div>
        </div>
        <div v-if="kcse.cluster_score" class="h-10 px-4 rounded-2xl bg-brand font-black text-white text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand/20">
           <Zap class="h-4 w-4" />
           Agg. Score: {{ fmt(kcse.cluster_score) }}
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6">
      <div v-if="loading" class="space-y-8 animate-pulse">
         <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div v-for="i in 3" :key="i" class="h-40 bg-white/40 rounded-3xl border border-white"></div>
         </div>
         <div class="h-96 bg-white/40 rounded-3xl border border-white"></div>
      </div>

      <div v-else class="space-y-8">
        <!-- Top Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="glass-card-premium p-6 border-brand/10 bg-brand/[0.02]">
            <div class="flex items-center justify-between mb-4">
               <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                 <Target class="h-6 w-6" />
               </div>
               <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Weighted Strength</span>
            </div>
            <p class="text-4xl font-black text-gray-900 tracking-tighter">{{ fmt(kcse.cluster_score) }}</p>
            <div class="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
               <CheckCircle2 v-if="kcse.has_grades" class="h-3 w-3 text-emerald-500" />
               <AlertCircle v-else class="h-3 w-3 text-orange-500" />
               {{ kcse.has_grades ? `${kcse.subjects_provided} Subjects Indexed` : 'Grades Required' }}
            </div>
          </div>

          <div class="glass-card-premium p-6">
            <div class="flex items-center justify-between mb-4">
               <div class="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                 <Award class="h-6 w-6" />
               </div>
               <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top 4 Points</span>
            </div>
            <p class="text-4xl font-black text-gray-900 tracking-tighter">{{ fmt(kcse.top4_points) }}</p>
            <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Cluster Core (R)</p>
          </div>

          <div class="glass-card-premium p-6">
            <div class="flex items-center justify-between mb-4">
               <div class="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                 <Sigma class="h-6 w-6" />
               </div>
               <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top 7 Points</span>
            </div>
            <p class="text-4xl font-black text-gray-900 tracking-tighter">{{ fmt(kcse.top7_points) }}</p>
            <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Aggregate Breadth (T)</p>
          </div>
        </div>

        <!-- Formula Section -->
        <section class="glass-card-premium p-6 sm:p-8 overflow-hidden relative">
           <div class="absolute top-0 right-0 h-48 w-48 bg-brand/5 blur-3xl -mr-24 -mt-24 rounded-full"></div>
           <div class="flex items-center gap-3 mb-6">
              <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                <HelpCircle class="h-6 w-6" />
              </div>
              <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Algorithm Used</h2>
           </div>
           
           <div v-if="kcse.formula" class="flex flex-col md:flex-row items-center gap-8">
              <div class="p-6 rounded-3xl bg-gray-900 text-white font-mono text-lg shadow-2xl shadow-slate-200">
                 Score = √((R / {{ kcse.formula.R }}) × (T / {{ kcse.formula.T }})) × 48
              </div>
              <div class="max-w-md space-y-2">
                 <p class="text-sm font-bold text-gray-600 leading-relaxed">
                   This is the standardized KUCCPS cluster calculation formula. 
                   <span class="text-brand">R</span> represents your top 4 subjects, 
                   and <span class="text-indigo-500">T</span> represents your top 7 subjects.
                 </p>
              </div>
           </div>
           <p v-else class="text-sm font-bold text-gray-400 text-center py-4 bg-slate-50 rounded-2xl">Formula schema pending data.</p>
        </section>

        <!-- Subjects Table -->
        <section class="glass-card-premium p-6 sm:p-8">
           <div class="flex items-center justify-between gap-4 mb-8">
              <div class="flex items-center gap-3">
                 <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                   <FileText class="h-6 w-6" />
                 </div>
                 <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Grades Matrix</h2>
              </div>
              <div class="flex items-center gap-4">
                 <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded bg-brand shadow-sm"></div>
                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Core 4</span>
                 </div>
                 <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded bg-brand/30 shadow-sm border border-brand/50"></div>
                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Breadth 7</span>
                 </div>
              </div>
           </div>

           <div v-if="sortedSubjects.length" class="overflow-hidden rounded-3xl border border-slate-100">
             <table class="min-w-full divide-y divide-slate-100">
               <thead class="bg-slate-50/50">
                 <tr>
                   <th class="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                   <th class="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade</th>
                   <th class="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Points</th>
                   <th class="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Impact</th>
                 </tr>
               </thead>
               <tbody class="divide-y divide-slate-100 bg-white/20 backdrop-blur-sm">
                 <tr
                   v-for="(s, idx) in sortedSubjects"
                   :key="idx"
                   class="group transition-colors"
                   :class="[
                     top4Set.has(String(s.subject_code).toUpperCase()) ? 'bg-brand/[0.04]' : (top7Set.has(String(s.subject_code).toUpperCase()) ? 'bg-brand/[0.02]' : '')
                   ]"
                 >
                   <td class="px-6 py-5 whitespace-nowrap">
                      <div class="flex items-center gap-3">
                         <div :class="['h-2 w-2 rounded-full', top4Set.has(String(s.subject_code).toUpperCase()) ? 'bg-brand' : (top7Set.has(String(s.subject_code).toUpperCase()) ? 'bg-brand/40' : 'bg-slate-200')]"></div>
                         <div class="flex flex-col">
                            <span class="text-sm font-black text-gray-900 font-mono">{{ s.subject_code }}</span>
                            <span class="text-[10px] font-bold text-gray-400 truncate max-w-[100px]">{{ _KCSE_SUBJECT_BY_CODE[s.subject_code]?.name || 'Elective Subject' }}</span>
                         </div>
                      </div>
                   </td>
                   <td class="px-6 py-5">
                      <span class="px-3 py-1 rounded-lg bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                         {{ s.grade || '—' }}
                      </span>
                   </td>
                   <td class="px-6 py-5">
                      <span class="text-sm font-black text-gray-900">{{ fmt(s.points) }}</span>
                   </td>
                   <td class="px-6 py-5 text-right">
                      <span v-if="top4Set.has(String(s.subject_code).toUpperCase())" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-brand/20">
                         <Zap class="h-3 w-3" />
                         CORE 4
                      </span>
                      <span v-else-if="top7Set.has(String(s.subject_code).toUpperCase())" class="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                         BREADTH 7
                      </span>
                   </td>
                 </tr>
               </tbody>
             </table>
           </div>
           <div v-else class="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
              <MousePointer2 class="h-8 w-8 text-slate-300 mx-auto mb-4" />
              <p class="text-sm font-bold text-gray-400">Index your KCSE grades to populate this table.</p>
           </div>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.glass-card-premium {
  @apply bg-white/70 backdrop-blur-2xl border-2 border-white rounded-[2rem] shadow-xl shadow-slate-200/50;
}
</style>
