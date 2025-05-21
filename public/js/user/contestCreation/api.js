// public/js/user/contestCreation/api.js
const BASE = '/api';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function fetchContestDetails(contestId, userId) {
  const token = localStorage.getItem('authToken');
  const resp = await fetch(
    `${BASE}/contests/contest-details?contest=${contestId}&user=${userId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function postConfirmSquad(squadData) {
  const token = localStorage.getItem('authToken');
  const resp = await fetch(
    `${BASE}/contests/confirm-squad`,
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

export async function getContestDetails(contestId, userId, token) {
    const resp = await fetch(`/contests/contest-details?contest=${contestId}&user=${userId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error(`Contest-details ${resp.status}`);
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