// public/js/user/addMembers/api.js
export async function fetchAllAthletes() {
    const res = await fetch('/api/all-active-athletes');    // ← aggiungi “/api”
    if (!res.ok) throw new Error('Errore caricamento atleti');
    return res.json();
  }