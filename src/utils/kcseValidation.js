export function normalizeGrade(g) {
  return String(g || '').trim().toUpperCase().replace(/\s+/g, '')
}

export function computeHsValidation({
  subjectCodes,
  subjectGrades,
  kcseGrades,
  knecMinSubjects,
  knecMaxSubjects,
  knecMandatory,
  knecLanguages,
} = {}) {
  const codes = (Array.isArray(subjectCodes) ? subjectCodes : []).map((x) => String(x || '').toUpperCase())
  const n = codes.length
  const hasMandatory = (Array.isArray(knecMandatory) ? knecMandatory : []).every((c) => codes.includes(String(c || '').toUpperCase()))
  const hasLanguage = codes.some((c) => (Array.isArray(knecLanguages) ? knecLanguages : []).map((x) => String(x || '').toUpperCase()).includes(c))

  const grades = (subjectGrades && typeof subjectGrades === 'object') ? subjectGrades : {}
  const allowed = Array.isArray(kcseGrades) ? kcseGrades.map((x) => String(x || '').toUpperCase()) : []
  const missingGrades = codes.filter((c) => !allowed.includes(normalizeGrade(grades[c])))

  const minN = Number.isFinite(Number(knecMinSubjects)) ? Number(knecMinSubjects) : 0
  const maxN = Number.isFinite(Number(knecMaxSubjects)) ? Number(knecMaxSubjects) : Number.MAX_SAFE_INTEGER
  const okCount = n >= minN && n <= maxN

  return {
    n,
    okCount,
    hasMandatory,
    hasLanguage,
    missingGrades,
    ok: okCount && hasMandatory && hasLanguage && missingGrades.length === 0,
  }
}
