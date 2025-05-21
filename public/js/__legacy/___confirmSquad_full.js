
// Variabili per il moltiplicatore
let selectedMultiplier = 1;
let baseTeamCost = 0;

// Funzione per verificare se l'utente è invitato e impostare il moltiplicatore di conseguenza
export async function setupMultiplyForInvitedUser() {
  console.log("setupMultiplyForInvitedUser: Inizio funzione"); // Log inizio
  try {
    const params = new URLSearchParams(window.location.search);
    const contestId = params.get("contest") || window.contestId;
    const userId = params.get("user") || localStorage.getItem('userId');
    if (!contestId || !userId) {
      console.log("setupMultiplyForInvitedUser: contestId o userId mancanti"); // Log parametri mancanti
      return;
    }

    // Ottieni il token di autenticazione
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.error("setupMultiplyForInvitedUser: Token di autenticazione mancante");
      // Potresti voler gestire questo caso in modo diverso, es. reindirizzare al login
      return;
    }

    // Correggi l'URL qui per utilizzare il percorso corretto
    const url = `/contests/contest-details?contest=${contestId}&user=${userId}`;
    console.log(`setupMultiplyForInvitedUser: Fetching ${url}`); // Log fetch
    // Aggiungi l'header Authorization alla richiesta fetch
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    if (!response.ok) {
      console.error("setupMultiplyForInvitedUser: Errore fetch contest details:", response.status); // Log errore fetch
      // Considera di mostrare un messaggio all'utente qui se necessario
      return;
    }
    const data = await response.json();
    const contest = data.contest;
    console.log("setupMultiplyForInvitedUser: Dati contest ricevuti:", contest); // Log dati contest

    // Check if user is opponent and contest status is 1 (invited)
    const isOpponent = parseInt(userId) === parseInt(contest.opponent_id);
    console.log(`setupMultiplyForInvitedUser: userId=${userId}, opponent_id=${contest.opponent_id}, isOpponent=${isOpponent}, status=${contest.status}`); // Log controllo opponent/status

    if (isOpponent && contest.status === 1) {
      console.log("setupMultiplyForInvitedUser: Utente è opponent e status è 1. Blocco moltiplicatore."); // Log blocco attivo
      // User is invited - disable multiply selection and set to contest value
      let multiplyValue = 1;
      // Assicurati che contest.multiply esista e sia un numero valido
      if (contest.multiply && !isNaN(parseFloat(contest.multiply))) {
        multiplyValue = parseFloat(contest.multiply);
      } else {
        console.warn(`setupMultiplyForInvitedUser: Valore multiply non valido o mancante nel contest: ${contest.multiply}. Uso 1.`);
      }


      console.log("setupMultiplyForInvitedUser: Valore multiply dal contest:", contest.multiply, "Valore parsato:", multiplyValue); // Log valore multiply

      // Store the multiply value for later use when the overlay opens
      window.lockedMultiply = multiplyValue;
      localStorage.setItem("lockedMultiply", multiplyValue.toString());
      console.log("setupMultiplyForInvitedUser: window.lockedMultiply impostato a:", window.lockedMultiply); // Log valore impostato
      console.log("setupMultiplyForInvitedUser: localStorage lockedMultiply impostato a:", localStorage.getItem("lockedMultiply")); // Log valore localStorage
    } else {
      console.log("setupMultiplyForInvitedUser: Condizioni per blocco non soddisfatte. Rimuovo blocco."); // Log blocco non attivo
      // Clear any previously stored locked multiply value
      window.lockedMultiply = null;
      localStorage.removeItem("lockedMultiply");
      console.log("setupMultiplyForInvitedUser: window.lockedMultiply e localStorage lockedMultiply rimossi."); // Log rimozione blocco
    }
  } catch (error) {
    console.error("setupMultiplyForInvitedUser: Errore:", error); // Log errore generico
  }
  console.log("setupMultiplyForInvitedUser: Fine funzione"); // Log fine
}

// Funzione per mostrare l'overlay di moltiplicazione
export function showConfirmOverlay() {
  const players = loadChosenPlayers();
  if (!players.length) {
    alert("Devi scegliere almeno un giocatore!");
    return;
  }
  showMultiplyOverlay(getTotalCost);
}

