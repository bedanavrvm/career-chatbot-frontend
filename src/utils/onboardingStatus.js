let _cache = { uid: '', status: '', checkedAt: 0 }

function _lsKey(uid) {
  return `onboarding_status:${uid}`
}

export function invalidateOnboardingStatusCache(uid = '') {
  const u = String(uid || '')
  if (!u || _cache.uid === u) {
    _cache = { uid: u || '', status: '', checkedAt: 0 }
  }
  if (u) {
    try { localStorage.removeItem(_lsKey(u)) } catch {}
  }
}

export function setOnboardingStatusCache(uid, status) {
  const u = String(uid || '')
  const s = String(status || '')
  if (!u) return

  _cache = { uid: u, status: s, checkedAt: Date.now() }

  try {
    if (s === 'complete') localStorage.setItem(_lsKey(u), 'complete')
    else localStorage.removeItem(_lsKey(u))
  } catch {}
}

export async function getOnboardingStatus({ user, getIdToken, onboardingMe, maxAgeMs = 60_000 } = {}) {
  const uid = String(user?.uid || '')
  if (!uid) return ''

  const now = Date.now()
  if (_cache.uid === uid && _cache.status === 'complete' && now - _cache.checkedAt < Math.max(0, Number(maxAgeMs || 0))) {
    return _cache.status
  }

  try {
    const cached = localStorage.getItem(_lsKey(uid))
    if (cached === 'complete') {
      _cache = { uid, status: 'complete', checkedAt: now }
      return 'complete'
    }
  } catch {}

  const token = await (typeof getIdToken === 'function' ? getIdToken(true) : '')
  const data = await (typeof onboardingMe === 'function' ? onboardingMe(token) : {})
  const status = String(data?.status || '')
  setOnboardingStatusCache(uid, status)
  return status
}
