import { computed, reactive } from 'vue'
import { onboardingMe, formatApiError } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { toastError } from './toast'

const _state = reactive({
  uid: '',
  data: null,
  loading: false,
  error: '',
  fetchedAt: 0,
})

export function useProfile() {
  const { user, getIdToken, waitForAuthReady } = useAuth()

  async function refresh({ force = false, toastOnError = false } = {}) {
    await waitForAuthReady()
    const u = user.value
    const uid = String(u?.uid || '')
    if (!uid) {
      _state.uid = ''
      _state.data = null
      _state.error = ''
      _state.fetchedAt = 0
      return null
    }

    const now = Date.now()
    if (!force && _state.uid === uid && _state.data && now - Number(_state.fetchedAt || 0) < 30_000) {
      return _state.data
    }

    _state.loading = true
    _state.error = ''
    try {
      const token = await getIdToken(true)
      const data = await onboardingMe(token)
      _state.uid = uid
      _state.data = data || {}
      _state.fetchedAt = Date.now()
      return _state.data
    } catch (e) {
      const msg = formatApiError(e) || 'Failed to load profile'
      _state.error = msg
      if (toastOnError) toastError(msg)
      return null
    } finally {
      _state.loading = false
    }
  }

  function set(data) {
    const u = user.value
    const uid = String(u?.uid || '')
    _state.uid = uid
    _state.data = data || {}
    _state.error = ''
    _state.fetchedAt = Date.now()
  }

  function invalidate() {
    _state.fetchedAt = 0
    _state.data = null
    _state.error = ''
  }

  return {
    profile: computed(() => _state.data),
    loading: computed(() => !!_state.loading),
    error: computed(() => _state.error),
    refresh,
    set,
    invalidate,
  }
}
