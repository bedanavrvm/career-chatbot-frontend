<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { onboardingMe, onboardingSave, formatApiError } from '../lib/api'

import { useAuth } from '../lib/useAuth'

import FormErrors from '../components/FormErrors.vue'

import OnboardingStepProfile from './onboarding/OnboardingStepProfile.vue'
import OnboardingStepEducation from './onboarding/OnboardingStepEducation.vue'
import OnboardingStepAcademicHighSchool from './onboarding/OnboardingStepAcademicHighSchool.vue'
import OnboardingStepAcademicCollege from './onboarding/OnboardingStepAcademicCollege.vue'
import OnboardingStepLifestyle from './onboarding/OnboardingStepLifestyle.vue'
import OnboardingStepRiasec from './onboarding/OnboardingStepRiasec.vue'
import OnboardingStepReview from './onboarding/OnboardingStepReview.vue'

import {
  KCSE_GRADES,
  KNEC_MIN_SUBJECTS,
  KNEC_MAX_SUBJECTS,
  KNEC_MANDATORY,
  KNEC_LANGUAGES,
  ALL_KCSE_SUBJECTS,
  subjectByCode,
} from './onboarding/kcseSubjects'

import { RIASEC_TRAITS, buildRiasecScenarios } from './onboarding/riasecScenarios'
import { normalizeOnboardingMeData, buildOnboardingSavePayload } from '../utils/onboardingPayload'
import { resolveRiasecScenarioOrder } from '../utils/riasecOrder'
import { invalidateOnboardingStatusCache, setOnboardingStatusCache } from '../utils/onboardingStatus'
import { useProfile } from '../utils/useProfile'
import { computeHsValidation } from '../utils/kcseValidation'

const router = useRouter()
const { user, getIdToken } = useAuth()
const { set: setProfileCache } = useProfile()
const loading = ref(false)
const error = ref('')
const errorFields = ref(null)
const step = ref(1) // 1=Universal, 2=Level, 3=Branch, 4=Lifestyle, 5=RIASEC, 6=Review

const saveState = ref('idle') // idle | saving | saved
let savedTimer = null

const saveLabel = computed(() => {
  if (saveState.value === 'saving') return 'Saving…'
  if (saveState.value === 'saved') return 'Saved'
  return ''
})

const RIASEC_SCENARIOS_VERSION = 'v1'

const COUNTRIES = [
  'Kenya','Uganda','Tanzania','Rwanda','Burundi','South Sudan','Ethiopia','Somalia','Democratic Republic of the Congo',
  'Nigeria','Ghana','South Africa','Egypt','Morocco','Algeria','Tunisia','United States','United Kingdom','Canada','India','China','Australia','Germany','France','Italy','Spain','Netherlands'
]

const stepTitle = computed(() => {
  if (step.value === 1) return 'User profile'
  if (step.value === 2) return 'Education level'
  if (step.value === 3) return 'Academic details'
  if (step.value === 4) return 'Lifestyle & work preferences'
  if (step.value === 5) return 'RIASEC interests'
  return 'Review & submit'
})

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

function setUniversalField({ key, value }) {
  if (!key) return
  universal[key] = value
}

function setEducationLevel(level) {
  educationLevel.value = String(level || '')
}

function setUniField({ key, value }) {
  if (!key) return
  uni[key] = value
}

function setLifestyleField({ key, value }) {
  if (!key) return
  lifestyle[key] = value
}

function setPreferencesField({ key, value }) {
  if (!key) return
  preferences[key] = value
}

const educationLevel = ref('') // 'high_school' | 'college_student' | 'college_graduate'

const _KCSE_SUBJECT_BY_CODE = subjectByCode()

const hs = reactive({
  kcse_mean_grade: '',
  favorite_subjects: [],
  subject_grades: {},
  subject_codes: [],
})

const hsSubjectQuery = ref('')

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

// RIASEC: Agree=2, Neutral=1, Disagree=0
const riasec = reactive({
  Realistic: [],
  Investigative: [],
  Artistic: [],
  Social: [],
  Enterprising: [],
  Conventional: [],
})

const riasecScenarios = ref([])
const riasecIdx = ref(0)

function _ensureTraitLen(trait, n) {
  const arr = Array.isArray(riasec[trait]) ? [...riasec[trait]] : []
  while (arr.length < n) arr.push(null)
  riasec[trait] = arr
}

