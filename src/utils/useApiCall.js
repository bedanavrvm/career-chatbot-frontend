import { ref } from 'vue'
import { formatApiError } from '../lib/api'
import { beginGlobalLoading, endGlobalLoading } from './globalLoading'
import { toastError } from './toast'

export function useApiCall({ toastErrors = false, globalLoading = false } = {}) {
  const loading = ref(false)
  const error = ref('')
  const lastException = ref(null)

  function clearError() {
    error.value = ''
  }

  async function run(fn, { fallbackMessage = 'Request failed', silent = false } = {}) {
    if (typeof fn !== 'function') {
      throw new Error('useApiCall.run expects a function')
    }

    error.value = ''
    lastException.value = null
    loading.value = true
    if (globalLoading) beginGlobalLoading()

    try {
      return await fn()
    } catch (e) {
      lastException.value = e
      const msg = formatApiError(e) || fallbackMessage
      error.value = msg
      if (toastErrors && !silent) toastError(msg)
      return null
    } finally {
      if (globalLoading) endGlobalLoading()
      loading.value = false
    }
  }

  return {
    loading,
    error,
    lastException,
    clearError,
    run,
  }
}
