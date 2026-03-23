<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, User, GraduationCap, Heart, Sparkles, Save, RotateCcw } from 'lucide-vue-next'
import { onboardingMe, onboardingSave } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { useApiCall } from '../utils/useApiCall'
import { confirmDialog } from '../utils/confirmDialog'
import { toastSuccess } from '../utils/toast'
import { invalidateOnboardingStatusCache } from '../utils/onboardingStatus'
import { useProfile } from '../utils/useProfile'
import { computeHsValidation } from '../utils/kcseValidation'
import CareerGoalsInput from '../components/profile/CareerGoalsInput.vue'
import EducationTabHighSchool from '../components/profile/EducationTabHighSchool.vue'
import EducationTabCollege from '../components/profile/EducationTabCollege.vue'

import {
  KCSE_GRADES,
  KNEC_MIN_SUBJECTS,
  KNEC_MAX_SUBJECTS,
  KNEC_MANDATORY,
  KNEC_LANGUAGES,
  ALL_KCSE_SUBJECTS,
  subjectByCode,
} from './onboarding/kcseSubjects'

const router = useRouter()
const { user, getIdToken } = useAuth()
const { loading, error, run, clearError } = useApiCall({ toastErrors: true })
const { set: setProfileCache } = useProfile()

const activeTab = ref('user')
const TABS = [
  { id: 'user', label: 'User', icon: User },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'lifestyle', label: 'Lifestyle', icon: Heart },
  { id: 'riasec', label: 'RIASEC', icon: Sparkles },
]

const COUNTRIES = [
  'Kenya','Uganda','Tanzania','Rwanda','Burundi','South Sudan','Ethiopia','Somalia','Democratic Republic of the Congo',
  'Nigeria','Ghana','South Africa','Egypt','Morocco','Algeria','Tunisia','United States','United Kingdom','Canada','India','China','Australia','Germany','France','Italy','Spain','Netherlands'
]

const universal = reactive({
  fullName: '',
  age: '',
  gender: '',
  country: 'Kenya',
  region: '',
  careerGoals: [],
})

const careerGoalDraft = ref('')

function setCareerGoalDraft(v) {
  careerGoalDraft.value = String(v || '')
}

function _normGoal(s) {
  return String(s || '').trim()
}

function addCareerGoal() {
  const g = _normGoal(careerGoalDraft.value)
  if (!g) return
  const cur = Array.isArray(universal.careerGoals) ? [...universal.careerGoals] : []
  if (!cur.includes(g)) cur.push(g)
  universal.careerGoals = cur
  careerGoalDraft.value = ''
}

function removeCareerGoal(g) {
  const cur = Array.isArray(universal.careerGoals) ? [...universal.careerGoals] : []
  universal.careerGoals = cur.filter((x) => String(x || '') !== String(g || ''))
}

const educationLevel = ref('')

const _KCSE_SUBJECT_BY_CODE = subjectByCode()

const hs = reactive({
  kcse_mean_grade: '',
  favorite_subjects: [],
  subject_grades: {},
  subject_codes: [],
})

const hsSubjectQuery = ref('')

function setHsSubjectQuery(v) {
  hsSubjectQuery.value = String(v || '')
}

function setHsMeanGrade(v) {
  hs.kcse_mean_grade = String(v || '')
}

function setHsSubjectGrade(code, grade) {
  const c = String(code || '').trim().toUpperCase()
  if (!c) return
  if (!hs.subject_grades || typeof hs.subject_grades !== 'object') hs.subject_grades = {}
  hs.subject_grades[c] = String(grade || '')
}

function hsAddSubject(code) {
  const c = String(code || '').trim().toUpperCase()
  if (!c) return
  const arr = Array.isArray(hs.subject_codes) ? hs.subject_codes : []
  if (arr.includes(c)) return
  if (arr.length >= KNEC_MAX_SUBJECTS) return
  arr.push(c)
  hs.subject_codes = arr
  if (!hs.subject_grades || typeof hs.subject_grades !== 'object') hs.subject_grades = {}
  if (hs.subject_grades[c] == null) hs.subject_grades[c] = ''
}

