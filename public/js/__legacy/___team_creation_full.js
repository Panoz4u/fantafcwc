
import { renderPlayerList } from './renderPlayerList.js';
import { confirmSquad } from './confirmSquad.js';  // Modifica qui: importa da confirmSquad.js invece di team_creation.js

const getAvatarSrc = window.getAvatarSrc;

    // Modifica la funzione loadUserInfo per utilizzare le variabili globali
    async function loadUserInfo(userId, opponentId, ownerId, contestId) {
      try {
        // Se i parametri non sono forniti, prova a ottenerli dalle variabili globali
        if (!contestId) {
          contestId = window.contestId;
        }
        if (!opponentId) {
          opponentId = window.opponentId;
        }
        // Per ownerId, assumiamo che sia l'utente corrente se non specificato
        if (!ownerId) {
          ownerId = localStorage.getItem('userId');
        }
        // Per userId, assumiamo che sia l'utente corrente se non specificato
        if (!userId) {
          userId = localStorage.getItem('userId');
        }
    
        // Verifica che tutti i parametri necessari siano presenti
        if (!userId || !contestId) {
          console.error("Parametri mancanti: userId o contestId");
          showErrorMessage("Dati mancanti per caricare le informazioni utente");
          return;
        }
        
        // First, determine who is the current user and who is the opponent
        let currentUserId = userId;
        let actualOpponentId;
        // If current user is the opponent in the URL, then the owner is the actual opponent
        if (userId == opponentId) {
          actualOpponentId = ownerId;
        } else {
          actualOpponentId = opponentId;
        }
        
        // Sostituisco il messaggio di caricamento con uno spinner più discreto
        const container = document.getElementById("contestHeaderContainer");
        container.innerHTML = `
          <div class="contest-container cc-header">
            <div class="contest-bar" style="justify-content: center; min-height: 40px;">
              <div style="width: 20px; height: 20px; border: 2px solid #3498db; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
            </div>
          </div>
          <style>
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        `;
        
        // Get all users first to ensure we have user data even if contest details fail
        //Errore nel caricamento dei dati utente
        const usersResp = await fetch("/users");
        if (!usersResp.ok) {
          console.error("Errore nel recupero degli utenti:", usersResp.status, usersResp.statusText);
          container.innerHTML = `
            <div class="contest-container cc-header">
              <div class="contest-bar">
              
                <div class="result_bold"></div>
              </div>
            </div>
          `;
          return;
        }
        
        // Definisci allUsers qui, prima di usarla
        const allUsers = await usersResp.json();
        
        // Find the current user and opponent
        const currentUser = allUsers.find(x => x.user_id == currentUserId);
        const opponent = allUsers.find(x => x.user_id == actualOpponentId);
        
        if (currentUser) {
          // Update the Teex balance in the header
          const teexBalanceEl = document.getElementById("teexBalance");
          if (teexBalanceEl) teexBalanceEl.textContent = currentUser.teex_balance.toLocaleString();
          
          // Calcola il costo totale della squadra attuale
          const totalTeamCost = getTotalCost();
          // Aggiorna i Teex rimasti (10 - costo totale)
          const teexLeft = getAvailableBudget();
          const teexLeftEl = document.getElementById("teexLeft");
          if (teexLeftEl) {
            teexLeftEl.innerHTML = `<span class="teex-left-text-cyan">${teexLeft.toFixed(1)}</span> <span class="teex-left-text-white">SwissHearts left</span>`;
          }
        }
        
        // Get contest details to get team costs
        const contestResp = await fetch(`/contest-details?contest=${contestId}&user=${userId}`);
        console.log("Risposta contest-details:", contestResp.status, contestResp.statusText);
        
        if (!contestResp.ok) {
          console.error("Errore nel recupero dei dettagli del contest:", contestResp.status, contestResp.statusText);
          // Crea un header di fallback con le informazioni utente che abbiamo
          if (currentUser && opponent) {
            const iAmOwner = (parseInt(currentUserId) === parseInt(ownerId));
            const myName = currentUser.username || "User";
            const myAvatar = getAvatarSrc(currentUser.avatar);
            const oppName = opponent.username || "Opponent";
            const oppAvatar = getAvatarSrc(opponent.avatar);
            const myCost = getTotalCost().toFixed(1);
            container.innerHTML = `
              <div class="contest-container cc-header">
                <div class="contest-bar">
                  <img src="${myAvatar}" alt="${myName}" class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
                  <div class="result_bold">VS</div>
                  <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
                  <img src="${oppAvatar}" alt="${oppName}" class="player-avatar-contest right-avatar">
                  <div class="teex_spent left-teex" id="currentUserScore">${myCost}</div>
                  <div class="teex_spent right-teex">-</div>
                </div>
                <div class="status-badge-base status-badge">CREATED</div>
              </div>
            `;
          } else {
            // Manteniamo la struttura del container ma senza contenuto visibile
            container.innerHTML = `
              <div class="contest-container cc-header">
                <div class="contest-bar" style="min-height: 40px;">
                </div>
              </div>
            `;
          }
          return;
        }
        
        const contestData = await contestResp.json();
        console.log("Dati contest ricevuti:", contestData);
        
        // Verifica che contestData esista e sia un oggetto valido
        if (!contestData || typeof contestData !== 'object') {
          console.error("Dati del contest mancanti o in formato non valido");
          // Usa lo stesso fallback di sopra
          if (currentUser && opponent) {
            const iAmOwner = (parseInt(currentUserId) === parseInt(ownerId));
            const myName = currentUser.username || "User";
            const myAvatar = getAvatarSrc(currentUser.avatar);
            const oppName = opponent.username || "Opponent";
            const oppAvatar = getAvatarSrc(opponent.avatar);
            const myCost = getTotalCost().toFixed(1);
            container.innerHTML = `
              <div class="contest-container cc-header">
                <div class="contest-bar">
                  <img src="${myAvatar}" alt="${myName}" class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
                  <div class="result_bold">VS</div>
                  <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
                  <img src="${oppAvatar}" alt="${oppName}" class="player-avatar-contest right-avatar">
                  <div class="teex_spent left-teex" id="currentUserScore">${myCost}</div>
                  <div class="teex_spent right-teex">-</div>
                </div>
                <div class="status-badge-base status-badge">CREATED</div>
              </div>
            `;
          } else {
            container.innerHTML = `
              <div class="contest-container cc-header">
                <div class="contest-bar">
                  <div class="result_bold"></div>
                </div>
              </div>
            `;
          }
          return;
        }
        
        // Se contestData ha contest_id ma non ha la proprietà contest,
        //significa che l'API ha restituito direttamente l'oggetto contest
        if (contestData.contest_id && !contestData.contest) {
          // Crea un nuovo oggetto con la struttura attesa
          const formattedData = {
            contest: contestData
          };
          // Usa formattedData invece di contestData
          renderContestHeader(formattedData.contest);
        } else if (contestData.contest) {
          // Se contestData ha già la proprietà contest, usala direttamente
          renderContestHeader(contestData.contest);
        } else {
          console.error("Struttura dati contest non riconosciuta");
          // Rimuovi il messaggio di errore visibile e usa uno spinner invece
          container.innerHTML = `
            <div class="contest-container cc-header">
              <div class="contest-bar" style="justify-content: center; min-height: 40px;">
                <div style="width: 20px; height: 20px; border: 2px solid #3498db; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
              </div>
            </div>
            <style>
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
          `;
          return;
        }
        
        // Il resto del codice rimane invariato
        // Render contest header
        // Usa renderContestHeader da headerUtils.js
        if (contestData && contestData.contest) {
          renderContestHeader(contestData.contest);
        }
        
        // Set current user's team cost
        const isOwner = currentUserId == ownerId;
        // Calcola il costo totale della squadra attuale
        const totalTeamCost = getTotalCost();
        // Aggiorna i Teex rimasti (10 - costo totale)
        const teexLeft = getAvailableBudget();
        const teexLeftEl = document.getElementById("teexLeft");
        if (teexLeftEl) {
          teexLeftEl.innerHTML = `<span class="teex-left-text-cyan">${teexLeft.toFixed(1)}</span> <span class="teex-left-text-white">SwissHearts left</span>`;
        }
        
        // These elements might not exist in this page, so wrap them in try/catch
        try {
          document.getElementById("currentUserName").textContent = currentUser.username;
          document.getElementById("currentUserAvatar").src = getAvatarSrc(currentUser.avatar);
          document.getElementById("currentUserScore").textContent = totalTeamCost.toFixed(1);
        } catch (e) {
          console.log("Some elements not found, this is expected");
        }
        
        // Find the actual opponent
        if (opponent) {
          try {
            document.getElementById("opponentName").textContent = opponent.username;
            document.getElementById("opponentAvatar").src = getAvatarSrc(opponent.avatar);
            
            // Set opponent's team cost
            const opponentIsOwner = actualOpponentId == ownerId;
            const opponentCost = opponentIsOwner ? contestData.contest.owner_cost : contestData.contest.opponent_cost;
            document.getElementById("opponentScore").textContent = opponentCost ? parseFloat(opponentCost).toFixed(1) : "-";
          } catch (e) {
            console.log("Some opponent elements not found, this is expected");
          }
        }
      } catch(e) {
        console.error("Errore loadUserInfo", e);
        // Gestione errori generici
        const container = document.getElementById("contestHeaderContainer");
        if (container) {
          container.innerHTML = `
            <div class="contest-container cc-header">
              <div class="contest-bar">
                <div class="result_bold">Errore imprevisto: ${e.message}</div>
              </div>
            </div>
          `;
        }
        showErrorMessage(`Si è verificato un errore: ${e.message}`);
      }
    }

