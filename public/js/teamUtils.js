// public/js/teamUtils.js

export function loadChosenPlayers() {
  const c = localStorage.getItem("chosenPlayers");
  if (!c) return [];
  try { return JSON.parse(c); }
  catch { return []; }
}

export function saveChosenPlayers(players) {
  localStorage.setItem("chosenPlayers", JSON.stringify(players));
}

export function getTotalCost() {
  const players = loadChosenPlayers();
  return players.reduce((acc, p) => acc + parseFloat(p.event_unit_cost || 0), 0);
}

export function getAvailableBudget() {
  return Math.max(0, 10 - getTotalCost());
}

export async function enrichPlayerData(players) {
  try {
    for (let i = 0; i < players.length; i++) {
      if (!players[i].picture || !players[i].event_unit_id) {
        const resp = await fetch(`/athlete-details?id=${players[i].athlete_id}`);
        if (resp.ok) {
          const data = await resp.json();
          players[i].picture           ||= data.picture;
          players[i].athlete_shortname ||= data.athlete_shortname;
          players[i].event_unit_id     ||= data.event_unit_id;
        }
      }
    }
    saveChosenPlayers(players);
    return players;
  } catch {
    return players;
  }
}
