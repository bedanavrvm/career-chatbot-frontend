import { reactive } from 'vue'

const DEFAULTS = {
  title: 'Confirm',
  message: '',
  confirmText: 'Continue',
  cancelText: 'Cancel',
  destructive: false,
}

export const confirmDialogState = reactive({
  open: false,
  title: DEFAULTS.title,
  message: DEFAULTS.message,
  confirmText: DEFAULTS.confirmText,
  cancelText: DEFAULTS.cancelText,
  destructive: DEFAULTS.destructive,
})

let pendingResolve = null

export function confirmDialog(options = {}) {
  if (typeof pendingResolve === 'function') {
    try { pendingResolve(false) } catch {}
  }

  const opts = options && typeof options === 'object' ? options : {}

  confirmDialogState.title = String(opts.title || DEFAULTS.title)
  confirmDialogState.message = String(opts.message || DEFAULTS.message)
  confirmDialogState.confirmText = String(opts.confirmText || DEFAULTS.confirmText)
  confirmDialogState.cancelText = String(opts.cancelText || DEFAULTS.cancelText)
  confirmDialogState.destructive = !!opts.destructive
  confirmDialogState.open = true

  return new Promise((resolve) => {
    pendingResolve = resolve
  })
}

export function resolveConfirmDialog(ok) {
  confirmDialogState.open = false
  const r = pendingResolve
  pendingResolve = null
  if (typeof r === 'function') {
    r(!!ok)
  }
}
