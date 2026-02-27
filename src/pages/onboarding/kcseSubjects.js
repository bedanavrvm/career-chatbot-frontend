export const KCSE_GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E']

export const KNEC_MIN_SUBJECTS = 7
export const KNEC_MAX_SUBJECTS = 9
export const KNEC_MANDATORY = ['MAT']
export const KNEC_LANGUAGES = ['ENG', 'KIS', 'KSL']

export const ALL_KCSE_SUBJECTS = [
  { code: 'ENG', num: '101', name: 'English', group: 'Languages' },
  { code: 'KIS', num: '102', name: 'Kiswahili', group: 'Languages' },
  { code: 'KSL', num: '504', name: 'Kenya Sign Language', group: 'Languages' },
  { code: 'MAT', num: '121', altNums: ['122'], name: 'Mathematics', group: 'Core' },
  { code: 'BIO', num: '231', name: 'Biology', group: 'Sciences' },
  { code: 'CHE', num: '233', name: 'Chemistry', group: 'Sciences' },
  { code: 'PHY', num: '232', name: 'Physics', group: 'Sciences' },
  { code: 'GSC', num: '236', name: 'General Science', group: 'Sciences' },
  { code: 'GEO', num: '312', name: 'Geography', group: 'Humanities' },
  { code: 'HIS', num: '311', name: 'History and Government', group: 'Humanities' },
  { code: 'CRE', num: '313', name: 'Christian Religious Education', group: 'Humanities' },
  { code: 'IRE', num: '314', name: 'Islamic Religious Education', group: 'Humanities' },
  { code: 'HRE', num: '315', name: 'Hindu Religious Education', group: 'Humanities' },
  { code: 'AGR', num: '443', name: 'Agriculture', group: 'Applied' },
  { code: 'BST', num: '565', name: 'Business Studies', group: 'Applied' },
  { code: 'CSC', num: '451', name: 'Computer Studies', group: 'Applied' },
  { code: 'HSC', num: '441', name: 'Home Science', group: 'Applied' },
  { code: 'ART', num: '442', name: 'Art and Design', group: 'Applied' },
  { code: 'WWK', num: '444', name: 'Woodwork', group: 'Applied' },
  { code: 'MWK', num: '445', name: 'Metalwork', group: 'Applied' },
  { code: 'BCN', num: '446', name: 'Building Construction', group: 'Applied' },
  { code: 'PME', num: '447', name: 'Power Mechanics', group: 'Applied' },
  { code: 'ELC', num: '448', name: 'Electricity', group: 'Applied' },
  { code: 'DRW', num: '449', name: 'Drawing and Design', group: 'Applied' },
  { code: 'AVT', num: '450', name: 'Aviation Technology', group: 'Applied' },
  { code: 'FRE', num: '501', name: 'French', group: 'Languages' },
  { code: 'GER', num: '502', name: 'German', group: 'Languages' },
  { code: 'ARB', num: '503', name: 'Arabic', group: 'Languages' },
  { code: 'MUS', num: '511', name: 'Music', group: 'Applied' },
]

export function subjectByCode() {
  const m = {}
  for (const s of ALL_KCSE_SUBJECTS) {
    m[s.code] = s
    if (s.num) m[s.num] = s
    if (s.altNums) {
      for (const alt of s.altNums) {
        m[alt] = s
      }
    }
  }
  return m
}