function _hasAnyRiasecAnswers() {
  for (const t of RIASEC_TRAITS) {
    const arr = Array.isArray(riasec[t]) ? riasec[t] : []
    if (arr.some((v) => typeof v === 'number' && !Number.isNaN(v))) return true
  }
  return false
}

const riasecCurrent = computed(() => {
  const arr = riasecScenarios.value || []
  const i = Math.max(0, Math.min((arr.length || 1) - 1, Number(riasecIdx.value || 0)))
  return arr[i] || null
})

function riasecSelectedOptionId() {
  const q = riasecCurrent.value
  if (!q) return null
  const idx = Number(riasecIdx.value || 0)
  for (const t of RIASEC_TRAITS) {
    const v = riasec[t] && riasec[t][idx]
    if (typeof v !== 'number' || Number.isNaN(v)) return null
  }

  for (const opt of (q.options || [])) {
    let ok = true
    for (const t of RIASEC_TRAITS) {
      const expected = Number((opt.scores && opt.scores[t] != null) ? opt.scores[t] : 0)
      const actual = Number(riasec[t][idx])
      if (expected !== actual) {
        ok = false
        break
      }
    }
    if (ok) return opt.id
  }
  return null
}

function setRiasecChoice(option) {
  const qIndex = Number(riasecIdx.value || 0)
  const vec = option && option.scores ? option.scores : null
  if (!vec || typeof vec !== 'object') return
  const n = qIndex + 1
  for (const t of RIASEC_TRAITS) {
    _ensureTraitLen(t, n)
  }

  for (const t of RIASEC_TRAITS) {
    const arr = [...(riasec[t] || [])]
    const v = Number(vec[t] != null ? vec[t] : 0)
    arr[qIndex] = Number.isNaN(v) ? 0 : v
    riasec[t] = arr
  }
}

function riasecBack() {
  error.value = ''
  if (riasecIdx.value > 0) {
    riasecIdx.value -= 1
    return
  }
  prevStep()
}

async function riasecNext() {
  error.value = ''
  const sel = riasecSelectedOptionId()
  if (!sel) {
    error.value = 'Please select an option to continue.'
    return
  }

  await savePartial()
  if (error.value) return

  const last = (riasecScenarios.value || []).length - 1
  if (riasecIdx.value < last) {
    riasecIdx.value += 1
    return
  }
  await nextStep()
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
  if (!user.value) throw new Error('Not authenticated')
  const t = await getIdToken(true)
  if (!t) throw new Error('Not authenticated')
  return t
}

async function preload() {
  try {
    loading.value = true
    const t = await token()
    const data = await onboardingMe(t)
    setProfileCache(data)
    const norm = normalizeOnboardingMeData(data)
    educationLevel.value = norm.educationLevel
    Object.assign(universal, norm.universal)
    Object.assign(hs, norm.highSchool)
    Object.assign(uni, norm.college)
    Object.assign(lifestyle, norm.lifestyle)
    Object.assign(preferences, norm.preferences)
    if (!universal.country) universal.country = 'Kenya'
    if (norm.riasecAnswers && typeof norm.riasecAnswers === 'object') {
      for (const k of Object.keys(riasec)) {
        if (Array.isArray(norm.riasecAnswers[k])) riasec[k] = norm.riasecAnswers[k]
      }
    }
  } catch {}
  finally { loading.value = false }
}

onMounted(async () => {
  if (user.value?.displayName && !universal.fullName) universal.fullName = user.value.displayName
  await preload()
  const uid = user.value?.uid || ''
  const seed = uid
  const base = buildRiasecScenarios(seed, false)
  const shuffled = buildRiasecScenarios(seed, true)
  const defaultIds = _hasAnyRiasecAnswers() ? base.map((s) => s.id) : shuffled.map((s) => s.id)
  const order = resolveRiasecScenarioOrder({
    uid,
    version: RIASEC_SCENARIOS_VERSION,
    scenarioIds: defaultIds,
  })
  const byId = new Map(base.map((s) => [s.id, s]))
  riasecScenarios.value = (order || []).map((id) => byId.get(id)).filter(Boolean)
})

