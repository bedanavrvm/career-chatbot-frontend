<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'
import { onboardingMe, onboardingSave } from '../lib/api'

// Inline: Minimal onboarding wizard for Sections 1–4 with branching and RIASEC.
// RiasecBox subcomponent renders 4 Likert prompts (0/1/2) and updates a numeric array via v-model:list
const RiasecBox = {
  props: { title: String, list: Array, prompts: Array },
  emits: ['update:list'],
  methods: {
    setVal(i, v) {
      const arr = [...(this.list || [])]
      arr[i] = Number(v)
      this.$emit('update:list', arr)
    },
  },
  template: `
  <div class="card p-4">
    <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
    <div v-for="(p,i) in prompts" :key="i" class="mb-2">
      <div class="text-sm text-gray-700 mb-1">{{ p }}</div>
      <select class="input input-md w-full" :value="list[i]" @change="e=>setVal(i,e.target.value)">
        <option :value="2">Agree</option>
        <option :value="1">Neutral</option>
        <option :value="0">Disagree</option>
      </select>
    </div>
  </div>`
}
const router = useRouter()
const loading = ref(false)
const error = ref('')
const step = ref(1) // 1=Universal, 2=Level, 3=Branch, 4=RIASEC, 5=Review

const universal = reactive({
  fullName: '',
  age: '',
  gender: '',
  region: '',
  careerGoals: '',
})

const educationLevel = ref('') // 'high_school' | 'college_student' | 'college_graduate'

const hs = reactive({
  kcseMeanGrade: '',
  favoriteSubjectsCsv: '',
})

const uni = reactive({
  qualification: '',
  fieldOfStudy: '',
  currentStatus: '',
})

// RIASEC: Agree=2, Neutral=1, Disagree=0
const riasec = reactive({
  Realistic: [1, 1, 1, 1],
  Investigative: [1, 1, 1, 1],
  Artistic: [1, 1, 1, 1],
  Social: [1, 1, 1, 1],
  Enterprising: [1, 1, 1, 1],
  Conventional: [1, 1, 1, 1],
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
    educationLevel.value = data?.education_level || ''
    Object.assign(universal, data?.universal || {})
    Object.assign(hs, data?.high_school || {})
    Object.assign(uni, data?.college || {})
    if (data?.riasec_answers) {
      for (const k of Object.keys(riasec)) {
        if (Array.isArray(data.riasec_answers[k])) riasec[k] = data.riasec_answers[k]
      }
    }
  } catch {}
  finally { loading.value = false }
}

onMounted(async () => {
  if (auth.currentUser?.displayName && !universal.fullName) universal.fullName = auth.currentUser.displayName
  await preload()
})

async function savePartial() {
  try {
    const t = await token()
    const payload = {
      education_level: educationLevel.value,
      universal: { ...universal },
      high_school: educationLevel.value === 'high_school' ? {
        kcse_mean_grade: hs.kcseMeanGrade,
        favorite_subjects: list(hs.favoriteSubjectsCsv),
      } : {},
      college: educationLevel.value !== 'high_school' ? {
        qualification: uni.qualification,
        field_of_study: uni.fieldOfStudy,
        current_status: uni.currentStatus,
      } : {},
      riasec_answers: riasec,
    }
    await onboardingSave(t, payload)
  } catch (e) { error.value = e?.message || 'Save failed' }
}

async function nextStep() { error.value = ''; await savePartial(); step.value = Math.min(5, step.value + 1) }
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
    <p class="text-gray-600">Step {{ step }} of 5</p>
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
        <label class="label">County / Region</label>
        <input v-model="universal.region" class="input input-lg w-full" />
      </div>
      <div class="md:col-span-2">
        <label class="label">Career Goals</label>
        <input v-model="universal.careerGoals" class="input input-lg w-full" placeholder="e.g., Become a ML Engineer" />
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
    <section v-if="step===3 && educationLevel==='high_school'" class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="label">KCSE Mean Grade</label>
        <select v-model="hs.kcseMeanGrade" class="input input-lg w-full">
          <option value="">Select</option>
          <option>A</option><option>A-</option><option>B+</option><option>B</option><option>B-</option>
          <option>C+</option><option>C</option><option>C-</option><option>D+</option><option>D</option><option>E</option>
        </select>
      </div>
      <div>
        <label class="label">Favorite Subjects (comma-separated)</label>
        <input v-model="hs.favoriteSubjectsCsv" class="input input-lg w-full" />
      </div>
      <div class="md:col-span-2 mt-4 flex gap-3">
        <button class="btn btn-secondary btn-lg" @click="prevStep">Back</button>
        <button class="btn btn-primary btn-lg" @click="nextStep">Continue</button>
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
        <input v-model="uni.fieldOfStudy" class="input input-lg w-full" />
      </div>
      <div>
        <label class="label">Current Status</label>
        <select v-model="uni.currentStatus" class="input input-lg w-full">
          <option value="">Select</option>
          <option>Still Studying</option><option>Graduate</option><option>Job Seeking</option><option>Employed</option>
        </select>
      </div>
      <div class="md:col-span-2 mt-4 flex gap-3">
        <button class="btn btn-secondary btn-lg" @click="prevStep">Back</button>
        <button class="btn btn-primary btn-lg" @click="nextStep">Continue</button>
      </div>
    </section>

    <!-- Step 4: RIASEC -->
    <section v-if="step===4" class="mt-6 space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RiasecBox title="Realistic (Doers)" v-model:list="riasec.Realistic" :prompts="['I like fixing or building','I enjoy working outdoors','I prefer physical tasks','I\'m good with tools']" />
        <RiasecBox title="Investigative (Thinkers)" v-model:list="riasec.Investigative" :prompts="['I enjoy solving problems','I like experimenting','I\'m curious how things work','I prefer logic to emotion']" />
        <RiasecBox title="Artistic (Creators)" v-model:list="riasec.Artistic" :prompts="['I enjoy creative work','I like expressing myself','I prefer open-ended tasks','I enjoy design or art']" />
        <RiasecBox title="Social (Helpers)" v-model:list="riasec.Social" :prompts="['I like helping others','I enjoy teaching or guiding','I value teamwork','I am empathetic']" />
        <RiasecBox title="Enterprising (Persuaders)" v-model:list="riasec.Enterprising" :prompts="['I like leading','I enjoy persuading','I am comfortable taking risks','I like organizing initiatives']" />
        <RiasecBox title="Conventional (Organizers)" v-model:list="riasec.Conventional" :prompts="['I prefer structure','I like details','I enjoy organizing','I like following procedures']" />
      </div>
      <div class="mt-4 flex gap-3">
        <button class="btn btn-secondary btn-lg" @click="prevStep">Back</button>
        <button class="btn btn-primary btn-lg" @click="nextStep">Continue</button>
      </div>
    </section>

    <!-- Step 5: Review/Submit -->
    <section v-if="step===5" class="mt-6 space-y-4">
      <p class="text-gray-700">Review complete. Submit to see your dashboard.</p>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-lg" @click="prevStep">Back</button>
        <button class="btn btn-primary btn-lg" :disabled="loading" @click="submitAll">Submit</button>
      </div>
    </section>
  </main>
</template>

 
