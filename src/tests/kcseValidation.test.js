import { describe, it, expect } from 'vitest'
import { computeHsValidation } from '../utils/kcseValidation'

describe('computeHsValidation', () => {
  it('returns ok when counts and required subjects/grades are satisfied', () => {
    const out = computeHsValidation({
      subjectCodes: ['MAT', 'ENG', 'KIS', 'BIO', 'CHE', 'PHY', 'GEO'],
      subjectGrades: {
        MAT: 'A',
        ENG: 'B+',
        KIS: 'B',
        BIO: 'B-',
        CHE: 'C+',
        PHY: 'B',
        GEO: 'A-',
      },
      kcseGrades: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'],
      knecMinSubjects: 7,
      knecMaxSubjects: 9,
      knecMandatory: ['MAT'],
      knecLanguages: ['ENG', 'KIS', 'KSL'],
    })

    expect(out.ok).toBe(true)
    expect(out.hasMandatory).toBe(true)
    expect(out.hasLanguage).toBe(true)
    expect(out.missingGrades.length).toBe(0)
  })

  it('is not ok when grades are missing', () => {
    const out = computeHsValidation({
      subjectCodes: ['MAT', 'ENG', 'BIO', 'CHE', 'PHY', 'GEO', 'HIS'],
      subjectGrades: {
        MAT: 'A',
        ENG: '',
      },
      kcseGrades: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'],
      knecMinSubjects: 7,
      knecMaxSubjects: 9,
      knecMandatory: ['MAT'],
      knecLanguages: ['ENG', 'KIS', 'KSL'],
    })

    expect(out.ok).toBe(false)
    expect(out.missingGrades.length).toBeGreaterThan(0)
  })
})
