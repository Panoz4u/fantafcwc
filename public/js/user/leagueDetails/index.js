// public/js/user/leagueDetails/index.js

import { fetchLeagueDetails } from './api.js';
import { initLeagueDetails } from './ui.js';
import { bindLeagueEvents   } from './events.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Leggo contestId da localStorage
  const contestIdStr = localStorage.getItem('contestId');
  const userId       = localStorage.getItem('userId');

  if (!contestIdStr || !userId) {
    alert('Contest o User non trovato in localStorage');
    return;
  }

  const contestId = parseInt(contestIdStr, 10);

  try {
    // 2) Chiamata API per ottenere i dati
    const data = await fetchLeagueDetails(contestId, userId);

    // 3) Rimuovo la chiamata a renderLeagueHeader che viene sovrascritta da initLeagueDetails

    // 4) Inizializzo la pagina passando direttamente i dati raccolti
    //    initLeagueDetails si occuperà di creare header + lista fantasy teams + accordions
        initLeagueDetails(
            { contest: data.contest, fantasyTeams: data.fantasyTeams },
            userId
          );

    // 5) registro eventuali altri eventi (per esempio l'accordion)
    bindLeagueEvents();
  } catch (err) {
    console.error('Errore nel caricamento di League Details:', err);
    alert('Impossibile caricare i dettagli della League.');
  }

  // 6) Pulsante "Back" (ritorno alla landing page)
  const backArrow = document.getElementById('backArrow');
  if (backArrow) {
    backArrow.addEventListener('click', () => {
      window.location.href = '/user-landing.html';
    });
  }
});
