import { loadChosenPlayers, getTotalCost } from './teamUtils.js';
import { showErrorMessage } from './statusUtils.js';
import { showMultiplyOverlay } from './multiply.js';

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
  
  console.log("RICEVUTO DA CLIENT:", { 
    contestId, 
    userId, 
    ownerId,
    opponentId,
    multiplier: selectedMultiplier, 
    totalCost: baseTeamCost,
    lockedMultiply
  });
  
  // Prepara i dati da inviare
  const squadData = {
    contestId: parseInt(contestId),
    userId: userId,
    owner_id: ownerId, // Cambiato da ownerId a owner_id
    opponent_id: opponentId, // Cambiato da opponentId a opponent_id
    players: players.map(p => {
      console.log("Dati giocatore originali:", p);
      console.log("aep_id del giocatore:", p.aep_id);
      return {
        athleteId: parseInt(p.athlete_id),
        eventUnitId: parseInt(p.event_unit_id),
        event_unit_cost: parseFloat(p.event_unit_cost || 0), // Costo di ogni atleta
        aep_id: p.aep_id || null // Usa il valore aep_id originale
      };
    }),
    multiplier: parseFloat(selectedMultiplier),
    totalCost: baseTeamCost  // Il server calcolerà il costo finale moltiplicando per il multiplier
  };
  
  console.log("Dati completi inviati in confirm-squad:", JSON.stringify(squadData));
  
  try {
    // Ottieni il token di autenticazione dal localStorage
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      showErrorMessage("Token di autenticazione mancante");
      return;
    }
    
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