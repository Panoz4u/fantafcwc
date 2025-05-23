const url = '/contests/contest-details';

export async function fetchContestDetails(contestId, ownerId, opponentId, eventUnitId, authToken) {
    const body = { contest_id: contestId, owner_id: ownerId, opponent_id: opponentId, event_unit_id: eventUnitId };
    console.log('Chiamo contest-details con', body);
  
    const resp = await fetch("/contests/contest-details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
    });
  
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Errore ${resp.status}: ${text}`);
    }
  
    // **Solo qui**, se resp.ok === true, facciamo il parse JSON:
    return await resp.json();
  }
  
  export async function fetchTeexBalance(authToken) {
    const resp = await fetch("/user-landing-info", {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!resp.ok) throw new Error("Errore caricamento balance");
    const data = await resp.json();
    return parseFloat(data.user.teex_balance).toFixed(1);
  }
  
  export async function fetchContestPoints(contestId) {
    const resp = await fetch(`/fantasy/contest-points?contest_id=${contestId}`);
    if (!resp.ok) throw new Error("Errore caricamento punti contest");
    return await resp.json();
  }
  