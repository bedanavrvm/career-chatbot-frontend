function safeParseJson(s) {
  try {
    return JSON.parse(String(s || ''))
  } catch {
    return null
  }
}

function stableArrayOfStrings(v) {
  if (!Array.isArray(v)) return null
  const out = []
  for (const x of v) {
    const s = String(x || '')
    if (!s) return null
    out.push(s)
  }
  return out
}

export function riasecOrderStorageKey({ uid, version }) {
  return `riasec_scenarios_order_${String(version || 'v1')}_${String(uid || '')}`
}

export function resolveRiasecScenarioOrder({
  uid,
  version = 'v1',
  scenarioIds,
  allowShuffle = false,
  seed = '',
  buildShuffledScenarioIds,
  storage = (typeof localStorage !== 'undefined' ? localStorage : null),
}) {
  const ids = Array.isArray(scenarioIds) ? scenarioIds.map((x) => String(x || '')) : []
  const set = new Set(ids)
  const key = riasecOrderStorageKey({ uid, version })

  const existingRaw = storage ? storage.getItem(key) : null
  const existing = stableArrayOfStrings(safeParseJson(existingRaw))

  let order = null

  if (existing && existing.some((x) => set.has(x))) {
    const kept = existing.filter((x) => set.has(x))
    const missing = ids.filter((x) => !kept.includes(x))
    order = [...kept, ...missing]
  }

  if (!order) {
    if (allowShuffle && typeof buildShuffledScenarioIds === 'function') {
      order = stableArrayOfStrings(buildShuffledScenarioIds(seed)) || null
    }
    if (!order) order = [...ids]
  }

  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(order))
    } catch {
      // ignore storage failures
    }
  }

  return order
}