// Funzione per mostrare l'overlay di conferma
function showConfirmOverlay() {
  const players = loadChosenPlayers();
  if (!players.length) {
    alert("Devi scegliere almeno un giocatore!");
    return;
  }
  
  // Mostra l'overlay di moltiplicazione
  showMultiplyOverlay(getTotalCost);
}

// Configura gli event listener per i pulsanti e altri elementi interattivi
function setupEventListeners() {
  // Aggiungi event listener per il pulsante di conferma
  const confirmBtn = document.getElementById("confirmFooterBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      showConfirmOverlay();
    });
  }
  
  // Aggiungi event listener per il pulsante di reset
  const resetBtn = document.getElementById("resetTeamBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetTeam);
  }
  
  // Aggiungi event listener per il pulsante di aggiunta giocatore
  const addPlayerBtn = document.getElementById("addPlayerBtn");
  if (addPlayerBtn) {
    addPlayerBtn.addEventListener("click", navigateToAddPlayer);
  }
  
  // Aggiungi event listener per i pulsanti nel multiply overlay
  document.querySelectorAll(".multiply-circle").forEach(circle => {
    circle.addEventListener("click", function() {
      // Rimuovi la classe selezionata da tutti i cerchi
      document.querySelectorAll(".multiply-circle").forEach(c => {
        c.className = "multiply-circle mc-off";
      });
      // Aggiungi la classe selezionata a questo cerchio
      this.className = "multiply-circle mc-selected";
      // Aggiorna il moltiplicatore selezionato
      selectedMultiplier = parseFloat(this.dataset.multiply);
      // Aggiorna il costo totale
      document.getElementById("multipliedCost").textContent = (baseTeamCost * selectedMultiplier).toFixed(1);
    });
  });
  
  // Aggiungi event listener per i pulsanti nel multiply overlay
  document.getElementById("cancelMultiply").addEventListener("click", hideMultiplyOverlay);
  document.getElementById("confirmMultiply").addEventListener("click", confirmSquad);
}

