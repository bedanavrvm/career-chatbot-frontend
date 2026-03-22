<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  ArrowRight,
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileCode,
  Layers,
  MapPin,
  Clock,
  Award,
  CircleDashed,
  Briefcase,
  History,
  Wallets,
  Building2,
  Globe
} from 'lucide-vue-next'
import { catalogGetProgram, catalogGetProgramCareers, etlCheckEligibility, onboardingMe } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'
import { subjectByCode } from './onboarding/kcseSubjects'

const _KCSE_SUBJECT_BY_CODE = subjectByCode()

const route = useRoute()
const router = useRouter()

const { user, getIdToken } = useAuth()
const { loading, error, run } = useApiCall({ toastErrors: true })

const program = ref(null)

const eligibilityLoading = ref(false)
const eligibilityError = ref('')
const eligibilityResult = ref(null)
const savedGrades = ref(null)

const careersLoading = ref(false)
const careersError = ref('')
const careers = ref([])

const careersSorted = computed(() => {
  const rows = Array.isArray(careers.value) ? careers.value.slice() : []
  rows.sort((a, b) => {
    const aw = a?.weight
    const bw = b?.weight
    const an = aw == null ? -Infinity : Number(aw)
    const bn = bw == null ? -Infinity : Number(bw)
    if (Number.isNaN(an) && Number.isNaN(bn)) return 0
    if (Number.isNaN(an)) return 1
    if (Number.isNaN(bn)) return -1
    if (bn !== an) return bn - an
    const ac = String(a?.onetsoc_code || '')
    const bc = String(b?.onetsoc_code || '')
    return ac.localeCompare(bc)
  })
  return rows
})

const programId = computed(() => {
  const v = route.params?.id
  const n = Number(v)
  return Number.isFinite(n) ? n : null
})

async function load() {
  program.value = null
  if (!programId.value) return

  const data = await run(async () => {
    const u = user.value
    const token = u ? await getIdToken(true) : ''
    return catalogGetProgram(token, programId.value)
  }, { fallbackMessage: 'Failed to load program' })

  if (data) program.value = data

  // Load possible careers
  careersLoading.value = true
  try {
    const c = await catalogGetProgramCareers(programId.value)
    careers.value = Array.isArray(c?.results) ? c.results : []
  } catch (e) {
    careersError.value = e?.message || 'Failed to load careers'
  } finally {
    careersLoading.value = false
  }

  // Load saved KCSE grades
  try {
    const u = user.value
    if (u) {
      const token = await getIdToken(true)
      const me = await onboardingMe(token)
      savedGrades.value = me?.high_school?.subject_grades || null
    }
  } catch {}
}

onMounted(load)

const title = computed(() => program.value?.program_name || 'Program Detail')

function fmtNumber(v) {
  if (v == null) return '—'
  const n = Number(v)
  return Number.isNaN(n) ? String(v) : String(n)
}

const clusterPointsLabel = computed(() => {
  const v = program.value?.estimated_cluster_points
  return v != null && !Number.isNaN(Number(v)) ? String(v) : '—'
})

const clusterPointsHint = computed(() => {
  const b = program.value?.cluster_points_breakdown
  const reason = b?.reason
  if (reason === 'need_at_least_7_subjects') return 'Requires 7 KCSE subject grades'
  if (reason === 'missing_required_subjects') return 'Missing required cluster subjects'
  if (reason === 'insufficient_program_subject_data') return 'Incomplete program requirement data'
  return b?.requirements_incomplete ? 'Estimated using partial data' : ''
})

const canCheckEligibility = computed(() => {
  const code = program.value?.program_code
  const g = savedGrades.value
  return !!code && g && Object.keys(g).length > 0
})

const eligibilityStatus = computed(() => {
  const r = eligibilityResult.value?.result
  if (!r) return null
  return r.eligible ? 'eligible' : 'not_eligible'
})

