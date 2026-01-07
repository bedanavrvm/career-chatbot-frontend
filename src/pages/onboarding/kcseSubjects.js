export const KCSE_GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E']

export const KNEC_MIN_SUBJECTS = 7
export const KNEC_MAX_SUBJECTS = 9
export const KNEC_MANDATORY = ['MAT']
export const KNEC_LANGUAGES = ['ENG', 'KIS', 'KSL']

export const ALL_KCSE_SUBJECTS = [
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

export function subjectByCode() {
  const m = {}
  for (const s of ALL_KCSE_SUBJECTS) m[s.code] = s
  return m
}
