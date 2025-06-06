// public/js/user/leagueRecap/index.js

import { fetchLeagueRecap } from './api.js';
import { initLeagueRecap }  from './ui.js';
import { bindRecapEvents }  from './events.js';

document.addEventListener('DOMContentLoaded', async () => {
  const contestIdStr = localStorage.getItem('recapContestId');
  const contestName  = localStorage.getItem('recapContestName');
  const userIdStr    = localStorage.getItem('userId');
  const token        = localStorage.getItem('authToken');

  if (!contestIdStr || !userIdStr || !token) {
    alert('Dati mancanti per visualizzare il recap');
    return;
  }
  const contestId = parseInt(contestIdStr, 10);
  const userId    = parseInt(userIdStr,    10);

  let data;
  try {
    // 1) Carichiamo i dati dal backend
    data = await fetchLeagueRecap(contestId, token);
    // data.fantasyTeams deve contenere almeno:
    // [ { user_id, username, avatar, total_cost, id (fantasyTeamId), … }, … ]
  } catch (err) {
    console.error('Errore nel caricamento di League Recap:', err);
    alert('Non è stato possibile caricare la recap della League.');
    return;
  }

  // 2) Inizializziamo la pagina (header + lista + bottoni)
  initLeagueRecap({
    contestName:   contestName,
    fantasyTeams:  data.fantasyTeams,
    currentUserId: userId
  });

  // ──────────────────────────────────────────────────────────────────
  //  EXTRA: recupero del fantasy-team del current user
  const currentFT = data.fantasyTeams.find(ft => Number(ft.user_id) === userId) || {};

  // Seleziono in maniera sicura l'ID del fantasy team, a seconda di come lo chiami
  const fantasyTeamId = currentFT.id 
                        ?? currentFT.fantasy_team_id 
                        ?? currentFT.ft_id 
                        ?? null;

  const contestData = {
    // i campi indispensabili per contest-creation.html
    contestId,                       // l'ID del contest
    currentUserId:   userId,         // l'ID dell'utente corrente
    fantasyTeamId,                    // l'ID del fantasy team (se presente)
    // profilo del current user
    currentUserAvatar:     currentFT.avatar      || '',
    currentUserName:       currentFT.username    || '',
    currentUserInitialCost: currentFT.total_cost != null
                             ? parseFloat(currentFT.total_cost).toFixed(1)
                             : '0.0'
  };

  console.log('💾 [DEBUG] contestData salvato in localStorage:', contestData);
  localStorage.setItem('contestData', JSON.stringify(contestData));
  // ──────────────────────────────────────────────────────────────────

  // 3) Infine, associo gli eventi ai pulsanti (“Accept”, “Back”, ecc.)
  bindRecapEvents(contestId, userId);
});
