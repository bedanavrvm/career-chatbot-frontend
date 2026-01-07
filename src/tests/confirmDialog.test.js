import { describe, it, expect } from 'vitest'
import { confirmDialog, resolveConfirmDialog, confirmDialogState } from '../utils/confirmDialog'

describe('confirmDialog', () => {
  it('resolves true/false via resolveConfirmDialog()', async () => {
    const p = confirmDialog({ title: 'X', message: 'Y' })
    expect(confirmDialogState.open).toBe(true)

    resolveConfirmDialog(true)
    await expect(p).resolves.toBe(true)
    expect(confirmDialogState.open).toBe(false)

    const p2 = confirmDialog({ title: 'X2', message: 'Y2' })
    resolveConfirmDialog(false)
    await expect(p2).resolves.toBe(false)
  })
})