// Funzione per confermare la squadra
export async function confirmSquad(multiplier) {
  const players = loadChosenPlayers();
  if (!players.length) {
    alert("Devi scegliere almeno un giocatore!");
    return;
  }
  
  // Ottieni i parametri dall'URL
  const params = new URLSearchParams(window.location.search);
  const contestId = params.get("contest") || window.contestId || localStorage.getItem('contestId');
  const userId = params.get("user") || window.userId || localStorage.getItem('userId');
  let ownerId = params.get("owner") || window.ownerId || localStorage.getItem('ownerId');
  let opponentId = params.get("opponent") || window.opponentId || localStorage.getItem('opponentId');
  
  if (!contestId || !userId) {
    showErrorMessage("Parametri mancanti per confermare la squadra");
    return;
  }
  
  // Prova a recuperare i dati dal localStorage se mancanti
  if (!ownerId || !opponentId) {
    console.warn("Owner o Opponent mancanti, tentativo di recupero da localStorage");
    try {
      const addPlayerData = JSON.parse(localStorage.getItem('addPlayerData') || '{}');
      if (addPlayerData.owner) {
        ownerId = addPlayerData.owner;
        console.log("Recuperato owner da addPlayerData:", ownerId);
      }
      if (addPlayerData.opponent) {
        opponentId = addPlayerData.opponent;
        console.log("Recuperato opponent da addPlayerData:", opponentId);
      }
    } catch (e) {
      console.error("Errore nel parsing di addPlayerData:", e);
    }
  }
  
  // Verifica ancora se mancano i parametri
  if (!ownerId || !opponentId) {
    console.error("Owner o Opponent ancora mancanti dopo il tentativo di recupero");
    showErrorMessage("Impossibile completare l'operazione: dati mancanti (owner/opponent)");
    return;
  }
  
  // Calcola il costo base
  baseTeamCost = getTotalCost();
  
  // Usa il moltiplicatore passato come parametro o prendi quello dal localStorage o dal valore bloccato
  const lockedMultiply = window.lockedMultiply || localStorage.getItem("lockedMultiply");
  const selectedMultiplier = lockedMultiply ? parseFloat(lockedMultiply) : (multiplier || localStorage.getItem('selectedMultiplier') || 1);
  
  // Ottieni l'aep_id globale se disponibile
  const globalAepId = params.get("aep_id") || window.aepId;
  
  console.log("RICEVUTO DA CLIENT:", { 
    contestId, 
    userId, 
    ownerId,
    opponentId,
    multiplier: selectedMultiplier, 
    totalCost: baseTeamCost,
    lockedMultiply,
    globalAepId
  });
  
  // Prepara i dati da inviare
  const squadData = {
    contestId: parseInt(contestId),
    userId: userId,
    owner_id: ownerId,
    opponent_id: opponentId,
    players: players.map(p => {
      // Usa l'aep_id del giocatore se disponibile, altrimenti usa l'aep_id globale
      const playerAepId = p.aep_id || globalAepId || null;
      console.log("Dati giocatore:", p.athlete_shortname || p.athlete_id, "aep_id:", playerAepId);
      
      return {
        athleteId: parseInt(p.athlete_id),
        eventUnitId: parseInt(p.event_unit_id),
        event_unit_cost: parseFloat(p.event_unit_cost || 0),
        aep_id: playerAepId
      };
    }),
    multiplier: parseFloat(selectedMultiplier),
    totalCost: baseTeamCost
  };
  
  console.log("Dati completi inviati in confirm-squad:", JSON.stringify(squadData));
  
  try {
    // Ottieni il token di autenticazione dal localStorage
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      showErrorMessage("Token di autenticazione mancante");
      return;
    }
    

console.log('?? Payload pronto da inviare:', JSON.stringify(squadData, null, 2));

    // Invia la richiesta con il token di autenticazione
    const response = await fetch('/contests/confirm-squad', { // Modifica qui l'URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`  // Aggiungi l'header di autorizzazione
      },
      body: JSON.stringify(squadData)
    });
    
    if (response.ok) {
      // Squadra confermata con successo
      const result = await response.json();
      console.log("Squadra confermata con successo:", result);



      
      // Pulisci la lista dei giocatori scelti
      localStorage.removeItem('chosenPlayers');
      
      // Reindirizza alla pagina di conferma o alla dashboard
      window.location.href = `/user-landing.html?user=${userId}`;
    } else {
      // Gestisci gli errori
      const errorData = await response.json().catch(() => ({ error: `Errore HTTP: ${response.status}` }));
      console.error("Errore nella conferma della squadra:", response.status, errorData);
      showErrorMessage(`Errore nella conferma della squadra: ${errorData.error || response.statusText}`);
    }
  } catch (error) {
    console.error("Errore nella conferma della squadra:", error);
    showErrorMessage(`Si è verificato un errore: ${error.message}`);
  }
}


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


// Importa la funzione getTotalCost dal modulo teamUtils
import { getTotalCost } from './teamUtils.js';
import { confirmSquad } from './confirmSquad.js';  // Modifica qui: importa da confirmSquad.js invece di team_creation.js

