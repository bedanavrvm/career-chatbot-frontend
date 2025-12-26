<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'
import { onboardingMe, onboardingSave } from '../lib/api'

const router = useRouter()
const loading = ref(false)
const error = ref('')

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

const KCSE_GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E']
const KNEC_MIN_SUBJECTS = 7
const KNEC_MAX_SUBJECTS = 9
const KNEC_MANDATORY = ['MAT']
const KNEC_LANGUAGES = ['ENG', 'KIS', 'KSL']

const ALL_KCSE_SUBJECTS = [
  { code: 'ENG', name: 'English', group: 'Languages' },
  { code: 'KIS', name: 'Kiswahili', group: 'Languages' },
  { code: 'KSL', name: 'Kenya Sign Language', group: 'Languages' },
  { code: 'MAT', name: 'Mathematics', group: 'Core' },
  { code: 'BIO', name: 'Biology', group: 'Sciences' },
  { code: 'CHE', name: 'Chemistry', group: 'Sciences' },
  { code: 'PHY', name: 'Physics', group: 'Sciences' },
  { code: 'GSC', name: 'General Science', group: 'Sciences' },
  { code: 'GEO', name: 'Geography', group: 'Humanities' },
  { code: 'HIS', name: 'History and Government', group: 'Humanities' },
  { code: 'CRE', name: 'Christian Religious Education', group: 'Humanities' },
  { code: 'IRE', name: 'Islamic Religious Education', group: 'Humanities' },
  { code: 'HRE', name: 'Hindu Religious Education', group: 'Humanities' },
  { code: 'AGR', name: 'Agriculture', group: 'Applied' },
  { code: 'BST', name: 'Business Studies', group: 'Applied' },
  { code: 'CSC', name: 'Computer Studies', group: 'Applied' },
  { code: 'HSC', name: 'Home Science', group: 'Applied' },
  { code: 'ART', name: 'Art and Design', group: 'Applied' },
  { code: 'WWK', name: 'Woodwork', group: 'Applied' },
  { code: 'MWK', name: 'Metalwork', group: 'Applied' },
  { code: 'BCN', name: 'Building Construction', group: 'Applied' },
  { code: 'PME', name: 'Power Mechanics', group: 'Applied' },
  { code: 'ELC', name: 'Electricity', group: 'Applied' },
  { code: 'DRW', name: 'Drawing and Design', group: 'Applied' },
  { code: 'AVT', name: 'Aviation Technology', group: 'Applied' },
  { code: 'FRE', name: 'French', group: 'Languages' },
  { code: 'GER', name: 'German', group: 'Languages' },
  { code: 'ARB', name: 'Arabic', group: 'Languages' },
  { code: 'MUS', name: 'Music', group: 'Applied' },
]

const _KCSE_SUBJECT_BY_CODE = (() => {
  const m = {}
  for (const s of ALL_KCSE_SUBJECTS) m[s.code] = s
  return m
})()

const hs = reactive({
  kcse_mean_grade: '',
  favorite_subjects: [],
  subject_grades: {},
  subject_codes: [],
})

const hsSubjectQuery = ref('')

function _normGrade(g) {
  return String(g || '').trim().toUpperCase().replace(/\s+/g, '')
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
  const codes = (Array.isArray(hs.subject_codes) ? hs.subject_codes : []).map((x) => String(x || '').toUpperCase())
  const n = codes.length
  const hasMandatory = KNEC_MANDATORY.every((c) => codes.includes(c))
  const hasLanguage = codes.some((c) => KNEC_LANGUAGES.includes(c))
  const grades = (hs.subject_grades && typeof hs.subject_grades === 'object') ? hs.subject_grades : {}
  const missingGrades = codes.filter((c) => !KCSE_GRADES.includes(_normGrade(grades[c])))
  const okCount = n >= KNEC_MIN_SUBJECTS && n <= KNEC_MAX_SUBJECTS
  return {
    n,
    okCount,
    hasMandatory,
    hasLanguage,
    missingGrades,
    ok: okCount && hasMandatory && hasLanguage && missingGrades.length === 0,
  }
})

const uni = reactive({
  qualification: '',
  field_of_study: '',
  current_status: '',
})

const lifestyle = reactive({
  workEnvironment: '',
  workSchedule: '',
  relocation: '',
})

const preferences = reactive({
  budget: '',
  notes: '',
})