async function savePartial() {
  try {
    errorFields.value = null
    saveState.value = 'saving'
    if (savedTimer) clearTimeout(savedTimer)
    const t = await token()
    const payload = buildOnboardingSavePayload({
      educationLevel: educationLevel.value,
      universal,
      highSchool: hs,
      college: uni,
      lifestyle,
      preferences,
      riasec,
    })
    await onboardingSave(t, payload)

    setProfileCache(payload)

    const uid = user.value?.uid || ''
    if (uid) {
      invalidateOnboardingStatusCache(uid)
      setOnboardingStatusCache(uid, 'incomplete')
    }

    saveState.value = 'saved'
    savedTimer = setTimeout(() => {
      saveState.value = 'idle'
    }, 1500)
  } catch (e) {
    errorFields.value = e?.fields || e?.data?.fields || null
    error.value = formatApiError(e) || 'Save failed'
    saveState.value = 'idle'
  }
}

function _validationForStep() {
  if (step.value === 2 && !educationLevel.value) {
    return { ok: false, message: 'Please select your education level to continue.' }
  }
  if (step.value === 3 && educationLevel.value === 'high_school' && !hsValidation.value.ok) {
    return { ok: false, message: 'Please complete your KCSE subjects and grades to continue.' }
  }
  return { ok: true, message: '' }
}

async function nextStep() {
  error.value = ''
  const v = _validationForStep()
  if (!v.ok) {
    error.value = v.message
    return
  }
  await savePartial()
  if (error.value) return
  step.value = Math.min(6, step.value + 1)
}
function prevStep() { step.value = Math.max(1, step.value - 1) }

async function submitAll() {
  try {
    errorFields.value = null
    loading.value = true
    await savePartial()
    if (error.value) return
    const t = await token()
    await onboardingSave(t, { status: 'complete' })

    setProfileCache({ status: 'complete' })

    const uid = user.value?.uid || ''
    if (uid) {
      invalidateOnboardingStatusCache(uid)
      setOnboardingStatusCache(uid, 'complete')
    }

    router.replace('/dashboard')
  } catch (e) {
    errorFields.value = e?.fields || e?.data?.fields || null
    error.value = formatApiError(e) || 'Submit failed'
  }
  finally { loading.value = false }
}
</script>

<template>
  <main class="container-page px-4 py-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Complete your profile</h1>
        <p class="text-gray-600">{{ stepTitle }} (Step {{ step }} of 6)</p>
      </div>
      <div v-if="saveLabel" class="text-xs text-gray-600 mt-1">{{ saveLabel }}</div>
    </div>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    <FormErrors :fields="errorFields" />

    <OnboardingStepProfile
      v-if="step === 1"
      :universal="universal"
      :countries="COUNTRIES"
      :careerGoalDraft="careerGoalDraft"
      @set-universal="setUniversalField"
      @set-career-goal-draft="setCareerGoalDraft"
      @add-career-goal="addCareerGoal"
      @remove-career-goal="removeCareerGoal"
      @next="nextStep"
    />

    <OnboardingStepEducation
      v-else-if="step === 2"
      :educationLevel="educationLevel"
      @set-education-level="setEducationLevel"
      @back="prevStep"
      @next="nextStep"
    />

    <OnboardingStepAcademicHighSchool
      v-else-if="step === 3 && educationLevel === 'high_school'"
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
      @back="prevStep"
      @next="nextStep"
    />

    <OnboardingStepAcademicCollege
      v-else-if="step === 3 && educationLevel !== 'high_school'"
      :uni="uni"
      @set-uni="setUniField"
      @back="prevStep"
      @next="nextStep"
    />

    <OnboardingStepLifestyle
      v-else-if="step === 4"
      :lifestyle="lifestyle"
      :preferences="preferences"
      @set-lifestyle="setLifestyleField"
      @set-preferences="setPreferencesField"
      @back="prevStep"
      @next="nextStep"
    />

    <OnboardingStepRiasec
      v-else-if="step === 5"
      :idx="Number(riasecIdx || 0)"
      :total="Number(riasecScenarios.length || 1)"
      :question="riasecCurrent"
      :selectedOptionId="riasecSelectedOptionId()"
      @choose="setRiasecChoice"
      @back="riasecBack"
      @next="riasecNext"
    />

    <OnboardingStepReview
      v-else-if="step === 6"
      :loading="loading"
      @back="prevStep"
      @submit="submitAll"
    />
  </main>
</template>

 
