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
    console.log("=== INIZIO ENRICHMENT DEI GIOCATORI ===");
    console.log("Giocatori prima dell'enrichment:", JSON.stringify(players));
    
    for (let i = 0; i < players.length; i++) {
      // Salva l'aep_id originale prima di fare la richiesta
      const originalAepId = players[i].aep_id;
      console.log(`Giocatore ${i + 1} - aep_id originale: ${originalAepId || 'NON PRESENTE'}`);
      
      if (!players[i].picture || !players[i].event_unit_id) {
        const resp = await fetch(`/athlete-details?id=${players[i].athlete_id}`);
        if (resp.ok) {
          const data = await resp.json();
          console.log(`Dati ricevuti da athlete-details per giocatore ${i + 1}:`, data);
          
          players[i].picture           ||= data.picture;
          players[i].athlete_shortname ||= data.athlete_shortname;
          players[i].event_unit_id     ||= data.event_unit_id;
          
          // Mantieni l'aep_id originale se esisteva
          if (originalAepId) {
            console.log(`Ripristino aep_id originale: ${originalAepId}`);
            players[i].aep_id = originalAepId;
          } else if (data.aep_id) {
            console.log(`Trovato aep_id nei dati ricevuti: ${data.aep_id}`);
            players[i].aep_id = data.aep_id;
          }
        }
      } else {
        // Assicurati che l'aep_id originale sia mantenuto anche se non facciamo la richiesta
        if (originalAepId) {
          console.log(`Mantenuto aep_id esistente: ${originalAepId}`);
        } else {
          console.log(`Nessun aep_id da mantenere per giocatore ${i + 1}`);
        }
      }
    }
    
    console.log("Giocatori dopo l'enrichment:", JSON.stringify(players));
    console.log("=== FINE ENRICHMENT DEI GIOCATORI ===");
    
    saveChosenPlayers(players);
    return players;
  } catch (error) {
    console.error("Errore durante l'enrichment dei giocatori:", error);
    return players;
  }
}
