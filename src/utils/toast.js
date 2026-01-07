import { reactive } from 'vue'

export const toastState = reactive({
  toasts: [],
})

let _seq = 0

export function pushToast({ type = 'info', title = '', message = '', timeoutMs = 4000 } = {}) {
  const id = String(++_seq)
  const t = {
    id,
    type: String(type || 'info'),
    title: String(title || ''),
    message: String(message || ''),
    timeoutMs: Number(timeoutMs || 0),
    createdAt: Date.now(),
  }
  toastState.toasts = [...(toastState.toasts || []), t]

  if (t.timeoutMs > 0) {
    setTimeout(() => {
      dismissToast(id)
    }, t.timeoutMs)
  }

  return id
}

export function dismissToast(id) {
  const cur = Array.isArray(toastState.toasts) ? toastState.toasts : []
  toastState.toasts = cur.filter((t) => String(t?.id || '') !== String(id || ''))
}

export function toastSuccess(message, { title = 'Success', timeoutMs = 3000 } = {}) {
  return pushToast({ type: 'success', title, message, timeoutMs })
}

export function toastError(message, { title = 'Error', timeoutMs = 6000 } = {}) {
  return pushToast({ type: 'error', title, message, timeoutMs })
}

export function toastInfo(message, { title = '', timeoutMs = 4000 } = {}) {
  return pushToast({ type: 'info', title, message, timeoutMs })
}