function hsRemoveSubject(code) {
  const c = String(code || '').trim().toUpperCase()
  const arr = Array.isArray(hs.subject_codes) ? [...hs.subject_codes] : []
  hs.subject_codes = arr.filter((x) => String(x || '').toUpperCase() !== c)
  if (hs.subject_grades && typeof hs.subject_grades === 'object') {
    try { delete hs.subject_grades[c] } catch {}
  }
  const nm = _KCSE_SUBJECT_BY_CODE[c]?.name
  if (nm && Array.isArray(hs.favorite_subjects)) {
    hs.favorite_subjects = hs.favorite_subjects.filter((x) => String(x || '') !== nm)
  }
}

function hsToggleFavorite(code) {
  const c = String(code || '').trim().toUpperCase()
  const nm = _KCSE_SUBJECT_BY_CODE[c]?.name
  if (!nm) return
  const cur = Array.isArray(hs.favorite_subjects) ? [...hs.favorite_subjects] : []
  const i = cur.findIndex((x) => String(x || '') === nm)
  if (i >= 0) cur.splice(i, 1)
  else cur.push(nm)
  hs.favorite_subjects = cur
}

function hsIsFavorite(code) {
  const c = String(code || '').trim().toUpperCase()
  const nm = _KCSE_SUBJECT_BY_CODE[c]?.name
  if (!nm) return false
  return Array.isArray(hs.favorite_subjects) && hs.favorite_subjects.some((x) => String(x || '') === nm)
}

function hsOnDragStart(e, code) {
  try {
    e?.dataTransfer?.setData('text/plain', String(code || ''))
    e?.dataTransfer && (e.dataTransfer.effectAllowed = 'copy')
  } catch {}
}

function hsOnDrop(e) {
  try {
    const code = e?.dataTransfer?.getData('text/plain')
    hsAddSubject(code)
  } catch {}
}

const hsAvailableSubjects = computed(() => {
  const q = String(hsSubjectQuery.value || '').trim().toLowerCase()
  const picked = new Set((Array.isArray(hs.subject_codes) ? hs.subject_codes : []).map((x) => String(x || '').toUpperCase()))
  return (ALL_KCSE_SUBJECTS || []).filter((s) => {
    if (picked.has(String(s.code || '').toUpperCase())) return false
    if (!q) return true
    return String(s.name || '').toLowerCase().includes(q) || String(s.code || '').toLowerCase().includes(q)
  })
})

const hsValidation = computed(() => {
  return computeHsValidation({
    subjectCodes: hs.subject_codes,
    subjectGrades: hs.subject_grades,
    kcseGrades: KCSE_GRADES,
    knecMinSubjects: KNEC_MIN_SUBJECTS,
    knecMaxSubjects: KNEC_MAX_SUBJECTS,
    knecMandatory: KNEC_MANDATORY,
    knecLanguages: KNEC_LANGUAGES,
  })
})

const uni = reactive({
  qualification: '',
  field_of_study: '',
  current_status: '',
})

function setUniField({ key, value }) {
  if (!key) return
  uni[key] = value
}

const lifestyle = reactive({
  workEnvironment: '',
  workSchedule: '',
  relocation: '',
})

const preferences = reactive({
  budget: '',
  notes: '',
})

async function token() {
  const u = user.value
  if (!u) throw new Error('Not authenticated')
  const t = await getIdToken(true)
  if (!t) throw new Error('Not authenticated')
  return t
}

