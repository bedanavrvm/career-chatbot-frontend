export async function securePing(idToken) {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
  const url = `${base}/api/secure-ping/`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || 'Request failed';
    throw new Error(`${res.status} ${msg}`);
  }
  return data;
}
