export async function fetchAllAthletes() {
  const token = localStorage.getItem('authToken');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch('/api/all-active-athletes', { headers });
  if (!res.ok) {
    const text = await res.text();
    console.error('fetchAllAthletes', res.status, text);
    throw new Error(text || 'Errore caricamento atleti');
  }
  return res.json();
}