// MANTIENI SOLO QUESTO EVENT LISTENER E RIMUOVI L'ALTRO
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Verifica se siamo in una pagina che richiede i dati del contest
    if (window.location.pathname.includes('riassunto.html') || 
        window.location.pathname.includes('team_creation.html')) {
      initApp();
    } else {
      // Per altre pagine, potrebbe essere necessario un comportamento diverso
      console.log("Pagina non riconosciuta per l'inizializzazione automatica");
    }
  } catch (e) {
    console.error("Errore durante l'inizializzazione:", e);
  }
});

// Inizializza l'applicazione
async function initApp() {
  try {
    // Ottieni i parametri dall'URL
    const params = new URLSearchParams(window.location.search);
    const ownerId = params.get("owner");
    const opponentId = params.get("opponent");
    const contestId = params.get("contest");
    const userId = params.get("user");
    
    // Verifica se i parametri sono disponibili nell'URL o nelle variabili globali
    const finalContestId = contestId || window.contestId;
    const finalUserId = userId || localStorage.getItem('userId');
    // Verifica che i parametri necessari siano presenti
    if (!finalContestId || !finalUserId) {
      console.error("Parametri mancanti (contest o user)");
      // Invece di mostrare un alert, mostra un messaggio più discreto nella pagina
      showErrorMessage("Parametri mancanti! Caricamento dati in corso...");
      
      // Prova a caricare i dati dal localStorage o dalle variabili globali
      setTimeout(async () => {
        // Riprova a caricare le informazioni utente con i dati disponibili
        await loadUserInfo();
        // Renderizza la lista dei giocatori
        await renderPlayerList();
      }, 1000);
      return;
    }
    
    // Carica le informazioni dell'utente
    await loadUserInfo(finalUserId, opponentId, ownerId, finalContestId);
    
    // Renderizza la lista dei giocatori
    await renderPlayerList();
    
    // Aggiungi event listener per i pulsanti
    setupEventListeners();
  } catch(e) {
    console.error("Errore nell'inizializzazione dell'app:", e);
    showErrorMessage("Errore nel caricamento dei dati. Riprova più tardi.");
  }
}

