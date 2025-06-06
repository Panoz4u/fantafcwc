// public/js/user/leagueDetails/api.js

export async function fetchLeagueDetails(contestId, userId) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) throw new Error('Token di autenticazione mancante');
  
    // → NOTA: la rotta corretta è /contests/details, non /contests/league-details
     const resp = await fetch('/contests/details', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${authToken}`
           },
           body: JSON.stringify({
             contest_id: contestId,   // ← ora uso “contest_id” con underscore
             userId                  // (questo campo non viene usato dal controller, ma lo posso inviare comunque)
           })
         });
  
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Errore ${resp.status}: ${text}`);
    }
    return await resp.json();
  }