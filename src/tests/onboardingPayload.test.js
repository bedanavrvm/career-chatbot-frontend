import { describe, it, expect } from 'vitest'
import { normalizeOnboardingMeData, buildOnboardingSavePayload } from '../utils/onboardingPayload'

describe('onboardingPayload', () => {
  it('normalizes mixed snake_case/camelCase payloads', () => {
    const out = normalizeOnboardingMeData({
      education_level: 'high_school',
      universal: { full_name: 'A B', county: 'Nairobi', careerGoals: 'Doctor, Engineer' },
      highSchool: {
        subjectCodes: ['MAT'],
        subjectGrades: { MAT: 'A' },
        favoriteSubjects: ['Mathematics'],
        kcseMeanGrade: 'B+',
      },
    })

    expect(out.educationLevel).toBe('high_school')
    expect(out.universal.fullName).toBe('A B')
    expect(out.universal.region).toBe('Nairobi')
    expect(out.universal.careerGoals).toEqual(['Doctor', 'Engineer'])
    expect(out.highSchool.subject_codes).toEqual(['MAT'])
    expect(out.highSchool.subject_grades.MAT).toBe('A')
    expect(out.highSchool.favorite_subjects).toEqual(['Mathematics'])
    expect(out.highSchool.kcse_mean_grade).toBe('B+')
  })

  it('builds save payload with correct branch fields', () => {
    const out = buildOnboardingSavePayload({
      educationLevel: 'college_student',
      universal: { fullName: 'A' },
      highSchool: { subject_codes: ['MAT'], subject_grades: { MAT: 'A' } },
      college: { qualification: 'Diploma', field_of_study: 'IT', current_status: 'Still Studying' },
      lifestyle: { workEnvironment: 'Office' },
      preferences: { notes: 'x' },
      riasec: { Realistic: [2] },
    })

    expect(out.education_level).toBe('college_student')
    expect(out.college.qualification).toBe('Diploma')
    expect(out.high_school).toEqual({})
    expect(out.riasec_answers.Realistic).toEqual([2])
  })
})
