<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  Target, 
  Fingerprint, 
  Lightbulb, 
  Users2, 
  Rocket, 
  ClipboardList,
  HelpCircle,
  BarChart3,
  Search,
  CheckCircle2
} from 'lucide-vue-next'
import { onboardingDashboard } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'

const router = useRouter()

const { user, getIdToken } = useAuth()
const { loading, error, run } = useApiCall({ toastErrors: true })

const profile = ref(null)
const riasec = ref({ scores: {}, top: [], narrative: '' })

const TRAIT_INFO = {
  Realistic: {
    label: 'Realistic',
    sub: 'The Doers',
    icon: Target,
    color: 'bg-red-500',
    light: 'bg-red-50 text-red-600',
    border: 'border-red-100',
    description: 'Practical, hands-on, and results-oriented. You likely prefer working with tangible objects like tools, machines, or plants rather than abstract ideas.',
    careers: ['Engineering', 'Mechanics', 'Agriculture', 'Logistics', 'Construction'],
  },
  Investigative: {
    label: 'Investigative',
    sub: 'The Thinkers',
    icon: Search,
    color: 'bg-blue-500',
    light: 'bg-blue-50 text-blue-600',
    border: 'border-blue-100',
    description: 'Analytical, curious, and precise. You enjoy solving complex problems, conducting research, and understanding how the world works through data.',
    careers: ['Data Science', 'Medicine', 'Research', 'Software Engineering', 'Actuarial'],
  },
  Artistic: {
    label: 'Artistic',
    sub: 'The Creators',
    icon: Lightbulb,
    color: 'bg-purple-500',
    light: 'bg-purple-50 text-purple-600',
    border: 'border-purple-100',
    description: 'Creative, expressive, and original. You thrive in open environments where you can communicate ideas through design, writing, or performance.',
    careers: ['Graphic Design', 'Architecture', 'Media', 'Content Creation', 'Advertising'],
  },
  Social: {
    label: 'Social',
    sub: 'The Helpers',
    icon: Users2,
    color: 'bg-teal-500',
    light: 'bg-teal-50 text-teal-600',
    border: 'border-teal-100',
    description: 'People-oriented and cooperative. You find fulfillment in teaching, helping, or healing others and prefer collaborative work environments.',
    careers: ['Teaching', 'Nursing', 'Counseling', 'HR', 'Public Health'],
  },
  Enterprising: {
    label: 'Enterprising',
    sub: 'The Persuaders',
    icon: Rocket,
    color: 'bg-orange-500',
    light: 'bg-orange-50 text-orange-600',
    border: 'border-orange-100',
    description: 'Ambitious, energetic, and influential. You enjoy leading projects, persuading others, and taking calculated risks in business or leadership.',
    careers: ['Entrepreneurship', 'Marketing', 'Law', 'Product Management', 'Politics'],
  },
  Conventional: {
    label: 'Conventional',
    sub: 'The Organizers',
    icon: ClipboardList,
    color: 'bg-slate-600',
    light: 'bg-slate-50 text-slate-600',
    border: 'border-slate-100',
    description: 'Structured, reliable, and detail-oriented. You excel at managing data, following processes, and maintaining order in complex systems.',
    careers: ['Accounting', 'Administration', 'Operations', 'Finance', 'Compliance'],
  },
}

async function load() {
  const data = await run(async () => {
    const u = user.value
    if (!u) {
      router.replace('/login')
      return null
    }
    const token = await getIdToken(true)
    return onboardingDashboard(token)
  }, { fallbackMessage: 'Failed to load RIASEC' })
  if (!data) return
  profile.value = data?.profile || null
  riasec.value = data?.riasec || riasec.value
}

onMounted(load)

const scoreRows = computed(() => {
  const scores = riasec.value?.scores || {}
  const keys = ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional']
  return keys.map(k => ({
    key: k,
    score: Number(scores?.[k] || 0),
    info: TRAIT_INFO[k],
  })).sort((a, b) => b.score - a.score)
})