async function checkEligibility () {
  eligibilityError.value = ''
  eligibilityResult.value = null
  const code = program.value?.program_code
  const grades = savedGrades.value
  if (!code || !grades) return
  
  eligibilityLoading.value = true
  try {
    eligibilityResult.value = await etlCheckEligibility({ programCode: code, grades })
  } catch (e) {
    eligibilityError.value = e?.message || 'Check failed'
  } finally {
    eligibilityLoading.value = false
  }
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
          <div class="min-w-0">
            <h1 class="text-xl font-black text-gray-900 truncate leading-tight">{{ title }}</h1>
            <p v-if="program" class="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest truncate mt-0.5">
              {{ program.institution?.name }} · {{ program.campus || program.region }}
            </p>
          </div>
        </div>
        <div v-if="program?.institution?.website" class="hidden sm:block">
           <a :href="program.institution.website" target="_blank" class="h-10 px-6 rounded-2xl bg-brand text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand/20 hover:shadow-brand/30 transition-all">
             <Globe class="h-3.5 w-3.5" />
             Institution Site
           </a>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6">
      <div v-if="error" class="glass-card p-6 text-red-600 font-bold text-center border-red-100 shadow-red-100/20">
        {{ error }}
      </div>

      <div v-else-if="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div class="lg:col-span-2 space-y-8 animate-pulse">
            <div class="h-64 bg-white/40 rounded-3xl border border-white"></div>
            <div class="h-96 bg-white/40 rounded-3xl border border-white"></div>
         </div>
         <div class="space-y-8 animate-pulse">
            <div class="h-48 bg-white/40 rounded-3xl border border-white"></div>
            <div class="h-64 bg-white/40 rounded-3xl border border-white"></div>
         </div>
      </div>

      <div v-else-if="program" class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <!-- Main Info -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Overview -->
          <section class="glass-card p-6 sm:p-8">
            <div class="flex items-center gap-3 mb-8">
              <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                <Layers class="h-6 w-6" />
              </div>
              <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Program Overview</h2>
            </div>
            
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
               <div class="space-y-1">
                 <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Code</p>
                 <div class="flex items-center gap-2">
                   <FileCode class="h-4 w-4 text-brand" />
                   <p class="text-sm font-black font-mono text-gray-900">{{ program.program_code || '—' }}</p>
                 </div>
               </div>
               <div class="space-y-1">
                 <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Level</p>
                 <div class="flex items-center gap-2">
                   <Award class="h-4 w-4 text-emerald-500" />
                   <p class="text-sm font-black text-gray-900">{{ program.level || 'Degree' }}</p>
                 </div>
               </div>
               <div class="space-y-1">
                 <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Duration</p>
                 <div class="flex items-center gap-2">
                   <Clock class="h-4 w-4 text-orange-500" />
                   <p class="text-sm font-black text-gray-900">{{ fmtNumber(program.duration_years) }} Years</p>
                 </div>
               </div>
               <div class="col-span-2 lg:col-span-3 pt-4 border-t border-slate-100">
                  <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60 mb-2">Estimated Cluster Points</p>
                  <div class="flex items-end gap-3">
                    <span class="text-5xl font-black text-brand tracking-tighter">{{ clusterPointsLabel }}</span>
                    <div v-if="clusterPointsHint" class="mb-1 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                       <CircleDashed class="h-3 w-3" />
                       {{ clusterPointsHint }}
                    </div>
                  </div>
               </div>
            </div>
          </section>

          <!-- Eligibility -->
          <section class="glass-card-premium p-6 sm:p-8 relative overflow-hidden">
            <div class="absolute top-0 right-0 h-32 w-32 bg-brand/5 blur-3xl -mr-16 -mt-16 rounded-full"></div>
            
            <div class="flex items-center justify-between gap-4 mb-8">
               <div class="flex items-center gap-3">
                 <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                   <CheckCircle2 class="h-6 w-6" />
                 </div>
                 <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Eligibility Check</h2>
               </div>
               <button
                 class="h-10 px-6 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg"
                 :class="[
                   eligibilityLoading ? 'bg-slate-100 text-slate-400' : 
                   !canCheckEligibility ? 'bg-slate-50 text-slate-300' : 'bg-gray-900 text-white hover:bg-black shadow-slate-200'
                 ]"
                 :disabled="eligibilityLoading || !canCheckEligibility"
                 @click="checkEligibility"
               >
                 <CircleDashed v-if="eligibilityLoading" class="h-3 w-3 animate-spin" />
                 {{ eligibilityLoading ? 'Analyzing...' : 'Validate My Grades' }}
               </button>
            </div>

            <div v-if="!user" class="p-6 rounded-3xl bg-slate-50 text-center">
               <p class="text-sm font-bold text-gray-500">Log in to check your personal eligibility for this program.</p>
            </div>
            <div v-else-if="!canCheckEligibility" class="p-6 rounded-3xl bg-orange-50/50 border border-orange-100 text-center">
               <p class="text-sm font-bold text-orange-700">Add your KCSE grades in your profile to enable this check.</p>
            </div>

            <div v-if="eligibilityResult" class="space-y-6">
               <div :class="[
                 'p-6 rounded-3xl border-2 transition-all flex items-center gap-4',
                 eligibilityStatus === 'eligible' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
               ]">
                  <div :class="[
                    'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
                    eligibilityStatus === 'eligible' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-red-500 text-white shadow-lg shadow-red-200'
                  ]">
                    <CheckCircle2 v-if="eligibilityStatus === 'eligible'" class="h-6 w-6" />
                    <XCircle v-else class="h-6 w-6" />
                  </div>
                  <div>
                    <h3 class="text-lg font-black text-gray-900 uppercase tracking-tight">
                      {{ eligibilityStatus === 'eligible' ? 'You Qualify!' : 'Admission Conflict' }}
                    </h3>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">
                       Your Cluster: {{ eligibilityResult.result?.cluster_points }} pts
                    </p>
                  </div>
               </div>

               <div v-if="eligibilityResult.result?.reasons?.length" class="space-y-3">
                 <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detailed Analysis</h4>
                 <div class="grid grid-cols-1 gap-2">
                   <div v-for="(r, idx) in eligibilityResult.result.reasons" :key="idx" class="flex items-start gap-2 p-3 rounded-2xl bg-white border border-slate-100">
                     <AlertCircle class="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                     <p class="text-xs font-bold text-gray-600">{{ r }}</p>
                   </div>
                 </div>
               </div>
            </div>
          </section>

          <!-- Careers -->
          <section class="glass-card-premium p-6 sm:p-8">
            <div class="flex items-center gap-3 mb-8">
              <div class="h-10 w-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                <Briefcase class="h-6 w-6" />
              </div>
              <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Future Pathways</h2>
            </div>

            <div v-if="careersLoading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div v-for="i in 4" :key="i" class="h-32 bg-slate-50 rounded-3xl animate-pulse"></div>
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button
                 v-for="c in careersSorted"
                 :key="c.onetsoc_code"
                 class="p-5 rounded-3xl bg-white border border-slate-100 hover:border-brand hover:shadow-premium transition-all text-left group"
                 @click="router.push({ name: 'career_details', params: { soc_code: c.onetsoc_code } })"
               >
                 <div class="flex items-center justify-between mb-3">
                   <span class="px-2 py-0.5 rounded-lg bg-brand/5 text-brand text-[8px] font-black uppercase tracking-widest group-hover:bg-brand group-hover:text-white transition-colors">Career Path</span>
                   <ArrowRight class="h-4 w-4 text-slate-300 group-hover:text-brand transition-colors" />
                 </div>
                 <h4 class="text-sm font-black text-gray-900 group-hover:text-brand transition-colors">{{ c.title }}</h4>
                 <p class="text-[11px] text-gray-500 mt-2 line-clamp-2 leading-relaxed font-bold tracking-tight">{{ c.description }}</p>
               </button>
            </div>
          </section>
        </div>

        <!-- Sidebar Info -->
        <div class="space-y-8">
          <!-- Institution -->
          <aside class="glass-card-premium p-6 sm:p-8">
             <div class="flex items-center gap-3 mb-6">
                <div class="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                  <Building2 class="h-6 w-6" />
                </div>
                <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Institution</h2>
             </div>
             
             <div class="space-y-4">
                <h3 class="text-base font-black text-gray-900 leading-tight">{{ program.institution?.name }}</h3>
                <div class="space-y-2">
                   <div class="flex items-center gap-2 text-gray-500">
                     <MapPin class="h-4 w-4" />
                     <span class="text-xs font-bold">{{ program.campus || program.region }}</span>
                   </div>
                   <div v-if="program.institution?.code" class="flex items-center gap-2 text-gray-400">
                     <FileCode class="h-4 w-4" />
                     <span class="text-xs font-mono font-bold">{{ program.institution.code }}</span>
                   </div>
                </div>
                <button
                  @click="router.push({ name: 'institution_details', params: { code: program.institution.code } })"
                  class="w-full mt-4 py-3 rounded-2xl bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                >
                  View Full Profile
                </button>
             </div>
          </aside>

          <!-- Cutoff History -->
          <aside class="glass-card-premium p-6 sm:p-8 overflow-hidden">
             <div class="flex items-center gap-3 mb-6">
                <div class="h-10 w-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                  <History class="h-6 w-6" />
                </div>
                <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Cutoff History</h2>
             </div>

             <div v-if="program.cutoffs?.length" class="space-y-3">
                <div v-for="c in program.cutoffs" :key="c.year" class="flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-white">
                   <span class="text-xs font-black font-mono text-gray-400">{{ c.year }}</span>
                   <div class="text-right">
                     <p class="text-sm font-black text-gray-900">{{ fmtNumber(c.cutoff) }}</p>
                     <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest">{{ c.capacity || '—' }} Seats</p>
                   </div>
                </div>
             </div>
             <p v-else class="text-xs font-bold text-gray-400 text-center py-4 bg-slate-50 rounded-2xl">No historical data available.</p>
          </aside>

          <!-- Fees & Costs -->
          <aside class="glass-card-premium p-6 sm:p-8">
             <div class="flex items-center gap-3 mb-6">
                <div class="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <Wallets class="h-6 w-6" />
                </div>
                <h2 class="text-xs font-black text-gray-400 uppercase tracking-widest">Program Costs</h2>
             </div>

             <div v-if="program.costs?.length" class="space-y-4">
                <div v-for="(c, idx) in program.costs" :key="idx" class="p-4 rounded-3xl bg-emerald-50/50 border border-emerald-100">
                   <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Standard Fees</p>
                   <p class="text-xl font-black text-gray-900">{{ c.amount != null ? `${fmtNumber(c.amount)} ${c.currency || 'KES'}` : c.raw_cost }}</p>
                   <p v-if="c.source_id" class="text-[8px] font-bold text-emerald-400 uppercase mt-2">Source: {{ c.source_id }}</p>
                </div>
             </div>
             <p v-else class="text-xs font-bold text-gray-400 text-center py-4 bg-slate-50 rounded-2xl">Fee data not listed.</p>
          </aside>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.glass-card-premium {
  @apply bg-white/70 backdrop-blur-2xl border-2 border-white rounded-[2rem] shadow-xl shadow-slate-200/50;
}
</style>
