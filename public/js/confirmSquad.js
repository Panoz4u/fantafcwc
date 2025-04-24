import { loadChosenPlayers, getTotalCost } from './teamUtils.js';
import { showErrorMessage } from './statusUtils.js';
import { showMultiplyOverlay } from './multiply.js';

// Variabili per il moltiplicatore
let selectedMultiplier = 1;
let baseTeamCost = 0;

// Funzione per verificare se l'utente è invitato e impostare il moltiplicatore di conseguenza
export async function setupMultiplyForInvitedUser() {
  try {
    const params = new URLSearchParams(window.location.search);
    const contestId = params.get("contest");
    const userId = params.get("user");
    if (!contestId || !userId) return;
    
    // Fetch contest details
    const response = await fetch(`/contest-details?contest=${contestId}&user=${userId}`);
    if (!response.ok) return;
    const data = await response.json();
    const contest = data.contest;
    
    // Check if user is opponent and contest status is 1 (invited)
    const isOpponent = parseInt(userId) === parseInt(contest.opponent_id);
    if (isOpponent && contest.status === 1) {
      // User is invited - disable multiply selection and set to contest value
      // Make sure we're getting the correct multiply value
      let multiplyValue = 1;
      if (contest.multiply) {
        // Try to parse the multiply value, ensuring it's a number
        multiplyValue = parseFloat(contest.multiply);
        if (isNaN(multiplyValue)) multiplyValue = 1;
      }
      
      // Add debug output to see what we're getting
      console.log("Contest multiply value:", contest.multiply, "Type:", typeof contest.multiply);
      console.log("Parsed multiply value:", multiplyValue, "Type:", typeof multiplyValue);
      
      // Store the multiply value for later use when the overlay opens
      window.lockedMultiply = multiplyValue;
      localStorage.setItem("lockedMultiply", multiplyValue.toString());
      console.log("User is invited - multiply locked to:", multiplyValue);
    } else {
      // Clear any previously stored locked multiply value
      window.lockedMultiply = null;
      localStorage.removeItem("lockedMultiply");
    }
  } catch (error) {
    console.error("Error setting up multiply for invited user:", error);
  }
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
  
  if (!contestId || !userId) {
    showErrorMessage("Parametri mancanti per confermare la squadra");
    return;
  }
  
  // Calcola il costo base
  baseTeamCost = getTotalCost();
  
  // Usa il moltiplicatore passato come parametro o prendi quello dal localStorage
  const selectedMultiplier = multiplier || localStorage.getItem('selectedMultiplier') || 1;
  // const multipliedCost = baseTeamCost * selectedMultiplier; // Non più necessario qui se il server non lo usa
  
  console.log("RICEVUTO DA CLIENT:", { contestId, userId, multiplier: selectedMultiplier, totalCost: baseTeamCost }); // Aggiornato log
  
  // Prepara i dati da inviare
  const squadData = {
    contestId: parseInt(contestId),
    userId: userId,
    players: players.map(p => ({
      athleteId: parseInt(p.athlete_id),
      eventUnitId: parseInt(p.event_unit_id),
      event_unit_cost: parseFloat(p.event_unit_cost || 0), // Costo di ogni atleta
      aep_id: p.aep_id || null // Usa il valore aep_id originale
    })),
    multiplier: parseFloat(selectedMultiplier),
    totalCost: baseTeamCost  // Il server calcolerà il costo finale moltiplicando per il multiplier
  };
  
  console.log("Dati inviati in confirm-squad:", JSON.stringify(squadData));
  
  try {
    // Ottieni il token di autenticazione dal localStorage
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      showErrorMessage("Token di autenticazione mancante");
      return;
    }
    
    // Invia la richiesta con il token di autenticazione
    const response = await fetch('/confirm-squad', {
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