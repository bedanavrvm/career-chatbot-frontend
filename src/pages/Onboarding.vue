<script setup>
import { ref, reactive, onMounted, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'
import { onboardingMe, onboardingSave } from '../lib/api'

// Inline: Minimal onboarding wizard for Sections 1–4 with branching and RIASEC.
// RiasecBox subcomponent renders 4 Likert prompts (0/1/2) and updates a numeric array via v-model:list
const RiasecBox = {
  props: { title: String, list: Array, prompts: Array },
  emits: ['update:list'],
  setup(props, { emit }) {
    function setVal(i, v) {
      const arr = [...(props.list || [])]
      arr[i] = v === '' ? null : Number(v)
      emit('update:list', arr)
    }

    return () =>
      h('div', { class: 'card p-4' }, [
        h('h3', { class: 'text-lg font-semibold mb-2' }, props.title || ''),
        ...((props.prompts || []).map((p, i) =>
          h('div', { key: i, class: 'mb-2' }, [
            h('div', { class: 'text-sm text-gray-700 mb-1' }, String(p || '')),
            h(
              'select',
              {
                class: 'input input-md w-full',
                value: props.list && props.list[i] != null ? props.list[i] : '',
                onChange: (e) => setVal(i, e?.target?.value),
              },
              [
                h('option', { value: '' }, 'Select'),
                h('option', { value: 2 }, 'Agree'),
                h('option', { value: 1 }, 'Neutral'),
                h('option', { value: 0 }, 'Disagree'),
              ]
            ),
          ])
        )),
      ])
  },
}
const router = useRouter()
const loading = ref(false)
const error = ref('')
const step = ref(1) // 1=Universal, 2=Level, 3=Branch, 4=Lifestyle, 5=RIASEC, 6=Review

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

const educationLevel = ref('') // 'high_school' | 'college_student' | 'college_graduate'

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

// RIASEC: Agree=2, Neutral=1, Disagree=0
const riasec = reactive({
  Realistic: [],
  Investigative: [],
  Artistic: [],
  Social: [],
  Enterprising: [],
  Conventional: [],
})

const _RIASEC_TRAITS = ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional']

const riasecScenarios = ref([])
const riasecIdx = ref(0)

function _hash32(s) {
  let h = 5381
  const str = String(s || '')
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
  }
  return h >>> 0
}

