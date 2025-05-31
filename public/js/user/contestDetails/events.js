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
  let eventUnitIdStr   = localStorage.getItem("eventUnitId");
  const authToken      = localStorage.getItem("authToken");
  const currentUserId  = localStorage.getItem("userId");

  // Conversione base e check sui parametri
  const contestId  = parseInt(contestIdStr, 10);
  const ownerId    = parseInt(ownerIdStr, 10);
  const opponentId = opponentIdStr ? parseInt(opponentIdStr, 10) : null;

  // Gestione eventUnitId (evito NaN silenziosi)
  if (
    eventUnitIdStr === null ||
    eventUnitIdStr === undefined ||
    eventUnitIdStr.trim() === "" ||
    eventUnitIdStr.toLowerCase() === "null"
  ) {
    console.warn(
      'eventUnitId mancante o vuoto in localStorage; forzo valore non numerico per triggerare l’errore più tardi'
    );
    eventUnitIdStr = "INVALID";
  }
  const eventUnitId = parseInt(eventUnitIdStr, 10);

  // Verifica contestId e ownerId (irreversibili)
  if (isNaN(contestId) || isNaN(ownerId)) {
    console.error(
      'ID fondamentali mancanti o non validi:',
      { contestIdStr, ownerIdStr }
    );
    showError(
      'Errore: impossibile caricare i dettagli. Parametri fondamentali mancanti nel contest.'
    );
    return;
  }

  // Verifica specifica di eventUnitId
  if (isNaN(eventUnitId)) {
    console.error(
      'eventUnitId non valido dopo il parsing:',
      { eventUnitIdStr, parsedEventUnitId: eventUnitId }
    );
    showError(
      "Errore: ID dell'evento mancante o non valido per la visualizzazione del contest."
    );
    return;
  }

  // Se opponentId non è un numero valido, lo pongo a null
  const validOpponentId =
    opponentId !== null && !isNaN(opponentId) ? opponentId : null;

  try {
    console.log(
      'Parametri fetchContestDetails:',
      { contestId, ownerId, opponentId: validOpponentId, eventUnitId }
    );
    const [data, balance] = await Promise.all([
      fetchContestDetails(contestId, ownerId, validOpponentId, eventUnitId, authToken),
      fetchTeexBalance(authToken)
    ]);

       // —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
       // Loggo per vedere in dettaglio la struttura dei team:
       console.log("🏷️ ownerTeam raw data:", data.ownerTeam);
       console.log("🏷️ opponentTeam raw data:", data.opponentTeam);
       // —


    // 1) Mostro bilancio
    renderTeexBalance(balance);

    // 2) Calcolo “sono owner?” una sola volta
    const contest   = data.contest;
    const iAmOwner  = Number(currentUserId) === Number(contest.owner_id);

    // 3) Passo iAmOwner a tutte le funzioni di rendering
    renderContestHeader(contest, currentUserId, iAmOwner);
    renderTeamLists(
      data.ownerTeam,
      data.opponentTeam,
      contest,
      currentUserId,
      iAmOwner
    );

    // 4) Popolo il blocco dei nomi utente
    {
      const leftEl  = document.getElementById("leftUserName");
      const rightEl = document.getElementById("rightUserName");

      if (leftEl) {
        leftEl.textContent = iAmOwner
          ? contest.owner_name
          : contest.opponent_name;
      }
      if (rightEl) {
        rightEl.textContent = iAmOwner
          ? contest.opponent_name
          : contest.owner_name;
      }
    }

  } catch (error) {
    console.error('Errore caricamento contest details:', error);
    showError(
      error.message || 'Errore durante il caricamento dei dettagli del contest.'
    );
  }

  // “Back” arrow: torna alla landing page
  const backArrow = document.getElementById("backArrow");
  if (backArrow) {
    backArrow.addEventListener("click", () => {
      window.location.href = "/user-landing.html";
    });
  }
}
