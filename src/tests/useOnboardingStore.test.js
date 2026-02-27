/**
 * src/tests/useOnboardingStore.test.js
 * Unit tests for useOnboardingStore Pinia store — tests computed getters.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    onAuthStateChanged: vi.fn((_auth, cb) => { cb(null); return () => { } }),
    getIdToken: vi.fn(async () => 'token'),
}))
vi.mock('../lib/firebase', () => ({ auth: {} }))
vi.mock('../lib/api.js', () => ({
    registerProfile: vi.fn(async () => ({})),
    meProfile: vi.fn(async () => null),
    onboardingMe: vi.fn(async () => null),
    onboardingDashboard: vi.fn(async () => null),
}))

import { useOnboardingStore } from '../stores/useOnboardingStore'

describe('useOnboardingStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('isComplete is false when no profile', () => {
        const store = useOnboardingStore()
        expect(store.isComplete).toBe(false)
    })

    it('isComplete true when profile.status is "complete"', () => {
        const store = useOnboardingStore()
        store.profile = { status: 'complete', education_level: 'high_school' }
        expect(store.isComplete).toBe(true)
    })

    it('isComplete false when status is not complete', () => {
        const store = useOnboardingStore()
        store.profile = { status: 'in_progress' }
        expect(store.isComplete).toBe(false)
    })

    it('educationLevel returns education_level from profile', () => {
        const store = useOnboardingStore()
        store.profile = { education_level: 'high_school', status: 'complete' }
        expect(store.educationLevel).toBe('high_school')
    })

    it('educationLevel returns empty string when no profile', () => {
        const store = useOnboardingStore()
        expect(store.educationLevel).toBe('')
    })

    it('careerGoals returns empty array when no profile', () => {
        const store = useOnboardingStore()
        expect(store.careerGoals).toEqual([])
    })

    it('careerGoals parses array from profile.universal.careerGoals', () => {
        const store = useOnboardingStore()
        store.profile = { universal: { careerGoals: ['Medicine', 'Software Engineering'] } }
        expect(store.careerGoals).toEqual(['Medicine', 'Software Engineering'])
    })

    it('careerGoals wraps a string goal in an array', () => {
        const store = useOnboardingStore()
        store.profile = { universal: { career_goals: 'Nursing' } }
        expect(store.careerGoals).toEqual(['Nursing'])
    })

    it('$reset clears profile to null', () => {
        const store = useOnboardingStore()
        store.profile = { status: 'complete' }
        store.$reset()
        expect(store.profile).toBeNull()
        expect(store.isComplete).toBe(false)
    })
})