// Variabile per memorizzare il moltiplicatore selezionato
let selectedMultiplier = 1;

// Funzione per mostrare l'overlay del moltiplicatore
export function showMultiplyOverlay(getTotalCostFn) {
  console.log("showMultiplyOverlay: Inizio funzione"); // Log inizio
  // Ottieni il costo totale della squadra utilizzando la funzione passata o quella predefinita
  const totalCost = getTotalCostFn ? getTotalCostFn() : getTotalCost();
  console.log("showMultiplyOverlay: totalCost =", totalCost); // Log costo totale

  // Se non ci sono giocatori (costo totale = 0), non mostrare l'overlay
  if (totalCost <= 0) {
    console.log("showMultiplyOverlay: totalCost <= 0, chiamo confirmSquad direttamente."); // Log costo zero
    const lockedMultiply = window.lockedMultiply || localStorage.getItem("lockedMultiply");
    console.log("showMultiplyOverlay: Valore lockedMultiply per costo zero:", lockedMultiply); // Log lockedMultiply per costo zero
    confirmSquad(lockedMultiply ? parseFloat(lockedMultiply) : 1);
    return;
  }

  // Controlla se il moltiplicatore è bloccato
  const lockedMultiplyValue = window.lockedMultiply || localStorage.getItem("lockedMultiply");
  const isMultiplyLocked = lockedMultiplyValue !== null;
  console.log("showMultiplyOverlay: window.lockedMultiply =", window.lockedMultiply); // Log window.lockedMultiply
  console.log("showMultiplyOverlay: localStorage lockedMultiply =", localStorage.getItem("lockedMultiply")); // Log localStorage
  console.log("showMultiplyOverlay: lockedMultiplyValue =", lockedMultiplyValue, "isMultiplyLocked =", isMultiplyLocked); // Log stato blocco

  // Aggiorna il titolo dell'overlay
  const titleElement = document.querySelector('#multiplyOverlay .title_centre');
  if (titleElement) {
    if (isMultiplyLocked) {
      console.log("showMultiplyOverlay: Imposto titolo 'MULTIPLY IS FIXED'"); // Log titolo bloccato
      titleElement.innerHTML = 'MULTIPLY IS FIXED<br>X';
    } else {
      console.log("showMultiplyOverlay: Imposto titolo 'MULTIPLY YOUR WIN'"); // Log titolo normale
      titleElement.innerHTML = 'MULTIPLY YOUR WIN<br>X';
    }
  }

  // Imposta il moltiplicatore iniziale (o bloccato)
  selectedMultiplier = isMultiplyLocked ? parseFloat(lockedMultiplyValue) : 1;
  console.log("showMultiplyOverlay: selectedMultiplier impostato a:", selectedMultiplier); // Log moltiplicatore iniziale

  // Aggiorna il costo visualizzato nell'overlay
  updateMultipliedCost(); // Assicurati che il costo sia aggiornato con il moltiplicatore corretto

  // Mostra l'overlay
  const overlay = document.getElementById('multiplyOverlay');
  if (overlay) {
    console.log("showMultiplyOverlay: Mostro overlay"); // Log mostra overlay
    overlay.style.display = 'flex';
  }

  // Aggiungi event listeners ai cerchi del moltiplicatore (ora gestisce lo stato bloccato)
  setupMultiplyCircles();

  // Aggiungi event listeners ai pulsanti
  setupMultiplyButtons();
  console.log("showMultiplyOverlay: Fine funzione"); // Log fine
}

// Funzione per aggiornare il costo visualizzato in base al moltiplicatore selezionato
function updateMultipliedCost() {
  const totalCost = getTotalCost();
  const multipliedCost = (totalCost * selectedMultiplier).toFixed(1);
  const multipliedCostEl = document.getElementById('multipliedCost');
  if (multipliedCostEl) {
    multipliedCostEl.textContent = multipliedCost;
  }
}

