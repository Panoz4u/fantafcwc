// public/js/user/contestDetails/events.js

import { fetchContestDetails, fetchTeexBalance } from './api.js';
import {
  renderContestHeader,
  renderTeamLists,
  renderTeexBalance,
  showError
} from './ui.js';

export async function initContestDetails() {
  const contestIdStr   = localStorage.getItem("contestId");
  const ownerIdStr     = localStorage.getItem("ownerId");
  const opponentIdStr  = localStorage.getItem("opponentId");
  let eventUnitIdStr = localStorage.getItem("eventUnitId"); // <<< MODIFIED: Make it let
  const authToken      = localStorage.getItem("authToken");
  const currentUserId  = localStorage.getItem("userId");

  // Converti e controlla gli ID
  const contestId = parseInt(contestIdStr, 10);
  const ownerId = parseInt(ownerIdStr, 10); 
  const opponentId = opponentIdStr ? parseInt(opponentIdStr, 10) : null; 
  
  // --- BEGIN MODIFICATION ---
  // Handle cases where eventUnitIdStr might be null, undefined, or "null"
  if (eventUnitIdStr === null || eventUnitIdStr === undefined || eventUnitIdStr.toLowerCase() === "null" || eventUnitIdStr.trim() === "") {
    console.warn('eventUnitIdStr from localStorage is null, undefined, or empty. Attempting to use a default or signal error.');
    // At this point, you might want to fetch a current/default event_unit_id
    // For now, we'll let it proceed to isNaN check, which will fail if it's not a number.
    // Or, you could explicitly set it to a value that causes a controlled error or fetches a default.
    // Forcing an error for now if it's not resolvable to a number:
    eventUnitIdStr = "INVALID"; // This will ensure isNaN check below fails clearly if not overridden by a fetch
  }

  const eventUnitId = parseInt(eventUnitIdStr, 10);
  // --- END MODIFICATION ---

  // Verifica che gli ID necessari siano numeri validi
  if (isNaN(contestId) || isNaN(ownerId)) { // <<< MODIFIED: Removed eventUnitId from this initial check as it's handled more specifically
    console.error('Uno o più ID fondamentali (contestId, ownerId) non sono validi:', 
                  { contestIdStr, ownerIdStr });
    showError('Errore: Dati del contest mancanti o corrotti. (ID fondamentali mancanti)');
    return;
  }

  // Specific check for eventUnitId after attempting to parse
  if (isNaN(eventUnitId)) {
    console.error('eventUnitId non è valido dopo il parsing:', { eventUnitIdStr, parsedEventUnitId: eventUnitId });
    showError('Errore: ID dell\'evento mancante o corrotto per la creazione della squadra. (eventUnitId mancante)');
    // Potresti voler reindirizzare o mostrare un messaggio più specifico qui
    // Ad esempio, se è contest-creation.html, potrebbe significare che l'evento non è selezionato.
    return;
  }
  
  // Per contest-creation, l'opponentId potrebbe non essere rilevante o essere l'ID dell'owner originale
  // se l'utente corrente è l'invitato. La logica del backend dovrebbe gestire questo.
  // Il problema 'NaN' in 'on clause' suggerisce che un ID usato in un JOIN è NaN.
  // Assicuriamoci che opponentId sia null se non è un numero valido, piuttosto che NaN.
  const validOpponentId = (opponentId !== null && !isNaN(opponentId)) ? opponentId : null;

  try {
    console.log('Parametri richiesti per fetchContestDetails:', { contestId, ownerId, opponentId: validOpponentId, eventUnitId });
    const [data, balance] = await Promise.all([
      fetchContestDetails(contestId, ownerId, validOpponentId, eventUnitId, authToken),
      fetchTeexBalance(authToken)
    ]);

    renderTeexBalance(balance);
    renderContestHeader(data.contest, currentUserId);
    renderTeamLists(data.ownerTeam, data.opponentTeam, data.contest, currentUserId);

  } catch (error) {
    console.error('Errore caricamento contest details:', error);
    showError(error.message || 'Errore caricamento contest details');
  }

  document.getElementById("backArrow")
    .addEventListener("click", () => window.location.href = "/user-landing.html");
}
