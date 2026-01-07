import { computed, reactive } from 'vue'

export const globalLoadingState = reactive({
  active: 0,
})

export const isGlobalLoading = computed(() => Number(globalLoadingState.active || 0) > 0)

export function beginGlobalLoading() {
  globalLoadingState.active = Number(globalLoadingState.active || 0) + 1
}

export function endGlobalLoading() {
  globalLoadingState.active = Math.max(0, Number(globalLoadingState.active || 0) - 1)
}

export async function withGlobalLoading(promiseFactory) {
  beginGlobalLoading()
  try {
    return await promiseFactory()
  } finally {
    endGlobalLoading()
  }
}