async function load() {
  const data = await run(async () => {
    const t = await token()
    return onboardingMe(t)
  }, { fallbackMessage: 'Failed to load profile' })
  if (!data) return

  setProfileCache(data)

  educationLevel.value = data?.education_level || ''
  Object.assign(universal, data?.universal || {})
  Object.assign(hs, data?.high_school || {})
  Object.assign(uni, data?.college || {})
  Object.assign(lifestyle, data?.lifestyle || {})
  Object.assign(preferences, data?.preferences || {})
  if (!universal.careerGoals && universal.career_goals) universal.careerGoals = universal.career_goals
  if (!lifestyle.workEnvironment && lifestyle.work_environment) lifestyle.workEnvironment = lifestyle.work_environment
  if (!lifestyle.workSchedule && lifestyle.work_schedule) lifestyle.workSchedule = lifestyle.work_schedule
  if (!universal.country) universal.country = 'Kenya'
  if (typeof universal.careerGoals === 'string') {
    const s = String(universal.careerGoals || '').trim()
    universal.careerGoals = s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []
  }
  if (!Array.isArray(universal.careerGoals)) universal.careerGoals = []
}

async function save() {
  clearError()
  const ok = await run(async () => {
    const t = await token()
    const payload = {
      education_level: educationLevel.value,
      universal: { ...universal },
      high_school: educationLevel.value === 'high_school' ? {
        kcse_mean_grade: hs.kcse_mean_grade,
        favorite_subjects: Array.isArray(hs.favorite_subjects) ? hs.favorite_subjects : [],
        subject_grades: (hs.subject_grades && typeof hs.subject_grades === 'object') ? hs.subject_grades : {},
        subject_codes: Array.isArray(hs.subject_codes) ? hs.subject_codes : [],
      } : {},
      college: educationLevel.value !== 'high_school' ? {
        qualification: uni.qualification,
        field_of_study: uni.field_of_study,
        current_status: uni.current_status,
      } : {},
      lifestyle: { ...lifestyle },
      preferences: { ...preferences },
    }

    await onboardingSave(t, payload)

    setProfileCache({ ...(payload || {}), status: 'incomplete' })

    const uid = user.value?.uid || ''
    if (uid) invalidateOnboardingStatusCache(uid)

    return true
  }, { fallbackMessage: 'Save failed' })

  if (!ok) return
  toastSuccess('Saved changes')
  router.replace('/dashboard')
}

async function confirmReset() {
  const ok = await confirmDialog({
    title: 'Reset changes?',
    message: 'This will discard your unsaved edits and reload your saved profile data.',
    confirmText: 'Reset',
    cancelText: 'Cancel',
    destructive: true,
  })
  if (!ok) return
  await load()
}

onMounted(async () => {
  if (user.value?.displayName && !universal.fullName) universal.fullName = user.value.displayName
  await load()
})
</script>