function _mulberry32(seed) {
  let a = Number(seed || 0) >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function _shuffleInPlace(arr, rand = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

const _RIASEC_OPPOSITE = {
  Realistic: 'Social',
  Social: 'Realistic',
  Investigative: 'Enterprising',
  Enterprising: 'Investigative',
  Artistic: 'Conventional',
  Conventional: 'Artistic',
}

function _vec(primary, secondary) {
  const v = {}
  const p = String(primary || '')
  const s = String(secondary || '')
  const opp = _RIASEC_OPPOSITE[p]
  if (p) v[p] = 2
  if (s) v[s] = 1
  if (opp) v[opp] = -2
  return v
}

function _opt(text, primary, secondary) {
  return { text: String(text || ''), scores: _vec(primary, secondary) }
}

function _ensureTraitLen(trait, n) {
  const arr = Array.isArray(riasec[trait]) ? [...riasec[trait]] : []
  while (arr.length < n) arr.push(null)
  riasec[trait] = arr
}

function _hasAnyRiasecAnswers() {
  for (const t of _RIASEC_TRAITS) {
    const arr = Array.isArray(riasec[t]) ? riasec[t] : []
    if (arr.some((v) => typeof v === 'number' && !Number.isNaN(v))) return true
  }
  return false
}

function _buildRiasecScenarios(seed = '', shuffleScenarios = false) {
  const base = [
    {
      id: 's1',
      text: 'Your group project is behind schedule and the deadline is in 2 days. What do you do first?',
      options: [
        _opt('I decide priorities, assign roles, and keep the team moving.', 'Enterprising', 'Conventional'),
        _opt('I check in with team members and help resolve tension so we can work together.', 'Social', 'Artistic'),
        _opt('I look at what is failing and suggest a fix based on evidence.', 'Investigative', 'Realistic'),
        _opt('I set up a simple plan (tasks, timeline, shared files) so the work is organized.', 'Conventional', 'Realistic'),
      ],
    },
    {
      id: 's2',
      text: 'You are volunteering to organize a school charity event. Which role do you naturally grab?',
      options: [
        _opt("I'll design the posters, pick a theme, and decorate the venue.", 'Artistic', 'Social'),
        _opt("I'll manage the budget, track sales, and handle logistics.", 'Conventional', 'Realistic'),
        _opt("I'll find sponsors and encourage people to attend.", 'Enterprising', 'Social'),
        _opt("I'll set up equipment (sound/lighting) and handle hands-on setup.", 'Realistic', 'Investigative'),
      ],
    },
    {
      id: 's3',
      text: 'A new AI study tool is released. What do you do first?',
      options: [
        _opt('I test it systematically to understand how it works and where it fails.', 'Investigative', 'Realistic'),
        _opt('I try it on a small task right away and learn the workflow by doing.', 'Realistic', 'Conventional'),
        _opt('I suggest trying it with a small study group so we can learn together.', 'Social', 'Enterprising'),
        _opt('I experiment with creative prompts and outputs and make it my own.', 'Artistic', 'Investigative'),
      ],
    },
    {
      id: 's4',
      text: 'Your class is planning a trip or group activity. What do you contribute first?',
      options: [
        _opt('I handle the details: budget, schedule, and any forms or bookings.', 'Conventional', 'Realistic'),
        _opt('I get people to commit, delegate tasks, and keep momentum.', 'Enterprising', 'Social'),
        _opt('I sort out practical logistics like transport and equipment.', 'Realistic', 'Conventional'),
        _opt('I compare options and risks and recommend a plan based on evidence.', 'Investigative', 'Realistic'),
      ],
    },
    {
      id: 's5',
      text: 'You are helping improve a classroom or shared space. What do you naturally do first?',
      options: [
        _opt('I start assembling/fixing what is needed and rearrange the space hands-on.', 'Realistic', 'Conventional'),
        _opt('I sketch a new layout and choose colors/materials to change the look and feel.', 'Artistic', 'Social'),
        _opt('I coordinate the group, check in, and help people work smoothly together.', 'Social', 'Artistic'),
        _opt('I create a materials list, budget, and step-by-step plan so nothing is missed.', 'Conventional', 'Realistic'),
      ],
    },
    {
      id: 's6',
      text: 'Your school wants a new initiative to help students succeed. What is your first move?',
      options: [
        _opt('I gather information, look for patterns, and test what might work.', 'Investigative', 'Realistic'),
        _opt('I brainstorm a concept and draft a message/visuals to introduce it.', 'Artistic', 'Investigative'),
        _opt('I talk to students and staff, listen, and build support.', 'Social', 'Enterprising'),
        _opt('I set goals, recruit people, and start organizing the launch steps.', 'Enterprising', 'Social'),
      ],
    },
    {
      id: 's7',
      text: 'In a new internship, a key process keeps failing and people are frustrated. What do you do first?',
      options: [
        _opt('I fix the practical issue so work can continue.', 'Realistic', 'Conventional'),
        _opt('I troubleshoot systematically to identify the root cause.', 'Investigative', 'Realistic'),
        _opt('I align people on a plan and make decisions so the work can move forward.', 'Enterprising', 'Social'),
        _opt('I document the steps and create a checklist so the process is consistent.', 'Conventional', 'Realistic'),
      ],
    },
    {
      id: 's8',
      text: 'You have to present what you learned for an assignment. Which approach do you choose?',
      options: [
        _opt('I build a simple demonstration or prototype that shows it working.', 'Realistic', 'Investigative'),
        _opt('I write an explanation with evidence and step-by-step reasoning.', 'Investigative', 'Realistic'),
        _opt('I make a poster/video/story that communicates the idea clearly.', 'Artistic', 'Social'),
        _opt('I run a short session with classmates and answer questions.', 'Social', 'Artistic'),
      ],
    },
    {
      id: 's9',
      text: 'A small student club wants to grow and stay active. What do you naturally focus on?',
      options: [
        _opt('I handle practical setup for meetings and activities.', 'Realistic', 'Conventional'),
        _opt('I create the brand: name, visuals, and creative content that stands out.', 'Artistic', 'Social'),
        _opt('I focus on community: welcoming people, supporting members, and resolving issues.', 'Social', 'Artistic'),
        _opt('I focus on growth: outreach, partnerships, and convincing people to join.', 'Enterprising', 'Social'),
      ],
    },
    {
      id: 's10',
      text: 'You have a lot of messy notes and an exam is coming. What do you do first?',
      options: [
        _opt('I organize everything into a clear structure and schedule so I can follow it.', 'Conventional', 'Realistic'),
        _opt('I focus on understanding the hardest concepts and do practice questions.', 'Investigative', 'Realistic'),
        _opt('I create mind maps/diagrams/visual summaries to remember and connect ideas.', 'Artistic', 'Investigative'),
        _opt('I form a study group so we can explain topics and support each other.', 'Social', 'Enterprising'),
      ],
    },
    {
      id: 's11',
      text: 'Your club wants to run a campaign for a cause. What role fits you best?',
      options: [
        _opt('I design the message and create visuals/content.', 'Artistic', 'Social'),
        _opt('I engage with people: reply, listen, and keep supporters involved.', 'Social', 'Artistic'),
        _opt('I negotiate partnerships, set targets, and drive the campaign to grow.', 'Enterprising', 'Social'),
        _opt('I manage the calendar, track tasks, and keep everything consistent.', 'Conventional', 'Realistic'),
      ],
    },
    {
      id: 's12',
      text: 'Your school receives new equipment/software and someone must set it up for everyone to use. What do you do?',
      options: [
        _opt('I install/assemble it and handle the hands-on setup.', 'Realistic', 'Conventional'),
        _opt('I test it carefully, identify issues, and get it working reliably.', 'Investigative', 'Realistic'),
        _opt('I write a simple guide/checklist so others can use it consistently.', 'Conventional', 'Realistic'),
        _opt('I lead the rollout: decide a plan, get buy-in, and make sure it is adopted.', 'Enterprising', 'Social'),
      ],
    },
  ]

  const scenarios = base.map((s) => ({
    id: String(s.id),
    text: String(s.text),
    options: (s.options || []).map((o, i) => ({
      id: `${s.id}:o${i}`,
      text: String(o.text),
      scores: { ...(o.scores || {}) },
    })),
  }))

  const s = String(seed || 'default')
  if (shuffleScenarios) {
    const randQ = _mulberry32(_hash32(`${s}:__questions__`))
    _shuffleInPlace(scenarios, randQ)
  }
  for (const sc of scenarios) {
    const rand = _mulberry32(_hash32(`${s}:${sc.id}`))
    _shuffleInPlace(sc.options, rand)
  }
  riasecScenarios.value = scenarios
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
  for (const t of _RIASEC_TRAITS) {
    const v = riasec[t] && riasec[t][idx]
    if (typeof v !== 'number' || Number.isNaN(v)) return null
  }

  for (const opt of (q.options || [])) {
    let ok = true
    for (const t of _RIASEC_TRAITS) {
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
  for (const t of _RIASEC_TRAITS) {
    _ensureTraitLen(t, n)
  }

  for (const t of _RIASEC_TRAITS) {
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

async function preload() {
  try {
    loading.value = true
    const t = await token()
    const data = await onboardingMe(t)
    educationLevel.value = data?.education_level || data?.educationLevel || ''
    Object.assign(universal, data?.universal || {})
    Object.assign(hs, data?.high_school || data?.highSchool || {})
    Object.assign(uni, data?.college || {})
    Object.assign(lifestyle, data?.lifestyle || {})
    Object.assign(preferences, data?.preferences || {})
    if (!lifestyle.workEnvironment && lifestyle.work_environment) lifestyle.workEnvironment = lifestyle.work_environment
    if (!lifestyle.workSchedule && lifestyle.work_schedule) lifestyle.workSchedule = lifestyle.work_schedule
    if (!universal.country) universal.country = 'Kenya'
    if (typeof universal.careerGoals === 'string') {
      const s = String(universal.careerGoals || '').trim()
      universal.careerGoals = s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []
    }
    if (!Array.isArray(universal.careerGoals)) universal.careerGoals = []
    if (data?.riasec_answers) {
      for (const k of Object.keys(riasec)) {
        if (Array.isArray(data.riasec_answers[k])) riasec[k] = data.riasec_answers[k]
      }
    } else if (data?.riasecAnswers) {
      for (const k of Object.keys(riasec)) {
        if (Array.isArray(data.riasecAnswers[k])) riasec[k] = data.riasecAnswers[k]
      }
    }
  } catch {}
  finally { loading.value = false }
}

onMounted(async () => {
  if (auth.currentUser?.displayName && !universal.fullName) universal.fullName = auth.currentUser.displayName
  await preload()
  const seed = auth.currentUser?.uid || ''
  _buildRiasecScenarios(seed, !_hasAnyRiasecAnswers())
})

async function savePartial() {
  try {
    const t = await token()
    const payload = {
      educationLevel: educationLevel.value,
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
      riasec_answers: riasec,
      lifestyle: { ...lifestyle },
      preferences: { ...preferences },
    }
    await onboardingSave(t, payload)
  } catch (e) { error.value = e?.message || 'Save failed' }
}

async function nextStep() { error.value = ''; await savePartial(); step.value = Math.min(6, step.value + 1) }
function prevStep() { step.value = Math.max(1, step.value - 1) }

async function submitAll() {
  try {
    loading.value = true
    const t = await token()
    await onboardingSave(t, { riasec_answers: riasec, status: 'complete' })
    router.replace('/dashboard')
  } catch (e) { error.value = e?.message || 'Submit failed' }
  finally { loading.value = false }
}
</script>

<template>
  <main class="container-page px-4 py-6">
    <h1 class="text-2xl font-bold">Complete your profile</h1>
    <p class="text-gray-600">{{ stepTitle }} (Step {{ step }} of 6)</p>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>

    <!-- Step 1: Universal -->
    <section v-if="step===1" class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="label">Full Name</label>
        <input v-model="universal.fullName" class="input input-lg w-full" />
      </div>
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
      <div class="md:col-span-2">
        <label class="label">Career Goals</label>
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <input v-model="careerGoalDraft" class="input input-lg w-full" placeholder="e.g., ML Engineer" @keydown.enter.prevent="addCareerGoal" />
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
      <div class="md:col-span-2 mt-4 flex gap-3">
        <button class="btn btn-primary btn-lg" @click="nextStep">Save & Continue</button>
      </div>
    </section>

    <!-- Step 2: Level -->
    <section v-if="step===2" class="mt-6 space-y-4">
      <label class="label">Highest education level</label>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button :class="['btn','btn-outline','btn-lg', educationLevel==='high_school' && 'btn-primary']" @click="educationLevel='high_school'">High School</button>
        <button :class="['btn','btn-outline','btn-lg', educationLevel==='college_student' && 'btn-primary']" @click="educationLevel='college_student'">College Student</button>
        <button :class="['btn','btn-outline','btn-lg', educationLevel==='college_graduate' && 'btn-primary']" @click="educationLevel='college_graduate'">College Graduate</button>
      </div>
      <div class="mt-4 flex gap-3">
        <button class="btn btn-secondary btn-lg" @click="prevStep">Back</button>
        <button class="btn btn-primary btn-lg" :disabled="!educationLevel" @click="nextStep">Continue</button>
      </div>
    </section>

    <!-- Step 3: Branch -->
    <section v-if="step===3 && educationLevel==='high_school'" class="mt-6 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="label">KCSE Mean Grade</label>
          <select v-model="hs.kcse_mean_grade" class="input input-lg w-full">
            <option value="">Select</option>
            <option v-for="g in KCSE_GRADES" :key="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="label">Favorite subjects</label>
          <div class="text-sm text-gray-600">Mark favorites from your selected subjects.</div>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="nm in (hs.favorite_subjects || [])"
              :key="nm"
              class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm"
            >{{ nm }}</span>
            <span v-if="!(hs.favorite_subjects || []).length" class="text-sm text-gray-500">—</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-lg font-semibold">Available subjects</div>
              <div class="text-sm text-gray-600">Drag or click to add ({{ hsValidation.n }}/{{ KNEC_MAX_SUBJECTS }})</div>
            </div>
            <input v-model="hsSubjectQuery" class="input input-md" placeholder="Search…" />
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="s in hsAvailableSubjects"
              :key="s.code"
              type="button"
              class="chip-btn"
              draggable="true"
              @dragstart="(e) => hsOnDragStart(e, s.code)"
              @click="hsAddSubject(s.code)"
            >{{ s.name }}</button>
          </div>
        </div>

        <div class="card p-4" @dragover.prevent @drop.prevent="hsOnDrop">
          <div class="text-lg font-semibold">Your subjects & grades</div>
          <div class="text-sm text-gray-600">Drop subjects here, then set grades. Requirements: {{ KNEC_MIN_SUBJECTS }}–{{ KNEC_MAX_SUBJECTS }} subjects, include Mathematics and at least one language (English/Kiswahili/KSL).</div>

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
                  class="px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-sm active:scale-[0.99]"
                  :class="hsIsFavorite(code) ? 'border-brand bg-brand text-white' : 'border-gray-200 bg-white text-gray-700'"
                  @click="hsToggleFavorite(code)"
                >Favourite</button>

                <button type="button" class="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm transition-all hover:bg-gray-50 hover:shadow-sm active:scale-[0.99]" @click="hsRemoveSubject(code)">Remove</button>
              </div>
            </div>
          </div>
          <div v-else class="mt-4 rounded-xl border border-dashed border-gray-200 p-6 text-gray-600">
            Drag subjects here (or click from the left).
          </div>

          <div class="mt-4 text-sm" :class="hsValidation.ok ? 'text-green-700' : 'text-gray-700'">
            <div><span class="font-medium">Selected:</span> {{ hsValidation.n }} / {{ KNEC_MAX_SUBJECTS }}</div>
            <div><span class="font-medium">Math:</span> {{ hsValidation.hasMandatory ? 'OK' : 'Missing' }}</div>
            <div><span class="font-medium">Language:</span> {{ hsValidation.hasLanguage ? 'OK' : 'Missing' }}</div>
            <div v-if="hsValidation.missingGrades.length"><span class="font-medium">Grades missing for:</span> {{ hsValidation.missingGrades.join(', ') }}</div>
          </div>
        </div>
      </div>

      <div class="mt-2 flex gap-3">
        <button class="btn btn-secondary btn-lg" @click="prevStep">Back</button>
        <button class="btn btn-primary btn-lg" :disabled="!hsValidation.ok" @click="nextStep">Continue</button>
      </div>
    </section>

    <section v-if="step===3 && educationLevel!=='high_school'" class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div class="md:col-span-2 mt-4 flex gap-3">
        <button class="btn btn-secondary btn-lg" @click="prevStep">Back</button>
        <button class="btn btn-primary btn-lg" @click="nextStep">Continue</button>
      </div>
    </section>

    <!-- Step 4: Lifestyle & Work Preferences -->
    <section v-if="step===4" class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div class="md:col-span-2">
        <label class="label">Additional notes</label>
        <input v-model="preferences.notes" class="input input-lg w-full" placeholder="e.g., Prefer institutions near home" />
      </div>
      <div class="md:col-span-2 mt-4 flex gap-3">
        <button class="btn btn-secondary btn-lg" @click="prevStep">Back</button>
        <button class="btn btn-primary btn-lg" @click="nextStep">Continue</button>
      </div>
    </section>

    <!-- Step 5: RIASEC -->
    <section v-if="step===5" class="mt-6 space-y-6">
      <div class="card p-6">
        <div class="flex items-center justify-between gap-4">
          <div class="text-sm text-gray-600">Question {{ (riasecIdx + 1) }} of {{ (riasecScenarios.length || 1) }}</div>
          <div class="text-sm text-gray-500">Pick the option you would most likely do</div>
        </div>
        <div class="mt-4 text-lg font-semibold text-gray-900">{{ riasecCurrent?.text || '' }}</div>
        <div class="mt-6 grid grid-cols-1 gap-3">
          <button
            v-for="opt in (riasecCurrent?.options || [])"
            :key="opt.id"
            class="btn btn-outline btn-lg text-left justify-start"
            :class="riasecSelectedOptionId() === opt.id ? 'btn-primary' : ''"
            @click="setRiasecChoice(opt)"
          >{{ opt.text }}</button>
        </div>
        <div class="mt-6 flex gap-3">
          <button class="btn btn-secondary btn-lg" @click="riasecBack">Back</button>
          <button class="btn btn-primary btn-lg" @click="riasecNext">Next</button>
        </div>
      </div>
    </section>

    <!-- Step 5: Review/Submit -->
    <section v-if="step===6" class="mt-6 space-y-4">
      <p class="text-gray-700">Review complete. Submit to see your dashboard.</p>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-lg" @click="prevStep">Back</button>
        <button class="btn btn-primary btn-lg" :disabled="loading" @click="submitAll">Submit</button>
      </div>
    </section>
  </main>
</template>

 