function list(csv) {
  return String(csv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function token() {
  const u = auth.currentUser
  if (!u) throw new Error('Not authenticated')
  return getIdToken(u, true)
}

async function load() {
  try {
    loading.value = true
    const t = await token()
    const data = await onboardingMe(t)
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
  } catch (e) {
    error.value = e?.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

async function save() {
  try {
    error.value = ''
    loading.value = true
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
    router.replace('/dashboard')
  } catch (e) {
    error.value = e?.message || 'Save failed'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (auth.currentUser?.displayName && !universal.fullName) universal.fullName = auth.currentUser.displayName
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
      <button class="btn btn-outline" @click="router.back()">Back</button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <section class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-4 space-y-4">
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
        <div>
          <label class="label">Career Goals</label>
          <div class="flex flex-col gap-2">
            <div class="flex gap-2">
              <input v-model="careerGoalDraft" class="input input-lg w-full" @keydown.enter.prevent="addCareerGoal" />
              <button type="button" class="btn btn-outline btn-lg" @click="addCareerGoal">Add</button>
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="g in (universal.careerGoals || [])"
                :key="g"
                class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm"
              >
                <span>{{ g }}</span>
                <button type="button" class="text-xs text-gray-600" @click="removeCareerGoal(g)">Remove</button>
              </span>
              <span v-if="!(universal.careerGoals || []).length" class="text-sm text-gray-500">—</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-4 space-y-4">
        <h2 class="text-lg font-semibold">Education level</h2>
        <div>
          <label class="label">Highest education level</label>
          <select v-model="educationLevel" class="input input-lg w-full">
            <option value="">Select</option>
            <option value="high_school">High School</option>
            <option value="college_student">College Student</option>
            <option value="college_graduate">College Graduate</option>
          </select>
        </div>

        <template v-if="educationLevel==='high_school'">
          <div>
            <label class="label">KCSE Mean Grade</label>
            <select v-model="hs.kcse_mean_grade" class="input input-lg w-full">
              <option value="">Select</option>
              <option v-for="g in KCSE_GRADES" :key="g">{{ g }}</option>
            </select>
          </div>

          <div class="card p-4" @dragover.prevent @drop.prevent="hsOnDrop">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-lg font-semibold">KCSE subjects & grades</div>
                <div class="text-sm text-gray-600">Requirements: {{ KNEC_MIN_SUBJECTS }}–{{ KNEC_MAX_SUBJECTS }} subjects, include Mathematics and at least one language.</div>
              </div>
              <input v-model="hsSubjectQuery" class="input input-md" placeholder="Search…" />
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                v-for="s in hsAvailableSubjects"
                :key="s.code"
                type="button"
                class="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm hover:bg-gray-50"
                draggable="true"
                @dragstart="(e) => hsOnDragStart(e, s.code)"
                @click="hsAddSubject(s.code)"
              >{{ s.name }}</button>
            </div>

            <div v-if="(hs.subject_codes || []).length" class="mt-4 space-y-2">
              <div
                v-for="code in (hs.subject_codes || [])"
                :key="code"
                class="flex flex-col gap-2 rounded-xl border border-gray-100 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div class="min-w-0">
                  <div class="font-medium text-gray-900">{{ _KCSE_SUBJECT_BY_CODE[code]?.name || code }}</div>
                  <div class="text-xs text-gray-500">{{ code }} · {{ _KCSE_SUBJECT_BY_CODE[code]?.group || 'Subject' }}</div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <select
                    class="input input-md"
                    :value="hs.subject_grades?.[code] || ''"
                    @change="(e) => (hs.subject_grades[code] = e?.target?.value || '')"
                  >
                    <option value="">Grade</option>
                    <option v-for="g in KCSE_GRADES" :key="g" :value="g">{{ g }}</option>
                  </select>

                  <button
                    type="button"
                    class="px-3 py-2 rounded-lg border text-sm"
                    :class="hsIsFavorite(code) ? 'border-brand bg-brand text-white' : 'border-gray-200 bg-white text-gray-700'"
                    @click="hsToggleFavorite(code)"
                  >Favourite</button>

                  <button type="button" class="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm" @click="hsRemoveSubject(code)">Remove</button>
                </div>
              </div>
            </div>

            <div class="mt-4 text-sm" :class="hsValidation.ok ? 'text-green-700' : 'text-gray-700'">
              <div><span class="font-medium">Selected:</span> {{ hsValidation.n }} / {{ KNEC_MAX_SUBJECTS }}</div>
              <div><span class="font-medium">Math:</span> {{ hsValidation.hasMandatory ? 'OK' : 'Missing' }}</div>
              <div><span class="font-medium">Language:</span> {{ hsValidation.hasLanguage ? 'OK' : 'Missing' }}</div>
              <div v-if="hsValidation.missingGrades.length"><span class="font-medium">Grades missing for:</span> {{ hsValidation.missingGrades.join(', ') }}</div>
            </div>
          </div>
        </template>

        <template v-else-if="educationLevel">
          <div>
            <label class="label">Qualification</label>
            <select v-model="uni.qualification" class="input input-lg w-full">
              <option value="">Select</option>
              <option>Certificate</option><option>Diploma</option><option>Bachelor's</option><option>Master's</option>
            </select>
          </div>
          <div>
            <label class="label">Field of Study</label>
            <input v-model="uni.field_of_study" class="input input-lg w-full" />
          </div>
          <div>
            <label class="label">Current Status</label>
            <select v-model="uni.current_status" class="input input-lg w-full">
              <option value="">Select</option>
              <option>Still Studying</option><option>Graduate</option><option>Job Seeking</option><option>Employed</option>
            </select>
          </div>
        </template>
      </div>

      <div class="card p-4 space-y-4 lg:col-span-2">
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

      <div class="card p-4 lg:col-span-2">
        <h2 class="text-lg font-semibold">RIASEC interests</h2>
        <p class="mt-2 text-sm text-gray-600">RIASEC is collected during onboarding and is used to guide recommendations.</p>
        <p class="mt-1 text-sm text-gray-600">To change your RIASEC, re-run onboarding.</p>
      </div>
    </section>

    <div class="mt-6 flex gap-3">
      <button class="btn btn-primary btn-lg" :disabled="loading" @click="save">Save changes</button>
      <button class="btn btn-secondary btn-lg" :disabled="loading" @click="load">Reset</button>
    </div>
  </main>
</template>
