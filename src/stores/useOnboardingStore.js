/**
 * stores/useOnboardingStore.js
 * Pinia store for onboarding profile data.
 * Centralises the data that was previously re-fetched in Dashboard,
 * Chat, ProfileSettings, and other pages independently.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { onboardingMe, onboardingDashboard } from '../lib/api.js'
import { useUserStore } from './useUserStore.js'

export const useOnboardingStore = defineStore('onboarding', () => {
    // --- State ---
    const profile = ref(null)      // Raw onboarding profile object from /api/auth/onboarding/me/
    const dashboard = ref(null)    // Dashboard summary from /api/auth/onboarding/dashboard/
    const loaded = ref(false)
    const loading = ref(false)
    const error = ref(null)

    // --- Getters ---
    const isComplete = computed(() => {
        const status = profile.value?.status ?? ''
        return status === 'complete'
    })

    const educationLevel = computed(() => profile.value?.education_level ?? '')

    const riasecTop = computed(() => profile.value?.riasec_top ?? [])

    const riasecScores = computed(() => profile.value?.riasec_scores ?? {})

    const careerGoals = computed(() => {
        const uni = profile.value?.universal
        if (!uni || typeof uni !== 'object') return []
        const raw = uni.careerGoals ?? uni.career_goals ?? null
        if (Array.isArray(raw)) return raw.filter(Boolean)
        if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
        return []
    })

    // --- Actions ---
    async function fetchProfile() {
        const userStore = useUserStore()
        const token = await userStore.getToken()
        if (!token) return

        loading.value = true
        error.value = null
        try {
            const data = await onboardingMe(token)
            profile.value = data ?? null
            loaded.value = true
        } catch (e) {
            error.value = e?.message ?? 'Failed to load onboarding'
        } finally {
            loading.value = false
        }
    }

    async function fetchDashboard() {
        const userStore = useUserStore()
        const token = await userStore.getToken()
        if (!token) return

        try {
            const data = await onboardingDashboard(token)
            dashboard.value = data ?? null
        } catch (e) {
            console.error('[useOnboardingStore] fetchDashboard failed', e)
        }
    }

    async function fetchAll() {
        await fetchProfile()
        await fetchDashboard()
    }

    function $reset() {
        profile.value = null
        dashboard.value = null
        loaded.value = false
        loading.value = false
        error.value = null
    }

    return {
        // state
        profile,
        dashboard,
        loaded,
        loading,
        error,
        // getters
        isComplete,
        educationLevel,
        riasecTop,
        riasecScores,
        careerGoals,
        // actions
        fetchProfile,
        fetchDashboard,
        fetchAll,
        $reset,
    }
})
