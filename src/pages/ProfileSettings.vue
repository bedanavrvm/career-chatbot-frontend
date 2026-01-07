<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
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
  { id: 'user', label: 'User' },
  { id: 'education', label: 'Education' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'riasec', label: 'RIASEC' },
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
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Profile settings</h1>
        <p class="text-gray-600">Edit your profile without the step-by-step wizard</p>
      </div>
      <button
        class="btn btn-outline btn-md"
        type="button"
        title="Back"
        aria-label="Back"
        @click="router.back()"
      >
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back</span>
      </button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <div class="mt-6 border-b border-gray-200">
      <div class="flex flex-wrap gap-2" role="tablist" aria-label="Profile sections">
        <button
          v-for="t in TABS"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === t.id"
          :class="[
            'px-4 py-2 rounded-t-lg border border-b-0 text-sm font-medium transition-colors',
            activeTab === t.id ? 'bg-white border-gray-200 text-gray-900' : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100',
          ]"
          @click="activeTab = t.id"
        >{{ t.label }}</button>
      </div>
    </div>

    <section class="mt-6">
      <div v-show="activeTab === 'user'" role="tabpanel" class="card p-4 space-y-4">
        <h2 class="text-lg font-semibold">User profile</h2>
        <div>
          <label class="label">Full Name</label>
          <input v-model="universal.fullName" class="input input-lg w-full" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label">Age</label>
            <input v-model="universal.age" type="number" min="10" max="100" class="input input-lg w-full" />
          </div>
          <div>
            <label class="label">Gender</label>
            <select v-model="universal.gender" class="input input-lg w-full">
              <option value="">Select</option>
              <option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label">Country</label>
            <input v-model="universal.country" list="countries" class="input input-lg w-full" />
            <datalist id="countries">
              <option v-for="c in COUNTRIES" :key="c" :value="c" />
            </datalist>
          </div>
          <div>
            <label class="label">County / Region</label>
            <input v-model="universal.region" class="input input-lg w-full" />
          </div>
        </div>
        <CareerGoalsInput
          :careerGoals="universal.careerGoals"
          :draft="careerGoalDraft"
          @set-draft="setCareerGoalDraft"
          @add="addCareerGoal"
          @remove="removeCareerGoal"
        />
      </div>

      <div v-show="activeTab === 'education'" role="tabpanel" class="card p-3 space-y-3">
        <h2 class="text-lg font-semibold">Education level</h2>
        <div>
          <label class="label">Highest education level</label>
          <select v-model="educationLevel" class="input input-md w-full">
            <option value="">Select</option>
            <option value="high_school">High School</option>
            <option value="college_student">College Student</option>
            <option value="college_graduate">College Graduate</option>
          </select>
        </div>

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

        <template v-else-if="educationLevel">
          <EducationTabCollege :uni="uni" @set-uni="setUniField" />
        </template>
      </div>

      <div v-show="activeTab === 'lifestyle'" role="tabpanel" class="card p-4 space-y-4">
        <h2 class="text-lg font-semibold">Lifestyle & work preferences</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label">Preferred work environment</label>
            <select v-model="lifestyle.workEnvironment" class="input input-lg w-full">
              <option value="">Select</option>
              <option>Office</option><option>Hybrid</option><option>Remote</option><option>Field / Outdoors</option>
            </select>
          </div>
          <div>
            <label class="label">Preferred work schedule</label>
            <select v-model="lifestyle.workSchedule" class="input input-lg w-full">
              <option value="">Select</option>
              <option>Full-time</option><option>Part-time</option><option>Flexible</option><option>Shift-based</option>
            </select>
          </div>
          <div>
            <label class="label">Willing to relocate?</label>
            <select v-model="lifestyle.relocation" class="input input-lg w-full">
              <option value="">Select</option>
              <option>Yes</option><option>No</option><option>Maybe</option>
            </select>
          </div>
          <div>
            <label class="label">Budget considerations</label>
            <select v-model="preferences.budget" class="input input-lg w-full">
              <option value="">Select</option>
              <option>Low-cost options</option><option>Balanced</option><option>Not sure</option>
            </select>
          </div>
        </div>
        <div>
          <label class="label">Additional notes</label>
          <input v-model="preferences.notes" class="input input-lg w-full" />
        </div>
      </div>

      <div v-show="activeTab === 'riasec'" role="tabpanel" class="card p-4">
        <h2 class="text-lg font-semibold">RIASEC interests</h2>
        <p class="mt-2 text-sm text-gray-600">RIASEC is collected during onboarding and is used to guide recommendations.</p>
        <p class="mt-1 text-sm text-gray-600">To change your RIASEC, re-run onboarding.</p>
      </div>
    </section>

    <div class="mt-6 flex gap-3">
      <button class="btn btn-primary btn-lg" :disabled="loading" @click="save">Save changes</button>
      <button class="btn btn-secondary btn-lg" :disabled="loading" @click="confirmReset">Reset</button>
    </div>
  </main>
</template>