// Funzione per nascondere l'overlay di moltiplicazione
function hideMultiplyOverlay() {
  const overlay = document.getElementById("multiplyOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}



// Export the function
// Rimuovi la vecchia funzione confirmSquad che non fa nulla di utile
// e mantieni solo l'export della nuova funzione importata
export { confirmSquad };

// Aggiungi event listener quando il documento è pronto
document.addEventListener("DOMContentLoaded", function() {
  // Aggiungi event listener per il pulsante Back
  const backArrow = document.getElementById("backArrow");
  if (backArrow) {
    backArrow.addEventListener("click", () => {
      window.history.back();
    });
  }
  
  // Aggiungi event listener per il pulsante RESET
  const resetTeamBtn = document.getElementById("resetTeamBtn");
  if (resetTeamBtn) {
    resetTeamBtn.addEventListener("click", () => {
      // Svuota la lista dei giocatori scelti
      saveChosenPlayers([]);
      // Aggiorna la visualizzazione
      renderPlayerList();
    });
  }
  

  
  // Aggiungi event listener per il pulsante ADD PLAYER
  const addPlayerBtn = document.getElementById("addPlayerBtn");
  if (addPlayerBtn) {
    addPlayerBtn.addEventListener("click", () => {
      // Ottieni i parametri URL
      const params = new URLSearchParams(window.location.search);
      const contestId = params.get("contest");
      const userId = params.get("user");
      const ownerId = params.get("owner");
      const opponentId = params.get("opponent");
      
      // Reindirizza alla pagina di aggiunta giocatori
      window.location.href = `/aggiungi-giocatore.html?contest=${contestId}&user=${userId}&owner=${ownerId}&opponent=${opponentId}`;
    });
  }
    // Carica i dati utente e renderizza la lista dei giocatori
  const params = new URLSearchParams(window.location.search);
  const contestId = params.get("contest");
  const userId = params.get("user");
  const ownerId = params.get("owner");
  const opponentId = params.get("opponent");
  
  if (contestId && userId) {
    loadUserInfo(userId, opponentId, ownerId, contestId);
    renderPlayerList();
  } else {
    // Non fare nulla se contestId o userId non sono disponibili
    console.log("Parametri contestId o userId mancanti");
  }
  return;
});
// Funzione per resettare la squadra
function resetTeam() {
  if (confirm("Sei sicuro di voler resettare la squadra?")) {
    saveChosenPlayers([]);
    renderPlayerList();
  }
}
// Funzione per navigare alla pagina di aggiunta giocatore
function navigateToAddPlayer() {
  // Salva i dati necessari nel localStorage
  const addPlayerData = {
    owner: window.ownerId || new URLSearchParams(window.location.search).get("owner"),
    opponent: window.opponentId || new URLSearchParams(window.location.search).get("opponent"),
    contest: window.contestId || new URLSearchParams(window.location.search).get("contest"),
    user: localStorage.getItem('userId'),
    timestamp: new Date().getTime()
  };
  localStorage.setItem('addPlayerData', JSON.stringify(addPlayerData));
  
  // Naviga alla pagina senza parametri in URL
  window.location.href = '/aggiungi-giocatore.html';
}

// public/js/headerUtils.js
const getAvatarSrc = window.getAvatarSrc;
import { getTotalCost } from './teamUtils.js';

export function renderContestHeader(contestData) {
  const container = document.getElementById("contestHeaderContainer");
  if (!container) {
    console.error("Container contestHeaderContainer non trovato");
    return;
  }
  container.innerHTML = "";
  
  // Determina se il current user è owner
  // Prima prova a ottenere l'ID utente dai parametri URL
  const params = new URLSearchParams(window.location.search);
  let currentUserId = params.get("user");
  
  // Se non è presente nell'URL, prova a ottenerlo dal localStorage
  if (!currentUserId) {
    currentUserId = localStorage.getItem('userId');
  }
  
  // Se ancora non abbiamo un ID utente, usa una logica di fallback
  if (!currentUserId && window.contestId) {
    console.log("Usando logica di fallback per determinare l'utente corrente");
    // Assumiamo che l'utente corrente sia l'owner se non specificato diversamente
    currentUserId = contestData.owner_id;
  }
  
  const iAmOwner = (parseInt(currentUserId) === parseInt(contestData.owner_id));
  
  // Calcola il costo totale della squadra attuale
  const totalTeamCost = getTotalCost();
  
  // Importante: l'utente corrente deve sempre essere a sinistra
  // Non invertire mai le posizioni
  const myName = iAmOwner ? contestData.owner_name : contestData.opponent_name;
  const myAvatar = iAmOwner ? contestData.owner_avatar : contestData.opponent_avatar;
  const myCost = totalTeamCost.toFixed(1); // Usa il costo calcolato dai giocatori scelti
  const oppName = iAmOwner ? contestData.opponent_name : contestData.owner_name;
  const oppAvatar = iAmOwner ? contestData.opponent_avatar : contestData.owner_avatar;
  const oppCost = iAmOwner 
    ? (contestData.opponent_cost ? parseFloat(contestData.opponent_cost).toFixed(1) : "-") 
    : (contestData.owner_cost ? parseFloat(contestData.owner_cost).toFixed(1) : "-");
  
  // ricostruisci la card completa
  const statusBadges = {
    0: "CREATED",
    1: iAmOwner ? "PENDING" : "INVITED",
    2: "READY",
    4: "LIVE",
    5: "COMPLETED"
  };
  const statusText = statusBadges[contestData.status] || contestData.status_name;

  const card = document.createElement("div");
  card.classList.add("contest-container", "cc-header");
  
  // Determina la classe corretta per il badge di stato
  let statusBadgeClass = "status-badge";
  if (contestData.status === 1 && !iAmOwner) {
    statusBadgeClass = "status-badge-invited";
  }
  
  card.innerHTML = `
    <div class="contest-bar">
      <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
      <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
      <div class="result_bold">VS</div>
      <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
      <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
      <div class="teex_spent left-teex" id="currentUserScore">${myCost}</div>
      <div class="teex_spent right-teex">${oppCost}</div>
    </div>
    <div class="status-badge-base ${statusBadgeClass}">${statusText}</div>
    ${contestData.multiply && parseInt(contestData.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ''}
  `;

  container.appendChild(card);
  console.log("Header del contest renderizzato con successo");
}

// Ho analizzato i file del tuo progetto e ho identificato i problemi che stai riscontrando. Ecco le soluzioni:
// Problema 1: Classe dello Status "INVITED"
//
// Nel file `headerUtils.js`, lo status badge viene sempre creato con la classe "status-badge-base status-badge", ma per lo stato "INVITED" dovrebbe usare "status-badge-base status-invited".
//
// Ecco la modifica necessaria:


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

// public/js/headerUtils.js
const getAvatarSrc = window.getAvatarSrc;
import { getTotalCost } from './teamUtils.js';

export function renderContestHeader(contestData) {
  const container = document.getElementById("contestHeaderContainer");
  if (!container) {
    console.error("Container contestHeaderContainer non trovato");
    return;
  }
  container.innerHTML = "";
  
  // Determina se il current user è owner
  // Prima prova a ottenere l'ID utente dai parametri URL
  const params = new URLSearchParams(window.location.search);
  let currentUserId = params.get("user");
  
  // Se non è presente nell'URL, prova a ottenerlo dal localStorage
  if (!currentUserId) {
    currentUserId = localStorage.getItem('userId');
  }
  
  // Se ancora non abbiamo un ID utente, usa una logica di fallback
  if (!currentUserId && window.contestId) {
    console.log("Usando logica di fallback per determinare l'utente corrente");
    // Assumiamo che l'utente corrente sia l'owner se non specificato diversamente
    currentUserId = contestData.owner_id;
  }
  
  const iAmOwner = (parseInt(currentUserId) === parseInt(contestData.owner_id));
  
  // Calcola il costo totale della squadra attuale
  const totalTeamCost = getTotalCost();
  
  // Importante: l'utente corrente deve sempre essere a sinistra
  // Non invertire mai le posizioni
  const myName = iAmOwner ? contestData.owner_name : contestData.opponent_name;
  const myAvatar = iAmOwner ? contestData.owner_avatar : contestData.opponent_avatar;
  const myCost = totalTeamCost.toFixed(1); // Usa il costo calcolato dai giocatori scelti
  const oppName = iAmOwner ? contestData.opponent_name : contestData.owner_name;
  const oppAvatar = iAmOwner ? contestData.opponent_avatar : contestData.owner_avatar;
  const oppCost = iAmOwner 
    ? (contestData.opponent_cost ? parseFloat(contestData.opponent_cost).toFixed(1) : "-") 
    : (contestData.owner_cost ? parseFloat(contestData.owner_cost).toFixed(1) : "-");
  
  // ricostruisci la card completa
  const statusBadges = {
    0: "CREATED",
    1: iAmOwner ? "PENDING" : "INVITED",
    2: "READY",
    4: "LIVE",
    5: "COMPLETED"
  };
  const statusText = statusBadges[contestData.status] || contestData.status_name;

  const card = document.createElement("div");
  card.classList.add("contest-container", "cc-header");
  
  // Determina la classe corretta per il badge di stato
  let statusBadgeClass = "status-badge";
  if (contestData.status === 1 && !iAmOwner) {
    statusBadgeClass = "status-badge-invited";
  }
  
  card.innerHTML = `
    <div class="contest-bar">
      <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
      <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
      <div class="result_bold">VS</div>
      <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
      <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
      <div class="teex_spent left-teex" id="currentUserScore">${myCost}</div>
      <div class="teex_spent right-teex">${oppCost}</div>
    </div>
    <div class="status-badge-base ${statusBadgeClass}">${statusText}</div>
    ${contestData.multiply && parseInt(contestData.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ''}
  `;

  container.appendChild(card);
  console.log("Header del contest renderizzato con successo");
}

// Ho analizzato i file del tuo progetto e ho identificato i problemi che stai riscontrando. Ecco le soluzioni:
// Problema 1: Classe dello Status "INVITED"
//
// Nel file `headerUtils.js`, lo status badge viene sempre creato con la classe "status-badge-base status-badge", ma per lo stato "INVITED" dovrebbe usare "status-badge-base status-invited".
//
// Ecco la modifica necessaria:

export async function fetchCurrentEventUnit() {
  try {
    const resp = await fetch("/current-event-unit");
    if (!resp.ok) throw new Error("Errore nel recupero dell'unità evento");
    const data = await resp.json();
    return data.event_unit_id;
  } catch {
    return "";
  }
}

// public/js/statusUtils.js

export async function checkContestStatus(contestId) {
  try {
    const resp = await fetch(`/contest-details?contest=${contestId}`);
    if (!resp.ok) throw new Error("Errore nel recupero dei dettagli");
    const data = await resp.json();
    return data.contest.status;
  } catch (e) {
    console.error("checkContestStatus:", e);
    return null;
  }
}

export function showErrorMessage(message) {
  const div = document.getElementById("errorMessage");
  if (!div) return;
  div.textContent = message;
  div.style.display = "block";
  setTimeout(() => { div.style.display = "none"; }, 3000);
}