const answersBreakdown = computed(() => {
  const ans = profile.value?.riasec_answers
  if (!ans || typeof ans !== 'object') return []
  const keys = ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional']
  const out = []
  for (const k of keys) {
    const arr = Array.isArray(ans[k]) ? ans[k] : []
    const sum = arr.reduce((acc, x) => acc + (Number.isFinite(Number(x)) ? Number(x) : 0), 0)
    out.push({ key: k, questions: arr.length, sum, info: TRAIT_INFO[k] })
  }
  return out.sort((a, b) => b.sum - a.sum)
})
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
            <h1 class="text-xl font-black text-gray-900 leading-tight">RIASEC Profile</h1>
            <p class="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Interest Profile Analysis</p>
          </div>
        </div>
        <div class="h-10 px-4 rounded-2xl bg-brand/5 border border-brand/10 flex items-center gap-2">
           <Fingerprint class="h-4 w-4 text-brand" />
           <span class="text-[10px] font-black text-brand uppercase tracking-widest">{{ (riasec.top || []).join(' · ') }}</span>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6">
      <div v-if="loading" class="space-y-8 animate-pulse">
         <div class="h-48 bg-white/40 rounded-3xl border border-white"></div>
         <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="i in 6" :key="i" class="h-64 bg-white/40 rounded-3xl border border-white"></div>
         </div>
      </div>

      <div v-else class="space-y-8">
        <!-- Intro Card -->
        <section class="glass-card-premium p-6 sm:p-8 overflow-hidden relative">
          <div class="absolute top-0 right-0 h-64 w-64 bg-brand/5 blur-3xl -mr-32 -mt-32 rounded-full"></div>
          <div class="relative z-10 max-w-3xl">
            <div class="flex items-center gap-3 mb-6">
               <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                 <HelpCircle class="h-6 w-6" />
               </div>
               <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">What is RIASEC?</h2>
            </div>
            <p class="text-base text-gray-700 leading-relaxed font-bold tracking-tight">
              RIASEC is a globally recognized model used to map personality types to career environments. 
              By understanding your unique mix of these six core traits, we can identify workplaces and tasks 
              where you are naturally inclined to thrive.
            </p>
            <div v-if="riasec.narrative" class="mt-6 p-4 rounded-2xl bg-brand/5 border border-brand/10">
               <p class="text-sm font-black text-brand leading-relaxed uppercase tracking-tight italic">
                 "{{ riasec.narrative }}"
               </p>
            </div>
          </div>
        </section>

        <!-- Score Grid -->
        <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           <div 
             v-for="r in scoreRows" 
             :key="r.key" 
             class="glass-card-premium p-6 group hover:shadow-premium transition-all relative overflow-hidden"
             :class="[r.info.border]"
           >
             <!-- Icon & Header -->
             <div class="flex items-start justify-between mb-6">
                <div :class="['h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg', r.info.color]">
                   <component :is="r.info.icon" class="h-7 w-7" />
                </div>
                <div class="text-right">
                   <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score</p>
                   <p class="text-4xl font-black text-gray-900 tracking-tighter">{{ r.score }}</p>
                </div>
             </div>

             <!-- Content -->
             <div class="space-y-1 mb-6">
                <h3 class="text-lg font-black text-gray-900 group-hover:text-brand transition-colors">{{ r.info.label }}</h3>
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{{ r.info.sub }}</p>
             </div>

             <p class="text-xs font-bold text-gray-500 leading-relaxed mb-6">{{ r.info.description }}</p>

             <!-- Career Badges -->
             <div class="space-y-2 pt-6 border-t border-slate-100">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Ideal Career Fields</p>
                <div class="flex flex-wrap gap-1.5">
                   <span 
                     v-for="c in r.info.careers" 
                     :key="c" 
                     class="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-100 bg-slate-50 text-slate-500"
                   >
                     {{ c }}
                   </span>
                </div>
             </div>
           </div>
        </section>

        <!-- Calculation Logic -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div class="glass-card-premium p-6 sm:p-8">
              <div class="flex items-center gap-3 mb-8">
                 <div class="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                   <BarChart3 class="h-6 w-6" />
                 </div>
                 <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Points Contribution</h2>
              </div>
              
              <div class="space-y-3">
                 <div v-for="r in answersBreakdown" :key="r.key" class="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-50 group hover:border-brand/20 transition-all">
                    <div class="flex items-center gap-4">
                       <div :class="['h-8 w-8 rounded-xl flex items-center justify-center text-white', r.info.color]">
                          <component :is="r.info.icon" class="h-4 w-4" />
                       </div>
                       <div>
                          <p class="text-sm font-black text-gray-900">{{ r.key }}</p>
                          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ r.questions }} Scenarios</p>
                       </div>
                    </div>
                    <div class="text-right">
                       <p class="text-lg font-black text-gray-900 tracking-tight">{{ r.sum }} <span class="text-[10px] text-gray-400">PTS</span></p>
                    </div>
                 </div>
              </div>
           </div>

           <div class="glass-card-premium p-6 sm:p-8 flex flex-col justify-center items-center text-center">
              <div class="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6 shadow-glow shadow-emerald-200">
                 <CheckCircle2 class="h-10 w-10" />
              </div>
              <h3 class="text-xl font-black text-gray-900 mb-4">Profile Authenticated</h3>
              <p class="text-sm font-bold text-gray-500 leading-relaxed max-w-sm">
                 Your RIASEC scores are calculated based on your responses during the orientation phase. 
                 This data is used to ground every career and program recommendation we provide.
              </p>
              <button 
                @click="router.push('/dashboard')"
                class="mt-8 px-8 py-3 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200"
              >
                Back to Dashboard
              </button>
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
