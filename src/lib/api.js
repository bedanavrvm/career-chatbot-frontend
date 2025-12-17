const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function parseJson(res) {
  return res
    .json()
    .catch(() => ({}))
    .then((data) => {
      if (!res.ok) {
        const msg = data?.detail || 'Request failed'
        throw new Error(`${res.status} ${msg}`)
      }
      return data
    })
}

export async function securePing(idToken) {
  const url = `${base}/api/secure-ping/`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  return parseJson(res)
}

export async function registerProfile(idToken) {
  const url = `${base}/api/auth/register/`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })
  return parseJson(res)
}

export async function loginProfile(idToken) {
  const url = `${base}/api/auth/login/`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })
  return parseJson(res)
}

export async function meProfile(idToken) {
  const url = `${base}/api/auth/me/`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  return parseJson(res)
}
