import { normalizeOnboardingMeData, buildOnboardingSavePayload } from '../src/utils/onboardingPayload.js'
import { buildRiasecScenarios } from '../src/pages/onboarding/riasecScenarios.js'
import { resolveRiasecScenarioOrder } from '../src/utils/riasecOrder.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed')
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

class MemoryStorage {
  constructor() {
    this._m = new Map()
  }
  getItem(k) {
    return this._m.has(k) ? this._m.get(k) : null
  }
  setItem(k, v) {
    this._m.set(k, String(v))
  }
}

function testNormalizeLegacyKeys() {
  const input = {
    educationLevel: 'high_school',
    universal: {
      full_name: 'Jane Doe',
      county: 'Nairobi',
      careerGoals: 'Engineer, Doctor',
    },
    highSchool: {
      subjectCodes: ['MAT', 'ENG'],
      subjectGrades: { MAT: 'A', ENG: 'B+' },
      favoriteSubjects: ['Mathematics'],
      kcseMeanGrade: 'B+',
    },
    riasecAnswers: { Realistic: [2], Investigative: [0], Artistic: [0], Social: [0], Enterprising: [0], Conventional: [0] },
  }

  const out = normalizeOnboardingMeData(input)
  assert(out.educationLevel === 'high_school', 'educationLevel normalization failed')
  assert(out.universal.fullName === 'Jane Doe', 'universal.full_name -> fullName normalization failed')
  assert(out.universal.region === 'Nairobi', 'universal.county -> region normalization failed')
  assert(Array.isArray(out.universal.careerGoals) && out.universal.careerGoals.length === 2, 'careerGoals string -> array normalization failed')
  assert(deepEqual(out.highSchool.subject_codes, ['MAT', 'ENG']), 'subjectCodes -> subject_codes normalization failed')
  assert(out.highSchool.subject_grades?.MAT === 'A', 'subjectGrades -> subject_grades normalization failed')
  assert(deepEqual(out.highSchool.favorite_subjects, ['Mathematics']), 'favoriteSubjects -> favorite_subjects normalization failed')
  assert(out.highSchool.kcse_mean_grade === 'B+', 'kcseMeanGrade -> kcse_mean_grade normalization failed')
  assert(out.riasecAnswers?.Realistic?.[0] === 2, 'riasecAnswers normalization failed')
}

function testBuildSavePayloadBranching() {
  const payloadHs = buildOnboardingSavePayload({
    educationLevel: 'high_school',
    universal: { fullName: 'X', careerGoals: ['Software Engineer', 'Data Scientist'] },
    highSchool: { kcse_mean_grade: 'B', subject_codes: ['MAT'], subject_grades: { MAT: 'A' }, favorite_subjects: [] },
    college: { qualification: 'Diploma' },
    lifestyle: {},
    preferences: {},
    riasec: {},
  })
  assert(payloadHs.education_level === 'high_school', 'education_level not set for HS')
  assert(Array.isArray(payloadHs.universal?.careerGoals) && payloadHs.universal.careerGoals.length === 2, 'careerGoals not preserved in payload universal')
  assert(payloadHs.high_school?.subject_codes?.length === 1, 'high_school payload missing subject_codes')
  assert(deepEqual(payloadHs.college, {}), 'college payload should be empty for HS')

  const payloadCollege = buildOnboardingSavePayload({
    educationLevel: 'college_student',
    universal: { fullName: 'X' },
    highSchool: { subject_codes: ['MAT'] },
    college: { qualification: 'Diploma', field_of_study: 'CS', current_status: 'Still Studying' },
    lifestyle: {},
    preferences: {},
    riasec: {},
  })
  assert(payloadCollege.education_level === 'college_student', 'education_level not set for college')
  assert(payloadCollege.college?.qualification === 'Diploma', 'college payload missing qualification')
  assert(deepEqual(payloadCollege.high_school, {}), 'high_school payload should be empty for college')
}

function testRiasecOrderStability() {
  const storage = new MemoryStorage()
  const uid = 'user123'
  const version = 'v1'
  const seed = uid

  const base = buildRiasecScenarios(seed, false)
  const scenarioIds = base.map((s) => s.id)

  const order1 = resolveRiasecScenarioOrder({ uid, version, scenarioIds, storage })
  const order2 = resolveRiasecScenarioOrder({ uid, version, scenarioIds, storage })
  assert(deepEqual(order1, order2), 'Order should be stable across calls')

  const scenarioIds2 = [...scenarioIds, 's_new']
  const order3 = resolveRiasecScenarioOrder({ uid, version, scenarioIds: scenarioIds2, storage })
  assert(order3.includes('s_new'), 'New scenario id should be present after reconciliation')
  assert(order3[order3.length - 1] === 's_new', 'New scenario id should be appended at end')
}

function main() {
  testNormalizeLegacyKeys()
  testBuildSavePayloadBranching()
  testRiasecOrderStability()
  console.log('onboarding_smoke: ok')
}

try {
  main()
} catch (e) {
  console.error('onboarding_smoke: failed')
  console.error(e && e.stack ? e.stack : String(e))
  process.exit(1)
}
