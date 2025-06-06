// public/js/user/leagueRecap/index.js

import { fetchLeagueRecap } from './api.js';
import { initLeagueRecap }   from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  const contestIdStr = localStorage.getItem('recapContestId');
  const contestName  = localStorage.getItem('recapContestName');
  const userId       = localStorage.getItem('userId');
  const token        = localStorage.getItem('authToken');

  if (!contestIdStr || !userId || !token) {
    alert('Dati mancanti per visualizzare il recap');
    return;
  }
  const contestId = parseInt(contestIdStr, 10);

  try {
    // 1) Carichiamo i dati dal backend
    const data = await fetchLeagueRecap(contestId, token);
    // data deve contenere almeno:
    // { fantasyTeams: [ { user_id, username, avatar, ft_status, … }, … ] }

    // 2) Inizializziamo la pagina (header + lista + bottoni)
    initLeagueRecap({
      contestName:  contestName,
      fantasyTeams: data.fantasyTeams,
      currentUserId: userId
    });

  } catch (err) {
    console.error('Errore nel caricamento di League Recap:', err);
    alert('Non è stato possibile caricare la recap della League.');
  }

  // 3) Pulsante “Back”:
  document.getElementById('backArrow')?.addEventListener('click', () => {
    window.location.href = '/user-landing.html';
  });
  
  // 4) Gestione bottoni DISCARD / ACCEPT
  document.getElementById('DiscardBtn')?.addEventListener('click', () => {
    // Logica di “rifiuta”: aggiorna ft_status in < 2 e torna alla landing
    // (vedi sez. Rotta backend più avanti)
  });
  document.getElementById('AcceptBtn')?.addEventListener('click', () => {
    // Logica “accetta”: redirige a contest-creation.html con i dati necessari
  });
});
