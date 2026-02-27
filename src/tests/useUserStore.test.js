/**
 * src/tests/useUserStore.test.js
 * Unit tests for useUserStore Pinia store — tests getters with mock auth state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Mock Firebase before importing the store
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    onAuthStateChanged: vi.fn((_auth, cb) => { cb(null); return () => { } }),
    getIdToken: vi.fn(async () => 'mock-token'),
}))
vi.mock('../lib/firebase', () => ({ auth: {} }))
vi.mock('../lib/api.js', () => ({
    registerProfile: vi.fn(async () => ({})),
    meProfile: vi.fn(async () => null),
    onboardingMe: vi.fn(async () => null),
    onboardingDashboard: vi.fn(async () => null),
}))

import { useUserStore } from '../stores/useUserStore'

describe('useUserStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('isAuthenticated is false when no firebaseUser', () => {
        const store = useUserStore()
        expect(store.isAuthenticated).toBe(false)
    })

    it('uid returns null when not authenticated', () => {
        const store = useUserStore()
        expect(store.uid).toBeNull()
    })

    it('isAuthenticated becomes true after setting firebaseUser', () => {
        const store = useUserStore()
        store.firebaseUser = { uid: 'abc123', email: 'test@example.com', displayName: 'Test' }
        expect(store.isAuthenticated).toBe(true)
        expect(store.uid).toBe('abc123')
    })

    it('$reset clears all state', () => {
        const store = useUserStore()
        store.firebaseUser = { uid: 'u1' }
        store.profile = { full_name: 'Test' }
        store.$reset()
        expect(store.isAuthenticated).toBe(false)
        expect(store.uid).toBeNull()
        expect(store.profile).toBeNull()
    })

    it('displayName returns firebaseUser.displayName when set', () => {
        const store = useUserStore()
        store.firebaseUser = { uid: 'u1', displayName: 'Jane Doe', email: 'jane@example.com' }
        expect(store.displayName).toBe('Jane Doe')
    })

    it('displayName falls back to null when neither profile nor firebaseUser', () => {
        const store = useUserStore()
        expect(store.displayName).toBeNull()
    })

    it('email returns firebaseUser.email', () => {
        const store = useUserStore()
        store.firebaseUser = { uid: 'u1', email: 'me@example.com', displayName: null }
        expect(store.email).toBe('me@example.com')
    })
})
