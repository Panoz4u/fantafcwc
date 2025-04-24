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
export async function confirmSquad() {
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
  
  // Calcola il costo moltiplicato
  baseTeamCost = getTotalCost();
  selectedMultiplier = parseFloat(localStorage.getItem('selectedMultiplier') || 1);
  const multipliedCost = baseTeamCost * selectedMultiplier;
  
  const bodyObj = {
    contestId,
    userId,
    players,
    multiply: selectedMultiplier,
    totalCost: multipliedCost
  };
  
  try {
    const resp = await fetch("/confirm-squad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj)
    });
    
    if(!resp.ok) {
      const err = await resp.json();
      alert("Errore conferma squadra: " + err.error);
      return;
    }
    
    // Ok
    window.location.href = `/user-landing.html?user=${userId}`;
  } catch(e) {
    alert("Errore di rete");
    console.error(e);
  }
}