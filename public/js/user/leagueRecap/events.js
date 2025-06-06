// public/js/user/leagueRecap/events.js

import { updateFantasyTeamStatus } from './api.js';

export function bindRecapEvents(contestId, userId) {
  // Pulsante Back → torna a landing
  document.getElementById('backArrow').addEventListener('click', () => {
    window.location.href = '/user-landing.html';
  });

    // Pulsante “Discard” → setta ft_status=-1 e ritorna alla landing
  document.getElementById('DiscardBtn').addEventListener('click', async () => {
    try {
      await updateFantasyTeamStatus(contestId, userId, -1);
      window.location.href = '/user-landing.html';
    } catch (err) {
      console.error('Errore aggiornamento status:', err);
    }
  });

  // Pulsante “Accept” → redirige a contest-creation.html con query param
  document.getElementById('AcceptBtn').addEventListener('click', () => {
    window.location.href = `/contest-creation.html?contestId=${contestId}`;
  });
}
