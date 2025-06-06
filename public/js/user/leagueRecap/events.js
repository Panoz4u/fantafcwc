// public/js/user/leagueRecap/events.js

import { updateFantasyTeamStatus } from './api.js';

/**
 * bindRecapEvents:
 *   - Pulsante “Back” (←): torna a user-landing.html
 *   - Pulsante “Discard”: imposta ft_status = 2 (o -1, a seconda della logica)
 *       e poi torna a user-landing.html
 *   - Pulsante “Accept”: legge da localStorage ‘contestData’ e
 *       reindirizza a contest-creation.html senza query string
 */
export function bindRecapEvents(contestId, userId) {
  // Pulsante “Discard” → setta ft_status=-1 e ritorna alla landing
  document.getElementById('backArrow').addEventListener('click', () => {
    window.location.href = '/user-landing.html';
  });

  // 2) Pulsante “Discard” → aggiorna ft_status e torna a /user-landing.html
  document.getElementById('DiscardBtn').addEventListener('click', async () => {
    try {
      // Imposta lo status del fantasy team a “2” (discard)
      await updateFantasyTeamStatus(contestId, userId, 2);
      // Torna alla pagina dei contest
      window.location.href = '/user-landing.html';
    } catch (err) {
      console.error('Errore aggiornamento status:', err);
    }
  });

  // 3) Pulsante “Accept” → naviga a contest-creation.html salvando il contestData in localStorage
  document.getElementById('AcceptBtn').addEventListener('click', () => {
    // Controlla che contestData sia presente in localStorage
    const saved = localStorage.getItem('contestData');
    if (!saved) {
      console.error('contestData non trovata in localStorage');
      alert('Impossibile aprire la creazione squadra: dati mancanti.');
      return;
    }
    // Se esiste, naviga a contest-creation.html (i dati verranno letti da lì in index.js)
    window.location.href = '/contest-creation.html';
  });
}
