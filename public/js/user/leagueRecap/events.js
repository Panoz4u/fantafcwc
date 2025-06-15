// public/js/user/leagueRecap/events.js

import { updateFantasyTeamStatus } from './api.js';

/**
 * Associa al pulsante di back l'azione di ritorno alla pagina di landing
 */
export function bindBackArrowEvent() {
  const backEl = document.getElementById('backArrow');
  if (backEl) {
    backEl.addEventListener('click', () => {
      // torna alla pagina precedente nel history
      window.history.back();
      // oppure, se preferisci sempre la landing:
      // window.location.href = '/user-landing.html';
    });
  }
}


export function bindRecapEvents(contestId, userId, ownerId, opponentId, eventUnitId) {
  // … back e discard restano uguali …

  document.getElementById('AcceptBtn').addEventListener('click', () => {
    // 1) recupero il contestData già salvato (con avatar, name, cost, fantasyTeamId…)
    const existing = JSON.parse(localStorage.getItem('contestData') || '{}');


    // 2) aggiorno/aggiungo solo i campi strettamente necessari
    const merged = {
      ...existing,
      contestId:   parseInt(contestId,   10),
      currentUserId: parseInt(userId,    10),
      ownerId:     parseInt(ownerId,     10),
      opponentId:  parseInt(opponentId,  10),
      eventUnitId: parseInt(eventUnitId, 10)
      // **non tocco** avatar/name/cost/fantasyTeamId: li tengo da existing
    };
 

    // 3) risalvo e redirect
    localStorage.setItem('contestData', JSON.stringify(merged));
    window.location.href = '/contest-creation.html';
  });

    // 3) DiscardBtn: setta ft_status = -1 e torna alla landing
    const discardBtn = document.getElementById('DiscardBtn');
    if (discardBtn) {
      discardBtn.addEventListener('click', async () => {
        try {
          await updateFantasyTeamStatus(contestId, userId, -1);
          // dopo il discard, ricarico la landing
          window.location.href = '/user-landing.html';
        } catch (err) {
          console.error('❌ Errore DISCARD:', err);
          alert('Errore nel rifiuto della partecipazione.');
        }
      });
    }


}