// Funzione per configurare i cerchi del moltiplicatore
function setupMultiplyCircles() {
  console.log("setupMultiplyCircles: Inizio funzione"); // Log inizio
  const circles = document.querySelectorAll('.multiply-circle');
  const lockedMultiplyValue = window.lockedMultiply || localStorage.getItem("lockedMultiply");
  const isMultiplyLocked = lockedMultiplyValue !== null;
  const currentSelectedMultiplier = isMultiplyLocked ? parseFloat(lockedMultiplyValue) : selectedMultiplier;
  console.log("setupMultiplyCircles: lockedMultiplyValue =", lockedMultiplyValue, "isMultiplyLocked =", isMultiplyLocked, "currentSelectedMultiplier =", currentSelectedMultiplier); // Log stato blocco e valore

  // Rimuovi prima tutti gli event listeners esistenti per evitare duplicati
  circles.forEach(circle => {
    const newCircle = circle.cloneNode(true);
    circle.parentNode.replaceChild(newCircle, circle);
  });
  console.log("setupMultiplyCircles: Event listeners rimossi e nodi clonati"); // Log clonazione

  // Aggiungi nuovi event listeners e imposta lo stato iniziale/bloccato
  document.querySelectorAll('.multiply-circle').forEach(circle => {
    const circleValue = parseFloat(circle.dataset.multiply);
    console.log(`setupMultiplyCircles: Processo cerchio con valore ${circleValue}`); // Log processo cerchio

    // Imposta lo stato visivo iniziale/bloccato
    if (circleValue === currentSelectedMultiplier) {
      console.log(`setupMultiplyCircles: Cerchio ${circleValue} corrisponde a currentSelectedMultiplier. Imposto mc-on.`); // Log cerchio selezionato
      circle.classList.remove('mc-off');
      circle.classList.add('mc-on');
    } else {
      console.log(`setupMultiplyCircles: Cerchio ${circleValue} NON corrisponde a currentSelectedMultiplier. Imposto mc-off.`); // Log cerchio non selezionato
      circle.classList.remove('mc-on');
      circle.classList.add('mc-off');
    }

    // Se il moltiplicatore è bloccato, disabilita l'interazione
    if (isMultiplyLocked) {
      console.log(`setupMultiplyCircles: Moltiplicatore BLOCCATO. Disabilito interazione per cerchio ${circleValue}.`); // Log blocco attivo per cerchio
      circle.style.pointerEvents = 'none'; // Disabilita click
      if (circleValue !== currentSelectedMultiplier) {
        console.log(`setupMultiplyCircles: Cerchio ${circleValue} non selezionato, imposto opacità 0.5.`); // Log opacità ridotta
        circle.style.opacity = '0.5';
      } else {
         console.log(`setupMultiplyCircles: Cerchio ${circleValue} selezionato, imposto opacità 1.`); // Log opacità normale
         circle.style.opacity = '1';
      }
    } else {
      console.log(`setupMultiplyCircles: Moltiplicatore NON bloccato. Abilito interazione per cerchio ${circleValue}.`); // Log blocco non attivo per cerchio
      // Se non è bloccato, abilita l'interazione e resetta lo stile
      circle.style.pointerEvents = '';
      circle.style.opacity = '';

      // Aggiungi event listener per il click solo se non è bloccato
      circle.addEventListener('click', function() {
        console.log(`setupMultiplyCircles: Click su cerchio ${this.dataset.multiply}`); // Log click
        // Rimuovi la classe attiva da tutti i cerchi
        document.querySelectorAll('.multiply-circle').forEach(c => {
          c.classList.remove('mc-on');
          c.classList.add('mc-off');
        });

        // Aggiungi la classe attiva al cerchio cliccato
        this.classList.remove('mc-off');
        this.classList.add('mc-on');

        // Aggiorna il moltiplicatore selezionato
        selectedMultiplier = parseInt(this.dataset.multiply);
        console.log(`setupMultiplyCircles: selectedMultiplier aggiornato a ${selectedMultiplier}`); // Log aggiornamento moltiplicatore

        // Aggiorna il costo visualizzato
        updateMultipliedCost();
      });
    }
  });
  console.log("setupMultiplyCircles: Fine funzione"); // Log fine
}

// Funzione per configurare i pulsanti dell'overlay
function setupMultiplyButtons() {
  // Pulsante Cancel
  const cancelBtn = document.getElementById('cancelMultiply');
  if (cancelBtn) {
    // Rimuovi prima tutti gli event listeners esistenti
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Aggiungi nuovo event listener
    document.getElementById('cancelMultiply').addEventListener('click', function() {
      // Nascondi l'overlay
      const overlay = document.getElementById('multiplyOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
    });
  }
  
  // Pulsante Confirm
  const confirmBtn = document.getElementById('confirmMultiply');
  if (confirmBtn) {
    // Rimuovi prima tutti gli event listeners esistenti
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Aggiungi nuovo event listener
    document.getElementById('confirmMultiply').addEventListener('click', function() {
      // Salva il moltiplicatore selezionato nel localStorage
      localStorage.setItem('selectedMultiplier', selectedMultiplier.toString());
      
      // Nascondi l'overlay
      const overlay = document.getElementById('multiplyOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
      
      // Chiama la funzione confirmSquad con il moltiplicatore selezionato
      confirmSquad(selectedMultiplier);
    });
  }
}

