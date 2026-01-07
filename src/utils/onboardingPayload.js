export function normalizeOnboardingMeData(data) {
  const d = data && typeof data === 'object' ? data : {}

  const educationLevel = String(d.education_level || d.educationLevel || '')

  const universal = { ...(d.universal && typeof d.universal === 'object' ? d.universal : {}) }
  if (!universal.fullName && universal.full_name) universal.fullName = universal.full_name
  if (!universal.region && universal.county) universal.region = universal.county
  if (typeof universal.careerGoals === 'string') {
    const s = String(universal.careerGoals || '').trim()
    universal.careerGoals = s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []
  }
  if (!Array.isArray(universal.careerGoals)) universal.careerGoals = []

  const highSchoolRaw = d.high_school || d.highSchool || {}
  const highSchool = { ...(highSchoolRaw && typeof highSchoolRaw === 'object' ? highSchoolRaw : {}) }
  if (!Array.isArray(highSchool.subject_codes) && Array.isArray(highSchool.subjectCodes)) {
    highSchool.subject_codes = highSchool.subjectCodes
  }
  if (!highSchool.subject_grades && highSchool.subjectGrades && typeof highSchool.subjectGrades === 'object') {
    highSchool.subject_grades = highSchool.subjectGrades
  }
  if (!Array.isArray(highSchool.favorite_subjects) && Array.isArray(highSchool.favoriteSubjects)) {
    highSchool.favorite_subjects = highSchool.favoriteSubjects
  }
  if (!highSchool.kcse_mean_grade && highSchool.kcseMeanGrade) {
    highSchool.kcse_mean_grade = highSchool.kcseMeanGrade
  }

  const collegeRaw = d.college || d.college_data || {}
  const college = { ...(collegeRaw && typeof collegeRaw === 'object' ? collegeRaw : {}) }

  const lifestyleRaw = d.lifestyle || {}
  const lifestyle = { ...(lifestyleRaw && typeof lifestyleRaw === 'object' ? lifestyleRaw : {}) }
  if (!lifestyle.workEnvironment && lifestyle.work_environment) lifestyle.workEnvironment = lifestyle.work_environment
  if (!lifestyle.workSchedule && lifestyle.work_schedule) lifestyle.workSchedule = lifestyle.work_schedule

  const preferencesRaw = d.preferences || {}
  const preferences = { ...(preferencesRaw && typeof preferencesRaw === 'object' ? preferencesRaw : {}) }

  const riasecAnswers = d.riasec_answers || d.riasecAnswers || null

  return {
    educationLevel,
    universal,
    highSchool,
    college,
    lifestyle,
    preferences,
    riasecAnswers,
  }
}

export function buildOnboardingSavePayload({ educationLevel, universal, highSchool, college, lifestyle, preferences, riasec }) {
  const level = String(educationLevel || '')

  return {
    educationLevel: level,
    education_level: level,
    universal: { ...(universal && typeof universal === 'object' ? universal : {}) },
    high_school: level === 'high_school'
      ? {
          kcse_mean_grade: String(highSchool?.kcse_mean_grade || ''),
          favorite_subjects: Array.isArray(highSchool?.favorite_subjects) ? highSchool.favorite_subjects : [],
          subject_grades: (highSchool?.subject_grades && typeof highSchool.subject_grades === 'object') ? highSchool.subject_grades : {},
          subject_codes: Array.isArray(highSchool?.subject_codes) ? highSchool.subject_codes : [],
        }
      : {},
    college: level !== 'high_school'
      ? {
          qualification: String(college?.qualification || ''),
          field_of_study: String(college?.field_of_study || ''),
          current_status: String(college?.current_status || ''),
        }
      : {},
    riasec_answers: riasec && typeof riasec === 'object' ? riasec : {},
    lifestyle: { ...(lifestyle && typeof lifestyle === 'object' ? lifestyle : {}) },
    preferences: { ...(preferences && typeof preferences === 'object' ? preferences : {}) },
  }
}