<template>
  <main class="min-h-screen app-bg relative overflow-hidden pb-12">
    <!-- Background Decorations -->
    <div class="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
      <div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand/10 blur-[120px]"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
    </div>

    <div class="container-page py-10 relative z-10">
      <div class="flex items-center justify-between mb-8">
        <div class="space-y-1">
          <h1 class="text-3xl font-black text-gray-900 tracking-tight">Profile Settings</h1>
          <p class="text-sm font-bold text-gray-600 uppercase tracking-widest">Manage your academic and career profile</p>
        </div>
        <button
          class="h-12 w-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-600 hover:text-brand hover:border-brand/20 transition-all active:scale-95"
          type="button"
          @click="router.back()"
        >
          <ArrowLeft class="h-5 w-5" />
        </button>
      </div>

      <div v-if="error" class="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-sm font-bold text-red-600 flex items-center gap-3">
        <Sparkles class="h-5 w-5 rotate-45" />
        {{ error }}
      </div>

      <div class="glass-card-premium overflow-hidden">
        <!-- Tabs Header -->
        <div class="flex border-b border-gray-100 bg-white/40 p-2 gap-1 overflow-x-auto">
          <button
            v-for="t in TABS"
            :key="t.id"
            type="button"
            @click="activeTab = t.id"
            :class="[
              'flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap',
              activeTab === t.id 
                ? 'bg-white text-brand shadow-sm border border-gray-100' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            ]"
          >
            <component :is="t.icon" class="h-4 w-4" />
            {{ t.label }}
          </button>
        </div>

        <div class="p-8">
          <div v-show="activeTab === 'user'" class="space-y-8 max-w-4xl">
            <div class="flex items-center gap-3 mb-2">
              <div class="h-10 w-10 rounded-2xl bg-brand/5 flex items-center justify-center text-brand">
                <User class="h-5 w-5" />
              </div>
              <h2 class="text-xl font-black text-gray-900 tracking-tight">Basic Information</h2>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="md:col-span-2">
                <label class="label mb-2">Full Name</label>
                <div class="relative group">
                  <input v-model="universal.fullName" class="input group-focus-within:border-brand transition-all" placeholder="Enter your full name" />
                </div>
              </div>

              <div>
                <label class="label mb-2">Age</label>
                <input v-model="universal.age" type="number" min="10" max="100" class="input" placeholder="Years" />
              </div>
              
              <div>
                <label class="label mb-2">Gender</label>
                <select v-model="universal.gender" class="input">
                  <option value="">Select Gender</option>
                  <option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option>
                </select>
              </div>

              <div>
                <label class="label mb-2">Country</label>
                <input v-model="universal.country" list="countries" class="input" placeholder="Select Country" />
                <datalist id="countries">
                  <option v-for="c in COUNTRIES" :key="c" :value="c" />
                </datalist>
              </div>

              <div>
                <label class="label mb-2">County / Region</label>
                <input v-model="universal.region" class="input" placeholder="Your region" />
              </div>
            </div>

            <div class="pt-4">
              <CareerGoalsInput
                :careerGoals="universal.careerGoals"
                :draft="careerGoalDraft"
                @set-draft="setCareerGoalDraft"
                @add="addCareerGoal"
                @remove="removeCareerGoal"
              />
            </div>
          </div>

          <div v-show="activeTab === 'education'" class="space-y-6">
             <div class="flex items-center gap-3 mb-2">
              <div class="h-10 w-10 rounded-2xl bg-brand/5 flex items-center justify-center text-brand">
                <GraduationCap class="h-5 w-5" />
              </div>
              <h2 class="text-xl font-black text-gray-900 tracking-tight">Academic Background</h2>
            </div>

            <div class="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
              <label class="label">Highest education level attained</label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button 
                  v-for="opt in [
                    { id: 'high_school', label: 'High School' },
                    { id: 'college_student', label: 'College Student' },
                    { id: 'college_graduate', label: 'College Graduate' }
                  ]"
                  :key="opt.id"
                  @click="educationLevel = opt.id"
                  :class="[
                    'p-4 rounded-2xl border text-sm font-black uppercase tracking-widest transition-all text-center',
                    educationLevel === opt.id 
                      ? 'bg-white border-brand text-brand shadow-sm ring-4 ring-brand/10' 
                      : 'bg-white/50 border-gray-100 text-gray-500 hover:border-gray-200'
                  ]"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div v-if="educationLevel" class="mt-8 transition-all animate-in fade-in slide-in-from-top-4 duration-500">
              <template v-if="educationLevel==='high_school'">
                <EducationTabHighSchool
                  :hs="hs"
                  :kcseGrades="KCSE_GRADES"
                  :subjectByCode="_KCSE_SUBJECT_BY_CODE"
                  :hsAvailableSubjects="hsAvailableSubjects"
                  :hsValidation="hsValidation"
                  :hsSubjectQuery="hsSubjectQuery"
                  :knecMinSubjects="KNEC_MIN_SUBJECTS"
                  :knecMaxSubjects="KNEC_MAX_SUBJECTS"
                  @set-hs-subject-query="setHsSubjectQuery"
                  @set-hs-kcse-mean-grade="setHsMeanGrade"
                  @set-hs-subject-grade="setHsSubjectGrade"
                  @add-subject="hsAddSubject"
                  @remove-subject="hsRemoveSubject"
                  @toggle-favorite="hsToggleFavorite"
                  @drag-start="hsOnDragStart"
                  @drop="hsOnDrop"
                />
              </template>
              <template v-else>
                <EducationTabCollege :uni="uni" @set-uni="setUniField" />
              </template>
            </div>
          </div>

          <div v-show="activeTab === 'lifestyle'" class="space-y-8 max-w-4xl">
            <div class="flex items-center gap-3 mb-2">
              <div class="h-10 w-10 rounded-2xl bg-brand/5 flex items-center justify-center text-brand">
                <Heart class="h-5 w-5" />
              </div>
              <h2 class="text-xl font-black text-gray-900 tracking-tight">Lifestyle & Work Preferences</h2>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="label mb-2">Work Environment</label>
                <select v-model="lifestyle.workEnvironment" class="input">
                  <option value="">Select Environment</option>
                  <option>Office</option><option>Hybrid</option><option>Remote</option><option>Field / Outdoors</option>
                </select>
              </div>
              <div>
                <label class="label mb-2">Work Schedule</label>
                <select v-model="lifestyle.workSchedule" class="input">
                  <option value="">Select Schedule</option>
                  <option>Full-time</option><option>Part-time</option><option>Flexible</option><option>Shift-based</option>
                </select>
              </div>
              <div>
                <label class="label mb-2">Willing to relocate?</label>
                <select v-model="lifestyle.relocation" class="input">
                  <option value="">Select Preference</option>
                  <option>Yes</option><option>No</option><option>Maybe</option>
                </select>
              </div>
              <div>
                <label class="label mb-2">Budget Considerations</label>
                <select v-model="preferences.budget" class="input">
                  <option value="">Select Level</option>
                  <option>Low-cost options</option><option>Balanced</option><option>Not sure</option>
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="label mb-2">Additional Career Notes</label>
                <textarea v-model="preferences.notes" class="input min-h-[100px]" placeholder="Any other details you want us to consider..."></textarea>
              </div>
            </div>
          </div>

          <div v-show="activeTab === 'riasec'" class="space-y-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="h-10 w-10 rounded-2xl bg-brand/5 flex items-center justify-center text-brand">
                <Sparkles class="h-5 w-5" />
              </div>
              <h2 class="text-xl font-black text-gray-900 tracking-tight">RIASEC Interests</h2>
            </div>
            
            <div class="p-8 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex flex-col items-center text-center gap-6">
              <div class="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Sparkles class="h-10 w-10" />
              </div>
              <div class="space-y-2">
                <h3 class="text-lg font-black text-indigo-900">Psychometric Interests</h3>
                <p class="text-sm text-indigo-700 max-w-md mx-auto">RIASEC data is generated from your onboarding test and identifies your core personality traits (Realistic, Investigative, Artistic, etc.).</p>
              </div>
              <div class="flex gap-4">
                <button @click="router.push('/onboarding')" class="btn-primary px-8 py-3 rounded-2xl shadow-lg shadow-brand/20">Re-run Onboarding</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Footer -->
        <div class="p-6 bg-slate-50/80 backdrop-blur-sm border-t border-gray-100 flex items-center justify-end gap-4">
          <button 
            class="btn px-6 py-3 rounded-2xl bg-white border border-gray-200 text-gray-600 font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all flex items-center gap-2"
            :disabled="loading" 
            @click="confirmReset"
          >
            <RotateCcw class="h-4 w-4" />
            Reset
          </button>
          <button 
            class="btn-primary px-8 py-3 rounded-2xl shadow-xl shadow-brand/20 font-black uppercase tracking-widest text-xs flex items-center gap-2"
            :disabled="loading" 
            @click="save"
          >
            <Save class="h-4 w-4" />
            Save Profile Changes
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
