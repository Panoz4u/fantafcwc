// public/js/user/selectCompetitors/api.js
// —————————————————————————————————————————————————————————————————————————
// Qui mettiamo tutte le chiamate HTTP che servono a SelectCompetitors:
//  1) fetchCompetitors(): richiama GET /api/leagues/competitors
//  2) createLeague():  POST /api/leagues
// —————————————————————————————————————————————————————————————————————————

/**
 * Richiama l’API per ottenere la lista di possibili competitor.
 * Restituisce un array di utenti: [ { id, username, avatar, balance, … }, … ]
 */
export async function fetchCompetitors(page = 1, search = '', sortField = 'username', sortDir = 'asc') {
    // NOTA: nel backend abbiamo già il servizio getPossibleCompetitors(ownerId),
    //       che restituisce tutta la lista in un colpo solo. Possiamo recuperarla
    //       interamente e poi paginarla/sortarla lato client (vedi events.js).
    //  Se però vuoi implementare paginazione lato server, dovrai creare un
    //  query param ?page=…&search=…&sortField=…&sortDir=… e renderlo nel
    //  controller da passare alla service. Per semplicità, qui ci prendiamo
    //  tutta la lista: `/api/leagues/competitors`.
    const token = localStorage.getItem('authToken');
    const resp = await fetch('/api/leagues/competitors', {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!resp.ok) {
      throw new Error('Errore caricamento competitors: ' + (await resp.text()));
    }
    const data = await resp.json();
    return Array.isArray(data.users) ? data.users : [];
  }
  
  /**
   * Richiama l’API per creare la nuova lega privata.
   * Body: { leagueName: string, competitorIds: number[] }
   * Restituisce { leagueId: … }.
   */
  export async function createLeagueRequest(leagueName, competitorIds = []) {
    const token = localStorage.getItem('authToken');
    const resp = await fetch('/api/leagues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ leagueName, competitorIds })
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || 'Errore creazione lega');
    }
    return resp.json(); // { leagueId: … }
  }