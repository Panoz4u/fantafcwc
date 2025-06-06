// public/js/user/leagueRecap/api.js

/**
 * Recupera il recap di tutti i fantasy team per il contestId
 */
export async function fetchLeagueRecap(contestId, token) {
  const resp = await fetch(`/api/user-contests/${contestId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!resp.ok) throw new Error('Errore caricamento league recap');
  return await resp.json();
}
  
/**
 * Aggiorna lo status di un fantasy_team (usato da "DiscardBtn")
 */
export async function updateFantasyTeamStatus(contestId, userId, status) {
  const token = localStorage.getItem('authToken');
  const resp = await fetch(`/api/fantasyTeams/${contestId}/${userId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  if (!resp.ok) throw new Error('Errore aggiornamento status');
  return await resp.json();
}
  