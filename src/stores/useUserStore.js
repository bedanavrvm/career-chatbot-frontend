/**
 * stores/useUserStore.js
 * Pinia store for authenticated user profile and auth state.
 * Replaces per-page re-fetching of user/auth data with a shared reactive store.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { registerProfile, meProfile } from '../lib/api.js'

export const useUserStore = defineStore('user', () => {
  // --- State ---
  const firebaseUser = ref(null)       // The raw Firebase User object
  const profile = ref(null)            // The Django backend profile
  const authReady = ref(false)          // True once the first auth check is done
  const loading = ref(false)
  const error = ref(null)

  // --- Getters ---
  const isAuthenticated = computed(() => !!firebaseUser.value)
  const uid = computed(() => firebaseUser.value?.uid ?? null)
  const displayName = computed(
    () => profile.value?.display_name ?? firebaseUser.value?.displayName ?? null
  )
  const email = computed(
    () => profile.value?.email ?? firebaseUser.value?.email ?? null
  )
  const photoURL = computed(
    () => profile.value?.photo_url ?? firebaseUser.value?.photoURL ?? null
  )

  // --- Token refresh ---
  /**
   * Returns a fresh Firebase ID token. Firebase automatically refreshes
   * the token when it is close to expiry, so callers should use this
   * instead of caching the token string directly.
   */
  async function getToken () {
    if (!firebaseUser.value) return null
    try {
      return await getIdToken(firebaseUser.value, /* forceRefresh */ false)
    } catch (e) {
      console.error('[useUserStore] getIdToken failed', e)
      return null
    }
  }

  // --- Actions ---
  async function fetchProfile () {
    const token = await getToken()
    if (!token) return
    try {
      loading.value = true
      error.value = null
      const data = await meProfile(token)
      profile.value = data ?? null
    } catch (e) {
      error.value = e?.message ?? 'Failed to load profile'
    } finally {
      loading.value = false
    }
  }

  async function ensureRegistered () {
    const token = await getToken()
    if (!token) return
    try {
      await registerProfile(token)
    } catch (e) {
      // 409 Conflict is normal (user already registered)
      if (e?.status !== 409) console.error('[useUserStore] registerProfile failed', e)
    }
  }

  function $reset () {
    firebaseUser.value = null
    profile.value = null
    authReady.value = false
    loading.value = false
    error.value = null
  }

  // --- Firebase auth listener ---
  // Initialize once; the store persists for the lifetime of the app.
  onAuthStateChanged(auth, async (user) => {
    firebaseUser.value = user
    if (user) {
      await ensureRegistered()
      await fetchProfile()
    } else {
      profile.value = null
    }
    authReady.value = true
  })

  return {
    // state
    firebaseUser,
    profile,
    authReady,
    loading,
    error,
    // getters
    isAuthenticated,
    uid,
    displayName,
    email,
    photoURL,
    // actions
    getToken,
    fetchProfile,
    ensureRegistered,
    $reset,
  }
})
