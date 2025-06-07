// public/js/user/contestCreation/api.js
const BASE = '/api';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Conferma head-to-head sul path /contests (no /api)
export async function postConfirmSquad(squadData) {
    const token = localStorage.getItem('authToken');
    const resp = await fetch(
      '/contests/confirm-squad',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(squadData)
      }
    );
    if (!resp.ok) throw await resp.json();
    return resp.json();
  }

// user/contestCreation/api.js
export async function fetchCurrentEventUnit() {
    const resp = await fetch("/current-event-unit");
    if (!resp.ok) throw new Error("Errore nel recupero dell'unità evento");
    const json = await resp.json();
    return json.event_unit_id;
  }


  /**
 * Chiede al server i dettagli completi di un contest
 * @param {number} contestId
 * @param {number} ownerId
 * @param {number} opponentId
 * @param {number} eventUnitId
 * @param {string} authToken
 */

  export async function getContestDetails(contestId, ownerId, opponentId, eventUnitId, authToken) {
    const body = {
      contest_id:    parseInt(contestId,    10),
      owner_id:      parseInt(ownerId,      10),
      opponent_id:   parseInt(opponentId,   10),
      event_unit_id: parseInt(eventUnitId,  10)
    };
    const resp = await fetch('/contests/contest-details', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Contest-details ${resp.status}: ${text}`);
    }
    return resp.json();
  }

export async function getUserInfo(token) {
    const resp = await fetch("/user-info", { headers: { "Authorization": `Bearer ${token}` } });
    if (!resp.ok) throw new Error(`User-info ${resp.status}`);
    return resp.json();  // { userId, username, teexBalance, … }
  }


  export async function confirmSquadApi(payload, token) {
    const resp = await fetch("/contests/confirm-squad", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw await resp.json();
    return resp.json();
  }
  

  export async function fetchUsers(page, limit, sort, order, search) {
    const q = new URLSearchParams({ page, limit, sort, order, search });
    const resp = await fetch(`/api/users?${q}`, { headers:{ Authorization:`Bearer ${localStorage.getItem('authToken')}` }});
    return resp.json();
  }
  
  export async function fetchUserLandingInfo() {
    const resp = await fetch(`/user-landing-info`, { headers:{ Authorization:`Bearer ${localStorage.getItem('authToken')}` }});
    return resp.json();
  }

  
  export async function confirmSquad(payload) {
    const resp = await fetch(`/contests/confirm-squad`, {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization:`Bearer ${localStorage.getItem('authToken')}` },
      body: JSON.stringify(payload)
    });
    return resp.json();
  }
  
  export async function fetchAthleteDetails(id) {
    const resp = await fetch(`/athlete-details?id=${id}`);
    return resp.ok ? resp.json() : {};
  }

/**
 * Conferma un league contest (moltiplicatore + entities)
 */
export async function postConfirmLeague(payload) {
    // notare "leagues" al plurale, per allinearsi a routes/leagueRoutes.js
    const resp = await fetch(`${BASE}/leagues/confirm-league`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  return resp.json();
}