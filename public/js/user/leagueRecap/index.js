// public/js/user/leagueRecap/index.js

import { fetchLeagueRecap }    from './api.js';
import { initLeagueRecap }     from './ui.js';
import { bindRecapEvents,
         bindBackArrowEvent }  from './events.js';
import '../../session-expired-handler.js';

document.addEventListener('DOMContentLoaded', async () => {
 

  // 1) Leggo e valido recapContestData
  const rawRecap = localStorage.getItem('recapContestData');
  if (!rawRecap) {
    alert('Nessun recapContestData trovato in LocalStorage');
    return;
  }

  let recap;
  try {
    recap = JSON.parse(rawRecap);
  } catch (err) {
    console.error('❌ Errore parsing recapContestData:', err);
    alert('Formato recapContestData non valido');
    return;
  }


  const {
    contestId,
    contestName,
    ownerId,
    opponentId,
    eventUnitId,
    fantasyTeams,
    currentUser
  } = recap;

  const userId = Number(currentUser?.id);
  if (!contestId || !userId) {
    console.error('❌ Dati contestId o currentUser.id mancanti:', { contestId, userId });
    alert('Dati contest o utente mancanti per la Recap');
    return;
  }

  // 2) Attacco subito il listener della freccia “back”
  bindBackArrowEvent();

  // 3) Preparo token e chiamo il backend
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.error('❌ Auth token mancante');
    alert('Sessione scaduta, effettua il login.');
    return;
  }

  let data;
  try {
   
    data = await fetchLeagueRecap(contestId, token);
    } catch (err) {
    console.error('❌ Errore caricamento League Recap:', err);
    alert('Non è stato possibile caricare la recap della League.');
    return;
  }

  // 4) Inizializzo la UI: tutte le card (avatar + username)
  initLeagueRecap({
      contestName,
      fantasyTeams:  data.fantasyTeams,
      currentUserId: userId,
      ownerId        // ← aggiungi questo
    });


  // 5) Estraggo il fantasy-team corrente per preparare contestData
  const currentFT = data.fantasyTeams.find(ft => Number(ft.user_id) === userId) || {};
  const fantasyTeamId = currentFT.id 
                        ?? currentFT.fantasy_team_id 
                        ?? currentFT.ft_id 
                        ?? null;

  const contestData = {
    // preservo tutto ciò che c’era in recap
    ...recap,
    // sovrascrivo o aggiungo
    contestId,
    currentUserId:        userId,
    fantasyTeamId,
    currentUserAvatar:    currentFT.avatar      || '',
    currentUserName:      currentFT.username    || '',
    currentUserInitialCost: currentFT.total_cost != null
                             ? parseFloat(currentFT.total_cost).toFixed(1)
                             : '0.0'
  };

  localStorage.setItem('contestData', JSON.stringify(contestData));

  // 6) Associo gli eventi ai pulsanti (“Accept”, “Back”, ecc.)
   bindRecapEvents(contestId, userId, ownerId, opponentId, eventUnitId);

});
